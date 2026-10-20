'use client'

import { Sparkles, X, Dumbbell, Activity, Check } from 'lucide-react'

export interface AIAssistantData {
  suggested_exercises: string[]
  biomechanical_reason: string
  adjusted_rir: number
}

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  aiData: AIAssistantData | null
  onApprove: () => void
}

export default function AIAssistantModal({
  isOpen,
  onClose,
  aiData,
  onApprove,
}: AIAssistantModalProps) {
  if (!isOpen || !aiData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 text-[#FF5A00]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              Sugerencia Biomecánica
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Diagnóstico / Razón Biomecánica</span>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{aiData.biomechanical_reason}</p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Ejercicios Alternativos</span>
            <div className="flex flex-wrap gap-2">
              {aiData.suggested_exercises.map((exercise, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 shadow-sm">
                  <Dumbbell className="w-3.5 h-3.5 text-[#FF5A00]" />
                  <span>{exercise}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#FF5A00]" />
              <span className="text-xs font-semibold text-slate-300">Nuevo RIR Sugerido</span>
            </div>
            <span className="px-3 py-1 text-xs font-bold font-mono text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/20 rounded-md">
              RIR {aiData.adjusted_rir}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
            Descartar
          </button>
          <button onClick={onApprove} className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#FF5A00]/20 active:scale-95 transition-all">
            <Check className="w-4 h-4" />
            <span>Aprobar y Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  )
}