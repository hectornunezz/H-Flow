'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`)
  return value
}

function getAppUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  const vercelUrl = process.env.VERCEL_URL
  const value = configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : null)

  if (!value) {
    throw new Error('Falta configurar NEXT_PUBLIC_APP_URL para generar el enlace.')
  }

  const url = new URL(value)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('La URL de la aplicación debe usar HTTPS.')
  }
  return url
}

export async function generateAthleteMagicLink(athleteId: string): Promise<string> {
  try {
    if (!UUID_PATTERN.test(athleteId)) {
      throw new Error('El identificador del atleta no es válido.')
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
      throw new Error('Debes iniciar sesión para generar un enlace de acceso.')
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
      throw new Error('Solo un entrenador puede generar enlaces de acceso para atletas.')
    }

    const { data: athlete, error: athleteError } = await supabase
      .from('profiles')
      .select('id, email, role, trainer_id')
      .eq('id', athleteId)
      .maybeSingle()

    if (athleteError) {
      throw new Error(`No se pudo verificar el atleta: ${athleteError.message}`)
    }
    if (
      !athlete ||
      athlete.role !== 'athlete' ||
      athlete.trainer_id !== user.id ||
      typeof athlete.email !== 'string' ||
      !athlete.email.trim()
    ) {
      throw new Error('El atleta no existe, no pertenece a este entrenador o no tiene correo.')
    }

    const admin = createSupabaseAdmin(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const redirectTo = new URL('/client-portal', getAppUrl()).toString()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: athlete.email.trim(),
      options: { redirectTo },
    })

    if (error) {
      throw new Error(`No se pudo generar el enlace de acceso: ${error.message}`)
    }

    const actionLink = data.properties?.action_link
    if (!actionLink) {
      throw new Error('Supabase no devolvió un enlace de acceso.')
    }

    return actionLink
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al generar el enlace.'
    console.error('[generateAthleteMagicLink]', message)
    throw new Error(message)
  }
}
