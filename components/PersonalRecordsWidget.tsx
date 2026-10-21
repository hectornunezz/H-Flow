'use client'

import { ArrowUpRight, Minus, Trophy } from 'lucide-react'

export type PersonalRecord = {
  id: string
  exercise: string
  weight: number
  previousMonthWeight: number
}

type PersonalRecordsWidgetProps = {
  records: PersonalRecord[]
}

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(1)
}

export default function PersonalRecordsWidget({
  records,
}: PersonalRecordsWidgetProps) {
  return (
    <section
      aria-labelledby="personal-records-title"
      className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 text-white shadow-xl shadow-black/20 backdrop-blur-xl"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
            Rendimiento
          </p>
          <h2 id="personal-records-title" className="mt-1 text-base font-extrabold">
            Récords personales
          </h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF8A4C]">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
      </header>

      {records.length > 0 ? (
        <ul className="divide-y divide-white/5">
          {records.map((record) => {
            const improvement = record.weight - record.previousMonthWeight
            const improved = improvement > 0

            return (
              <li
                key={record.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-200">
                    {record.exercise}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatWeight(record.weight)} kg
                  </p>
                </div>

                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${
                    improved
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/80 text-slate-400'
                  }`}
                  aria-label={
                    improved
                      ? `Mejora de ${formatWeight(improvement)} kilogramos respecto al mes anterior`
                      : 'Sin mejora respecto al mes anterior'
                  }
                >
                  {improved ? (
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {improved ? '+' : ''}
                  {formatWeight(improvement)} kg
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          Aún no hay récords personales registrados.
        </p>
      )}

      {records.length > 0 && (
        <p className="border-t border-white/5 px-5 py-3 text-[11px] text-slate-500">
          Variación respecto al mes anterior
        </p>
      )}
    </section>
  )
}
