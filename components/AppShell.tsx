'use client'

import { useState }      from 'react'
import Image             from 'next/image'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import DashboardTab   from '@/components/tabs/DashboardTab'
import AtletasTab     from '@/components/tabs/AtletasTab'
import IAMensajesTab  from '@/components/tabs/IAMensajesTab'
import AjustesTab     from '@/components/tabs/AjustesTab'
import type {
  AssignedWorkoutRecord,
  ExerciseRecord,
  ProfileRecord,
  WorkoutRecord,
} from '@/types'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'atletas' | 'ia' | 'ajustes'

interface NavItem {
  id:     TabId
  label:  string
  Icon:   LucideIcon
  badge?: number
}

export interface AppShellProps {
  user:          { id: string; email: string | undefined; name: string }
  athleteCount:  number
  pendingCount:  number
  workoutCount:  number
  exerciseCount: number
  profiles:      ProfileRecord[]
  workouts:      WorkoutRecord[]
  exercises:     ExerciseRecord[]
  assignedWorkouts: AssignedWorkoutRecord[]
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function AppShell({
  user,
  athleteCount,
  pendingCount,
  workoutCount,
  profiles,
}: AppShellProps) {
  const [active, setActive] = useState<TabId>('dashboard')

  const NAV: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
    { id: 'atletas',   label: 'Atletas',       Icon: Users,         badge: athleteCount || undefined },
    { id: 'ia',        label: 'IA & Mensajes', Icon: MessageSquare },
    { id: 'ajustes',   label: 'Ajustes',       Icon: Settings },
  ]

  // ── Render del contenido según tab activa ─────────────────────────────────
  const content = (() => {
    switch (active) {
      case 'dashboard':
        return (
          <DashboardTab
            userName={user.name}
            athleteCount={athleteCount}
            pendingCount={pendingCount}
            workoutCount={workoutCount}
          />
        )
      case 'atletas':
        return <AtletasTab profiles={profiles} />
      case 'ia':
        return <IAMensajesTab />
      case 'ajustes':
        return <AjustesTab user={user} />
    }
  })()

  return (
    /* Viewport completo — no scroll en el shell, scroll dentro del main */
    <div className="flex h-dvh overflow-hidden bg-[#030712]">

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR — solo desktop (lg+)
      ═══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-slate-900/50 border-r border-slate-800/60 backdrop-blur-xl">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800/60 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700/60 flex items-center justify-center overflow-hidden ring-1 ring-white/5">
            <Image src="/Logo.png" alt="H-Flow" width={32} height={32} className="object-cover" priority />
          </div>
          <div>
            <p className="font-black text-sm tracking-wider text-white leading-none">H-FLOW</p>
            <p className="text-[9px] font-bold text-[#f97316] uppercase tracking-widest mt-0.5">Coach Studio</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegación principal">
          {NAV.map(({ id, label, Icon, badge }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-150 group',
                  isActive
                    ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-[#030712] border border-[#f97316]/20 shadow-sm shadow-orange-950/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && (
                  <span className={[
                    'text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center',
                    isActive
                      ? 'bg-[#f97316]/20 text-[#f97316]'
                      : 'bg-slate-800 text-slate-400',
                  ].join(' ')}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User chip */}
        <div className="px-3 pb-4 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[10px] font-black text-[#f97316]">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[9px] text-slate-500 truncate">Coach</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMNA DERECHA — header mobile + contenido + bottom nav
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile header (oculto en desktop) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center overflow-hidden">
              <Image src="/Logo.png" alt="H-Flow" width={28} height={28} className="object-cover" />
            </div>
            <span className="font-black text-sm tracking-wider text-white">H-FLOW</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-300"
              role="img"
              aria-label={`Notificaciones: ${pendingCount} tareas pendientes`}
              title={`${pendingCount} tareas pendientes`}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-950 bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[10px] font-black text-[#f97316]">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content area — scrollable */}
        <main className="flex-1 overflow-y-auto">
          {/* Padding bottom para dejar espacio al bottom nav en mobile */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-8">
            {content}
          </div>
        </main>

        {/* Bottom nav — solo mobile (oculto en desktop) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/60"
          aria-label="Navegación inferior"
        >
          <div className="flex items-center justify-around px-2 py-2">
            {NAV.map(({ id, label, Icon, badge }) => {
              const isActive = active === id
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={[
                    'relative flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl transition-all duration-150',
                    isActive ? 'text-[#f97316]' : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {/* Indicador activo */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#f97316]" />
                  )}

                  <div className="relative">
                    <Icon className="w-5 h-5" aria-hidden />
                    {badge !== undefined && badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 bg-[#f97316] text-white text-[8px] font-black rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-semibold leading-none">
                    {label === 'IA & Mensajes' ? 'IA' : label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

      </div>
    </div>
  )
}
