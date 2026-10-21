'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'

type VideoFeedbackInputProps = {
  assignedWorkoutId: string
  initialUrl?: string
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export default function VideoFeedbackInput({
  assignedWorkoutId,
  initialUrl = '',
}: VideoFeedbackInputProps) {
  const [url, setUrl] = useState(initialUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [hasError, setHasError] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setHasError(false)

    const normalizedUrl = url.trim()
    if (!isValidHttpUrl(normalizedUrl)) {
      setHasError(true)
      setMessage('Introduce una URL válida que empiece por http:// o https://.')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('assigned_workouts')
        .update({ feedback_url: normalizedUrl })
        .eq('id', assignedWorkoutId)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('No se encontró la sesión asignada del atleta.')

      setUrl(normalizedUrl)
      setMessage('Feedback adjuntado correctamente.')
    } catch (error) {
      console.error('Error al guardar el feedback del atleta:', error)
      setHasError(true)
      setMessage(
        error instanceof Error
          ? `No se pudo guardar el feedback: ${error.message}`
          : 'No se pudo guardar el feedback.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor={`video-feedback-${assignedWorkoutId}`}
        className="block text-sm font-medium text-slate-200"
      >
        URL del video de feedback
      </label>
      <input
        id={`video-feedback-${assignedWorkoutId}`}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="Pega un enlace de Loom, YouTube o Drive"
        value={url}
        onChange={(event) => {
          setUrl(event.target.value)
          setMessage('')
          setHasError(false)
        }}
        aria-invalid={hasError}
        aria-describedby={`video-feedback-message-${assignedWorkoutId}`}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        type="submit"
        disabled={isSaving || !url.trim()}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 px-4 py-2.5 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/25 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSaving ? 'Guardando...' : 'Adjuntar Feedback'}
      </button>
      <p
        id={`video-feedback-message-${assignedWorkoutId}`}
        role="status"
        aria-live="polite"
        className={`text-sm ${hasError ? 'text-rose-400' : 'text-emerald-400'}`}
      >
        {message}
      </p>
    </form>
  )
}
