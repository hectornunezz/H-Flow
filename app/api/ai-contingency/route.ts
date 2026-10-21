import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ContingencyRequest {
  athleteMessage: string
  currentExercise: string
  exerciseBank: Array<{ id?: string; name: string; category?: string; equipment?: string }> | string[]
}

interface ContingencyResponse {
  suggested_exercises: string[]
  biomechanical_reason: string
  adjusted_rir: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para solicitar una sugerencia.' },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser JSON válido.' },
        { status: 400 }
      )
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Los datos de la consulta no son válidos.' },
        { status: 400 }
      )
    }

    const { athleteMessage, currentExercise, exerciseBank } = body as Partial<ContingencyRequest>

    if (
      typeof athleteMessage !== 'string' ||
      athleteMessage.trim().length === 0 ||
      athleteMessage.length > 1000 ||
      typeof currentExercise !== 'string' ||
      currentExercise.trim().length === 0 ||
      currentExercise.length > 200 ||
      !Array.isArray(exerciseBank) ||
      exerciseBank.length === 0 ||
      exerciseBank.length > 500 ||
      exerciseBank.some((item) =>
        typeof item === 'string'
          ? item.trim().length === 0 || item.length > 150
          : typeof item !== 'object' ||
            item === null ||
            typeof item.name !== 'string' ||
            item.name.trim().length === 0 ||
            item.name.length > 150
      )
    ) {
      return NextResponse.json(
        { error: 'Los datos de la consulta no son válidos o superan el límite permitido.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY no configurada en las variables de entorno.' },
        { status: 500 }
      )
    }

    const formattedBank = exerciseBank.map((item) =>
      typeof item === 'string' ? item : item.name
    )

    const systemPrompt = `Actúa como biomecánico de élite. Evalúa el dolor/estancamiento reportado en el currentExercise. Selecciona 2 ejercicios alternativos seguros exclusivamente del exerciseBank.
Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "suggested_exercises": ["string", "string"],
  "biomechanical_reason": "string",
  "adjusted_rir": number
}`

    const userPrompt = `Mensaje del atleta: "${athleteMessage}"
Ejercicio actual: "${currentExercise}"
Banco de ejercicios disponible:
${JSON.stringify(formattedBank, null, 2)}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Groq API error (${response.status}): ${errText}`)
    }

    const groqData = await response.json()
    const content = groqData.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Respuesta vacía de Groq API.')
    }

    const parsed: ContingencyResponse = JSON.parse(content)

    return NextResponse.json(parsed, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al procesar la contingencia.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}