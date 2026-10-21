'use client'

import { useMemo, useState } from 'react'
import { Activity, ChevronDown, Dumbbell, Target } from 'lucide-react'

type ProgressRecord = {
  week: string
  load: number
  rir: number
}

type ExerciseProgress = {
  id: string
  name: string
  records: ProgressRecord[]
}

const exerciseProgress: ExerciseProgress[] = [
  {
    id: 'bench-press',
    name: 'Press de Banca',
    records: [
      { week: 'Sem 1', load: 62.5, rir: 3 },
      { week: 'Sem 2', load: 65, rir: 3 },
      { week: 'Sem 3', load: 65, rir: 2 },
      { week: 'Sem 4', load: 67.5, rir: 2 },
      { week: 'Sem 5', load: 70, rir: 2 },
      { week: 'Sem 6', load: 70, rir: 1 },
      { week: 'Sem 7', load: 72.5, rir: 2 },
      { week: 'Sem 8', load: 75, rir: 2 },
    ],
  },
  {
    id: 'squat',
    name: 'Sentadilla',
    records: [
      { week: 'Sem 1', load: 85, rir: 3 },
      { week: 'Sem 2', load: 87.5, rir: 3 },
      { week: 'Sem 3', load: 90, rir: 2 },
      { week: 'Sem 4', load: 90, rir: 2 },
      { week: 'Sem 5', load: 92.5, rir: 2 },
      { week: 'Sem 6', load: 95, rir: 1 },
      { week: 'Sem 7', load: 97.5, rir: 2 },
      { week: 'Sem 8', load: 100, rir: 2 },
    ],
  },
  {
    id: 'deadlift',
    name: 'Peso Muerto',
    records: [
      { week: 'Sem 1', load: 100, rir: 3 },
      { week: 'Sem 2', load: 105, rir: 2 },
      { week: 'Sem 3', load: 105, rir: 2 },
      { week: 'Sem 4', load: 110, rir: 2 },
      { week: 'Sem 5', load: 112.5, rir: 2 },
      { week: 'Sem 6', load: 115, rir: 1 },
      { week: 'Sem 7', load: 117.5, rir: 2 },
      { week: 'Sem 8', load: 120, rir: 2 },
    ],
  },
]

function getChartPoints(
  records: ProgressRecord[],
  value: (record: ProgressRecord) => number,
  min: number,
  max: number,
) {
  const range = max - min || 1
  return records
    .map((record, index) => {
      const x = 24 + (index * 552) / Math.max(records.length - 1, 1)
      const y = 156 - ((value(record) - min) / range) * 132
      return { ...record, x, y }
    })
}

function formatLoad(load: number) {
  return Number.isInteger(load) ? `${load}` : load.toFixed(1)
}

export default function AthleteProgressCharts() {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exerciseProgress[0].id,
  )

  const selectedExercise =
    exerciseProgress.find((exercise) => exercise.id === selectedExerciseId) ??
    exerciseProgress[0]

  const loadPoints = useMemo(() => {
    const loads = selectedExercise.records.map((record) => record.load)
    const min = Math.min(...loads) - 5
    const max = Math.max(...loads) + 5
    return getChartPoints(selectedExercise.records, (record) => record.load, min, max)
  }, [selectedExercise])

  const rirPoints = useMemo(
    () =>
      getChartPoints(
        selectedExercise.records,
        (record) => record.rir,
        0,
        Math.max(4, ...selectedExercise.records.map((record) => record.rir)),
      ),
    [selectedExercise],
  )

  const firstLoad = selectedExercise.records[0]?.load ?? 0
  const latestLoad =
    selectedExercise.records[selectedExercise.records.length - 1]?.load ?? 0
  const loadIncrease = latestLoad - firstLoad
  const rirAverage =
    selectedExercise.records.reduce((sum, record) => sum + record.rir, 0) /
    selectedExercise.records.length

  return (
    <section className="space-y-5 text-white" aria-label="Progreso del atleta">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
            Rendimiento
          </p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            Progreso del atleta
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Evolución de carga y esfuerzo por semana.
          </p>
        </div>

        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Seleccionar ejercicio</span>
          <Dumbbell
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF5A00]"
          />
          <select
            value={selectedExerciseId}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-900 px-10 pr-9 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#FF5A00]"
          >
            {exerciseProgress.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          />
        </label>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Carga máxima semanal
              </p>
              <p className="mt-2 text-2xl font-black">
                {formatLoad(latestLoad)}
                <span className="ml-1 text-sm font-semibold text-slate-400">kg</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 p-2.5 text-[#FF5A00]">
              <Activity aria-hidden="true" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-400">
            +{formatLoad(loadIncrease)} kg desde la primera semana
          </p>
        </article>

        <article className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400">RIR promedio</p>
              <p className="mt-2 text-2xl font-black">
                {rirAverage.toFixed(1)}
                <span className="ml-1 text-sm font-semibold text-slate-400">RIR</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 p-2.5 text-[#FF5A00]">
              <Target aria-hidden="true" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Repeticiones en reserva durante 8 semanas
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur-md sm:p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Evolución de carga</h3>
            <p className="mt-1 text-xs text-slate-500">
              Peso máximo levantado por semana · {selectedExercise.name}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FF5A00]">
            <span className="h-2 w-2 rounded-full bg-[#FF5A00]" />
            Kilogramos
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 600 210"
            role="img"
            aria-label={`Evolución semanal de carga de ${selectedExercise.name}`}
            className="h-52 min-w-[520px] w-full overflow-visible"
          >
            {[0, 1, 2, 3].map((line) => {
              const y = 24 + line * 44
              return (
                <line
                  key={line}
                  x1="24"
                  y1={y}
                  x2="576"
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
              )
            })}
            <polygon
              points={`24,180 ${loadPoints.map((point) => `${point.x},${point.y}`).join(' ')} 576,180`}
              fill="url(#loadGradient)"
            />
            <defs>
              <linearGradient id="loadGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FF5A00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF5A00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={loadPoints.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="#FF5A00"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {loadPoints.map((point) => (
              <g key={point.week}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#0f172a"
                  stroke="#FF5A00"
                  strokeWidth="3"
                />
                <text
                  x={point.x}
                  y="198"
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {point.week}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 backdrop-blur-md sm:p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Control de RIR</h3>
            <p className="mt-1 text-xs text-slate-500">
              Repeticiones en reserva registradas por semana.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-300">
            <span className="h-2 w-2 rounded-full bg-orange-300" />
            RIR
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 600 210"
            role="img"
            aria-label={`Control semanal de RIR de ${selectedExercise.name}`}
            className="h-52 min-w-[520px] w-full overflow-visible"
          >
            {[0, 1, 2, 3, 4].map((line) => {
              const y = 24 + line * 33
              return (
                <g key={line}>
                  <line
                    x1="24"
                    y1={y}
                    x2="576"
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 6"
                    strokeWidth="1"
                  />
                  <text
                    x="12"
                    y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {4 - line}
                  </text>
                </g>
              )
            })}
            <polyline
              points={rirPoints.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="#fdba74"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {rirPoints.map((point) => (
              <g key={point.week}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#0f172a"
                  stroke="#fdba74"
                  strokeWidth="3"
                />
                <text
                  x={point.x}
                  y="198"
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {point.week}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </article>
    </section>
  )
}
