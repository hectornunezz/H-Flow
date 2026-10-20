import { supabase } from '@/lib/supabase'
import type {
  ExerciseBank,
  ExerciseBankInsert,
  CreateRoutineInput,
  RoutineWithBlocks,
  RoutineBlockWithExercises,
} from '@/types/workout'

// ─── getExerciseBank ──────────────────────────────────────────────────────────

/**
 * Devuelve todos los ejercicios del banco privado de un entrenador,
 * ordenados por categoría y nombre para facilitar la UI del selector.
 */
export async function getExerciseBank(trainerId: string): Promise<ExerciseBank[]> {
  const { data, error } = await supabase
    .from('exercise_bank')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('category', { ascending: true })
    .order('name',     { ascending: true })

  if (error) {
    throw new Error(`[getExerciseBank] ${error.message}`)
  }

  return (data ?? []) as ExerciseBank[]
}

// ─── addExerciseToBank ────────────────────────────────────────────────────────

/**
 * Inserta un nuevo ejercicio en el banco privado del entrenador.
 * Devuelve el registro completo con el UUID generado por Supabase.
 */
export async function addExerciseToBank(
  exercise: ExerciseBankInsert
): Promise<ExerciseBank> {
  const { data, error } = await supabase
    .from('exercise_bank')
    .insert(exercise)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`[addExerciseToBank] ${error?.message ?? 'Sin respuesta de Supabase'}`)
  }

  return data as ExerciseBank
}

// ─── createRoutineWithExercises ───────────────────────────────────────────────

/**
 * Crea una rutina completa en Supabase de forma secuencial y anidada:
 *   1. INSERT en `routines`          → obtiene el routine.id
 *   2. Para cada bloque:
 *      INSERT en `routine_blocks`    → obtiene el block.id
 *      INSERT en `routine_exercises` (bulk) con join de exercise_bank
 *
 * Decisión técnica: Supabase no expone transacciones SQL desde el cliente JS,
 * por lo que usamos inserciones secuenciales. Si algún paso falla lanzamos
 * el error inmediatamente; el rollback manual queda pendiente para cuando
 * expongamos esta lógica como una Postgres Function (RPC) en la siguiente
 * iteración del backend.
 *
 * @returns RoutineWithBlocks — la rutina completa con bloques y ejercicios anidados.
 */
export async function createRoutineWithExercises(
  input: CreateRoutineInput
): Promise<RoutineWithBlocks> {

  // ── 1. Crear la rutina ────────────────────────────────────────────────────
  const { data: routine, error: routineErr } = await supabase
    .from('routines')
    .insert({
      trainer_id: input.trainer_id,
      athlete_id: input.athlete_id ?? null,
      name:       input.name,
      active:     input.active ?? true,
    })
    .select()
    .single()

  if (routineErr || !routine) {
    throw new Error(`[createRoutineWithExercises] Rutina: ${routineErr?.message ?? 'sin datos'}`)
  }

  // ── 2. Crear bloques + ejercicios ─────────────────────────────────────────
  const populatedBlocks: RoutineBlockWithExercises[] = []

  for (const blockInput of input.blocks) {

    // 2a. Insertar bloque
    const { data: block, error: blockErr } = await supabase
      .from('routine_blocks')
      .insert({
        routine_id: routine.id,
        day_name:   blockInput.day_name,
        order:      blockInput.order,
      })
      .select()
      .single()

    if (blockErr || !block) {
      throw new Error(
        `[createRoutineWithExercises] Bloque "${blockInput.day_name}": ${blockErr?.message ?? 'sin datos'}`
      )
    }

    // 2b. Insertar ejercicios del bloque (bulk insert)
    const exerciseRows = blockInput.exercises.map((ex) => ({
      block_id:            block.id,
      exercise_id:         ex.exercise_id,
      sets:                ex.sets,
      reps_target:         ex.reps_target,
      rir_target:          ex.rir_target          ?? null,
      rest_time:           ex.rest_time           ?? null,
      intensity_technique: ex.intensity_technique ?? null,
      order:               ex.order,
    }))

    const { data: exercises, error: exErr } = await supabase
      .from('routine_exercises')
      .insert(exerciseRows)
      .select(`
        *,
        exercise:exercise_bank(*)
      `)

    if (exErr) {
      throw new Error(
        `[createRoutineWithExercises] Ejercicios del bloque "${blockInput.day_name}": ${exErr.message}`
      )
    }

    populatedBlocks.push({
      ...block,
      exercises: (exercises ?? []) as RoutineBlockWithExercises['exercises'],
    })
  }

  return {
    ...routine,
    blocks: populatedBlocks,
  } as RoutineWithBlocks
}

// ─── getRoutineWithBlocks ─────────────────────────────────────────────────────

/**
 * Obtiene una rutina completa con todos sus bloques y ejercicios anidados.
 * Útil para el constructor visual y la vista de detalle de rutina.
 */
export async function getRoutineWithBlocks(routineId: string): Promise<RoutineWithBlocks> {
  const { data, error } = await supabase
    .from('routines')
    .select(`
      *,
      blocks:routine_blocks (
        *,
        exercises:routine_exercises (
          *,
          exercise:exercise_bank(*)
        )
      )
    `)
    .eq('id', routineId)
    .order('order', { referencedTable: 'routine_blocks',    ascending: true })
    .order('order', { referencedTable: 'routine_exercises', ascending: true })
    .single()

  if (error || !data) {
    throw new Error(`[getRoutineWithBlocks] ${error?.message ?? 'Rutina no encontrada'}`)
  }

  return data as unknown as RoutineWithBlocks
}

// ─── getTrainerRoutines ───────────────────────────────────────────────────────

/**
 * Lista todas las rutinas activas de un entrenador (sin bloques anidados).
 * Para el listado del constructor modular.
 */
export async function getTrainerRoutines(
  trainerId:  string,
  activeOnly  = true
) {
  let query = supabase
    .from('routines')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`[getTrainerRoutines] ${error.message}`)
  }

  return data ?? []
}
