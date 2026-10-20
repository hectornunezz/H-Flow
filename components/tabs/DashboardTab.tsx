'use client'

/**
 * components/tabs/DashboardTab.tsx
 *
 * Vista principal del Command Center.
 * Saludo dinámico + 3 KPIs + AgendaWidget centrada.
 */

import AgendaWidget from '@/components/AgendaWidget'

interface Props {
  userName:     string
  athleteCount: number
  pendingCount: number
  workoutCount: number
}

function greeting(name: string): string {
  const h = new Date().getHours()
  const saludo =
    h < 13 ? 'Buenos días' :
    h < 20 ? 'Buenas tardes' :
             'Buenas noches'
  return `${saludo}, ${name}.`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:    string
  value:    string | number
  sub?:     string
  accent?:  boolean
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className={[
      'rounded-2xl border p-4 flex flex-col gap-1 shadow-lg transition-all duration-200',
      'bg-slate-800/40 backdrop-blur-md border-slate-700/50 hover:border-slate-600/70',
    ].join(' ')}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={[
        'text-2xl sm:text-3xl font-black font-mono tabular-nums',
        accent ? 'text-[#FF5A00]' : 'text-white',
      ].join(' ')}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DashboardTab({ userName, athleteCount, pendingCount, workoutCount }: Props) {
  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Saludo ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Command Center
        </p>
        <h1 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight">
          {greeting(userName)}
        </h1>
      </div>

      {/* ── 3 KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Atletas"
          value={athleteCount}
          sub="activos"
        />
        <KpiCard
          label="Tareas"
          value={pendingCount}
          sub="pendientes"
          accent={pendingCount > 0}
        />
        <KpiCard
          label="Rutinas"
          value={workoutCount}
          sub="plantillas"
        />
      </div>

      {/* ── Agenda — protagonista ── */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl">
        <AgendaWidget />
      </div>

    </div>
  )
}
