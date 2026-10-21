import type { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'coach' | 'athlete'

export interface AuthenticatedUserRole {
  id: string
  role: UserRole
  isSubscribed: boolean
}

export async function getAuthenticatedUserRole(
  supabase: SupabaseClient,
): Promise<AuthenticatedUserRole | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(`No se pudo verificar la sesión: ${authError.message}`)
  }
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_subscribed')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`No se pudo verificar el rol: ${profileError.message}`)
  }

  if (profile?.role !== 'coach' && profile?.role !== 'athlete') return null
  return {
    id: user.id,
    role: profile.role,
    isSubscribed: profile.is_subscribed === true,
  }
}

export async function isCoach(supabase: SupabaseClient): Promise<boolean> {
  return (await getAuthenticatedUserRole(supabase))?.role === 'coach'
}

export async function isAthlete(supabase: SupabaseClient): Promise<boolean> {
  return (await getAuthenticatedUserRole(supabase))?.role === 'athlete'
}

export async function requireCoach(
  supabase: SupabaseClient,
): Promise<AuthenticatedUserRole> {
  const user = await getAuthenticatedUserRole(supabase)
  if (!user || user.role !== 'coach') {
    throw new Error('Solo un entrenador puede acceder a esta página.')
  }
  return user
}

export async function requireAthlete(
  supabase: SupabaseClient,
): Promise<AuthenticatedUserRole> {
  const user = await getAuthenticatedUserRole(supabase)
  if (!user || user.role !== 'athlete') {
    throw new Error('Solo un atleta puede acceder a esta página.')
  }
  return user
}
