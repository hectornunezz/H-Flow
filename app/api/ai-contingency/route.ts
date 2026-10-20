import { NextResponse } from 'next/server'

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
    const body: ContingencyRequest = await request.json()
    const { athleteMessage, currentExercise, exerciseBank } = body

    if (!athleteMessage || !currentExercise || !Array.isArray(exerciseBank)) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: athleteMessage, currentExercise, exerciseBank.' },
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