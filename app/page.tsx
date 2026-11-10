import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { AssignedWorkoutRecord, ProfileRecord } from '@/types'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  await supabase.from('profiles').upsert(
    [{ id: user.id, email: user.email, full_name: user.email?.split('@')[0] || 'Coach', role: 'coach' }],
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

  const safeProfiles = profiles || []
  const safeAssignedWorkouts = assignedWorkouts || []
  const safeWorkouts = workouts || []
  const safeExercises = exercises || []

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || 'Coach',
      }}
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
