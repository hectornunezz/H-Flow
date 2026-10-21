'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

function readRequiredText(formData: FormData, key: string, label: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} es obligatorio.`)
  }

  return value.trim()
}

export async function updateCoachProfile(formData: FormData): Promise<void> {
  try {
    const fullName = readRequiredText(formData, 'full_name', 'El nombre')
    const email = readRequiredText(formData, 'email', 'El correo')

    if (fullName.length > 120) {
      throw new Error('El nombre no puede superar los 120 caracteres.')
    }
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new Error('El correo no es válido.')
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
      throw new Error('Debes iniciar sesión para actualizar tu perfil.')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error(`No se pudo verificar el perfil: ${profileError.message}`)
    }
    if (!profile || profile.role !== 'coach') {
      throw new Error('Solo el entrenador autenticado puede actualizar este perfil.')
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, email })
      .eq('id', user.id)
      .select('id')
      .maybeSingle()

    if (updateError) {
      throw new Error(`No se pudo actualizar el perfil: ${updateError.message}`)
    }
    if (!updatedProfile) {
      throw new Error('No se actualizó ningún perfil. Comprueba los permisos de la base de datos.')
    }

    revalidatePath('/')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al actualizar el perfil.'
    console.error('[updateCoachProfile]', message)
    throw new Error(message)
  }
}
