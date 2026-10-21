/** Nivel de experiencia del atleta en el roster del coach. */
export type ExperienceLevel = 'Principiante' | 'Intermedio' | 'Avanzado'

/** Iconos semánticos disponibles para tareas de agenda. */
export type TaskIcon = 'video' | 'phone' | 'calendar' | 'dumbbell'

/**
 * Entrenador / coach propietario del studio H-Flow.
 */
export interface Trainer {
  id: string
  email: string
  fullName: string
  role: 'coach'
  avatarUrl?: string | null
  studioName?: string | null
  createdAt?: string
}

/**
 * Atleta gestionado por un Trainer.
 */
export interface Athlete {
  id: string
  email: string
  fullName: string
  role: 'athlete'
  experienceLevel: ExperienceLevel
  trainerId: string
  avatarUrl?: string | null
  createdAt?: string
}

/**
 * Tarea / ítem de agenda del coach (día operativo).
 */
export interface Task {
  id: string
  title: string
  /** Hora legible para UI, ej. "10:30 AM" */
  time: string
  completed: boolean
  icon: TaskIcon
  /** Atleta relacionado, si aplica */
  athleteId?: string | null
  /** Trainer dueño de la tarea */
  trainerId?: string | null
  /** ISO date de la agenda (YYYY-MM-DD) */
  scheduledDate?: string
}

/** Fila de perfil usada en las vistas del coach. */
export interface ProfileRecord {
  id: string
  email: string | null
  full_name: string | null
  role: string
  trainer_id: string | null
  experience_level?: ExperienceLevel | null
}

/** Ejercicio del catálogo legado usado por las vistas de rutinas. */
export interface ExerciseRecord {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
  difficulty: string | null
  video_url: string | null
}

export interface WorkoutExerciseRecord {
  id: string
  sets: number
  reps: string | number
  rir: number | null
  tempo: string | null
  exercises: Pick<ExerciseRecord, 'id' | 'name' | 'equipment' | 'muscle_group'> | null
}

/** Rutina del esquema de entrenamientos anterior. */
export interface WorkoutRecord {
  id: string
  title: string
  description: string | null
  coach_id: string
  workout_exercises: WorkoutExerciseRecord[]
}

export interface AssignedWorkoutRecord {
  id: string
  workout_id: string
  athlete_id: string
  scheduled_date: string
  completed: boolean
  workouts: Pick<WorkoutRecord, 'title'> | null
  profiles: Pick<ProfileRecord, 'full_name' | 'email'> | null
}
