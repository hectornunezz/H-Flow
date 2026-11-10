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
  CheckCircle2,
  BookOpen,
  Settings,
  Activity,
  Utensils,
} from 'lucide-react'

// Componentes y vistas principales de H-Flow
import AthletesManager from '@/components/AthletesManager'
import VoiceSimulatorWidget from '@/components/VoiceSimulatorWidget'
import OverviewTab   from '@/components/tabs/OverviewTab'
import RutinasTab    from '@/components/tabs/RutinasTab'
import CalendarioTab from '@/components/tabs/CalendarioTab'
import BibliotecaTab from '@/components/tabs/BibliotecaTab'
import AjustesTab    from '@/components/tabs/AjustesTab'
import AthleteProgressCharts from '@/components/AthleteProgressCharts'
import NutritionPlanner from '@/components/NutritionPlanner'
import type {
  AssignedWorkoutRecord,
  ExerciseRecord,
  ProfileRecord,
  WorkoutRecord,
} from '@/types'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TabId =
  | 'overview'
  | 'atletas'
  | 'rutinas'
  | 'calendario'
  | 'biblioteca'
  | 'ia-mensajes'
  | 'progreso'
  | 'nutricion'
  | 'ajustes'

interface TabDef {
  id:         TabId
  label:      string
  shortLabel: string
  Icon:       React.ElementType
  badge?:     number
}

export interface DashboardTabsProps {
  user:               { id: string; email: string | undefined }
  exercises:          ExerciseRecord[]
  workouts:           WorkoutRecord[]
  profiles:           ProfileRecord[]
  assignedWorkouts:   AssignedWorkoutRecord[]
  athleteCount:       number
  workoutCount:       number
  exerciseCount:      number
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
  const [currentDate] = useState(() =>
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date()),
  )

  const TABS: TabDef[] = [
    { id: 'overview',     label: 'Dashboard',   shortLabel: 'Home',     Icon: LayoutDashboard },
    { id: 'atletas',      label: 'Atletas',     shortLabel: 'Atletas', Icon: Users,       badge: athleteCount   || undefined },
    { id: 'rutinas',      label: 'Rutinas',     shortLabel: 'Rutinas', Icon: Dumbbell,    badge: workoutCount   || undefined },
    { id: 'calendario',   label: 'Calendario',  shortLabel: 'Cal.',    Icon: CalendarDays, badge: assignedWorkouts.filter((assignment) => !assignment.completed).length || undefined },
    { id: 'biblioteca',   label: 'Biblioteca',  shortLabel: 'Biblio.', Icon: BookOpen,    badge: exerciseCount  || undefined },
    { id: 'ia-mensajes',  label: 'IA & Voz',    shortLabel: 'IA',      Icon: Activity },
    { id: 'progreso',     label: 'Progreso',    shortLabel: 'Prog.',   Icon: Activity },
    { id: 'nutricion',    label: 'Nutrición',   shortLabel: 'Nutri.',  Icon: Utensils },
    { id: 'ajustes',      label: 'Ajustes',     shortLabel: 'Ajustes', Icon: Settings },
  ]

  return (
    <div className="pb-20 transition-all duration-300 ease-in-out md:pb-0">
      {/* ── Tab Navigation Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 md:sticky md:top-14 md:bottom-auto md:z-40 md:bg-slate-950/80 md:border-t-0 md:border-b md:border-slate-800/50"
        aria-label="Navegación principal"
      >
        <div className="flex overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] transition-all duration-300 ease-in-out">
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
                  'border-b-2 transition-all duration-300 ease-in-out outline-none',
                  isActive
                    ? 'border-[#f97316] text-[#f97316]'
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
                        ? 'bg-[#f97316]/20 text-[#f97316]'
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
      <div className="px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300 ease-in-out animate-in fade-in zoom-in-95" role="tabpanel">
        {activeTab === 'overview' && (
          <>
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-gradient-to-r from-[#f97316]/10 via-slate-900/40 to-transparent p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f97316]/20 bg-[#f97316]/10 text-[#f97316]">
                  <CalendarDays className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Hoy en H-Flow
                  </p>
                  <time
                    className="mt-1 block text-sm font-semibold capitalize text-white"
                  >
                    {currentDate}
                  </time>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                IA Activa y Sincronizada
              </span>
            </div>
            <OverviewTab
              athleteCount={athleteCount}
              workoutCount={workoutCount}
              exerciseCount={exerciseCount}
              pendingTasksCount={assignedWorkouts.filter((assignment) => !assignment.completed).length}
            />
          </>
        )}

        {activeTab === 'atletas' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Gestión de Atletas (CRM)</h2>
            <AthletesManager />
          </div>
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

        {activeTab === 'ia-mensajes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Centro de Inteligencia de Audio</h2>
            <VoiceSimulatorWidget />
          </div>
        )}

        {activeTab === 'progreso' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Análisis de Progreso</h2>
            <AthleteProgressCharts />
          </div>
        )}

        {activeTab === 'nutricion' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Planificación Nutricional</h2>
            <NutritionPlanner />
          </div>
        )}

        {activeTab === 'ajustes' && (
          <AjustesTab
            user={{
              ...user,
              name: profiles.find((profile) => profile.id === user.id)?.full_name
                ?? user.email?.split('@')[0]
                ?? 'Coach',
            }}
          />
        )}
      </div>
    </div>
  )
}
