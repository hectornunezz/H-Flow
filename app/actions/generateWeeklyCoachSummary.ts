'use server'

import { createClient } from '@/utils/supabase/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'

type AthleteMetric = {
  date: string
  weight: number | null
  sleep_hours: number | null
  stress_level: number | null
  fatigue_level: number | null
}

type WorkoutExercise = {
  sets: number
  reps: number | string
  rir: number | null
  tempo: string | null
  exercises:
    | { name: string; muscle_group: string | null }
    | Array<{ name: string; muscle_group: string | null }>
    | null
}

type AssignedWorkout = {
  scheduled_date: string
  workouts:
    | { title: string; workout_exercises: WorkoutExercise[] | null }
    | Array<{ title: string; workout_exercises: WorkoutExercise[] | null }>
    | null
}

type GroqResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

function getFourWeeksAgo(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 28)
  return date.toISOString().slice(0, 10)
}

export async function generateWeeklyCoachSummary(athleteId: string): Promise<string> {
  try {
    if (!UUID_PATTERN.test(athleteId)) {
      throw new Error('El identificador del atleta no es válido.')
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }
    if (!user) {
      throw new Error('Debes iniciar sesión para generar el resumen.')
    }

    const { data: coach, error: coachError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (coachError) {
      throw new Error(`No se pudo verificar el entrenador: ${coachError.message}`)
    }
    if (!coach || coach.role !== 'coach') {
      throw new Error('Solo un entrenador puede generar resúmenes de atletas.')
    }

    const { data: athlete, error: athleteError } = await supabase
      .from('profiles')
      .select('id, trainer_id, role')
      .eq('id', athleteId)
      .maybeSingle()

    if (athleteError) {
      throw new Error(`No se pudo verificar el atleta: ${athleteError.message}`)
    }
    if (!athlete || athlete.role !== 'athlete' || athlete.trainer_id !== user.id) {
      throw new Error('El atleta no existe o no pertenece a este entrenador.')
    }

    const since = getFourWeeksAgo()
    const [
      { data: metricsData, error: metricsError },
      { data: workoutsData, error: workoutsError },
    ] = await Promise.all([
      supabase
        .from('athlete_metrics')
        .select('date, weight, sleep_hours, stress_level, fatigue_level')
        .eq('athlete_id', athleteId)
        .gte('date', since)
        .order('date', { ascending: true }),
      supabase
        .from('assigned_workouts')
        .select(
          'scheduled_date, workouts(title, workout_exercises(sets, reps, rir, tempo, exercises(name, muscle_group)))',
        )
        .eq('athlete_id', athleteId)
        .gte('scheduled_date', since)
        .order('scheduled_date', { ascending: true }),
    ])

    if (metricsError) {
      throw new Error(`No se pudieron cargar las métricas: ${metricsError.message}`)
    }
    if (workoutsError) {
      throw new Error(`No se pudieron cargar las rutinas: ${workoutsError.message}`)
    }

    const metrics = (metricsData ?? []) as AthleteMetric[]
    const assignedWorkouts = (workoutsData ?? []) as AssignedWorkout[]
    const trainingPlan = assignedWorkouts.map((assignment) => {
      const workout = Array.isArray(assignment.workouts)
        ? assignment.workouts[0]
        : assignment.workouts

      return {
        date: assignment.scheduled_date,
        title: workout?.title ?? 'Rutina',
        exercises: (workout?.workout_exercises ?? []).map((exercise) => {
          const details = Array.isArray(exercise.exercises)
            ? exercise.exercises[0]
            : exercise.exercises
          return {
            name: details?.name ?? 'Ejercicio',
            muscleGroup: details?.muscle_group ?? null,
            sets: exercise.sets,
            reps: exercise.reps,
            rir: exercise.rir,
            tempo: exercise.tempo,
          }
        }),
      }
    })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY no está configurada.')
    }

    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'Actúa como analista de rendimiento para el entrenador. Con los datos proporcionados, redacta un resumen ejecutivo en español de exactamente 3 líneas, conciso y útil. Evalúa tendencias de métricas y carga prescrita solo cuando haya datos suficientes. No inventes resultados, tendencias ni pesos levantados. El campo weight corresponde al peso corporal del atleta, no a cargas de ejercicios. Los datos de rutinas son prescripciones (series/repeticiones), no registros de cargas completadas. Si no hay registros de pesos levantados o la información no basta, indícalo brevemente en una línea. No emitas diagnósticos médicos.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              periodo: { desde: since, hasta: new Date().toISOString().slice(0, 10) },
              metricas: metrics,
              rutinasAsignadas: trainingPlan,
              registrosDeCargasLevantadas: [],
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`Groq respondió ${response.status}: ${details}`)
    }

    const result = (await response.json()) as GroqResponse
    const summary = result.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      throw new Error('El modelo no devolvió un resumen.')
    }

    const lines = summary
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
    if (lines.length !== 3) {
      throw new Error('El modelo no devolvió exactamente 3 líneas.')
    }

    return lines.join('\n')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al generar el resumen.'
    console.error('[generateWeeklyCoachSummary]', message)
    throw new Error(message)
  }
}
