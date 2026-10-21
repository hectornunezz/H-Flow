import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { POST as processTranscription } from '@/app/api/whatsapp-sync/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v22.0'
const MAX_MEDIA_BYTES = 16 * 1024 * 1024
const MAX_WEBHOOK_BYTES = 128 * 1024
const ALLOWED_MEDIA_HOSTS = ['lookaside.fbsbx.com', 'fbcdn.net']

type WhatsAppMessage = {
  id?: string
  type?: string
  audio?: { id?: string }
}

type WhatsAppWebhookBody = {
  object?: string
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[]
      }
    }>
  }>
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAllowedMediaUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      ALLOWED_MEDIA_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
  } catch {
    return false
  }
}

function verifySignature(payload: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false

  const expected = createHmac('sha256', appSecret).update(payload).digest()
  const received = Buffer.from(signature.slice('sha256='.length), 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

async function transcribeAudio(audioId: string): Promise<string> {
  const accessToken = getRequiredEnv('WHATSAPP_ACCESS_TOKEN')
  const graphVersion = /^v\d+\.\d+$/.test(GRAPH_API_VERSION) ? GRAPH_API_VERSION : 'v22.0'
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(audioId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    },
  )

  if (!metadataResponse.ok) {
    throw new Error(`Meta no pudo recuperar el audio (${metadataResponse.status}).`)
  }

  const metadata: unknown = await metadataResponse.json()
  if (!isRecord(metadata) || typeof metadata.url !== 'string' || !metadata.url) {
    throw new Error('Meta no devolvió una URL válida para el audio.')
  }
  if (typeof metadata.mime_type !== 'string' || !metadata.mime_type.startsWith('audio/')) {
    throw new Error('El archivo recibido no tiene un tipo de audio válido.')
  }
  if (!isAllowedMediaUrl(metadata.url)) {
    throw new Error('Meta devolvió un dominio de descarga de audio no permitido.')
  }

  const mediaResponse = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  })

  if (!mediaResponse.ok) {
    throw new Error(`No se pudo descargar el audio de Meta (${mediaResponse.status}).`)
  }

  const declaredLength = Number(mediaResponse.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_MEDIA_BYTES) {
    throw new Error('El audio supera el tamaño máximo permitido.')
  }

  const audio = Buffer.from(await mediaResponse.arrayBuffer())
  if (audio.length === 0 || audio.length > MAX_MEDIA_BYTES) {
    throw new Error('El audio está vacío o supera el tamaño máximo permitido.')
  }

  const apiKey = getRequiredEnv('GROQ_API_KEY')
  const form = new FormData()
  form.append('file', new Blob([audio], { type: metadata.mime_type }), 'whatsapp-audio')
  form.append('model', 'whisper-large-v3')
  form.append('language', 'es')
  form.append('response_format', 'json')

  const transcriptionResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  })

  if (!transcriptionResponse.ok) {
    console.error(
      '[whatsapp-webhook] Groq transcription failed:',
      transcriptionResponse.status,
      await transcriptionResponse.text(),
    )
    throw new Error('No se pudo transcribir el audio.')
  }

  const transcription: unknown = await transcriptionResponse.json()
  if (!isRecord(transcription) || typeof transcription.text !== 'string') {
    throw new Error('Groq devolvió una transcripción no válida.')
  }

  const text = transcription.text.trim()
  if (!text || text.length > 5000) {
    throw new Error('La transcripción está vacía o supera el tamaño permitido.')
  }

  return text
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (!expectedToken) {
    console.error('[whatsapp-webhook] WHATSAPP_VERIFY_TOKEN no está configurado.')
    return new NextResponse('Webhook no configurado.', { status: 503 })
  }

  const receivedToken = Buffer.from(token ?? '')
  const configuredToken = Buffer.from(expectedToken)
  if (
    mode !== 'subscribe' ||
    !token ||
    receivedToken.length !== configuredToken.length ||
    !timingSafeEqual(receivedToken, configuredToken) ||
    !challenge ||
    challenge.length > 256
  ) {
    return new NextResponse('Verificación no válida.', { status: 403 })
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'El webhook supera el tamaño permitido.' }, { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el webhook.' }, { status: 400 })
  }
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'El webhook supera el tamaño permitido.' }, { status: 413 })
  }

  let appSecret: string
  try {
    appSecret = getRequiredEnv('WHATSAPP_APP_SECRET')
  } catch (error) {
    console.error('[whatsapp-webhook]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 503 })
  }

  if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Firma del webhook no válida.' }, { status: 401 })
  }

  let payload: WhatsAppWebhookBody
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookBody
  } catch {
    return NextResponse.json({ error: 'El cuerpo del webhook no es JSON válido.' }, { status: 400 })
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ received: true })
  }

  const messages =
    payload.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
    ) ?? []
  const audioMessages = messages.filter(
    (message) => message.type === 'audio' && typeof message.audio?.id === 'string',
  )

  try {
    for (const message of audioMessages) {
      const audioId = message.audio?.id
      if (!audioId) continue

      const transcription = await transcribeAudio(audioId)
      const internalResponse = await processTranscription(
        new Request('http://localhost/api/whatsapp-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcription }),
        }),
      )

      if (!internalResponse.ok) {
        console.error(
          `[whatsapp-webhook] Falló el procesamiento del mensaje ${message.id ?? 'desconocido'}:`,
          await internalResponse.text(),
        )
        return NextResponse.json(
          { error: 'No se pudo procesar el audio recibido.' },
          { status: 502 },
        )
      }
    }
  } catch (error) {
    console.error(
      '[whatsapp-webhook] Error procesando un mensaje de audio:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json({ error: 'No se pudo procesar el audio.' }, { status: 500 })
  }

  return NextResponse.json({ received: true, processedAudios: audioMessages.length })
}
