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
