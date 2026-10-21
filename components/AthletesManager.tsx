'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import AthleteDetailModal from './AthleteDetailModal'

type Athlete = {
  id: number
  name: string
  experience: string
  reportStatus: 'up-to-date' | 'pending'
  initials: string
  avatarColor: string
  sport: string
  lastReport: string
}

const initialAthletes: Athlete[] = [
  {
    id: 1,
    name: 'Lucía Fernández',
    experience: 'Avanzado',
    reportStatus: 'up-to-date',
    initials: 'LF',
    avatarColor: 'from-orange-500 to-rose-600',
    sport: 'Fuerza y acondicionamiento',
    lastReport: 'Hoy, 09:15',
  },
  {
    id: 2,
    name: 'Mateo Rodríguez',
    experience: 'Intermedio',
    reportStatus: 'pending',
    initials: 'MR',
    avatarColor: 'from-sky-500 to-indigo-600',
    sport: 'Hipertrofia',
    lastReport: 'Pendiente de revisión',
  },
  {
    id: 3,
    name: 'Valentina Morales',
    experience: 'Principiante',
    reportStatus: 'up-to-date',
    initials: 'VM',
    avatarColor: 'from-emerald-500 to-teal-600',
    sport: 'Entrenamiento funcional',
    lastReport: 'Ayer, 18:40',
  },
  {
    id: 4,
    name: 'Santiago Pérez',
    experience: 'Avanzado',
    reportStatus: 'pending',
    initials: 'SP',
    avatarColor: 'from-violet-500 to-fuchsia-600',
    sport: 'Rendimiento deportivo',
    lastReport: 'Pendiente de revisión',
  },
]

export default function AthletesManager() {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExperience, setNewExperience] = useState('Principiante')
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => setIsLoading(false), 450)
    return () => window.clearTimeout(loadingTimer)
  }, [])

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return athletes
    return athletes.filter((athlete) =>
      `${athlete.name} ${athlete.experience} ${athlete.sport}`
        .toLocaleLowerCase('es')
        .includes(query),
    )
  }, [athletes, search])

  function handleCreateAthlete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return

    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('es')

    setAthletes((current) => [
      ...current,
      {
        id: Date.now(),
        name,
        experience: newExperience,
        reportStatus: 'pending',
        initials,
        avatarColor: 'from-orange-500 to-amber-600',
        sport: 'Sin disciplina asignada',
        lastReport: 'Pendiente de revisión',
      },
    ])
    setNewName('')
    setNewExperience('Principiante')
    setIsCreating(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FF5A00]">
              H-Flow · Roster
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Atletas
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Gestiona tu equipo y revisa el estado de sus reportes.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="relative block sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar atletas..."
                aria-label="Buscar atletas"
                className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-900/80 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20"
              />
            </label>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF5A00] px-4 text-sm font-bold text-white shadow-lg shadow-[#FF5A00]/20 transition hover:bg-[#ff6a1a] active:scale-[0.98]"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nuevo Atleta
            </button>
          </div>
        </header>

        <section aria-label="Roster de atletas">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <span className="font-bold text-white">{filteredAthletes.length}</span>{' '}
              {filteredAthletes.length === 1 ? 'atleta' : 'atletas'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Reporte al día
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Pendiente
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Cargando atletas">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 rounded-2xl bg-slate-700/70" />
                    <div className="h-6 w-24 rounded-full bg-slate-700/70" />
                  </div>
                  <div className="mt-5 h-5 w-2/3 rounded bg-slate-700/70" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-700/50" />
                  <div className="mt-5 flex items-center justify-between border-t border-slate-700/50 pt-4">
                    <div className="space-y-2">
                      <div className="h-2.5 w-20 rounded bg-slate-700/50" />
                      <div className="h-4 w-24 rounded bg-slate-700/70" />
                    </div>
                    <div className="h-9 w-24 rounded-lg bg-slate-700/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAthletes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAthletes.map((athlete) => {
                const reportIsCurrent = athlete.reportStatus === 'up-to-date'

                return (
                  <article
                    key={athlete.id}
                    className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-xl shadow-black/10 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-slate-600/70"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${athlete.avatarColor} text-sm font-black text-white shadow-lg`}
                        aria-label={`Avatar de ${athlete.name}`}
                      >
                        {athlete.initials}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                          reportIsCurrent
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {reportIsCurrent ? (
                          <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                        ) : (
                          <AlertCircle aria-hidden="true" className="h-3 w-3" />
                        )}
                        {reportIsCurrent ? 'Al día' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <h2 className="text-lg font-bold text-white">{athlete.name}</h2>
                      <p className="mt-1 text-xs text-slate-400">{athlete.sport}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-700/50 pt-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Experiencia
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">
                          {athlete.experience}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAthlete(athlete)
                          setIsDetailOpen(true)
                        }}
                        className="rounded-lg border border-[#FF5A00]/30 bg-[#FF5A00]/10 px-3.5 py-2 text-xs font-bold text-[#FF5A00] transition hover:border-[#FF5A00]/60 hover:bg-[#FF5A00]/20"
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : athletes.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/40 px-6 py-12 text-center backdrop-blur-md">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/10">
                <UserRound
                  aria-hidden="true"
                  className="h-7 w-7 text-[#FF5A00]"
                />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">
                No hay atletas registrados todavía
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                Añade tu primer atleta para empezar a gestionar su entrenamiento.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff6a1a]"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nuevo Atleta
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 px-6 py-14 text-center backdrop-blur-md">
              <UserRound
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-slate-600"
              />
              <p className="mt-3 text-sm font-semibold text-slate-300">
                No se encontraron atletas
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Prueba con otro nombre o término de búsqueda.
              </p>
            </div>
          )}
        </section>
      </div>

      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreating(false)
          }}
        >
          <form
            onSubmit={handleCreateAthlete}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-athlete-title"
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="new-athlete-title" className="text-lg font-bold">
                Nuevo atleta
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-semibold text-slate-300">
              Nombre completo
              <input
                autoFocus
                required
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Nombre del atleta"
                className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#FF5A00]"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-slate-300">
              Nivel de experiencia
              <select
                value={newExperience}
                onChange={(event) => setNewExperience(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-[#FF5A00]"
              >
                <option>Principiante</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
            </label>
            <button
              type="submit"
              className="mt-6 h-11 w-full rounded-xl bg-[#FF5A00] text-sm font-bold text-white transition hover:bg-[#ff6a1a]"
            >
              Crear atleta
            </button>
          </form>
        </div>
      )}

      {selectedAthlete && (
        <AthleteDetailModal
          athlete={{
            id: String(selectedAthlete.id),
            name: selectedAthlete.name,
            experience: selectedAthlete.experience,
            sport: selectedAthlete.sport,
            reportStatus: selectedAthlete.reportStatus,
            lastReport: selectedAthlete.lastReport,
          }}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </main>
  )
}
