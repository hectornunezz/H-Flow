'use server'

import { createClient } from '@/utils/supabase/server'

type AthleteExportRow = {
  full_name: string | null
  email: string | null
  experience_level: string | null
  status: string | null
  created_at: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function escapeCsvCell(value: string): string {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safeValue.replace(/"/g, '""')}"`
}

export async function exportAthletesToCSV(coachId: string): Promise<string> {
  try {
    if (!UUID_PATTERN.test(coachId)) {
      throw new Error('El identificador del entrenador no es válido.')
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
      throw new Error('No estás autorizado para exportar estos atletas.')
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
      throw new Error('Solo un entrenador puede exportar la lista de atletas.')
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, experience_level, status, created_at')
      .eq('trainer_id', user.id)
      .eq('role', 'athlete')
      .order('full_name', { ascending: true })

    if (error) {
      throw new Error(`No se pudieron cargar los atletas: ${error.message}`)
    }

    const athletes = (data ?? []) as AthleteExportRow[]
    const header = ['Nombre', 'Email', 'Nivel', 'Estado']
    const rows = athletes.map((athlete) => [
      athlete.full_name?.trim() || 'Sin nombre',
      athlete.email?.trim() || '',
      athlete.experience_level?.trim() || 'Sin especificar',
      athlete.status?.trim() || 'Activo',
    ])

    return `\uFEFF${[header, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(';'))
      .join('\r\n')}`
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al exportar los atletas.'
    console.error('[exportAthletesToCSV]', message)
    throw new Error(message)
  }
}
