'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import type { Task, TaskIcon } from '@/types'

type WhatsAppSyncResponse =
  | {
      ok: true
      task: Task
    }
  | {
      ok: false
      error: string
      details?: string
    }

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false

  const task = value as Record<string, unknown>
  const validIcons: readonly TaskIcon[] = ['video', 'phone', 'calendar', 'dumbbell']

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.time === 'string' &&
    typeof task.completed === 'boolean' &&
    typeof task.icon === 'string' &&
    validIcons.includes(task.icon as TaskIcon)
  )
}

function isWhatsAppSyncResponse(value: unknown): value is WhatsAppSyncResponse {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false

  if (value.ok === true) {
    return 'task' in value && isTask(value.task)
  }

  return value.ok === false && 'error' in value && typeof value.error === 'string'
}

export async function triggerWhatsAppSyncSimulation(): Promise<Task> {
  try {
    const requestHeaders = await headers()
    const configuredUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const host =
      requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
    const protocol =
      requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'http'
    const baseUrl = configuredUrl ?? (host ? `${protocol}://${host}` : null)

    if (!baseUrl) {
      throw new Error('No se pudo determinar la URL local de la aplicación.')
    }

    const endpoint = new URL('/api/whatsapp-sync', baseUrl)
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
      throw new Error('La URL del servicio de sincronización no es válida.')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error('El servicio de WhatsApp devolvió una respuesta no válida.')
    }

    if (!isWhatsAppSyncResponse(payload)) {
      throw new Error('El servicio de WhatsApp devolvió datos con formato no válido.')
    }

    if (!response.ok || !payload.ok) {
      const apiError = payload.ok
        ? `Error HTTP ${response.status}.`
        : payload.details
          ? `${payload.error} ${payload.details}`
          : payload.error
      throw new Error(apiError)
    }

    revalidatePath('/')
    return payload.task
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error inesperado al sincronizar el audio de WhatsApp.'
    console.error('[triggerWhatsAppSyncSimulation]', message)
    throw new Error(message)
  }
}
