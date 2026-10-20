'use client'

/**
 * components/DashboardTabs.tsx
 *
 * Navegador de pestañas principal del Command Center de H-Flow.
 * Recibe todos los datos ya hidratados desde page.tsx (Server Component)
 * y gestiona el estado de la pestaña activa en el cliente.
 *
 * Decisión técnica: sticky top-14 (altura del header) para que la barra
 * de pestañas quede anclada justo debajo del header al hacer scroll.
 */

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarDays,
  BookOpen,
} from 'lucide-react'
import OverviewTab   from '@/components/tabs/OverviewTab'
import AtletasTab    from '@/components/tabs/AtletasTab'
import RutinasTab    from '@/components/tabs/RutinasTab'
import CalendarioTab from '@/components/tabs/CalendarioTab'
import BibliotecaTab from '@/components/tabs/BibliotecaTab'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'atletas' | 'rutinas' | 'calendario' | 'biblioteca'

interface TabDef {
  id:         TabId
  label:      string
  shortLabel: string
  Icon:       React.ElementType
  badge?:     number
}

export interface DashboardTabsProps {
  user:              { id: string; email: string | undefined }
  exercises:         any[]
  workouts:          any[]
  profiles:          any[]
  assignedWorkouts:  any[]
  athleteCount:      number
  workoutCount:      number
  exerciseCount:     number
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DashboardTabs({
  user,
  exercises,
  workouts,
  profiles,
  assignedWorkouts,
  athleteCount,
  workoutCount,
  exerciseCount,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const TABS: TabDef[] = [
    { id: 'overview',    label: 'Dashboard',   shortLabel: 'Home',    Icon: LayoutDashboard },
    { id: 'atletas',     label: 'Atletas',     shortLabel: 'Atletas', Icon: Users,       badge: athleteCount   || undefined },
    { id: 'rutinas',     label: 'Rutinas',     shortLabel: 'Rutinas', Icon: Dumbbell,    badge: workoutCount   || undefined },
    { id: 'calendario',  label: 'Calendario',  shortLabel: 'Cal.',    Icon: CalendarDays, badge: assignedWorkouts.filter((a: any) => !a.completed).length || undefined },
    { id: 'biblioteca',  label: 'Biblioteca',  shortLabel: 'Biblio.', Icon: BookOpen,    badge: exerciseCount  || undefined },
  ]

  return (
    <div>
      {/* ── Tab Navigation Bar ── */}
      <nav
        className="sticky top-14 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50"
        aria-label="Navegación principal"
      >
        <div className="flex overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {TABS.map(({ id, label, shortLabel, Icon, badge }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-selected={isActive}
                role="tab"
                className={[
                  'relative flex items-center gap-2 px-3 sm:px-5 py-3.5',
                  'text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0',
                  'border-b-2 transition-all duration-200 outline-none',
                  isActive
                    ? 'border-[#FF5A00] text-[#FF5A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>

                {/* Badge con conteo */}
                {badge !== undefined && badge > 0 && (
                  <span
                    className={[
                      'inline-flex items-center justify-center rounded-full text-[9px] font-black',
                      'min-w-[16px] h-4 px-1 leading-none',
                      isActive
                        ? 'bg-[#FF5A00]/20 text-[#FF5A00]'
                        : 'bg-slate-800 text-slate-400',
                    ].join(' ')}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Tab Content ── */}
      <div className="px-4 sm:px-6 py-6 sm:py-8" role="tabpanel">
        {activeTab === 'overview' && (
          <OverviewTab
            athleteCount={athleteCount}
            workoutCount={workoutCount}
            exerciseCount={exerciseCount}
            pendingTasksCount={assignedWorkouts.filter((a: any) => !a.completed).length}
          />
        )}
        {activeTab === 'atletas' && (
          <AtletasTab profiles={profiles} />
        )}
        {activeTab === 'rutinas' && (
          <RutinasTab workouts={workouts} exercises={exercises} />
        )}
        {activeTab === 'calendario' && (
          <CalendarioTab
            workouts={workouts}
            profiles={profiles}
            assignedWorkouts={assignedWorkouts}
          />
        )}
        {activeTab === 'biblioteca' && (
          <BibliotecaTab exercises={exercises} />
        )}
      </div>
    </div>
  )
}
