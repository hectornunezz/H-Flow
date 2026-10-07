'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addExercise(formData: FormData) {
  const name = formData.get('name') as string
  const muscle_group = formData.get('muscle_group') as string
  if (!name) return

  const supabase = await createClient()
  await supabase.from('exercises').insert([{ name, muscle_group }])
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

  if (!workout_id || !exercise_id) return

  const supabase = await createClient()
  await supabase.from('workout_exercises').insert([
    { workout_id, exercise_id, sets, reps }
  ])
  revalidatePath('/')
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return redirect('/login?message=Error al iniciar sesión')
  }
  revalidatePath('/')
  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  // 1. Registrar usuario en Auth de Supabase
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error || !data.user) {
    return redirect('/login?message=Error al registrarse')
  }

  // 2. Crear automáticamente su perfil asociado en la tabla 'profiles'
  await supabase.from('profiles').insert([
    {
      id: data.user.id,
      email: email,
      full_name: email.split('@')[0],
      role: 'coach'
    }
  ])

  revalidatePath('/')
  redirect('/')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}