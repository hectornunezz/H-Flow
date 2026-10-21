'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

interface ComplianceAthlete {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

interface AthleteReportDate {
  athlete_id: string
  date: string
}

export async function checkAthleteCompliance(): Promise<number> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }
    if (!user) {
      throw new Error('Debes iniciar sesión para revisar el cumplimiento.')
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
      throw new Error('Solo un entrenador puede revisar el cumplimiento de atletas.')
    }

    const { data: athletesData, error: athletesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('trainer_id', user.id)
      .eq('role', 'athlete')

    if (athletesError) {
      throw new Error(`No se pudieron cargar los atletas: ${athletesError.message}`)
    }

    const athletes = (athletesData ?? []) as ComplianceAthlete[]
    if (athletes.length === 0) return 0

    const athleteIds = athletes.map(athlete => athlete.id)
    const { data: reportsData, error: reportsError } = await supabase
      .from('athlete_metrics')
      .select('athlete_id, date')
      .in('athlete_id', athleteIds)
      .order('date', { ascending: false })

    if (reportsError) {
      throw new Error(`No se pudieron cargar los reportes: ${reportsError.message}`)
    }

    const latestReportByAthlete = new Map<string, string>()
    for (const report of (reportsData ?? []) as AthleteReportDate[]) {
      if (!latestReportByAthlete.has(report.athlete_id)) {
        latestReportByAthlete.set(report.athlete_id, report.date)
      }
    }

    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const overdueAthletes = athletes.flatMap(athlete => {
      const lastReportDate = latestReportByAthlete.get(athlete.id) ?? athlete.created_at.slice(0, 10)
      const parsedDate = Date.parse(`${lastReportDate}T00:00:00.000Z`)

      if (!Number.isFinite(parsedDate)) {
        throw new Error(`Fecha de reporte no válida para el atleta ${athlete.id}.`)
      }

      const daysWithoutReport = Math.floor((todayUtc - parsedDate) / 86_400_000)
      if (daysWithoutReport <= 5) return []

      const athleteName = athlete.full_name?.trim() || athlete.email || 'Atleta'
      return [{
        id: `compliance-${athlete.id}-${today}`,
        title: `🚨 ALTA PRIORIDAD · ALERTA DE ABANDONO: ${athleteName} lleva ${daysWithoutReport} días sin reportar`,
        time: '09:00',
        completed: false,
        status: 'pending',
        icon: 'phone',
        athlete_id: athlete.id,
        trainer_id: user.id,
        scheduled_date: today,
      }]
    })

    if (overdueAthletes.length === 0) return 0

    const { data: createdTasks, error: tasksError } = await supabase
      .from('tasks')
      .upsert(overdueAthletes, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')

    if (tasksError) {
      throw new Error(`No se pudieron crear las alertas: ${tasksError.message}`)
    }

    const createdCount = createdTasks?.length ?? 0
    if (createdCount > 0) revalidatePath('/')
    return createdCount
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al revisar el cumplimiento.'
    console.error('[checkAthleteCompliance]', message)
    throw new Error(message)
  }
}
