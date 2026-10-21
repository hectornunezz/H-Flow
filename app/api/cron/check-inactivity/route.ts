import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INACTIVITY_DAYS = 4
const DAY_MS = 86_400_000
const PAGE_SIZE = 1000
const ID_BATCH_SIZE = 200

type Athlete = {
  id: string
  trainer_id: string | null
  full_name: string | null
  email: string | null
  created_at: string
}

type MetricDate = {
  athlete_id: string
  date: string
}

type WorkoutReportDate = {
  athlete_id: string
  scheduled_date: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (!secret || !authorization?.startsWith('Bearer ')) return false

  const providedSecret = Buffer.from(authorization.slice('Bearer '.length))
  const expectedSecret = Buffer.from(secret)
  return (
    providedSecret.length === expectedSecret.length &&
    timingSafeEqual(providedSecret, expectedSecret)
  )
}

function dateFromDaysAgo(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const athletes: Athlete[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, trainer_id, full_name, email, created_at')
        .eq('role', 'athlete')
        .not('trainer_id', 'is', null)
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        throw new Error(`No se pudieron cargar los atletas: ${error.message}`)
      }
      athletes.push(...((data ?? []) as Athlete[]))
      if (!data || data.length < PAGE_SIZE) break
    }

    const athleteIds = athletes.map((athlete) => athlete.id)
    if (athleteIds.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, notificationsCreated: 0 })
    }

    const thresholdDate = dateFromDaysAgo(INACTIVITY_DAYS)
    const today = new Date().toISOString().slice(0, 10)
    const latestActivityByAthlete = new Map<string, number>()
    for (let start = 0; start < athleteIds.length; start += ID_BATCH_SIZE) {
      const batch = athleteIds.slice(start, start + ID_BATCH_SIZE)
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('athlete_metrics')
          .select('athlete_id, date')
          .in('athlete_id', batch)
          .order('date', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) {
          throw new Error(`No se pudieron cargar los check-ins: ${error.message}`)
        }
        for (const row of (data ?? []) as MetricDate[]) {
          const date = Date.parse(`${row.date}T00:00:00.000Z`)
          if (Number.isFinite(date)) {
            latestActivityByAthlete.set(
              row.athlete_id,
              Math.max(latestActivityByAthlete.get(row.athlete_id) ?? 0, date),
            )
          }
        }
        if (!data || data.length < PAGE_SIZE) break
      }

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('tasks')
          .select('athlete_id, scheduled_date')
          .in('athlete_id', batch)
          .eq('completed', true)
          .not('scheduled_date', 'is', null)
          .order('scheduled_date', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) {
          throw new Error(
            `No se pudieron cargar los reportes de entrenamiento: ${error.message}`,
          )
        }
        for (const row of (data ?? []) as WorkoutReportDate[]) {
          const date = Date.parse(`${row.scheduled_date}T00:00:00.000Z`)
          if (Number.isFinite(date)) {
            latestActivityByAthlete.set(
              row.athlete_id,
              Math.max(latestActivityByAthlete.get(row.athlete_id) ?? 0, date),
            )
          }
        }
        if (!data || data.length < PAGE_SIZE) break
      }
    }

    const cutoff = Date.parse(`${thresholdDate}T00:00:00.000Z`)
    const inactiveAthletes = athletes.filter((athlete) => {
      const createdAt = Date.parse(athlete.created_at)
      const lastActivity =
        latestActivityByAthlete.get(athlete.id) ??
        (Number.isFinite(createdAt) ? createdAt : 0)
      return lastActivity < cutoff
    })

    if (inactiveAthletes.length === 0) {
      return NextResponse.json({ ok: true, checked: athletes.length, notificationsCreated: 0 })
    }

    const tasks = inactiveAthletes.map((athlete) => {
      const lastActivity = latestActivityByAthlete.get(athlete.id) ?? Date.parse(athlete.created_at)
      const daysInactive = Math.floor((Date.now() - lastActivity) / DAY_MS)
      const athleteName = athlete.full_name?.trim() || athlete.email || 'Atleta'

      return {
        id: `inactivity-${athlete.id}-${today}`,
        title: `Seguimiento: ${athleteName} lleva ${daysInactive} días sin check-in ni reportar entrenamientos`,
        time: '09:00',
        completed: false,
        status: 'pending',
        icon: 'phone',
        athlete_id: athlete.id,
        trainer_id: athlete.trainer_id,
        scheduled_date: today,
      }
    })

    const { data: createdTasks, error: insertError } = await supabase
      .from('tasks')
      .upsert(tasks, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')

    if (insertError) {
      throw new Error(`No se pudieron crear las notificaciones: ${insertError.message}`)
    }

    return NextResponse.json({
      ok: true,
      checked: athletes.length,
      inactive: inactiveAthletes.length,
      notificationsCreated: createdTasks?.length ?? 0,
    })
  } catch (error) {
    console.error(
      '[cron/check-inactivity]',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json(
      { error: 'No se pudo completar la revisión de inactividad.' },
      { status: 500 },
    )
  }
}
