'use client'

/**
 * components/AgendaWidget.tsx
 *
 * Agenda del día — widget central del Command Center de H-Flow.
 *
 * Cambios de esta iteración (Persistencia + UX de Producción):
 *  - PASO 4: Fetch inicial desde Supabase con Skeleton Loader de 3 tarjetas fantasma.
 *  - PASO 5: Optimistic UI al completar: tachado instantáneo + desvanecimiento
 *            + UPDATE asíncrono a Supabase en background.
 *  - PASO 6: Toast notifications vía sonner para todo el ciclo de vida de la IA.
 *
 * Decisiones técnicas:
 *  - Usamos el cliente anónimo de lib/supabase.ts (no el helper SSR) porque este
 *    es un Client Component y no necesita acceso al contexto de sesión en servidor.
 *  - El campo `status` de Supabase ('pending' | 'completed') convive con el campo
 *    `completed: boolean` de la interfaz Task para máxima compatibilidad hacia atrás.
 *  - Los skeleton loaders usan animate-pulse nativo de Tailwind para evitar
 *    dependencias extra y mantener coherencia con el sistema de diseño.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Video,
  Phone,
  CalendarClock,
  Dumbbell,
  Check,
  AudioLines,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Task, TaskIcon } from '@/types'
import Button from '@/components/Button'

// ─── Mapas de iconos y constantes de timing ──────────────────────────────────

const ICON_MAP: Record<TaskIcon, LucideIcon> = {
  video:    Video,
  phone:    Phone,
  calendar: CalendarClock,
  dumbbell: Dumbbell,
}

const EXIT_MS = 900   // Tiempo que la tarjeta permanece visible con tachado antes de salir
const FADE_MS = 300   // Duración de la transición CSS de salida (debe coincidir con duration-300)

// ─── Tipos ───────────────────────────────────────────────────────────────────

type WhatsAppSyncResponse =
  | { ok: true;  transcription: string; task: Task }
  | { ok: false; error: string; details?: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Transforma una fila de Supabase (snake_case) al tipo Task (camelCase).
 * Fuerza un icono válido en caso de datos corruptos.
 */
function rowToTask(row: Record<string, unknown>): Task {
  const icon = (typeof row.icon === 'string' && row.icon in ICON_MAP)
    ? (row.icon as TaskIcon)
    : 'dumbbell'

  return {
    id:            String(row.id),
    title:         String(row.title ?? ''),
    time:          String(row.time  ?? '—'),
    completed:     row.status === 'completed' || row.completed === true,
    icon,
    athleteId:     row.athlete_id   ? String(row.athlete_id)   : null,
    trainerId:     row.trainer_id   ? String(row.trainer_id)   : null,
    scheduledDate: row.scheduled_date ? String(row.scheduled_date) : undefined,
  }
}

/**
 * Normaliza la tarea que devuelve el endpoint /api/whatsapp-sync antes de
 * añadirla optimísticamente al estado local.
 */
function normalizeIncomingTask(task: Task, existingIds: Set<string>): Task {
  const icon: TaskIcon = task.icon in ICON_MAP ? task.icon : 'dumbbell'
  const id =
    task.id && !existingIds.has(task.id)
      ? task.id
      : `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    ...task,
    id,
    icon,
    completed: false,
    title:  task.title?.trim() || 'Nueva tarea desde WhatsApp',
    time:   task.time?.trim()  || '—',
  }
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

/**
 * Tres tarjetas fantasma que imitan exactamente la estructura visual de las
 * tarjetas reales. Usan animate-pulse de Tailwind para la animación shimmer.
 */
function AgendaSkeleton() {
  return (
    <ul className="space-y-2.5 sm:space-y-3" aria-label="Cargando agenda…" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-2.5 sm:gap-4 rounded-2xl border border-slate-800/60
                     bg-slate-900/40 backdrop-blur-md px-3 py-3 sm:px-4 sm:py-3.5 shadow-lg
                     animate-pulse"
        >
          {/* Hora */}
          <span className="h-3.5 w-12 sm:w-14 rounded-md bg-slate-800/80 shrink-0" />

          {/* Ícono circular */}
          <span className="h-9 w-9 rounded-xl bg-slate-800/80 shrink-0" />

          {/* Título — ancho variable para simular texto real */}
          <span
            className="h-3.5 flex-1 rounded-md bg-slate-800/80"
            style={{ maxWidth: `${55 + i * 15}%` }}
          />

          {/* Botón completar */}
          <span className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-slate-800/80 shrink-0" />
        </li>
      ))}
    </ul>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AgendaWidget() {
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(true)   // true → mostrar skeleton
  const [syncing,    setSyncing]    = useState(false)
  const [syncError,  setSyncError]  = useState<string | null>(null)

  // ── PASO 4: Cargar tareas pendientes desde Supabase al montar ──────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)           // Solo pendientes en la agenda del día
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AgendaWidget] Error cargando tasks:', error.message)
      // No bloqueamos la UI; mostramos agenda vacía con opción de simular audio.
    } else if (data) {
      setTasks((data as Record<string, unknown>[]).map(rowToTask))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  // ── PASO 5: Completar tarea con Optimistic UI ──────────────────────────────
  const completeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task || task.completed || exitingIds.has(id)) return

    // 1. Optimistic: marcamos como completada en la UI de forma inmediata.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true } : t)))

    // 2. Después del delay visual, iniciamos la animación de salida.
    window.setTimeout(() => {
      setExitingIds((prev) => new Set(prev).add(id))

      // 3. Cuando termina la transición CSS, eliminamos la tarjeta del DOM.
      window.setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        setExitingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, FADE_MS)
    }, EXIT_MS)

    // 4. Background: UPDATE asíncrono a Supabase (fire-and-forget con log).
    //    Si falla, la UI ya reflejó el cambio; el dato se corregirá al recargar.
    //    En una iteración futura podríamos revertir el optimistic update si hay error.
    supabase
      .from('tasks')
      .update({ completed: true, status: 'completed' })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('[AgendaWidget] Error actualizando task en Supabase:', error.message)
        }
      })
  }

  // ── PASO 6: Simular audio de WhatsApp con toasts ───────────────────────────
  const simulateWhatsAppAudio = async () => {
    if (syncing) return

    setSyncing(true)
    setSyncError(null)

    // Toast de estado "en proceso" — permanece hasta que lo resolvamos.
    const toastId = toast.loading('🎙️ Simulando audio de WhatsApp…', {
      description: 'Groq Whisper → LLM → Supabase',
    })

    try {
      const res  = await fetch('/api/whatsapp-sync', { method: 'POST' })
      const data = (await res.json()) as WhatsAppSyncResponse

      if (!res.ok || !data.ok) {
        const fail = data as Extract<WhatsAppSyncResponse, { ok: false }>
        throw new Error(fail.details || fail.error || `Error ${res.status}`)
      }

      // Añadimos la tarea al estado local (el INSERT ya ocurrió en el servidor).
      setTasks((prev) => {
        const existingIds  = new Set(prev.map((t) => t.id))
        const incoming     = normalizeIncomingTask(data.task, existingIds)
        return [incoming, ...prev]
      })

      // Toast de éxito con título de la tarea creada.
      toast.success('✅ Tarea estructurada y guardada.', {
        id:          toastId,
        description: data.task.title,
        duration:    4000,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo simular el audio de WhatsApp.'

      setSyncError(message)

      toast.error('❌ Error al procesar el audio.', {
        id:          toastId,
        description: message,
        duration:    6000,
      })
    } finally {
      setSyncing(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Agenda de hoy
        </h2>
        {!loading && tasks.length > 0 && (
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
            {tasks.filter((t) => !t.completed).length} pendientes
          </span>
        )}
      </div>

      {/* ── SKELETON mientras carga desde Supabase ── */}
      {loading ? (
        <AgendaSkeleton />
      ) : tasks.length === 0 ? (
        <p className="rounded-2xl border border-slate-800/80 bg-slate-900/30 px-4 py-6 text-center text-xs text-slate-500 italic">
          Agenda limpia. Buen trabajo, coach.
        </p>
      ) : (
        <ul className="space-y-2.5 sm:space-y-3">
          {tasks.map((task) => {
            const Icon     = ICON_MAP[task.icon] ?? Dumbbell
            const isDone   = task.completed
            const isExiting = exitingIds.has(task.id)

            return (
              <li
                key={task.id}
                className={[
                  'flex items-center gap-2.5 sm:gap-4 rounded-2xl border',
                  'backdrop-blur-md px-3 py-3 sm:px-4 sm:py-3.5 shadow-lg',
                  'transition-all duration-300 ease-out',
                  isDone
                    ? 'border-slate-800 bg-slate-950/80'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600',
                  isExiting
                    ? 'opacity-0 -translate-y-2 scale-[0.98] pointer-events-none'
                    : 'opacity-100 translate-y-0 scale-100',
                ].join(' ')}
              >
                {/* Hora */}
                <span className="shrink-0 w-14 sm:w-16 text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 tabular-nums">
                  {task.time}
                </span>

                {/* Ícono semántico */}
                <div
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    'border border-slate-700/80 bg-slate-950/60',
                    'transition-colors duration-300',
                    isDone ? 'text-slate-600' : 'text-[#FF5A00]',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </div>

                {/* Título — tachado suave al completar */}
                <p
                  className={[
                    'min-w-0 flex-1 text-xs sm:text-sm font-medium leading-snug',
                    'transition-all duration-300',
                    isDone
                      ? 'line-through text-slate-500 decoration-slate-600'
                      : 'text-slate-100',
                  ].join(' ')}
                >
                  {task.title}
                </p>

                {/* Botón completar */}
                <button
                  type="button"
                  onClick={() => completeTask(task.id)}
                  disabled={isDone}
                  aria-label={`Completar: ${task.title}`}
                  aria-pressed={isDone}
                  className={[
                    'flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full',
                    'border transition-all duration-200 active:scale-95',
                    'disabled:cursor-default',
                    isDone
                      ? 'border-[#FF5A00] bg-[#FF5A00] text-white shadow-[0_0_12px_rgba(255,90,0,0.45)]'
                      : 'border-slate-600 bg-slate-950/40 text-slate-500 hover:border-[#FF5A00] hover:bg-[#FF5A00]/15 hover:text-[#FF5A00] hover:shadow-[0_0_14px_rgba(255,90,0,0.35)]',
                  ].join(' ')}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Botón de simulación + error inline ── */}
      <div className="flex flex-col items-stretch sm:items-start gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={simulateWhatsAppAudio}
          disabled={syncing}
          className="w-full sm:w-auto text-slate-500 hover:text-slate-200 font-medium"
          aria-busy={syncing}
        >
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <AudioLines className="h-3.5 w-3.5" aria-hidden />
          )}
          {syncing ? 'Procesando audio…' : 'Simular Audio WhatsApp'}
        </Button>

        {syncError && (
          <p className="text-[11px] text-rose-400/90 leading-relaxed max-w-md" role="alert">
            {syncError}
          </p>
        )}
      </div>
    </section>
  )
}
