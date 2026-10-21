'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { signout } from '@/app/actions'
import ThemeToggle from '@/components/ThemeToggle'
import { LogOut, Save, Shield, User } from 'lucide-react'

interface Props {
  user: { id: string; email: string | undefined; name: string }
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-lg shadow-black/10">
      <div className="border-b border-slate-700/60 px-5 py-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#FF5A00]' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function AjustesTab({ user }: Props) {
  const [name, setName] = useState(user.name)
  const [specialty, setSpecialty] = useState('Entrenamiento de fuerza')
  const [contact, setContact] = useState(user.email ?? '')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [checkInNotifications, setCheckInNotifications] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Configuración
        </p>
        <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Ajustes</h2>
        <p className="mt-1 text-xs text-slate-400">
          Administra tu perfil y las preferencias de tu cuenta.
        </p>
      </header>

      <Section title="Perfil profesional">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-300">
              Nombre
              <div className="relative mt-2">
                <User
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setSaved(false)
                  }}
                  required
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#FF5A00]"
                />
              </div>
            </label>
            <label className="text-xs font-semibold text-slate-300">
              Especialidad
              <input
                value={specialty}
                onChange={(event) => {
                  setSpecialty(event.target.value)
                  setSaved(false)
                }}
                placeholder="Ej. Preparación física"
                className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#FF5A00]"
              />
            </label>
            <label className="text-xs font-semibold text-slate-300 sm:col-span-2">
              Contacto
              <input
                type="email"
                value={contact}
                onChange={(event) => {
                  setContact(event.target.value)
                  setSaved(false)
                }}
                placeholder="correo@ejemplo.com"
                className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#FF5A00]"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a]"
            >
              <Save aria-hidden="true" className="h-3.5 w-3.5" />
              Guardar cambios
            </button>
            {saved && (
              <span role="status" className="text-xs text-emerald-400">
                Cambios guardados en esta sesión.
              </span>
            )}
          </div>
        </form>
      </Section>

      <Section title="Notificaciones">
        <div className="divide-y divide-slate-800">
          <Toggle
            label="Notificaciones por correo"
            description="Recibe novedades y avisos importantes de tu cuenta."
            checked={emailNotifications}
            onChange={() => setEmailNotifications((value) => !value)}
          />
          <Toggle
            label="Check-ins de atletas"
            description="Avisos cuando un atleta envía su reporte semanal."
            checked={checkInNotifications}
            onChange={() => setCheckInNotifications((value) => !value)}
          />
        </div>
      </Section>

      <Section title="Apariencia">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Tema de la aplicación</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Elige entre el modo oscuro y el modo claro.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      <Section title="Seguridad">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
            <Shield aria-hidden="true" className="h-4 w-4 text-slate-300" />
          </div>
          <div className="min-w-0 flex-1">
            <Toggle
              label="Verificación en dos pasos"
              description="Activa una capa adicional de protección para tu cuenta."
              checked={twoFactorEnabled}
              onChange={() => setTwoFactorEnabled((value) => !value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Sesión">
        <form action={signout}>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </Section>
    </div>
  )
}
