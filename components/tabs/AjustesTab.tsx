/**
 * components/tabs/AjustesTab.tsx
 *
 * Vista de Ajustes — perfil del coach y configuración del studio.
 */

import { signout } from '@/app/actions'
import { LogOut, User, Shield, Bell } from 'lucide-react'

interface Props {
  user: { id: string; email: string | undefined; name: string }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-900/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AjustesTab({ user }: Props) {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">Configuración</p>
        <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Ajustes</h2>
      </div>

      {/* Perfil */}
      <Section title="Tu perfil">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center font-black text-lg text-[#FF5A00] shadow-inner">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-bold text-white text-sm truncate">{user.name}</p>
            <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
            <span className="inline-block text-[9px] font-black bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Coach
            </span>
          </div>
        </div>
      </Section>

      {/* Opciones placeholder */}
      <Section title="Preferencias">
        <div className="space-y-1">
          {[
            { Icon: User,   label: 'Editar perfil',          sub: 'Nombre, avatar y bio'            },
            { Icon: Bell,   label: 'Notificaciones',         sub: 'Alertas de check-ins y tareas'   },
            { Icon: Shield, label: 'Seguridad',              sub: 'Contraseña y 2FA'               },
          ].map(({ Icon, label, sub }) => (
            <button
              key={label}
              disabled
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left opacity-50 cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-[11px] text-slate-500">{sub}</p>
              </div>
              <span className="text-[9px] font-bold text-slate-600 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Pronto
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* Cerrar sesión */}
      <Section title="Sesión">
        <form action={signout}>
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            Cerrar sesión
          </button>
        </form>
      </Section>

      {/* Version */}
      <p className="text-center text-[10px] text-slate-700 font-mono">
        H-Flow Studio · v0.1.0-beta
      </p>

    </div>
  )
}
