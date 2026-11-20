/**
 * components/tabs/RutinasTab.tsx
 *
 * Arquitectura de rutinas — gestión de plantillas activas.
 */

import { createWorkout, deleteWorkout } from '@/app/actions'
import type { ExerciseRecord, WorkoutRecord } from '@/types'

interface Props {
  workouts:  WorkoutRecord[]
  exercises: ExerciseRecord[]
}

export default function RutinasTab({ workouts }: Props) {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#f97316]">
          Arquitectura
        </h2>
        <p className="text-lg sm:text-xl font-black text-white mt-1">
          Diseño de Rutinas
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Crea plantillas de entrenamiento y gestiona tus bloques activos.
        </p>
      </div>

      {/* ── Formulario nueva rutina ── */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nueva plantilla
          </p>
        </div>
        <div className="p-5">
          <form
            action={async (formData) => {
              'use server'
              await createWorkout(formData)
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              name="title"
              placeholder="Título (ej. Hipertrofia — Tren Superior A)"
              required
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f97316] transition-colors shadow-inner w-full"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                name="description"
                placeholder="Notas de enfoque (opcional)"
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f97316] transition-colors shadow-inner flex-1"
              />
              <button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c] text-[#030712] text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-950/30 active:scale-95 shrink-0"
              >
                Crear Rutina
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Listado de rutinas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Plantillas activas ({workouts.length})
          </p>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center">
            <p className="text-slate-500 text-xs italic">
              No tienes rutinas creadas todavía. Crea tu primera plantilla arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden"
              >
                {/* Workout header */}
                <div className="px-5 py-4 border-b border-slate-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white break-words">{w.title}</h4>
                      {w.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{w.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 px-2 py-0.5 rounded-lg">
                        {w.workout_exercises?.length || 0} ejerc.
                      </span>
                      <form
                        action={async () => {
                          'use server'
                          await deleteWorkout(w.id)
                        }}
                      >
                        <button
                          type="submit"
                          className="text-rose-400 hover:text-rose-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 transition-colors"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* Ejercicios estructurados */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Bloques de ejercicios
                      </p>
                    </div>
                    {w.workout_exercises?.length > 0 ? (
                      <ul className="divide-y divide-slate-800/60">
                        {w.workout_exercises.map((we) => (
                          <li
                            key={we.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-medium text-slate-200 truncate">
                                {we.exercises?.name}
                              </span>
                              <span className="hidden sm:inline shrink-0 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                {we.exercises?.equipment || 'General'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 text-[11px]">
                                {we.sets}×{we.reps}
                              </span>
                              {we.rir !== undefined && we.rir !== null && (
                                <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">
                                  RIR {we.rir}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-4 text-xs text-slate-500 italic">
                        Sin ejercicios asignados aún.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}