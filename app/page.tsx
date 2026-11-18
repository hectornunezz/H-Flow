import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AppShell from '@/components/AppShell'
import type { AssignedWorkoutRecord, ProfileRecord } from '@/types'

export default async function Home() {
  const cookieStore = await cookies()
  const localSessionRaw = cookieStore.get('hflow_session')?.value

  let currentUser: { id: string; email: string; name: string } | null = null
  let safeProfiles: ProfileRecord[] = []
  let safeAssignedWorkouts: AssignedWorkoutRecord[] = []
  let safeWorkouts: any[] = []
  let safeExercises: any[] = []

  // 1. Comprobamos si ya verificó el código de 6 dígitos (sesión resiliente)
  if (localSessionRaw) {
    try {
      const parsed = JSON.parse(localSessionRaw)
      currentUser = {
        id: 'local-coach-id',
        email: parsed.email || 'coach@hflow.es',
        name: parsed.name || 'Coach H-Flow',
      }
    } catch {
      // Cookie malformada
    }
  }

  // 2. Intentamos cargar usuario y datos de Supabase sin romper si falla la red
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        currentUser = {
          id: user.id,
          email: user.email || 'coach@hflow.es',
          name: user.email?.split('@')[0] || 'Coach',
        }

        await supabase.from('profiles').upsert(
          [{ id: user.id, email: user.email, full_name: currentUser.name, role: 'coach' }],
          { onConflict: 'id' }
        )

        const [
          { data: profiles },
          { data: assignedWorkouts },
          { data: workouts },
          { data: exercises },
        ] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('assigned_workouts').select('*, workouts(title), profiles(full_name, email)').order('scheduled_date', { ascending: true }),
          supabase.from('workouts').select('*, workout_exercises(id, sets, reps, rir, tempo, exercises(id, name, muscle_group, equipment))').eq('coach_id', user.id),
          supabase.from('exercises').select('*'),
        ])

        safeProfiles = (profiles as ProfileRecord[]) || []
        safeAssignedWorkouts = (assignedWorkouts as AssignedWorkoutRecord[]) || []
        safeWorkouts = workouts || []
        safeExercises = exercises || []
      }
    }
  } catch (err) {
    console.warn('[H-Flow Home] Cargando dashboard en modo local resiliente:', err)
  }

  // Si no hay sesión ni en cookie ni en Supabase, enviamos a login
  if (!currentUser) {
    redirect('/login')
  }

  return (
    <AppShell
      user={currentUser}
      athleteCount={safeProfiles.filter((profile: ProfileRecord) => profile.role === 'athlete').length}
      pendingCount={safeAssignedWorkouts.filter((workout: AssignedWorkoutRecord) => !workout.completed).length}
      workoutCount={safeWorkouts.length}
      exerciseCount={safeExercises.length}
      profiles={safeProfiles}
      workouts={safeWorkouts}
      exercises={safeExercises}
      assignedWorkouts={safeAssignedWorkouts}
    />
  )
}