'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Check, ChevronLeft, ChevronRight, Dumbbell, LoaderCircle, UserRound, X } from 'lucide-react'
import type { ExperienceLevel } from '@/types'

export interface OnboardingRoutine {
  id: string
  title: string
}

export interface QuickOnboardingData {
  fullName: string
  email: string
  objective: string
  experienceLevel: ExperienceLevel
  routineId: string
}

interface QuickOnboardingModalProps {
  isOpen: boolean
  routines: OnboardingRoutine[]
  onClose: () => void
  onSubmit: (data: QuickOnboardingData) => Promise<void>
}

const STEPS = ['Datos básicos', 'Objetivos y nivel', 'Primera rutina']

export default function QuickOnboardingModal({
  isOpen,
  routines,
  onClose,
  onSubmit,
}: QuickOnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [objective, setObjective] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Principiante')
  const [routineId, setRoutineId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedRoutineId = routines.some(routine => routine.id === routineId)
    ? routineId
    : routines[0]?.id ?? ''

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  function goNext() {
    setError(null)
    if (step === 0) {
      if (!fullName.trim()) {
        setError('Escribe el nombre del atleta.')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Introduce un correo válido.')
        return
      }
    }
    if (step === 1 && !objective.trim()) {
      setError('Indica el objetivo principal del atleta.')
      return
    }
    setStep(current => Math.min(current + 1, STEPS.length - 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRoutineId) {
      setError('Selecciona una rutina base para continuar.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        fullName: fullName.trim(),
        email: email.trim().toLocaleLowerCase('es'),
        objective: objective.trim(),
        experienceLevel,
        routineId: selectedRoutineId,
      })
      setStep(0)
      setFullName('')
      setEmail('')
      setObjective('')
      setExperienceLevel('Principiante')
      setRoutineId('')
      onClose()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'No se pudo completar el alta. Inténtalo de nuevo.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 text-white shadow-2xl shadow-black/50"
      >
        <header className="border-b border-slate-800 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
                Alta rápida · {step + 1} de {STEPS.length}
              </p>
              <h2 id="onboarding-title" className="mt-1 text-xl font-black">
                {STEPS[step]}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cerrar alta de atleta"
              className="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ol className="mt-5 flex gap-2" aria-label="Progreso del alta">
            {STEPS.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? 'step' : undefined}
                className={`h-1.5 flex-1 rounded-full ${
                  index <= step ? 'bg-[#FF5A00]' : 'bg-slate-700'
                }`}
              />
            ))}
          </ol>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="min-h-64 space-y-5 p-5 sm:p-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
                  <UserRound className="h-5 w-5 text-[#FF5A00]" aria-hidden />
                  <p className="text-xs text-slate-400">Solo necesitas sus datos de contacto para empezar.</p>
                </div>
                <label className="block text-xs font-semibold text-slate-300">
                  Nombre completo
                  <input
                    autoFocus
                    required
                    maxLength={120}
                    value={fullName}
                    onChange={event => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Ej. Lucía Fernández"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-[#FF5A00]"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="atleta@correo.com"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-[#FF5A00]"
                  />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300">
                  Objetivo principal
                  <textarea
                    autoFocus
                    required
                    maxLength={500}
                    rows={3}
                    value={objective}
                    onChange={event => setObjective(event.target.value)}
                    placeholder="Ej. Ganar fuerza en sentadilla y mejorar movilidad"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#FF5A00]"
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-slate-300">
                    Nivel de experiencia
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Principiante', 'Intermedio', 'Avanzado'] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={experienceLevel === level}
                        onClick={() => setExperienceLevel(level)}
                        className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                          experienceLevel === level
                            ? 'border-[#FF5A00]/50 bg-[#FF5A00]/10 text-[#FF5A00]'
                            : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
                  <Dumbbell className="h-5 w-5 text-[#FF5A00]" aria-hidden />
                  <p className="text-xs text-slate-400">Asigna una rutina base para que pueda empezar.</p>
                </div>
                {routines.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-xs font-semibold text-slate-300">
                      Rutina inicial
                    </legend>
                    {routines.map(routine => (
                      <label
                        key={routine.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                          selectedRoutineId === routine.id
                            ? 'border-[#FF5A00]/50 bg-[#FF5A00]/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="base-routine"
                          value={routine.id}
                          checked={selectedRoutineId === routine.id}
                          onChange={() => setRoutineId(routine.id)}
                          className="accent-[#FF5A00]"
                        />
                        <span className="text-sm font-semibold text-slate-100">{routine.title}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                    No hay rutinas disponibles. Crea una rutina base antes de dar de alta al atleta.
                  </div>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-slate-800 p-5 sm:px-6">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep(current => Math.max(current - 1, 0))
              }}
              disabled={step === 0 || isSubmitting}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Atrás
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a]"
              >
                Continuar
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !selectedRoutineId}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                {isSubmitting ? 'Creando atleta...' : 'Crear atleta'}
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  )
}
