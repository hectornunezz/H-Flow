/**
 * components/tabs/IAMensajesTab.tsx
 *
 * Vista provisional — Pipeline de IA y mensajes de WhatsApp.
 * Contenedor glassmorphic con estructura base lista para construir.
 */

import { AudioLines, Zap } from 'lucide-react'

export default function IAMensajesTab() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">Núcleo IA</p>
        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">IA & Mensajes</h2>
        <p className="text-xs text-slate-400 mt-1">
          Pipeline de transcripción y estructuración automática desde WhatsApp.
        </p>
      </div>

      {/* Contenedor glassmorphic provisional */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center">
            <AudioLines className="w-8 h-8 text-[#FF5A00]" />
          </div>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl animate-ping bg-[#FF5A00]/10" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 justify-center">
            <Zap className="w-4 h-4 text-[#FF5A00]" />
            Centro de Inteligencia
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Recibe audios de tus atletas por WhatsApp, transcríbelos con Groq Whisper y conviértelos en tareas accionables en segundos.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border border-slate-800 px-3 py-1.5 rounded-full">
          En construcción
        </span>
      </div>

      {/* Features preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Transcripción',  desc: 'Groq Whisper large-v3', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
          { label: 'Estructuración', desc: 'LLM → JSON Task',        color: 'text-blue-400   bg-blue-500/10   border-blue-500/20'   },
          { label: 'Persistencia',   desc: 'Supabase en tiempo real', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        ].map(({ label, desc, color }) => (
          <div
            key={label}
            className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 space-y-1.5"
          >
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${color}`}>
              {label}
            </span>
            <p className="text-xs text-slate-400 font-mono">{desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
