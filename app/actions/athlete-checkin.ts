'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

type AthleteCheckIn = {
  weightKg: number
  sleepHours: number
  stressLevel: number
  fatigueLevel: number
}

export async function registerAthleteCheckIn(input: AthleteCheckIn): Promise<void> {
  if (
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 20 ||
    input.weightKg > 500 ||
    !Number.isFinite(input.sleepHours) ||
    input.sleepHours < 0 ||
    input.sleepHours > 24 ||
    !Number.isInteger(input.stressLevel) ||
    input.stressLevel < 1 ||
    input.stressLevel > 5 ||
    !Number.isInteger(input.fatigueLevel) ||
    input.fatigueLevel < 1 ||
    input.fatigueLevel > 5
  ) {
    throw new Error('Los datos del check-in no son válidos.')
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
    throw new Error('Debes iniciar sesión para enviar tu check-in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`No se pudo verificar el perfil: ${profileError.message}`)
  }
  if (!profile || profile.role !== 'athlete') {
    throw new Error('Solo un atleta puede registrar un check-in.')
  }

  const { error: insertError } = await supabase.from('athlete_metrics').insert({
    athlete_id: user.id,
    date: new Date().toISOString().slice(0, 10),
    weight: input.weightKg,
    sleep_hours: input.sleepHours,
    stress_level: input.stressLevel,
    fatigue_level: input.fatigueLevel,
  })

  if (insertError) {
    throw new Error(`No se pudo guardar el check-in: ${insertError.message}`)
  }

  revalidatePath('/client-portal')
}
