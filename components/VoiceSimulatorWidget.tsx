'use client'

import { useState } from 'react'
import { LoaderCircle, Mic, Radio } from 'lucide-react'
import { toast } from 'sonner'
import type { Task, TaskIcon } from '@/types'

interface WhatsAppSyncResponse {
  ok: true
  transcription: string
  task: Task
  meta: {
    transcriptionSource: 'mock' | 'groq-whisper' | 'text-input'
    structuringProvider: string
    model: string
  }
}

function isWhatsAppSyncResponse(value: unknown): value is WhatsAppSyncResponse {
  if (typeof value !== 'object' || value === null) return false

  const response = value as Record<string, unknown>
  if (response.ok !== true || typeof response.transcription !== 'string') return false
  if (typeof response.task !== 'object' || response.task === null) return false
  if (typeof response.meta !== 'object' || response.meta === null) return false

  const task = response.task as Record<string, unknown>
  const meta = response.meta as Record<string, unknown>
  const validIcons: readonly TaskIcon[] = ['video', 'phone', 'calendar', 'dumbbell']

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.time === 'string' &&
    typeof task.completed === 'boolean' &&
    typeof task.icon === 'string' &&
    validIcons.includes(task.icon as TaskIcon) &&
    (meta.transcriptionSource === 'mock' ||
      meta.transcriptionSource === 'groq-whisper' ||
      meta.transcriptionSource === 'text-input') &&
    typeof meta.structuringProvider === 'string' &&
    typeof meta.model === 'string'
  )
}

export default function VoiceSimulatorWidget() {
  const [transcription, setTranscription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitTranscription() {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/whatsapp-sync', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription: transcription.trim() }),
      })

      const payload: unknown = await response.json().catch(() => null)
      if (!isWhatsAppSyncResponse(payload) || !response.ok) {
        const error =
          typeof payload === 'object' &&
          payload !== null &&
          'details' in payload &&
          typeof payload.details === 'string'
            ? payload.details
            : typeof payload === 'object' &&
                payload !== null &&
                'error' in payload &&
                typeof payload.error === 'string'
              ? payload.error
              : `Error HTTP ${response.status}.`
        throw new Error(error)
      }

      toast.success('Transcripción estructurada y guardada', {
        description: (
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
            {JSON.stringify(payload.task, null, 2)}
          </pre>
        ),
        duration: 10000,
      })
      setTranscription('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo procesar el audio.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 shadow-xl backdrop-blur-md sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF5A00]">
          <Radio className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Simulador de WhatsApp</h2>
          <p className="text-xs text-slate-400">Convierte un mensaje en una tarea</p>
        </div>
      </div>

      <label htmlFor="whatsapp-transcription" className="mb-2 block text-xs font-semibold text-slate-300">
        Transcripción del atleta
      </label>
      <textarea
        id="whatsapp-transcription"
        value={transcription}
        onChange={event => setTranscription(event.target.value)}
        placeholder="Ej. Hola, hoy dormí mal y me molesta el hombro en press banca..."
        maxLength={5000}
        rows={4}
        disabled={isSubmitting}
        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-[#FF5A00]/60 disabled:opacity-60"
      />

      <button
        type="button"
        onClick={submitTranscription}
        disabled={isSubmitting}
        className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-[#FF5A00] px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#e64f00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Procesando transcripción...
          </>
        ) : (
          <>
            <span className="flex h-5 items-center gap-0.5" aria-hidden>
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-white" />
              <span className="h-4 w-0.5 animate-pulse rounded-full bg-white [animation-delay:120ms]" />
              <Mic className="mx-1 h-4 w-4" />
              <span className="h-3 w-0.5 animate-pulse rounded-full bg-white [animation-delay:240ms]" />
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-white [animation-delay:360ms]" />
            </span>
            Grabar Audio de WhatsApp
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Simulación: envía el texto escrito o usa un mensaje de prueba si está vacío.
      </p>
    </section>
  )
}
