import { createClient } from '@/utils/supabase/server'
import { Activity, CheckCircle2, Clock3, Dumbbell, Flame } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ClientCheckInLauncher } from '@/components/client/ClientCheckInModal'

type WorkoutExercise = {
  id: string
  sets: number
  reps: number | string
  rir: number | null
  exercises: {
    name: string
    muscle_group: string | null
    equipment: string | null
  } | Array<{
    name: string
    muscle_group: string | null
    equipment: string | null
  }> | null
}

type AssignedWorkout = {
  id: string
  scheduled_date: string
  completed: boolean
  workouts: {
    title: string
    description: string | null
    workout_exercises: WorkoutExercise[] | null
  } | Array<{
    title: string
    description: string | null
    workout_exercises: WorkoutExercise[] | null
  }> | null
}

export default async function ClientPortal() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw new Error(`No se pudo cargar el perfil: ${profileError.message}`)
  if (!profile || profile.role !== 'athlete') redirect('/')

  const today = new Date().toISOString().slice(0, 10)
  const { data: assignedData, error: assignedError } = await supabase
    .from('assigned_workouts')
    .select(
      'id, scheduled_date, completed, workouts(title, description, workout_exercises(id, sets, reps, rir, exercises(name, muscle_group, equipment)))',
    )
    .eq('athlete_id', user.id)
    .eq('scheduled_date', today)
    .order('scheduled_date', { ascending: true })

  if (assignedError) {
    throw new Error(`No se pudo cargar la rutina del día: ${assignedError.message}`)
  }

  const assignments = (assignedData ?? []) as AssignedWorkout[]
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'Atleta'
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${today}T12:00:00.000Z`))

  return (
    <main className="min-h-dvh bg-slate-950 px-4 pb-12 pt-5 text-white sm:px-6 sm:pt-8">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FF5A00]/25 bg-[#FF5A00]/10 text-[#FF5A00]">
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
                H-Flow
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Portal de atleta</p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-slate-200">
            {firstName.slice(0, 1).toLocaleUpperCase('es')}
          </div>
        </header>

        <section className="mb-6">
          <p className="text-sm font-medium capitalize text-slate-400">{formattedDate}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Hola, <span className="text-[#FF5A00]">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Aquí tienes tu entrenamiento y seguimiento de hoy.
          </p>
        </section>

        <section className="mb-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#FF5A00]/15 via-slate-900/90 to-slate-900/90 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Flame className="h-4 w-4 text-[#FF5A00]" aria-hidden="true" />
              Entrenamiento de hoy
            </div>
            <span className="rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF8A4C]">
              {assignments.length ? `${assignments.length} sesión${assignments.length === 1 ? '' : 'es'}` : 'Plan diario'}
            </span>
          </div>

          {assignments.length > 0 ? (
            <div className="divide-y divide-white/10">
              {assignments.map((assignment) => {
                const workout = Array.isArray(assignment.workouts)
                  ? assignment.workouts[0]
                  : assignment.workouts
                const exercises = workout?.workout_exercises ?? []
                return (
                  <article key={assignment.id} className="px-5 py-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-extrabold leading-tight">
                          {workout?.title || 'Rutina asignada'}
                        </h2>
                        {workout?.description && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {workout.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          assignment.completed
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {assignment.completed ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                        )}
                        {assignment.completed ? 'Completada' : 'Pendiente'}
                      </span>
                    </div>

                    {exercises.length > 0 ? (
                      <ul className="space-y-2">
                        {exercises.map((exercise, index) => {
                          const details = Array.isArray(exercise.exercises)
                            ? exercise.exercises[0]
                            : exercise.exercises

                          return (
                            <li
                              key={exercise.id}
                              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-950/60 px-3.5 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-400">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-100">
                                    {details?.name || 'Ejercicio'}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                    {details?.muscle_group || details?.equipment || 'Entrenamiento'}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-lg border border-[#FF5A00]/15 bg-[#FF5A00]/10 px-2.5 py-1.5 font-mono text-xs font-bold text-[#FF8A4C]">
                                {exercise.sets} × {exercise.reps}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-5 text-center text-sm text-slate-400">
                        Tu coach todavía no ha añadido ejercicios a esta rutina.
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-bold">Día de recuperación</h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-400">
                No tienes una rutina asignada para hoy. Aprovecha para descansar o consultar con tu coach.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF5A00]">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold">Check-in diario</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Registra tu peso para que tu coach pueda seguir tu progreso.
              </p>
            </div>
          </div>

          <ClientCheckInLauncher />
        </section>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          Tu progreso se comparte únicamente con tu coach.
        </p>
      </div>
    </main>
  )
}
