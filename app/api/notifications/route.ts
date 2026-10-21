import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_REQUEST_BYTES = 16_384
const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
]

type PushSubscriptionInput = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

type NotificationRequest =
  | { action: 'register'; subscription: PushSubscriptionInput }
  | { action: 'microcycle_published'; microcycleName: string }

type StoredSubscription = PushSubscriptionInput & {
  athlete_id: string
  p256dh: string
  auth: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false

  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      ALLOWED_PUSH_HOSTS.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
  } catch {
    return false
  }
}

function isPushSubscription(value: unknown): value is PushSubscriptionInput {
  if (!isRecord(value) || !isRecord(value.keys)) return false

  return (
    isAllowedPushEndpoint(value.endpoint) &&
    typeof value.keys.p256dh === 'string' &&
    value.keys.p256dh.length >= 20 &&
    value.keys.p256dh.length <= 256 &&
    typeof value.keys.auth === 'string' &&
    value.keys.auth.length >= 8 &&
    value.keys.auth.length <= 128
  )
}

function parseRequest(value: unknown): NotificationRequest | null {
  if (!isRecord(value) || typeof value.action !== 'string') return null

  if (value.action === 'register' && isPushSubscription(value.subscription)) {
    return { action: 'register', subscription: value.subscription }
  }

  if (
    value.action === 'microcycle_published' &&
    typeof value.microcycleName === 'string' &&
    value.microcycleName.trim().length > 0 &&
    value.microcycleName.trim().length <= 120
  ) {
    return { action: 'microcycle_published', microcycleName: value.microcycleName.trim() }
  }

  return null
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Las notificaciones push no están configuradas.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ publicKey })
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
  }

  let body: unknown
  try {
    const payload = await request.text()
    if (new TextEncoder().encode(payload).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 })
    }
    body = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'El cuerpo debe ser JSON válido.' }, { status: 400 })
  }

  const input = parseRequest(body)
  if (!input) {
    return NextResponse.json({ error: 'La solicitud de notificación no es válida.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[notifications] No se pudo verificar la sesión:', authError.message)
      return NextResponse.json({ error: 'No se pudo verificar la sesión.' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error(`No se pudo verificar el perfil: ${profileError.message}`)
    }
    if (!profile) {
      return NextResponse.json({ error: 'No se encontró el perfil.' }, { status: 403 })
    }

    if (input.action === 'register') {
      if (profile.role !== 'athlete') {
        return NextResponse.json(
          { error: 'Solo los atletas pueden registrar dispositivos.' },
          { status: 403 },
        )
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          athlete_id: user.id,
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      )

      if (error) {
        throw new Error(`No se pudo registrar el dispositivo: ${error.message}`)
      }

      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (profile.role !== 'coach') {
      return NextResponse.json(
        { error: 'Solo el entrenador puede publicar microciclos.' },
        { status: 403 },
      )
    }

    const { data: athletes, error: athletesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('trainer_id', user.id)
      .eq('role', 'athlete')

    if (athletesError) {
      throw new Error(`No se pudieron cargar los atletas: ${athletesError.message}`)
    }

    const athleteIds = (athletes ?? []).map((athlete) => athlete.id)
    if (athleteIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, expired: 0 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('athlete_id, endpoint, p256dh, auth')
      .in('athlete_id', athleteIds)

    if (subscriptionsError) {
      throw new Error(`No se pudieron cargar los dispositivos: ${subscriptionsError.message}`)
    }
    if (!subscriptions?.length) {
      return NextResponse.json({ ok: true, sent: 0, expired: 0 })
    }

    webpush.setVapidDetails(
      getRequiredEnv('VAPID_SUBJECT'),
      getRequiredEnv('VAPID_PUBLIC_KEY'),
      getRequiredEnv('VAPID_PRIVATE_KEY'),
    )

    const payload = JSON.stringify({
      title: 'Nuevo microciclo disponible',
      body: `Tu entrenador ha publicado el microciclo "${input.microcycleName}".`,
      url: '/client-portal',
      tag: `microcycle-${user.id}-${input.microcycleName}`,
    })

    const results = await Promise.allSettled(
      (subscriptions as StoredSubscription[]).map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
            { TTL: 60 * 60 * 24 },
          )
          return { athleteId: subscription.athlete_id, expired: false }
        } catch (error) {
          const statusCode =
            typeof error === 'object' && error !== null && 'statusCode' in error
              ? error.statusCode
              : undefined

          if (statusCode === 404 || statusCode === 410) {
            const { error: deleteError } = await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint)

            if (deleteError) {
              throw new Error(`No se pudo eliminar una suscripción caducada: ${deleteError.message}`)
            }
            return { athleteId: subscription.athlete_id, expired: true }
          }

          throw error
        }
      }),
    )

    const failedCount = results.filter((result) => result.status === 'rejected').length
    const sentCount = results.filter(
      (result) => result.status === 'fulfilled' && !result.value.expired,
    ).length
    const expiredCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value.expired,
    ).length

    if (failedCount > 0) {
      console.error(`[notifications] Fallaron ${failedCount} envíos push.`)
    }

    return NextResponse.json({
      ok: failedCount === 0,
      sent: sentCount,
      expired: expiredCount,
      failed: failedCount,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al procesar notificaciones.'
    console.error('[notifications]', message)
    return NextResponse.json(
      { error: 'No se pudieron procesar las notificaciones.' },
      { status: 500 },
    )
  }
}
