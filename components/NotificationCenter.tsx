'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, Bell, CheckCheck, UserPlus } from 'lucide-react'

type Notification = {
  id: string
  message: string
  time: string
  type: 'report' | 'athlete'
  read: boolean
}

const initialNotifications: Notification[] = [
  {
    id: 'report-1',
    message: 'Marcos ha reportado molestias',
    time: 'Hace 10 min',
    type: 'report',
    read: false,
  },
  {
    id: 'athlete-1',
    message: 'Nuevo atleta inscrito',
    time: 'Hace 1 h',
    type: 'athlete',
    read: false,
  },
  {
    id: 'report-2',
    message: 'Lucía ha completado su reporte semanal',
    time: 'Ayer',
    type: 'report',
    read: true,
  },
]

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const containerRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notificaciones${unreadCount ? `: ${unreadCount} sin leer` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-300 transition hover:border-slate-700/70 hover:bg-slate-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00]/60"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-950 bg-[#FF5A00] px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notificaciones recientes"
          className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/85 shadow-2xl shadow-black/40 backdrop-blur-2xl"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-white">Notificaciones</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#FF8A4C] transition hover:bg-white/5 disabled:cursor-default disabled:text-slate-500"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Marcar todas como leídas
            </button>
          </header>

          {notifications.length > 0 ? (
            <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {notifications.map((notification) => {
                const Icon = notification.type === 'report' ? Activity : UserPlus
                return (
                  <li key={notification.id}>
                    <div
                      className={`flex gap-3 px-4 py-3.5 transition ${
                        notification.read ? 'opacity-65' : 'bg-white/[0.035]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          notification.type === 'report'
                            ? 'border-amber-400/15 bg-amber-400/10 text-amber-300'
                            : 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-slate-100">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {notification.time}
                        </p>
                      </div>
                      {!notification.read && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF5A00]"
                          aria-label="Sin leer"
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No tienes notificaciones recientes.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
