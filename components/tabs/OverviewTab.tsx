/**
 * components/tabs/OverviewTab.tsx
 *
 * Dashboard principal — Command Center de H-Flow.
 * Muestra las métricas clave del studio + la agenda del día con IA integrada.
 */

import AgendaWidget from '@/components/AgendaWidget'

interface Props {
  athleteCount:     number
  workoutCount:     number
  exerciseCount:    number
  pendingTasksCount: number
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

type ColorKey = 'orange' | 'blue' | 'purple' | 'emerald'

interface StatCardProps {
  label:    string
  value:    number
  emoji:    string
  color:    ColorKey
  sublabel?: string
}

const COLOR_MAP: Record<ColorKey, string> = {
  orange:  'bg-[#FF5A00]/10  border-[#FF5A00]/20  text-[#FF5A00]',
  blue:    'bg-blue-500/10   border-blue-500/20   text-blue-400',
  purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
}

function StatCard({ label, value, emoji, color, sublabel }: StatCardProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg hover:border-slate-700 transition-all duration-200 group">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tabular-nums">
          {value}
        </p>
        {sublabel && (
          <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{sublabel}</p>
        )}
      </div>
      <div
        className={[
          'hidden sm:flex w-11 h-11 shrink-0 rounded-2xl border',
          'items-center justify-center text-lg shadow-inner',
          'transition-transform duration-200 group-hover:scale-110',
          COLOR_MAP[color],
        ].join(' ')}
      >
        {emoji}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OverviewTab({
  athleteCount,
  workoutCount,
  exerciseCount,
  pendingTasksCount,
}: Props) {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Command Center
        </h2>
        <p className="text-lg sm:text-xl font-black text-white mt-1">
          Visión general del studio
        </p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Atletas"
          value={athleteCount}
          emoji="👥"
          color="blue"
          sublabel="activos"
        />
        <StatCard
          label="Rutinas"
          value={workoutCount}
          emoji="📋"
          color="purple"
          sublabel="plantillas"
        />
        <StatCard
          label="Ejercicios"
          value={exerciseCount}
          emoji="📚"
          color="emerald"
          sublabel="en biblioteca"
        />
        <StatCard
          label="Sesiones"
          value={pendingTasksCount}
          emoji="📅"
          color="orange"
          sublabel="pendientes"
        />
      </div>

      {/* ── Agenda del día ── */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl p-5 sm:p-6">
        <AgendaWidget />
      </div>

    </div>
  )
}
