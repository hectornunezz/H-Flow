'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Sparkles, X } from 'lucide-react'

type NewRoutineAlertBannerProps = {
  routineId: string
  routineTitle?: string
  isNew: boolean
  href?: string
}

export default function NewRoutineAlertBanner({
  routineId,
  routineTitle = 'Tu nueva planificación semanal',
  isNew,
  href = '/client-portal#workout',
}: NewRoutineAlertBannerProps) {
  const [dismissedRoutineId, setDismissedRoutineId] = useState<string | null>(null)

  if (!isNew || dismissedRoutineId === routineId) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-3 z-50 mx-auto w-auto max-w-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-500 sm:inset-x-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#FF5A00]/30 bg-slate-900/95 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-4">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF5A00]/15 text-[#FF8A4C]">
          <span className="absolute inset-0 rounded-xl bg-[#FF5A00]/10 motion-safe:animate-pulse" />
          <Sparkles className="relative h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF8A4C]">
            Nueva planificación
          </p>
          <p className="mt-0.5 truncate text-sm font-bold">{routineTitle}</p>
        </div>

        <Link
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#FF5A00] px-3 text-xs font-extrabold text-white transition hover:bg-[#e65000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A4C] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:px-4"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ver rutina</span>
          <span className="sm:hidden">Ver</span>
        </Link>

        <button
          type="button"
          onClick={() => setDismissedRoutineId(routineId)}
          aria-label="Cerrar aviso de nueva planificación"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A4C]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
