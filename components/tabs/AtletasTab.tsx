/**
 * components/tabs/AtletasTab.tsx
 *
 * Vista provisional — Gestión de atletas.
 * Contenedor glassmorphic con estructura base lista para construir.
 */

import { Users } from 'lucide-react'
import type { ProfileRecord } from '@/types'

interface Props {
  profiles: ProfileRecord[]
}

export default function AtletasTab({ profiles }: Props) {
  const athletes = profiles.filter((profile) => profile.role === 'athlete')

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">Roster</p>
        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Atletas</h2>
        <p className="text-xs text-slate-400 mt-1">
          {athletes.length > 0
            ? `${athletes.length} atleta${athletes.length !== 1 ? 's' : ''} en tu roster.`
            : 'Aún no tienes atletas registrados.'}
        </p>
      </div>

      {/* Contenedor glassmorphic provisional */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Users className="w-8 h-8 text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white">Gestión de Atletas</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Aquí podrás ver el roster completo, métricas individuales, audios de WhatsApp y el historial de cada deportista.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border border-slate-800 px-3 py-1.5 rounded-full">
          En construcción
        </span>
      </div>

    </div>
  )
}
