'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// 1. Añadir ejercicio con metadatos profesionales y vídeo del coach
export async function addExercise(formData: FormData) {
  const name = formData.get('name') as string
  const muscle_group = formData.get('muscle_group') as string
  const equipment = formData.get('equipment') as string
  const difficulty = formData.get('difficulty') as string
  const video_url = formData.get('video_url') as string
  
  if (!name) return

  const supabase = await createClient()
  const { error } = await supabase.from('exercises').insert([{ 
    name, 
    muscle_group, 
    equipment: equipment || 'Barra', 
    difficulty: difficulty || 'Intermedio',
    video_url: video_url || null
  }])

  if (error) {
    console.error('Error al guardar el ejercicio:', error.message)
    throw new Error(`Error al guardar el ejercicio: ${error.message}`)
  }

  revalidatePath('/')
}

export async function deleteExercise(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.from('exercises').delete().eq('id', id)
  revalidatePath('/')
}

export async function addWorkout(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  if (!title) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    throw new Error("No hay un usuario autenticado válido.")
  }

  // 1. Asegurar el perfil del coach
  const { error: profileError } = await supabase.from('profiles').upsert([
    {
      id: user.id,
      email: user.email,
      full_name: user.email.split('@')[0],
      role: 'coach'
    }
  ], { onConflict: 'id' })

  if (profileError) {
    throw new Error(`Error al crear perfil: ${profileError.message}`)
  }

  // 2. Insertar la rutina
  const { error: workoutError } = await supabase.from('workouts').insert([
    { title, description, coach_id: user.id }
  ])

  if (workoutError) {
    throw new Error(`Error al guardar rutina: ${workoutError.message}`)
  }

  revalidatePath('/')
}

export async function addExerciseToWorkout(formData: FormData) {
  const workout_id = formData.get('workout_id') as string
  const exercise_id = formData.get('exercise_id') as string
  const sets = parseInt(formData.get('sets') as string) || 3
  const reps = formData.get('reps') as string || '10'
  const rir = parseInt(formData.get('rir') as string) || 2
  const tempo = formData.get('tempo') as string || '3-1-1-0'

  if (!workout_id || !exercise_id) return

  const supabase = await createClient()
  await supabase.from('workout_exercises').insert([
    { workout_id, exercise_id, sets, reps, rir, tempo }
  ])
  revalidatePath('/')
}

export async function assignWorkout(formData: FormData) {
  const workout_id = formData.get('workout_id') as string
  const athlete_id = formData.get('athlete_id') as string
  const scheduled_date = formData.get('scheduled_date') as string

  if (!workout_id || !athlete_id || !scheduled_date) return

  const supabase = await createClient()

  const { error } = await supabase.from('assigned_workouts').insert([
    {
      workout_id,
      athlete_id,
      scheduled_date,
      completed: false
    }
  ])

  if (error) {
    console.error('Error al asignar rutina:', error.message)
    throw new Error(`Error al asignar rutina: ${error.message}`)
  }

  revalidatePath('/')
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('❌ Error al iniciar sesión:', error.message)
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/')
  redirect('/')
}

async function ensureBetaSignupProfile(
  userId: string,
  email: string,
  fullName: string,
  admin: ReturnType<typeof createAdminClient>,
) {
  const { data: existingProfile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`No se pudo comprobar el perfil: ${lookupError.message}`)
  }
  if (existingProfile) return

  const { error: insertError } = await admin.from('profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role: 'coach',
    is_beta_tester: false,
    is_subscribed: false,
  })

  if (insertError?.code === '23505') {
    const { data: concurrentProfile, error: concurrentLookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!concurrentLookupError && concurrentProfile) return
  }

  if (insertError) {
    throw new Error(`No se pudo crear el perfil beta: ${insertError.message}`)
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  const submittedName = formData.get('name')
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const normalizedPassword = typeof password === 'string' ? password : ''
  const fullName = typeof submittedName === 'string' ? submittedName.trim() : ''

  if (!normalizedEmail || !normalizedPassword || !fullName) {
    return redirect(`/register?message=${encodeURIComponent('Completa todos los campos.')}`)
  }
  if (normalizedPassword.length < 6) {
    return redirect(`/register?message=${encodeURIComponent('La contraseña debe tener al menos 6 caracteres.')}`)
  }

  let redirectPath = '/register'
  let message: string | undefined

  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      message = error.message
    } else if (!data.user) {
      message = 'No se pudo crear la cuenta. Inténtalo de nuevo.'
    } else if (data.user.identities?.length === 0) {
      message = 'Si el correo puede registrarse, recibirás instrucciones para continuar.'
    } else {
      await ensureBetaSignupProfile(
        data.user.id,
        data.user.email ?? normalizedEmail,
        fullName,
        admin,
      )

      if (data.session) {
        redirectPath = '/beta-pending'
      } else {
        message = 'Cuenta creada. Confirma tu correo para iniciar sesión y solicitar acceso a la beta.'
      }
    }
  } catch (error) {
    console.error(
      '[signup] No se pudo completar el registro:',
      error instanceof Error ? error.message : String(error),
    )
    message = 'No se pudo completar el registro por un problema de conexión. Inténtalo de nuevo más tarde.'
  }

  if (message) {
    redirectPath = `/register?message=${encodeURIComponent(message)}`
  }

  revalidatePath('/')
  redirect(redirectPath)
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}

// Actualizar el nivel de experiencia de un atleta desde el panel del coach
export async function updateAthleteLevel(formData: FormData) {
  const athlete_id = formData.get('athlete_id') as string
  const experience_level = formData.get('experience_level') as string

  if (!athlete_id || !experience_level) return

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ experience_level })
    .eq('id', athlete_id)

  if (error) {
    console.error('Error al actualizar el nivel del atleta:', error.message)
    throw new Error(`Error al actualizar nivel: ${error.message}`)
  }

  revalidatePath('/')
}