'use client'

import { useState } from 'react'
import { TrendingUp, Users, Wallet } from 'lucide-react'

interface CoachFinancialSummaryProps {
  athleteCount: number
  initialAveragePrice?: number
  currency?: string
}

export default function CoachFinancialSummary({
  athleteCount,
  initialAveragePrice = 50,
  currency = 'EUR',
}: CoachFinancialSummaryProps) {
  const [averagePrice, setAveragePrice] = useState(
    Number.isFinite(initialAveragePrice) && initialAveragePrice >= 0
      ? initialAveragePrice
      : 50,
  )
  const safeAthleteCount = Number.isFinite(athleteCount)
    ? Math.max(0, Math.floor(athleteCount))
    : 0
  const monthlyRecurringRevenue = safeAthleteCount * averagePrice
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)

  return (
    <section
      aria-labelledby="financial-summary-title"
      className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 shadow-xl shadow-black/10 backdrop-blur-md sm:p-6"
    >
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Finanzas del studio
        </p>
        <h2 id="financial-summary-title" className="mt-1 text-lg font-black text-white">
          Resumen mensual
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-[#FF5A00]/20 bg-gradient-to-br from-[#FF5A00]/10 to-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Wallet aria-hidden="true" className="h-4 w-4 text-[#FF5A00]" />
            <h3 className="text-xs font-semibold">Ingresos mensuales recurrentes</h3>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-white">
            {formatCurrency(monthlyRecurringRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Estimación de MRR</p>
        </article>

        <article className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Users aria-hidden="true" className="h-4 w-4 text-[#FF5A00]" />
            <h3 className="text-xs font-semibold">Clientes activos</h3>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums text-white">
            {safeAthleteCount}
          </p>
          <label className="mt-3 block text-[11px] font-medium text-slate-400">
            Precio medio mensual por cliente
            <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3">
              <span className="text-xs text-slate-500">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency,
                  maximumFractionDigits: 0,
                }).format(0).replace(/[0-9\s.,]/g, '')}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={averagePrice}
                onChange={event => {
                  const value = event.target.valueAsNumber
                  if (Number.isFinite(value) && value >= 0) setAveragePrice(value)
                  else if (event.target.value === '') setAveragePrice(0)
                }}
                aria-label={`Precio medio mensual en ${currency}`}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
              />
              <TrendingUp aria-hidden="true" className="h-4 w-4 text-[#FF5A00]" />
            </span>
          </label>
        </article>
      </div>
    </section>
  )
}
