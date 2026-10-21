'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { calculateCoachMetrics } from '@/utils/compliance-metrics'

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

export interface CoachMetrics {
  complianceRate: number
  totalAthletes: number
  pendingReviews: number
}

export async function getCoachMetrics(coachId: string): Promise<CoachMetrics> {
  try {
    if (!coachId.trim()) {
      throw new Error('El identificador del entrenador es obligatorio.')
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
    }
    if (!user || user.id !== coachId) {
      throw new Error('No estás autorizado para consultar estas métricas.')
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
      throw new Error('Solo un entrenador puede consultar estas métricas.')
    }

    const { data: athletesData, error: athletesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('trainer_id', coachId)
      .eq('role', 'athlete')

    if (athletesError) {
      throw new Error(`No se pudieron cargar los atletas: ${athletesError.message}`)
    }

    const athleteIds = (athletesData ?? []).map((athlete) => athlete.id)
    if (athleteIds.length === 0) return calculateCoachMetrics([], [])

    const now = new Date()
    const currentDay = now.getUTCDay()
    const daysSinceMonday = (currentDay + 6) % 7
    const weekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
    )
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

    const { data: reports, error: reportsError } = await supabase
      .from('athlete_metrics')
      .select('athlete_id')
      .in('athlete_id', athleteIds)
      .gte('date', weekStart.toISOString().slice(0, 10))
      .lt('date', weekEnd.toISOString().slice(0, 10))

    if (reportsError) {
      throw new Error(`No se pudieron cargar los reportes: ${reportsError.message}`)
    }

    return calculateCoachMetrics(
      athleteIds,
      (reports ?? []).map((report) => report.athlete_id),
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al consultar las métricas.'
    console.error('[getCoachMetrics]', message)
    throw new Error(message)
  }
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
