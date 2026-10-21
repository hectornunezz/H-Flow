'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Moon,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export interface AthleteDetail {
  id: string
  name: string
  email?: string
  experience: string
  sport?: string
  avatarUrl?: string | null
  reportStatus: 'up-to-date' | 'pending'
  lastReport?: string
  biofeedback?: {
    sleepHours?: number | null
    stress?: number | null
    fatigue?: number | null
    recordedAt?: string
  } | null
  microcycles?: Array<{
    id: string
    name: string
    dateRange: string
    completion: number
    rirCompliance: number
  }>
}

interface AthleteDetailModalProps {
  athlete: AthleteDetail
  isOpen: boolean
  onClose: () => void
}

interface AthleteMetricRecord {
  id: string
  date: string
  weight: number | null
  sleep_hours: number | null
  stress_level: number | null
  fatigue_level: number | null
}

interface AthleteNoteRecord {
  id: string
  content: string
  created_at: string
}

type MetricKey = 'weight' | 'sleep_hours' | 'stress_level'

const HISTORY_METRICS: Array<{
  key: MetricKey
  label: string
  unit: string
  icon: typeof Scale
  color: string
}> = [
  { key: 'weight', label: 'Peso', unit: 'kg', icon: Scale, color: '#FF5A00' },
  { key: 'sleep_hours', label: 'Sueño', unit: 'h', icon: Moon, color: '#a5b4fc' },
  { key: 'stress_level', label: 'Estrés', unit: '/10', icon: ShieldAlert, color: '#fbbf24' },
]

function isAthleteMetricRecord(value: unknown): value is AthleteMetricRecord {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  const isNullableNumber = (field: unknown) =>
    field === null || (typeof field === 'number' && Number.isFinite(field))

  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    isNullableNumber(record.weight) &&
    isNullableNumber(record.sleep_hours) &&
    isNullableNumber(record.stress_level) &&
    isNullableNumber(record.fatigue_level)
  )
}

function formatMetricDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function MetricHistoryCard({
  metric,
  records,
}: {
  metric: (typeof HISTORY_METRICS)[number]
  records: AthleteMetricRecord[]
}) {
  const values = records
    .map(record => record[metric.key])
    .filter((value): value is number => value !== null)
  const latest = values.at(-1)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
      const y = 36 - ((value - min) / range) * 28
      return `${x},${y}`
    })
    .join(' ')
  const Icon = metric.icon

  return (
    <article className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon aria-hidden="true" className="h-4 w-4" style={{ color: metric.color }} />
          <h3 className="text-xs font-semibold">{metric.label}</h3>
        </div>
        <p className="text-sm font-black text-white">
          {latest === undefined ? '—' : `${latest} ${metric.unit}`}
        </p>
      </div>
      {values.length > 1 ? (
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Histórico de ${metric.label.toLowerCase()}`}
          className="mt-4 h-14 w-full overflow-visible"
        >
          <polyline
            points={points}
            fill="none"
            stroke={metric.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <p className="mt-5 flex h-14 items-center text-[11px] text-slate-500">
          {values.length === 1 ? 'Se necesita otro registro para ver la evolución.' : 'Sin datos registrados.'}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-500">
        {values.length} {values.length === 1 ? 'registro' : 'registros'}
      </p>
    </article>
  )
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-rose-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-emerald-400'
}

function getProgressColor(score: number) {
  if (score >= 85) return 'bg-emerald-400'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-rose-400'
}

function formatValue(value: number | null | undefined, suffix = '') {
  return value == null ? 'Sin registro' : `${value}${suffix}`
}

export default function AthleteDetailModal({
  athlete,
  isOpen,
  onClose,
}: AthleteDetailModalProps) {
  const [noteContent, setNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [savedNotes, setSavedNotes] = useState<AthleteNoteRecord[]>([])
  const [metricHistory, setMetricHistory] = useState<AthleteMetricRecord[]>([])
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  async function handleSaveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = noteContent.trim()
    if (!content || isSavingNote) return

    setIsSavingNote(true)
    setNoteError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('athlete_notes')
        .insert({ athlete_id: athlete.id, content })
        .select('id, content, created_at')
        .single()

      if (error) {
        throw new Error(error.message)
      }
      if (
        !data ||
        typeof data.id !== 'string' ||
        typeof data.content !== 'string' ||
        typeof data.created_at !== 'string'
      ) {
        throw new Error('La base de datos devolvió una nota no válida.')
      }

      setSavedNotes(previous => [data, ...previous])
      setNoteContent('')
    } catch (error) {
      console.error(
        '[AthleteDetailModal] No se pudo guardar la nota:',
        error instanceof Error ? error.message : error,
      )
      setNoteError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la nota. Inténtalo de nuevo.',
      )
    } finally {
      setIsSavingNote(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let isCurrent = true
    const supabase = createClient()

    async function loadMetrics() {
      setIsLoadingMetrics(true)
      setMetricsError(null)

      try {
        const { data, error } = await supabase
          .from('athlete_metrics')
          .select('id, date, weight, sleep_hours, stress_level, fatigue_level')
          .eq('athlete_id', athlete.id)
          .order('date', { ascending: true })
          .limit(30)

        if (!isCurrent) return

        if (error) {
          console.error('[AthleteDetailModal] No se pudo cargar el historial:', error.message)
          setMetricsError('No se pudo cargar el historial de métricas.')
          setMetricHistory([])
        } else {
          const records: unknown = data
          if (!Array.isArray(records) || !records.every(isAthleteMetricRecord)) {
            setMetricsError('El historial contiene datos con un formato no válido.')
            setMetricHistory([])
          } else {
            setMetricHistory(records)
          }
        }
      } catch (error) {
        if (!isCurrent) return
        console.error('[AthleteDetailModal] Error inesperado al cargar el historial:', error)
        setMetricsError('No se pudo cargar el historial de métricas.')
        setMetricHistory([])
      } finally {
        if (isCurrent) setIsLoadingMetrics(false)
      }
    }

    void loadMetrics()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      isCurrent = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [athlete.id, isOpen, onClose])

  if (!isOpen) return null

  const reportIsCurrent = athlete.reportStatus === 'up-to-date'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="athlete-detail-title"
        className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900/95 text-white shadow-2xl shadow-black/50"
      >
        <header className="border-b border-slate-700/70 p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Volver al listado
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar perfil"
              className="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {athlete.avatarUrl ? (
                <img
                  src={athlete.avatarUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-2xl border border-slate-700 object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/25 bg-[#FF5A00]/10 text-lg font-black text-[#FF5A00]"
                >
                  {athlete.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toLocaleUpperCase('es')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
                  Perfil del atleta
                </p>
                <h1
                  id="athlete-detail-title"
                  className="mt-1 truncate text-xl font-black sm:text-2xl"
                >
                  {athlete.name}
                </h1>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {[athlete.email, athlete.sport].filter(Boolean).join(' · ') ||
                    'Sin datos de contacto'}
                </p>
              </div>
            </div>

            <div
              className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
                reportIsCurrent
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {reportIsCurrent ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <AlertCircle aria-hidden="true" className="h-4 w-4" />
              )}
              {reportIsCurrent ? 'Reporte al día' : 'Pendiente de revisión'}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-slate-300">
              Experiencia: <strong className="text-white">{athlete.experience}</strong>
            </span>
            {athlete.lastReport && (
              <span className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-slate-300">
                Último reporte: <strong className="text-white">{athlete.lastReport}</strong>
              </span>
            )}
          </div>
        </header>

        <div className="space-y-7 p-5 sm:p-7">
          <section aria-labelledby="athlete-notes-title">
            <div className="mb-4">
              <h2 id="athlete-notes-title" className="text-sm font-bold">
                Notas rápidas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Notas privadas vinculadas al perfil de este atleta
              </p>
            </div>
            <form onSubmit={handleSaveNote} className="space-y-3">
              <textarea
                value={noteContent}
                onChange={event => {
                  setNoteContent(event.target.value)
                  setNoteError(null)
                }}
                maxLength={2000}
                rows={3}
                required
                disabled={isSavingNote}
                placeholder="Escribe una observación rápida..."
                aria-label="Nota rápida del atleta"
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#FF5A00]/60 disabled:opacity-60"
              />
              {noteError && (
                <p role="alert" className="text-xs text-rose-400">
                  {noteError}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingNote || !noteContent.trim()}
                  className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
                </button>
              </div>
            </form>
            {savedNotes.length > 0 && (
              <ul className="mt-4 space-y-2">
                {savedNotes.map(note => (
                  <li
                    key={note.id}
                    className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-3"
                  >
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-200">
                      {note.content}
                    </p>
                    <time
                      dateTime={note.created_at}
                      className="mt-2 block text-[10px] text-slate-500"
                    >
                      {new Date(note.created_at).toLocaleString('es-ES')}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="metrics-history-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="metrics-history-title" className="text-sm font-bold">
                  Historial de métricas
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Registros guardados en Supabase
                </p>
              </div>
              <Activity aria-hidden="true" className="h-4 w-4 text-[#FF5A00]" />
            </div>

            {isLoadingMetrics ? (
              <div className="grid gap-3 sm:grid-cols-3" aria-label="Cargando métricas">
                {HISTORY_METRICS.map(metric => (
                  <div key={metric.key} className="h-36 animate-pulse rounded-2xl border border-slate-700/70 bg-slate-800/40" />
                ))}
              </div>
            ) : metricsError ? (
              <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-6 text-center text-xs text-rose-300">
                {metricsError}
              </div>
            ) : metricHistory.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {HISTORY_METRICS.map(metric => (
                    <MetricHistoryCard key={metric.key} metric={metric} records={metricHistory} />
                  ))}
                </div>
                <div className="mt-3 divide-y divide-slate-800 rounded-2xl border border-slate-700/70 bg-slate-800/30">
                  <div className="grid grid-cols-4 gap-2 border-b border-slate-800 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <span>Fecha</span>
                    <span>Peso</span>
                    <span>Sueño</span>
                    <span>Estrés</span>
                  </div>
                  {[...metricHistory].reverse().map(record => (
                    <div key={record.id} className="grid grid-cols-4 gap-2 px-4 py-3 text-xs">
                      <span className="font-medium text-slate-400">{formatMetricDate(record.date)}</span>
                      <span className="text-slate-200">{formatValue(record.weight, ' kg')}</span>
                      <span className="text-slate-200">{formatValue(record.sleep_hours, ' h')}</span>
                      <span className={record.stress_level == null ? 'text-slate-500' : getScoreColor(record.stress_level)}>
                        {formatValue(record.stress_level, '/10')}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-5 py-8 text-center">
                <Activity aria-hidden="true" className="mx-auto h-6 w-6 text-slate-600" />
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  Aún no hay métricas registradas para este atleta
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="microcycles-title">
            <div className="mb-4">
              <h2 id="microcycles-title" className="text-sm font-bold">
                Histórico de microciclos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Cumplimiento del plan y precisión de RIR
              </p>
            </div>

            {athlete.microcycles?.length ? (
              <div className="space-y-3">
                {athlete.microcycles.map((microcycle) => (
                  <article
                    key={microcycle.id}
                    className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                      <h3 className="text-sm font-bold">{microcycle.name}</h3>
                      <span className="text-[11px] text-slate-500">
                        {microcycle.dateRange}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { label: 'Cumplimiento', value: microcycle.completion },
                        { label: 'Cumplimiento de RIR', value: microcycle.rirCompliance },
                      ].map((metric) => (
                        <div key={metric.label}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">{metric.label}</span>
                            <span className="font-bold text-slate-200">
                              {metric.value}%
                            </span>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-slate-700"
                            role="progressbar"
                            aria-label={metric.label}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={metric.value}
                          >
                            <div
                              className={`h-full rounded-full ${getProgressColor(metric.value)}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, metric.value))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-5 py-8 text-center">
                <Activity
                  aria-hidden="true"
                  className="mx-auto h-6 w-6 text-slate-600"
                />
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  Aún no hay microciclos registrados
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="flex justify-end border-t border-slate-700/70 p-5 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#FF5A00] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a] focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/50"
          >
            Cerrar perfil
          </button>
        </footer>
      </section>
    </div>
  )
}
