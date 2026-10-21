'use server'

import { randomUUID } from 'node:crypto'
import { createClient } from '@/utils/supabase/server'

const VIDEO_BUCKET = 'athlete-set-videos'
const MAX_VIDEO_SIZE = 25 * 1024 * 1024
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

type RelatedWorkout = {
  workout_exercises: Array<{ id: string }> | null
}

type AssignedWorkout = {
  id: string
  athlete_id: string
  workouts: RelatedWorkout | RelatedWorkout[] | null
}

export type UploadedSetVideo = {
  id: string
  assignmentId: string
  exerciseId: string
  storagePath: string
  signedUrl: string
}

export async function uploadEffectiveSetVideo(formData: FormData): Promise<UploadedSetVideo> {
  const assignmentId = formData.get('assignmentId')
  const exerciseId = formData.get('exerciseId')
  const file = formData.get('file')

  if (typeof assignmentId !== 'string' || !UUID_PATTERN.test(assignmentId)) {
    throw new Error('La sesión asignada no es válida.')
  }
  if (typeof exerciseId !== 'string' || !UUID_PATTERN.test(exerciseId)) {
    throw new Error('El ejercicio seleccionado no es válido.')
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Selecciona un vídeo para subir.')
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error('El vídeo no puede superar los 25 MB.')
  }

  const extension = VIDEO_EXTENSIONS[file.type]
  if (!extension) {
    throw new Error('Formato no compatible. Usa MP4, WebM o MOV.')
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
    throw new Error('Debes iniciar sesión para subir un vídeo.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`No se pudo verificar el perfil: ${profileError.message}`)
  }
  if (!profile || profile.role !== 'athlete') {
    throw new Error('Solo un atleta puede subir vídeos de sus series.')
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from('assigned_workouts')
    .select('id, athlete_id, workouts(workout_exercises(id))')
    .eq('id', assignmentId)
    .eq('athlete_id', user.id)
    .maybeSingle()

  if (assignmentError) {
    throw new Error(`No se pudo verificar la sesión de entrenamiento: ${assignmentError.message}`)
  }
  if (!assignmentData) {
    throw new Error('La sesión asignada no existe o no pertenece a este atleta.')
  }

  const assignment = assignmentData as unknown as AssignedWorkout
  const workouts = Array.isArray(assignment.workouts)
    ? assignment.workouts
    : assignment.workouts
      ? [assignment.workouts]
      : []
  const exerciseBelongsToAssignment = workouts.some((workout) =>
    workout.workout_exercises?.some((exercise) => exercise.id === exerciseId),
  )

  if (!exerciseBelongsToAssignment) {
    throw new Error('El ejercicio no pertenece a la sesión asignada.')
  }

  const storagePath = `${user.id}/${assignmentId}/${exerciseId}/${randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`No se pudo subir el vídeo: ${uploadError.message}`)
  }

  const { data: videoRecord, error: recordError } = await supabase
    .from('athlete_set_videos')
    .insert({
      athlete_id: user.id,
      assigned_workout_id: assignmentId,
      workout_exercise_id: exerciseId,
      storage_path: storagePath,
    })
    .select('id')
    .single()

  if (recordError || !videoRecord) {
    const { error: cleanupError } = await supabase.storage.from(VIDEO_BUCKET).remove([storagePath])
    if (cleanupError) {
      console.error('[uploadEffectiveSetVideo] No se pudo limpiar el vídeo:', cleanupError.message)
    }
    throw new Error(
      `No se pudo vincular el vídeo al ejercicio: ${recordError?.message ?? 'registro no válido.'}`,
    )
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_LIFETIME_SECONDS)

  if (signedUrlError) {
    const { error: recordCleanupError } = await supabase
      .from('athlete_set_videos')
      .delete()
      .eq('id', videoRecord.id)
    if (recordCleanupError) {
      console.error(
        '[uploadEffectiveSetVideo] No se pudo limpiar el vínculo del vídeo:',
        recordCleanupError.message,
      )
    }

    const { error: cleanupError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .remove([storagePath])
    if (cleanupError) {
      console.error('[uploadEffectiveSetVideo] No se pudo limpiar el vídeo:', cleanupError.message)
    }
    throw new Error(`El vídeo se subió, pero no se pudo generar el enlace: ${signedUrlError.message}`)
  }

  return {
    id: videoRecord.id,
    assignmentId,
    exerciseId,
    storagePath,
    signedUrl: signedUrlData.signedUrl,
  }
}
