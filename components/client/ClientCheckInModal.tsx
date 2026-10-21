'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Check, LoaderCircle, Moon, Scale, ShieldAlert, X } from 'lucide-react'
import { registerAthleteCheckIn } from '@/app/actions/athlete-checkin'

type ClientCheckInModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmitted?: () => void
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5]

export default function ClientCheckInModal({
  isOpen,
  onClose,
  onSubmitted,
}: ClientCheckInModalProps) {
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [stressLevel, setStressLevel] = useState<number | null>(null)
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const parsedWeight = Number(weight)
    const parsedSleepHours = Number(sleepHours)

    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 500) {
      setErrorMessage('Introduce un peso válido entre 20 y 500 kg.')
      return
    }
    if (!Number.isFinite(parsedSleepHours) || parsedSleepHours < 0 || parsedSleepHours > 24) {
      setErrorMessage('Introduce las horas de sueño entre 0 y 24.')
      return
    }
    if (stressLevel === null || fatigueLevel === null) {
      setErrorMessage('Selecciona tu nivel de estrés y fatiga.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await registerAthleteCheckIn({
        weightKg: parsedWeight,
        sleepHours: parsedSleepHours,
        stressLevel,
        fatigueLevel,
      })
      setIsSubmitted(true)
      router.refresh()
      onSubmitted?.()
    } catch (error) {
      console.error(
        '[ClientCheckInModal] No se pudo enviar el reporte:',
        error instanceof Error ? error.message : error,
      )
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo enviar el reporte. Inténtalo de nuevo.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function closeModal() {
    if (isSubmitting) return
    setWeight('')
    setSleepHours('')
    setStressLevel(null)
    setFatigueLevel(null)
    setErrorMessage(null)
    setIsSubmitted(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <section
        aria-labelledby="check-in-title"
        aria-modal="true"
        className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 text-white shadow-2xl shadow-black/50 sm:rounded-3xl"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
              Check-in diario
            </p>
            <h2 id="check-in-title" className="mt-1 text-lg font-black">
              ¿Cómo te encuentras?
            </h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {isSubmitted ? (
          <div className="px-5 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Check className="h-7 w-7" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold">Reporte enviado</h3>
            <p className="mt-1 text-sm text-slate-400">Tu entrenador ya puede ver tu check-in.</p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-6 min-h-12 w-full rounded-xl bg-[#FF5A00] px-4 text-sm font-extrabold text-white transition hover:bg-[#e65000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
            <label className="block text-sm font-semibold text-slate-300">
              <span className="mb-2 flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#FF5A00]" aria-hidden="true" />
                Peso actual
              </span>
              <span className="flex min-h-14 items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-[#FF5A00] focus-within:ring-2 focus-within:ring-[#FF5A00]/15">
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="500"
                  step="0.1"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="Ej. 72.5"
                  aria-label="Peso actual en kilogramos"
                  className="min-h-14 min-w-0 flex-1 rounded-l-xl bg-transparent px-4 text-lg font-bold text-white outline-none placeholder:text-slate-600"
                />
                <span className="pr-4 text-sm font-semibold text-slate-500">kg</span>
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-300">
              <span className="mb-2 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-300" aria-hidden="true" />
                Horas de sueño
              </span>
              <span className="flex min-h-14 items-center rounded-xl border border-slate-700 bg-slate-950 focus-within:border-[#FF5A00] focus-within:ring-2 focus-within:ring-[#FF5A00]/15">
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(event) => setSleepHours(event.target.value)}
                  placeholder="Ej. 8"
                  aria-label="Horas de sueño"
                  className="min-h-14 min-w-0 flex-1 rounded-l-xl bg-transparent px-4 text-lg font-bold text-white outline-none placeholder:text-slate-600"
                />
                <span className="pr-4 text-sm font-semibold text-slate-500">h</span>
              </span>
            </label>

            <ScorePicker
              label="Nivel de estrés"
              description="1 = muy bajo · 5 = muy alto"
              icon={<ShieldAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />}
              value={stressLevel}
              onChange={setStressLevel}
            />

            <ScorePicker
              label="Fatiga antes de entrenar"
              description="1 = descansado · 5 = muy fatigado"
              icon={<Activity className="h-4 w-4 text-rose-300" aria-hidden="true" />}
              value={fatigueLevel}
              onChange={setFatigueLevel}
            />

            {errorMessage && (
              <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A00] px-4 text-base font-extrabold text-white transition hover:bg-[#e65000] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                'Enviar Reporte'
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function ScorePicker({
  label,
  description,
  icon,
  value,
  onChange,
}: {
  label: string
  description: string
  icon: React.ReactNode
  value: number | null
  onChange: (score: number) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-300">
        {icon}
        {label}
      </legend>
      <p className="mb-2 text-xs text-slate-500">{description}</p>
      <div className="grid grid-cols-5 gap-2">
        {SCORE_OPTIONS.map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            aria-label={`${label}: ${score} de 5`}
            onClick={() => onChange(score)}
            className={`min-h-12 rounded-xl border text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] ${
              value === score
                ? 'border-[#FF5A00] bg-[#FF5A00]/15 text-[#FF8A4C]'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function ClientCheckInLauncher() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#FF5A00]/20 transition hover:bg-[#ff6a1a] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <Activity className="h-4 w-4" aria-hidden="true" />
        Registrar Peso y Check-in
      </button>
      <ClientCheckInModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
