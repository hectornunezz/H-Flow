'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import HFlowLogo from '@/components/HFlowLogo'
import ThemeToggle from '@/components/ThemeToggle'
import DashboardTab from '@/components/tabs/DashboardTab'
import AtletasTab from '@/components/tabs/AtletasTab'
import AjustesTab from '@/components/tabs/AjustesTab'
import type {
  AssignedWorkoutRecord,
  ExerciseRecord,
  ProfileRecord,
  WorkoutRecord,
} from '@/types'

type TabId = 'dashboard' | 'atletas' | 'ajustes'

interface NavItem {
  id: TabId
  label: string
  Icon: LucideIcon
  badge?: number
}

export interface AppShellProps {
  user: { id: string; email: string | undefined; name: string }
  athleteCount: number
  pendingCount: number
  workoutCount: number
  exerciseCount: number
  profiles: ProfileRecord[]
  workouts: WorkoutRecord[]
  exercises: ExerciseRecord[]
  assignedWorkouts: AssignedWorkoutRecord[]
}

export default function AppShell({
  user,
  athleteCount,
  pendingCount,
  workoutCount,
  profiles,
}: AppShellProps) {
  const [active, setActive] = useState<TabId>('dashboard')

  const NAV: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'atletas', label: 'Atletas', Icon: Users, badge: athleteCount || undefined },
    { id: 'ajustes', label: 'Ajustes', Icon: Settings },
  ]

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
      case 'ajustes':
        return <AjustesTab user={user} />
    }
  })()

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-[#0A0A0A] dark:bg-[#0A0A0A] dark:text-white transition-colors">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800/80 dark:bg-[#111111]">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pt-1">
            <HFlowLogo className="h-7 w-10" showText />
            <ThemeToggle />
          </div>

          <nav className="space-y-1.5">
            {NAV.map(({ id, label, Icon, badge }) => {
              const isActive = active === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`flex w-full items-center justify-between rounded-full px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]'
                      : 'text-neutral-500 hover:bg-neutral-200/70 hover:text-[#0A0A0A] dark:text-neutral-400 dark:hover:bg-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  {badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#FF6B00] text-white'
                          : 'bg-neutral-200 text-neutral-700 dark:bg-[#1F1F1F] dark:text-neutral-300'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800/80 dark:bg-[#0A0A0A]">
          <p className="truncate text-xs font-bold">{user.name}</p>
          <p className="truncate font-mono text-[10px] text-neutral-500">{user.email}</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Mobile */}
        <header className="flex md:hidden items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800/80 dark:bg-[#111111]">
          <HFlowLogo className="h-6 w-9" showText />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          {content}
        </main>

        {/* Bottom Nav Mobile (Píldoras de alto contraste) */}
        <nav className="fixed bottom-0 inset-x-0 flex md:hidden items-center justify-around border-t border-neutral-200 bg-white/95 backdrop-blur-md px-2 py-2.5 dark:border-neutral-800/80 dark:bg-[#111111]/95">
          {NAV.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-[#0A0A0A]'
                    : 'text-neutral-500 hover:text-[#0A0A0A] dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}