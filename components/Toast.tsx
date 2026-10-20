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
          background: 'rgba(15, 23, 42, 0.92)',   // slate-950 semitransparente
          border: '1px solid rgba(51, 65, 85, 0.8)', // border-slate-700/80
          backdropFilter: 'blur(16px)',
          color: '#f1f5f9',                        // slate-100
          fontFamily: 'var(--font-geist-sans, system-ui)',
          fontSize: '13px',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,90,0,0.08)',
        },
        classNames: {
          // El ring naranja neón diferencia visualmente el éxito (marca H-Flow)
          success: 'hflow-toast-success',
          loading: 'hflow-toast-loading',
          error: 'hflow-toast-error',
        },
      }}
    />
  )
}
