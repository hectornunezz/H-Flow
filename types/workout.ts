/**
 * types/workout.ts
 *
 * Interfaces estrictas para el Banco de Ejercicios y el Constructor
 * Modular de Rutinas de H-Flow.
 *
 * Nomenclatura: snake_case en los campos que mapean 1:1 con columnas
 * de Supabase para evitar transformaciones en los helpers.
 */

// ─── Enums / Unions ───────────────────────────────────────────────────────────

export type ExerciseCategory =
  | 'Pecho'
  | 'Espalda'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Isquiotibiales'
  | 'Glúteos'
  | 'Pantorrillas'
  | 'Core'
  | 'Cardio'
  | 'Cuerpo Completo'

export type EquipmentType =
  | 'Barra'
  | 'Mancuernas'
  | 'Máquina'
  | 'Polea'
  | 'Peso Corporal'
  | 'Bandas'
  | 'TRX'
  | 'Otro'

export type IntensityTechnique =
  | 'Drop Set'
  | 'Rest-Pause'
  | 'Myo-Reps'
  | 'Giant Set'
  | 'Super Set'
  | 'Cluster Set'
  | 'Tempo'
  | 'Pausa en Estiramiento'

// ─── Tablas base (rows de Supabase) ──────────────────────────────────────────

/** Ejercicio en la biblioteca privada del entrenador. */
export interface ExerciseBank {
  id:                  string           // UUID
  trainer_id:          string
  name:                string
  category:            ExerciseCategory
  equipment:           EquipmentType | null
  biomechanics_notes:  string | null
  video_url:           string | null
  created_at:          string           // ISO timestamp
}

/** Rutina asignada (o plantilla libre) de un trainer. */
export interface Routine {
  id:          string
  trainer_id:  string
  athlete_id:  string | null
  name:        string
  active:      boolean
  created_at:  string
}

/** Bloque de un día dentro de una rutina (ej. "Empuje A"). */
export interface RoutineBlock {
  id:          string
  routine_id:  string
  day_name:    string
  order:       number
  created_at:  string
}

/** Ejercicio concreto dentro de un bloque, con prescripción completa. */
export interface RoutineExercise {
  id:                  string
  block_id:            string
  exercise_id:         string
  sets:                number
  reps_target:         string            // "8-12", "6", "AMRAP"…
  rir_target:          number | null     // Reps In Reserve
  rest_time:           number | null     // segundos
  intensity_technique: IntensityTechnique | null
  order:               number
  created_at:          string
}

// ─── Tipos de entrada (sin id / created_at — los genera Supabase) ─────────────

export type ExerciseBankInsert = Omit<ExerciseBank, 'id' | 'created_at'>

export interface RoutineExerciseInput {
  exercise_id:          string
  sets:                 number
  reps_target:          string
  rir_target?:          number | null
  rest_time?:           number | null
  intensity_technique?: IntensityTechnique | null
  order:                number
}

export interface RoutineBlockInput {
  day_name:   string
  order:      number
  exercises:  RoutineExerciseInput[]
}

export interface CreateRoutineInput {
  trainer_id:  string
  athlete_id?: string | null
  name:        string
  active?:     boolean
  blocks:      RoutineBlockInput[]
}

// ─── Tipos poblados / joins ───────────────────────────────────────────────────

/** RoutineExercise con el objeto ExerciseBank anidado (join). */
export interface RoutineExerciseWithDetails extends RoutineExercise {
  exercise: ExerciseBank
}

/** RoutineBlock con sus ejercicios completos. */
export interface RoutineBlockWithExercises extends RoutineBlock {
  exercises: RoutineExerciseWithDetails[]
}

/** Rutina completa con todos sus bloques y ejercicios anidados. */
export interface RoutineWithBlocks extends Routine {
  blocks: RoutineBlockWithExercises[]
}
