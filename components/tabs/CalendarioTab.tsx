/**
 * components/tabs/CalendarioTab.tsx
 *
 * Calendario y programación de sesiones — asignación de rutinas a atletas.
 */

import { assignWorkout } from '@/app/actions'
import type {
  AssignedWorkoutRecord,
  ProfileRecord,
  WorkoutRecord,
} from '@/types'

interface Props {
  workouts:         WorkoutRecord[]
  profiles:         ProfileRecord[]
  assignedWorkouts: AssignedWorkoutRecord[]
}

export default function CalendarioTab({ workouts, profiles, assignedWorkouts }: Props) {
  const athletes  = profiles.filter((profile) => profile.role === 'athlete')
  const canAssign = workouts.length > 0 && athletes.length > 0

  const pending   = assignedWorkouts.filter((assignment) => !assignment.completed)
  const completed = assignedWorkouts.filter((assignment) => assignment.completed)

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Programación
        </h2>
        <p className="text-lg sm:text-xl font-black text-white mt-1">
          Calendario de Sesiones
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Asigna rutinas a atletas en fechas específicas y gestiona el calendario.
        </p>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-black text-amber-400 font-mono">{pending.length}</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Completadas</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">{completed.length}</p>
        </div>
      </div>

      {/* ── Formulario asignación ── */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Nueva sesión programada
          </p>
        </div>
        <div className="p-5">
          {canAssign ? (
            <form action={assignWorkout} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                name="workout_id"
                required
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors min-h-10 shadow-inner"
              >
                <option value="">Selecciona Rutina...</option>
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>

              <select
                name="athlete_id"
                required
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors min-h-10 shadow-inner"
              >
                <option value="">Selecciona Atleta...</option>
                {athletes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="scheduled_date"
                required
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors font-mono min-h-10 shadow-inner"
              />

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 min-h-10"
              >
                Asignar al Calendario
              </button>
            </form>
          ) : (
            <p className="text-slate-400 text-xs italic leading-relaxed">
              Necesitas al menos una rutina creada y un atleta registrado para programar sesiones.
            </p>
          )}
        </div>
      </div>

      {/* ── Sesiones programadas ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Sesiones en calendario ({assignedWorkouts.length})
        </p>

        {assignedWorkouts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center">
            <p className="text-slate-500 text-xs italic">
              No hay sesiones programadas todavía.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden divide-y divide-slate-800/60">
            {assignedWorkouts.map((aw) => (
              <div
                key={aw.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                {/* Info */}
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold text-sm text-white truncate">
                    {aw.workouts?.title || 'Rutina'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Atleta:{' '}
                    <span className="text-slate-200">
                      {aw.profiles?.full_name || aw.profiles?.email || '—'}
                    </span>
                  </p>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-blue-400 font-mono text-[11px] shadow-inner">
                    {aw.scheduled_date}
                  </span>
                  <span
                    className={[
                      'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                      aw.completed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10   text-amber-400   border-amber-500/20',
                    ].join(' ')}
                  >
                    {aw.completed ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
