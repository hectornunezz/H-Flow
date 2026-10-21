/**
 * components/Toast.tsx
 *
 * Re-exporta el <Toaster> de sonner configurado con la estética Dark Mode
 * de H-Flow (#FF5A00 como acento, glassmorphism oscuro, fuente limpia).
 *
 * Uso:
 *   - Monta <HFlowToaster /> una sola vez en layout.tsx (ya incluido).
 *   - Desde cualquier Client Component importa { toast } de 'sonner' y llama:
 *       toast.loading("Simulando audio...")
 *       toast.success("Tarea estructurada y guardada.")
 *       toast.error("Error al guardar.")
 *
 * Decisión técnica: preferimos sonner sobre react-hot-toast porque soporta
 * promesas con toast.promise(), tiene animaciones más fluidas y es < 3 KB gzip.
 */

'use client'

import { Toaster } from 'sonner'

export function HFlowToaster() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: '#0f172a',
          border: '1px solid #1e293b',
          backdropFilter: 'blur(16px)',
          color: '#f1f5f9',
          fontFamily: 'var(--font-geist-sans, system-ui)',
          fontSize: '13px',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 18px rgba(255, 90, 0, 0.12)',
        },
        classNames: {
          success: 'hflow-toast-success border-l-2 border-l-[#FF5A00]',
          loading: 'hflow-toast-loading',
          error: 'hflow-toast-error border-l-2 border-l-[#FF5A00]',
        },
      }}
    />
  )
}
