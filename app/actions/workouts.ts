'use server'

import { revalidatePath } from 'next/cache'
import type { IntensityTechnique } from '@/types/workout'
import { createClient } from '@/utils/supabase/server'

interface DayExercise {
  exercise_id: string
  sets: number
  reps_target: string
  rir_target: number | null
  rest_time?: number | null
  intensity_technique: IntensityTechnique | null
}

export interface DayBlock {
  day_name: string
  exercises: DayExercise[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const INTENSITY_TECHNIQUES: readonly IntensityTechnique[] = [
  'Drop Set',
  'Rest-Pause',
  'Myo-Reps',
  'Giant Set',
  'Super Set',
  'Cluster Set',
  'Tempo',
  'Pausa en Estiramiento',
]

export async function saveCompleteRoutine(daysData: DayBlock[]): Promise<string> {
  try {
    if (!Array.isArray(daysData) || daysData.length === 0) {
      throw new Error('La rutina debe contener al menos un día.')
    }

    const blocks = daysData.map((day, dayIndex) => {
      if (
        typeof day.day_name !== 'string' ||
        day.day_name.trim().length === 0 ||
        !Array.isArray(day.exercises) ||
        day.exercises.length === 0
      ) {
        throw new Error(`El bloque ${dayIndex + 1} debe tener nombre y ejercicios.`)
      }

      return {
        day_name: day.day_name.trim(),
        order: dayIndex,
        exercises: day.exercises.map((exercise, exerciseIndex) => {
          if (
            !UUID_PATTERN.test(exercise.exercise_id) ||
            !Number.isInteger(exercise.sets) ||
            exercise.sets < 1 ||
            typeof exercise.reps_target !== 'string' ||
            exercise.reps_target.trim().length === 0 ||
            (exercise.rir_target !== null &&
              (!Number.isInteger(exercise.rir_target) ||
                exercise.rir_target < 0 ||
                exercise.rir_target > 10)) ||
            (exercise.rest_time != null &&
              (!Number.isInteger(exercise.rest_time) || exercise.rest_time < 0)) ||
            (exercise.intensity_technique !== null &&
              !INTENSITY_TECHNIQUES.includes(exercise.intensity_technique))
          ) {
            throw new Error(
              `El ejercicio ${exerciseIndex + 1} del bloque "${day.day_name}" contiene datos no válidos.`,
            )
          }

          return {
            exercise_id: exercise.exercise_id,
            sets: exercise.sets,
            reps_target: exercise.reps_target.trim(),
            rir_target: exercise.rir_target,
            rest_time: exercise.rest_time ?? null,
            intensity_technique: exercise.intensity_technique,
            order: exerciseIndex,
          }
        }),
      }
    })

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }
    if (!user) {
      throw new Error('Debes iniciar sesión para guardar una rutina.')
    }

    const routineName = `Rutina · ${blocks.map((block) => block.day_name).join(' / ')}`
    const { data: routineId, error } = await supabase.rpc('save_complete_routine', {
      p_routine: {
        trainer_id: user.id,
        name: routineName,
        active: true,
        blocks,
      },
    })

    if (error) {
      throw new Error(`No se pudo guardar la rutina: ${error.message}`)
    }
    if (typeof routineId !== 'string' || !UUID_PATTERN.test(routineId)) {
      throw new Error('La base de datos no devolvió un identificador de rutina válido.')
    }

    revalidatePath('/')
    return routineId
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al guardar la rutina.'
    console.error('[saveCompleteRoutine]', message)
    throw new Error(message)
  }
}
