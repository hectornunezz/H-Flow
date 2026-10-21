'use client'

import { useState } from 'react'
import { Check, Dumbbell, LoaderCircle, Save } from 'lucide-react'

export type ClientDailyExercise = {
  id: string
  name: string
  muscleGroup?: string | null
  equipment?: string | null
  sets: number
  reps: string | number
  targetRir?: number | null
}

export type SaveExerciseSetInput = {
  assignmentId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  actualRir: number
}

type ClientDailyWorkoutProps = {
  assignmentId: string
  title: string
  exercises: ClientDailyExercise[]
  onSaveSet: (input: SaveExerciseSetInput) => Promise<void>
}

type SetEntry = {
  weightKg: string
  actualRir: string
  saved: boolean
  saving: boolean
  error: string
}

function createEmptySet(): SetEntry {
  return { weightKg: '', actualRir: '', saved: false, saving: false, error: '' }
}

function formatRir(rir: number | null | undefined): string {
  return rir === null || rir === undefined ? 'Sin especificar' : `${rir} RIR`
}

export default function ClientDailyWorkout({
  assignmentId,
  title,
  exercises,
  onSaveSet,
}: ClientDailyWorkoutProps) {
  const [setEntries, setSetEntries] = useState<Record<string, SetEntry>>({})

  function getEntry(exerciseId: string, setNumber: number): SetEntry {
    return setEntries[`${exerciseId}:${setNumber}`] ?? createEmptySet()
  }

  function updateEntry(
    exerciseId: string,
    setNumber: number,
    updates: Partial<SetEntry>,
  ) {
    const key = `${exerciseId}:${setNumber}`
    setSetEntries((current) => ({
      ...current,
      [key]: { ...createEmptySet(), ...current[key], ...updates },
    }))
  }

  async function saveSet(exerciseId: string, setNumber: number) {
    const entry = getEntry(exerciseId, setNumber)
    const weightKg = Number(entry.weightKg)
    const actualRir = Number(entry.actualRir)

    if (!entry.weightKg.trim() || !Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) {
      updateEntry(exerciseId, setNumber, { error: 'Introduce un peso válido en kg.' })
      return
    }
    if (
      entry.actualRir.trim() === '' ||
      !Number.isInteger(actualRir) ||
      actualRir < 0 ||
      actualRir > 10
    ) {
      updateEntry(exerciseId, setNumber, { error: 'El RIR debe ser un número de 0 a 10.' })
      return
    }

    updateEntry(exerciseId, setNumber, { saving: true, error: '' })
    try {
      await onSaveSet({
        assignmentId,
        exerciseId,
        setNumber,
        weightKg,
        actualRir,
      })
      updateEntry(exerciseId, setNumber, { saving: false, saved: true })
    } catch (error) {
      console.error('[ClientDailyWorkout] No se pudo guardar la serie:', error)
      updateEntry(exerciseId, setNumber, {
        saving: false,
        saved: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar la serie. Inténtalo de nuevo.',
      })
    }
  }

  return (
    <section
      aria-labelledby="client-daily-workout-title"
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 text-white shadow-2xl shadow-black/30 backdrop-blur-xl"
    >
      <header className="border-b border-white/10 bg-gradient-to-r from-[#FF5A00]/15 to-transparent px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/25 bg-[#FF5A00]/10 text-[#FF5A00]">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF8A4C]">
              Entrenamiento de hoy
            </p>
            <h2
              id="client-daily-workout-title"
              className="mt-1 truncate text-lg font-black sm:text-xl"
            >
              {title}
            </h2>
          </div>
        </div>
      </header>

      {exercises.length > 0 ? (
        <div className="divide-y divide-white/10">
          {exercises.map((exercise, exerciseIndex) => {
            const setCount = Number.isInteger(exercise.sets)
              ? Math.min(Math.max(exercise.sets, 0), 30)
              : 0

            return (
              <article key={exercise.id} className="px-4 py-5 sm:px-6">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300">
                    {exerciseIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold leading-snug">
                      {exercise.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(' · ') ||
                        'Ejercicio asignado'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 px-3 py-2 text-xs font-bold text-[#FF8A4C]">
                    {exercise.reps} reps
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>{setCount} series</span>
                  <span>Objetivo: {formatRir(exercise.targetRir)}</span>
                </div>

                <ol className="space-y-3">
                  {Array.from({ length: setCount }, (_, index) => {
                    const setNumber = index + 1
                    const entry = getEntry(exercise.id, setNumber)

                    return (
                      <li
                        key={`${exercise.id}-set-${setNumber}`}
                        className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-3.5 sm:p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-200">
                            Serie {setNumber}
                          </span>
                          {entry.saved && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Guardada
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="block text-xs font-semibold text-slate-400">
                            Kilos levantados
                            <div className="mt-1.5 flex min-h-14 items-center rounded-xl border border-slate-700 bg-slate-900 focus-within:border-[#FF5A00] focus-within:ring-2 focus-within:ring-[#FF5A00]/15">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                max="1000"
                                step="0.5"
                                placeholder="0"
                                value={entry.weightKg}
                                onChange={(event) =>
                                  updateEntry(exercise.id, setNumber, {
                                    weightKg: event.target.value,
                                    saved: false,
                                    error: '',
                                  })
                                }
                                aria-label={`Kilos levantados en ${exercise.name}, serie ${setNumber}`}
                                className="h-14 min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-lg font-bold tabular-nums text-white outline-none placeholder:text-slate-600"
                              />
                              <span className="pr-3 text-sm font-semibold text-slate-500">kg</span>
                            </div>
                          </label>

                          <label className="block text-xs font-semibold text-slate-400">
                            RIR real
                            <div className="mt-1.5 flex min-h-14 items-center rounded-xl border border-slate-700 bg-slate-900 focus-within:border-[#FF5A00] focus-within:ring-2 focus-within:ring-[#FF5A00]/15">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="10"
                                step="1"
                                placeholder="0–10"
                                value={entry.actualRir}
                                onChange={(event) =>
                                  updateEntry(exercise.id, setNumber, {
                                    actualRir: event.target.value,
                                    saved: false,
                                    error: '',
                                  })
                                }
                                aria-label={`RIR real en ${exercise.name}, serie ${setNumber}`}
                                className="h-14 w-full min-w-0 rounded-xl bg-transparent px-3 text-lg font-bold tabular-nums text-white outline-none placeholder:text-slate-600"
                              />
                            </div>
                          </label>
                        </div>

                        {entry.error && (
                          <p role="alert" className="mt-2 text-xs text-rose-400">
                            {entry.error}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => void saveSet(exercise.id, setNumber)}
                          disabled={entry.saving}
                          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#FF5A00]/30 bg-[#FF5A00]/10 px-4 text-sm font-bold text-[#FF8A4C] transition hover:bg-[#FF5A00]/20 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00]/70 disabled:cursor-wait disabled:opacity-60"
                        >
                          {entry.saving ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : entry.saved ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Save className="h-4 w-4" aria-hidden="true" />
                          )}
                          {entry.saving
                            ? 'Guardando serie…'
                            : entry.saved
                              ? 'Serie guardada'
                              : 'Guardar serie'}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-slate-400">
          No hay ejercicios asignados para este entrenamiento.
        </p>
      )}
    </section>
  )
}
