'use client'

import { useState, type FormEvent } from 'react'
import { Check, Clock3, MessageCircle, Send } from 'lucide-react'

export type ClientCoachNote = {
  id: string
  content: string
  createdAt: string
}

type ClientCoachNotesProps = {
  notes: ClientCoachNote[]
  onSubmitQuestion: (question: string) => Promise<void>
}

function formatNoteDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function ClientCoachNotes({
  notes,
  onSubmitQuestion,
}: ClientCoachNotesProps) {
  const [question, setQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = question.trim()

    if (!content || isSubmitting) return
    if (content.length > 1000) {
      setErrorMessage('La duda no puede superar los 1000 caracteres.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSubmitted(false)

    try {
      await onSubmitQuestion(content)
      setQuestion('')
      setSubmitted(true)
    } catch (error) {
      console.error(
        '[ClientCoachNotes] No se pudo enviar la duda:',
        error instanceof Error ? error.message : error,
      )
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo enviar tu duda. Inténtalo de nuevo.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="client-coach-notes-title"
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 text-white shadow-xl shadow-black/20 backdrop-blur-xl"
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF5A00]">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="client-coach-notes-title" className="text-base font-black">
            Feedback del coach
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Correcciones y comentarios de tu preparador
          </p>
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        {notes.length > 0 ? (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-4"
              >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                  {note.content}
                </p>
                <time
                  dateTime={note.createdAt}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"
                >
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatNoteDate(note.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
            Todavía no tienes feedback del coach.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-t border-white/10 pt-5"
        >
          <label
            htmlFor="client-coach-question"
            className="block text-sm font-bold text-slate-200"
          >
            ¿Tienes alguna duda?
          </label>
          <textarea
            id="client-coach-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value)
              setErrorMessage(null)
              setSubmitted(false)
            }}
            maxLength={1000}
            rows={3}
            placeholder="Escribe una pregunta rápida para tu coach..."
            disabled={isSubmitting}
            className="min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/15 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{question.length}/1000</span>
            <button
              type="submit"
              disabled={isSubmitting || !question.trim()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF5A00] px-4 text-sm font-extrabold text-white transition hover:bg-[#e65000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                'Enviando…'
              ) : submitted ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Enviada
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Enviar duda
                </>
              )}
            </button>
          </div>
          {errorMessage && (
            <p role="alert" className="text-sm text-rose-400">
              {errorMessage}
            </p>
          )}
          {submitted && (
            <p role="status" className="text-sm text-emerald-400">
              Tu duda se envió correctamente.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
