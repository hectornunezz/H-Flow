import { AudioLines, Clock3, Target } from 'lucide-react'

export type WhatsAppStats = {
  processedAudios: number
  averageCoachResponseMinutes: number | null
  transcriptionAccuracyRate: number | null
}

type WhatsAppStatsWidgetProps = {
  stats: WhatsAppStats
  periodLabel?: string
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`
}

function formatRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate) || rate < 0 || rate > 100) return '—'
  return `${Math.round(rate)}%`
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: string
  description: string
  icon: typeof AudioLines
}) {
  return (
    <article className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-medium leading-relaxed text-slate-400">{label}</h3>
          <p className="mt-3 text-2xl font-black tabular-nums text-white">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF8A4C]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{description}</p>
    </article>
  )
}

export default function WhatsAppStatsWidget({
  stats,
  periodLabel = 'Últimos 30 días',
}: WhatsAppStatsWidgetProps) {
  const processedAudios =
    Number.isFinite(stats.processedAudios) && stats.processedAudios >= 0
      ? Math.floor(stats.processedAudios).toLocaleString('es-ES')
      : '—'

  return (
    <section
      aria-labelledby="whatsapp-stats-title"
      className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 text-white shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
            WhatsApp + IA
          </p>
          <h2 id="whatsapp-stats-title" className="mt-1 text-lg font-black">
            Rendimiento del asistente
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
          {periodLabel}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Audios procesados por IA"
          value={processedAudios}
          description="Mensajes de voz transcritos"
          icon={AudioLines}
        />
        <MetricCard
          label="Respuesta media del coach"
          value={formatDuration(stats.averageCoachResponseMinutes)}
          description="Desde el reporte del atleta"
          icon={Clock3}
        />
        <MetricCard
          label="Acierto de transcripción"
          value={formatRate(stats.transcriptionAccuracyRate)}
          description="Precisión según los audios revisados"
          icon={Target}
        />
      </div>
    </section>
  )
}
