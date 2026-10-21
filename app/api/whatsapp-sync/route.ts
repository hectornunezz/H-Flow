import { NextResponse } from 'next/server'
import type { Task, TaskIcon } from '@/types'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/whatsapp-sync
 *
 * Núcleo de IA de H-Flow: simula la recepción de un audio de WhatsApp,
 * lo transcribe (Groq Whisper) y lo estructura como `Task` vía LLM.
 * → PASO 3: el objeto Task resultante se persiste en Supabase antes de
 *   devolverlo al frontend, garantizando que sobrevive a recargas.
 *
 * Env vars:
 * - GROQ_API_KEY          → Whisper + fallback de chat (Groq/Mistral)
 * - LLM_BASE_URL          → FreeLLMAPI u otro OpenAI-compatible (default: http://127.0.0.1:3001/v1)
 * - LLM_API_KEY           → Bearer de FreeLLMAPI (freellmapi-...)
 * - LLM_MODEL             → modelo de chat (default: auto)
 * - WHATSAPP_SYNC_MOCK    → "true" (default) usa transcripción mock sin llamar a Whisper
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Audio de WhatsApp simulado (texto de prueba complejo del atleta Marcos). */
const MOCK_WHATSAPP_TRANSCRIPT =
  'Hola Héctor, soy Marcos. Me duele un poco el hombro al hacer press banca, ¿podemos cambiar la rutina de empujes de mañana? Ah, y el peso de hoy ha sido 82.5kg.'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_LLM_BASE_URL = 'http://127.0.0.1:3001/v1'
const TASK_ICONS: readonly TaskIcon[] = ['video', 'phone', 'calendar', 'dumbbell']

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null }
  }>
}

type WhisperTranscriptionResponse = {
  text?: string
}

type WhatsAppSyncSuccess = {
  ok: true
  transcription: string
  task: Task
  meta: {
    transcriptionSource: 'mock' | 'groq-whisper' | 'text-input'
    structuringProvider: string
    model: string
  }
}

type WhatsAppSyncError = {
  ok: false
  error: string
  details?: string
}

// ---------------------------------------------------------------------------
// Paso 1 — Transcripción ultrarrápida (Groq Whisper large-v3)
// ---------------------------------------------------------------------------

/**
 * Envía un archivo de audio a Groq Whisper (`whisper-large-v3`).
 * En esta iteración el audio real aún no llega desde WhatsApp;
 * la función queda lista para cuando exista el blob.
 */
async function transcribeWithGroqWhisper(audio: Blob, filename: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada: no se puede transcribir con Whisper.')
  }

  const form = new FormData()
  form.append('file', audio, filename)
  form.append('model', 'whisper-large-v3')
  form.append('language', 'es')
  form.append('response_format', 'json')
  form.append(
    'prompt',
    'Vocabulario de entrenamiento: press banca, mesociclo, check-in, kilos, rutina de empujes.'
  )

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq Whisper falló (${res.status}): ${body}`)
  }

  const data = (await res.json()) as WhisperTranscriptionResponse
  const text = data.text?.trim()
  if (!text) {
    throw new Error('Groq Whisper devolvió una transcripción vacía.')
  }

  return text
}

/**
 * Resuelve la transcripción: mock por defecto (audio simulado) o Whisper real
 * si llega un archivo y WHATSAPP_SYNC_MOCK no está forzado a true.
 */
async function resolveTranscription(request: Request): Promise<{
  transcription: string
  source: 'mock' | 'groq-whisper' | 'text-input'
}> {
  const mockEnabled = (process.env.WHATSAPP_SYNC_MOCK ?? 'true').toLowerCase() !== 'false'

  // Intentar leer multipart (audio real de WhatsApp en el futuro).
  const contentType = request.headers.get('content-type') ?? ''
  let audioFile: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const candidate = form.get('audio')
    if (candidate instanceof File && candidate.size > 0) {
      audioFile = candidate
    }
  } else if (contentType.includes('application/json')) {
    const body: unknown = await request.json()
    if (typeof body === 'object' && body !== null && 'transcription' in body) {
      if (typeof body.transcription !== 'string') {
        throw new Error('La transcripción debe ser texto.')
      }

      const transcription = body.transcription.trim()
      if (transcription.length > 5000) {
        throw new Error('La transcripción no puede superar los 5000 caracteres.')
      }
      if (transcription) {
        return { transcription, source: 'text-input' }
      }
    }
  }

  if (!mockEnabled && audioFile) {
    const transcription = await transcribeWithGroqWhisper(audioFile, audioFile.name || 'whatsapp.ogg')
    return { transcription, source: 'groq-whisper' }
  }

  // Audio simulado: usamos el mensaje de prueba de Marcos.
  return { transcription: MOCK_WHATSAPP_TRANSCRIPT, source: 'mock' }
}

// ---------------------------------------------------------------------------
// Paso 2 — Estructuración LLM → Task (FreeLLMAPI localhost → Groq fallback)
// ---------------------------------------------------------------------------

function buildEliteCoachSystemPrompt(): string {
  return [
    'Eres el asistente de IA de un entrenador personal de élite en H-Flow.',
    'Tu trabajo: leer un mensaje de voz transcrito de un atleta (WhatsApp) y extraer la intención operativa.',
    'Debes responder ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) que cumpla EXACTAMENTE esta forma:',
    '{',
    '  "id": string (uuid o slug único),',
    '  "title": string (acción concreta y breve para el coach, en español),',
    '  "time": string (hora legible tipo "10:30 AM"; si no hay hora, usa una razonable para mañana),',
    '  "completed": false,',
    '  "icon": "video" | "phone" | "calendar" | "dumbbell",',
    '  "athleteId": string | null,',
    '  "trainerId": string | null,',
    '  "scheduledDate": string (YYYY-MM-DD, opcional)',
    '}',
    'Reglas:',
    '- Prioriza dolor/lesión y cambios de rutina sobre métricas de peso.',
    '- El title debe ser accionable para el coach (ej. "Ajustar empujes de Marcos por dolor en hombro").',
    '- icon: "dumbbell" para rutina/fuerza, "calendar" para reprogramar sesión, "video" para check-in, "phone" para llamada.',
    '- completed siempre false en tareas nuevas.',
    '- No inventes campos fuera del schema.',
  ].join('\n')
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  // Algunos modelos envuelven el JSON en fences ```json ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  return JSON.parse(candidate) as unknown
}

function isTaskIcon(value: unknown): value is TaskIcon {
  return typeof value === 'string' && (TASK_ICONS as readonly string[]).includes(value)
}

/** Type guard estricto: garantiza que el JSON del LLM cumple `Task`. */
function assertTask(value: unknown): Task {
  if (!value || typeof value !== 'object') {
    throw new Error('El LLM no devolvió un objeto JSON.')
  }

  const v = value as Record<string, unknown>

  if (typeof v.id !== 'string' || !v.id.trim()) {
    throw new Error('Task.id inválido.')
  }
  if (typeof v.title !== 'string' || !v.title.trim()) {
    throw new Error('Task.title inválido.')
  }
  if (typeof v.time !== 'string' || !v.time.trim()) {
    throw new Error('Task.time inválido.')
  }
  if (typeof v.completed !== 'boolean') {
    throw new Error('Task.completed debe ser boolean.')
  }
  if (!isTaskIcon(v.icon)) {
    throw new Error('Task.icon debe ser video | phone | calendar | dumbbell.')
  }

  const task: Task = {
    id: v.id.trim(),
    title: v.title.trim(),
    time: v.time.trim(),
    completed: v.completed,
    icon: v.icon,
  }

  if (v.athleteId !== undefined) {
    task.athleteId = v.athleteId === null ? null : String(v.athleteId)
  }
  if (v.trainerId !== undefined) {
    task.trainerId = v.trainerId === null ? null : String(v.trainerId)
  }
  if (typeof v.scheduledDate === 'string' && v.scheduledDate.trim()) {
    task.scheduledDate = v.scheduledDate.trim()
  }

  return task
}

async function callChatCompletions(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: ChatMessage[]
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
      // Pedimos JSON estricto cuando el proveedor lo soporte (Groq / FreeLLMAPI).
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Chat completions falló en ${baseUrl} (${res.status}): ${body}`)
  }

  const data = (await res.json()) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error(`Respuesta vacía del LLM en ${baseUrl}.`)
  }

  return content
}

/**
 * Estructura la transcripción como `Task`.
 * 1) FreeLLMAPI en localhost (OpenAI-compatible)
 * 2) Fallback Groq chat (p.ej. llama / mistral vía API Groq)
 */
async function structureTranscriptAsTask(transcription: string): Promise<{
  task: Task
  provider: string
  model: string
}> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildEliteCoachSystemPrompt() },
    {
      role: 'user',
      content: [
        'Transcripción del audio de WhatsApp del atleta:',
        '---',
        transcription,
        '---',
        'Devuelve solo el JSON de la Task.',
      ].join('\n'),
    },
  ]

  const llmBaseUrl = process.env.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL
  const llmApiKey = process.env.LLM_API_KEY
  const llmModel = process.env.LLM_MODEL ?? 'auto'

  // Intento A — FreeLLMAPI / localhost
  try {
    const raw = await callChatCompletions(llmBaseUrl, llmApiKey, llmModel, messages)
    const task = assertTask(parseJsonObject(raw))
    return { task, provider: llmBaseUrl, model: llmModel }
  } catch (localError) {
    console.warn('[whatsapp-sync] FreeLLMAPI/local falló, probando Groq…', localError)
  }

  // Intento B — Groq (API compatible OpenAI; modelos rápidos tipo Llama/Mistral)
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    throw new Error(
      'No hay LLM disponible: FreeLLMAPI local falló y GROQ_API_KEY no está configurada.'
    )
  }

  const groqModel = process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile'
  const raw = await callChatCompletions(GROQ_BASE_URL, groqKey, groqModel, messages)
  const task = assertTask(parseJsonObject(raw))
  return { task, provider: 'groq', model: groqModel }
}

// ---------------------------------------------------------------------------
// Paso 3 — Route Handler (con INSERT en Supabase)
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse<WhatsAppSyncSuccess | WhatsAppSyncError>> {
  try {
    // 1) Transcripción (mock de audio WhatsApp o Whisper real)
    const { transcription, source } = await resolveTranscription(request)

    // 2) Estructuración de intención → Task tipada
    const { task, provider, model } = await structureTranscriptAsTask(transcription)

    // 3) PERSISTENCIA — INSERT en Supabase tasks
    //    Decisión técnica: mapeamos los campos camelCase de Task a snake_case
    //    de la BD para mantener la convención Postgres estándar.
    //    Si el LLM genera un id repetido, Supabase lo rechaza y relanzamos el error.
    const { data: savedRow, error: dbError } = await supabase
      .from('tasks')
      .insert({
        id:             task.id,
        title:          task.title,
        time:           task.time,
        completed:      task.completed,
        icon:           task.icon,
        athlete_id:     task.athleteId    ?? null,
        trainer_id:     task.trainerId    ?? null,
        scheduled_date: task.scheduledDate ?? null,
      })
      .select()
      .single()

    if (dbError) {
      // Si es colisión de PK el LLM generó un id duplicado; lo regeneramos.
      if (dbError.code === '23505') {
        const fallbackId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const { data: retryRow, error: retryError } = await supabase
          .from('tasks')
          .insert({
            id:             fallbackId,
            title:          task.title,
            time:           task.time,
            completed:      task.completed,
            icon:           task.icon,
            athlete_id:     task.athleteId    ?? null,
            trainer_id:     task.trainerId    ?? null,
            scheduled_date: task.scheduledDate ?? null,
          })
          .select()
          .single()

        if (retryError) throw new Error(`Supabase retry falló: ${retryError.message}`)
        task.id = retryRow.id
      } else {
        throw new Error(`Supabase INSERT falló: ${dbError.message}`)
      }
    } else if (savedRow) {
      // Actualizamos el id con el real de la BD (por si Supabase lo transformó)
      task.id = savedRow.id
    }

    // 4) Respuesta 200 al frontend con el objeto persistido
    return NextResponse.json(
      {
        ok: true,
        transcription,
        task,
        meta: {
          transcriptionSource: source,
          structuringProvider: provider,
          model,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido en whatsapp-sync'
    console.error('[whatsapp-sync]', message)

    return NextResponse.json(
      {
        ok: false,
        error: 'No se pudo procesar el audio de WhatsApp.',
        details: message,
      },
      { status: 500 }
    )
  }
}

/** Health-check ligero para verificar que la ruta está montada. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/whatsapp-sync',
    mockTranscript: MOCK_WHATSAPP_TRANSCRIPT,
    hint: 'POST para ejecutar el pipeline Whisper → LLM → Task → Supabase',
  })
}
