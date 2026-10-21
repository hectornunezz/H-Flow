'use client'

import { useState, useRef, useMemo } from 'react'
import {
  Plus, Search, ChevronDown, ChevronUp,
  Trash2, X, Dumbbell, Calendar, SlidersHorizontal, Sparkles, Printer,
  Maximize2, Minimize2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ExerciseBank, IntensityTechnique } from '@/types/workout'
import { saveCompleteRoutine } from '@/app/actions/workouts'
import AIAssistantModal, { type AIAssistantData } from './AIAssistantModal'
// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseEntry {
  localId:             string
  exercise_id:         string
  name:                string
  sets:                number
  reps_target:         string
  rir_target:          number | null
  intensity_technique: IntensityTechnique | null
}

interface DayBlock {
  localId:   string
  day_name:  string
  exercises: ExerciseEntry[]
}

interface Props {
  exerciseBank: ExerciseBank[]
  onSave?:      (days: DayBlock[]) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TECHNIQUES: IntensityTechnique[] = [
  'Drop Set', 'Rest-Pause', 'Myo-Reps', 'Giant Set',
  'Super Set', 'Cluster Set', 'Tempo', 'Pausa en Estiramiento',
]

const DAY_SUGGESTIONS = [
  'Empuje A', 'Empuje B', 'Tirón A', 'Tirón B',
  'Pierna A', 'Pierna B', 'Full Body', 'Upper', 'Lower',
]

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'brazos', label: 'Brazos' },
  { id: 'piernas', label: 'Piernas' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Cardio' },
] as const

const EQUIPMENT_FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'barra', label: 'Barra' },
  { id: 'mancuerna', label: 'Mancuerna' },
  { id: 'maquina', label: 'Máquina' },
] as const

type CategoryFilter = (typeof CATEGORY_FILTERS)[number]['id']
type EquipmentFilter = (typeof EQUIPMENT_FILTERS)[number]['id']

function normalizeFilterValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

const uid = () => Math.random().toString(36).slice(2, 11)

function isAIAssistantData(value: unknown): value is AIAssistantData {
  if (typeof value !== 'object' || value === null) return false

  const data = value as Record<string, unknown>
  return (
    Array.isArray(data.suggested_exercises) &&
    data.suggested_exercises.length > 0 &&
    data.suggested_exercises.every(exercise => typeof exercise === 'string') &&
    typeof data.biomechanical_reason === 'string' &&
    data.biomechanical_reason.trim().length > 0 &&
    typeof data.adjusted_rir === 'number' &&
    Number.isInteger(data.adjusted_rir) &&
    data.adjusted_rir >= 0 &&
    data.adjusted_rir <= 5
  )
}

function getResponseError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  return typeof value.error === 'string' ? value.error : null
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({
  entry,
  onChange,
  onDelete,
}: {
  entry:    ExerciseEntry
  onChange: (u: ExerciseEntry) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const set = (k: keyof ExerciseEntry, v: string | number | null) =>
    onChange({ ...entry, [k]: v })

  return (
    <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-7 h-7 shrink-0 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center">
          <Dumbbell className="w-3.5 h-3.5 text-[#FF5A00]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-none">{entry.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {entry.sets}×{entry.reps_target}
            {entry.rir_target !== null ? ` · RIR ${entry.rir_target}` : ''}
            {entry.intensity_technique ? ` · ${entry.intensity_technique}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open
            ? <ChevronUp   className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </div>
      </div>

      {open && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-slate-700/50 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Sets */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Series</label>
              <input
                type="number" min={1} max={20}
                value={entry.sets}
                onChange={e => set('sets', parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-2 text-sm text-white text-center font-mono focus:outline-none focus:border-[#FF5A00] transition-colors"
              />
            </div>
            {/* Reps */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Reps</label>
              <input
                type="text"
                value={entry.reps_target}
                placeholder="8-12"
                onChange={e => set('reps_target', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-2 text-sm text-white text-center font-mono focus:outline-none focus:border-[#FF5A00] transition-colors"
              />
            </div>
            {/* RIR */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">RIR</label>
              <input
                type="number" min={0} max={5}
                value={entry.rir_target ?? ''}
                placeholder="—"
                onChange={e => set('rir_target', e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-2 text-sm text-white text-center font-mono focus:outline-none focus:border-[#FF5A00] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Técnica de Intensidad</label>
            <select
              value={entry.intensity_technique ?? ''}
              onChange={e => set('intensity_technique', (e.target.value as IntensityTechnique) || null)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors"
            >
              <option value="">Sin técnica especial</option>
              {TECHNIQUES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DayBlockCard ─────────────────────────────────────────────────────────────

function DayBlockCard({
  day, exerciseBank, searchQuery, categoryFilter, equipmentFilter,
  onUpdateDay, onDeleteDay, isActive, onToggle,
}: {
  day:          DayBlock
  exerciseBank: ExerciseBank[]
  searchQuery:  string
  categoryFilter: CategoryFilter
  equipmentFilter: EquipmentFilter
  onUpdateDay:  (u: DayBlock) => void
  onDeleteDay:  () => void
  isActive:     boolean
  onToggle:     () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue,   setNameValue]   = useState(day.day_name)

  const filtered = useMemo(() => {
    const q = normalizeFilterValue(searchQuery.trim())
    return exerciseBank.filter(
      ex => {
        const name = normalizeFilterValue(ex.name)
        const category = normalizeFilterValue(ex.category)
        const equipment = normalizeFilterValue(ex.equipment ?? '')
        const matchesSearch =
          !q || name.includes(q) || category.includes(q) || equipment.includes(q)
        const matchesCategory =
          categoryFilter === 'all' ||
          (categoryFilter === 'brazos' && ['biceps', 'triceps'].includes(category)) ||
          (categoryFilter === 'piernas' &&
            ['cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas'].includes(category)) ||
          category === categoryFilter
        const matchesEquipment =
          equipmentFilter === 'all' || equipment.includes(equipmentFilter)

        return matchesSearch && matchesCategory && matchesEquipment
      }
    )
  }, [categoryFilter, equipmentFilter, exerciseBank, searchQuery])

  const addExercise = (ex: ExerciseBank) =>
    onUpdateDay({
      ...day,
      exercises: [...day.exercises, {
        localId:             uid(),
        exercise_id:         ex.id,
        name:                ex.name,
        sets:                3,
        reps_target:         '8-12',
        rir_target:          2,
        intensity_technique: null,
      }],
    })

  const commitName = () => {
    setEditingName(false)
    if (nameValue.trim()) onUpdateDay({ ...day, day_name: nameValue.trim() })
  }

  return (
    <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button type="button" onClick={onToggle} className="flex-1 flex items-center gap-3 min-w-0 text-left">
          <div className="w-8 h-8 shrink-0 rounded-xl bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#FF5A00]" />
          </div>

          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-slate-950 border border-[#FF5A00]/50 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none"
            />
          ) : (
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-bold text-white truncate"
                onDoubleClick={e => { e.stopPropagation(); setEditingName(true) }}
              >
                {day.day_name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {day.exercises.length} ejercicio{day.exercises.length !== 1 ? 's' : ''}
                <span className="text-slate-700"> · doble tap para renombrar</span>
              </p>
            </div>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-black bg-slate-900 border border-slate-700/60 text-slate-400 px-2 py-0.5 rounded-lg min-w-[24px] text-center">
            {day.exercises.length}
          </span>
          <button
            type="button" onClick={onDeleteDay}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onToggle} className="w-7 h-7 flex items-center justify-center text-slate-500">
            {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {isActive && (
        <div className="border-t border-slate-700/50 px-4 py-4 space-y-4">
          {day.exercises.length > 0 && (
            <div className="space-y-2">
              {day.exercises.map(entry => (
                <ExerciseCard
                  key={entry.localId}
                  entry={entry}
                  onChange={updated =>
                    onUpdateDay({ ...day, exercises: day.exercises.map(e => e.localId === entry.localId ? updated : e) })
                  }
                  onDelete={() =>
                    onUpdateDay({ ...day, exercises: day.exercises.filter(e => e.localId !== entry.localId) })
                  }
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {searchQuery ? `Resultados para &quot;${searchQuery}&quot;` : 'Banco de Ejercicios'}
            </p>
            <div className="max-h-52 overflow-y-auto space-y-1 [scrollbar-width:thin]">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-4 text-center">Sin resultados para &quot;{searchQuery}&quot;</p>
              ) : (
                filtered.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => addExercise(ex)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-700/40 hover:border-[#FF5A00]/30 text-left transition-all group"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#FF5A00] shrink-0 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">{ex.name}</p>
                      <p className="text-[10px] text-slate-500">{ex.category} · {ex.equipment ?? 'General'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ModularBuilder ────────────────────────────────────────────────────────────

export default function ModularBuilder({ exerciseBank, onSave }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [aiData, setAiData] = useState<AIAssistantData | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [athleteMessage, setAthleteMessage] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [days,       setDays]       = useState<DayBlock[]>([])
  const [activeDay,  setActiveDay]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all')
  const [addingDay,  setAddingDay]  = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const exerciseOptions = useMemo(
    () => days.flatMap(day =>
      day.exercises.map(entry => ({
        id: entry.localId,
        label: `${day.day_name} · ${entry.name}`,
      }))
    ),
    [days]
  )
  const activeExerciseId = exerciseOptions.some(option => option.id === selectedExerciseId)
    ? selectedExerciseId
    : exerciseOptions[0]?.id ?? ''

  const handleSaveRoutine = async () => {
    if (isSaving || days.length === 0) return

    setIsSaving(true)
    try {
      await saveCompleteRoutine(
        days.map(({ day_name, exercises }) => ({
          day_name,
          exercises: exercises.map(({
            exercise_id,
            sets,
            reps_target,
            rir_target,
            intensity_technique,
          }) => ({
            exercise_id,
            sets,
            reps_target,
            rir_target,
            intensity_technique,
          })),
        })),
      )
      onSave?.(days)
      toast.success('Rutina guardada en Supabase.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo guardar la rutina.'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const addDay = () => {
    const name  = newDayName.trim() || `Día ${days.length + 1}`
    const block: DayBlock = { localId: uid(), day_name: name, exercises: [] }
    setDays(prev => [...prev, block])
    setActiveDay(block.localId)
    setNewDayName('')
    setAddingDay(false)
  }

  const openAIAssistant = () => {
    setAiData(null)
    setAiError(null)
    setIsAIModalOpen(true)
  }

  const handleSimularIA = async () => {
    const target = days
      .flatMap(day => day.exercises)
      .find(entry => entry.localId === activeExerciseId)

    if (!target) {
      setAiError('Añade un ejercicio a la rutina antes de solicitar una alternativa.')
      return
    }

    if (!athleteMessage.trim()) {
      setAiError('Describe la molestia o dificultad reportada por el atleta.')
      return
    }

    setIsAILoading(true)
    setAiError(null)
    setAiData(null)

    try {
      const response = await fetch('/api/ai-contingency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          athleteMessage: athleteMessage.trim(),
          currentExercise: target.name,
          exerciseBank: exerciseBank.map(({ name, category, equipment }) => ({
            name,
            category,
            equipment,
          })),
        }),
      })

      let result: unknown
      try {
        result = await response.json()
      } catch {
        throw new Error('El servidor devolvió una respuesta no válida.')
      }

      if (!response.ok) {
        throw new Error(getResponseError(result) ?? `No se pudo analizar la contingencia (${response.status}).`)
      }

      if (!isAIAssistantData(result)) {
        throw new Error('La IA devolvió una sugerencia incompleta o con datos no válidos.')
      }

      const matchedSuggestions: string[] = []
      for (const suggestion of result.suggested_exercises) {
        const match = exerciseBank.find(
          exercise => exercise.name.trim().localeCompare(suggestion.trim(), 'es', { sensitivity: 'base' }) === 0
        )
        if (match && !matchedSuggestions.includes(match.name)) {
          matchedSuggestions.push(match.name)
        }
      }

      if (matchedSuggestions.length === 0) {
        throw new Error('La IA no propuso alternativas que existan en tu banco de ejercicios.')
      }

      setAiData({ ...result, suggested_exercises: matchedSuggestions })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No se pudo generar una alternativa. Inténtalo de nuevo.'
      setAiError(message)
      toast.error(message)
    } finally {
      setIsAILoading(false)
    }
  }

  const applyAIAlternative = (exerciseName: string) => {
    const replacement = exerciseBank.find(
      exercise => exercise.name.localeCompare(exerciseName, 'es', { sensitivity: 'base' }) === 0
    )
    const target = days.flatMap(day => day.exercises).find(entry => entry.localId === activeExerciseId)

    if (!replacement || !target || !aiData) {
      const message = 'No se pudo aplicar la alternativa. Revisa el ejercicio seleccionado e inténtalo de nuevo.'
      setAiError(message)
      toast.error(message)
      return
    }

    setDays(previous => previous.map(day => ({
      ...day,
      exercises: day.exercises.map(entry =>
        entry.localId === target.localId
          ? {
              ...entry,
              exercise_id: replacement.id,
              name: replacement.name,
              rir_target: aiData.adjusted_rir,
            }
          : entry
      ),
    })))
    setIsAIModalOpen(false)
    setAiData(null)
    toast.success('Alternativa aplicada al constructor. Guarda la rutina para conservar los cambios.')
  }

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0)

  return (
    <div className={isFullscreen
      ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-6'
      : 'flex flex-col gap-4'
    }>
      <section className="routine-printable hidden" aria-label="Rutina para imprimir">
        <h1 className="mb-2 text-2xl font-bold">Rutina de entrenamiento</h1>
        {days.map(day => (
          <section key={day.localId} className="mb-6 break-inside-avoid">
            <h2 className="mb-3 border-b border-slate-300 pb-2 text-lg font-bold">
              {day.day_name}
            </h2>
            {day.exercises.length === 0 ? (
              <p className="text-sm">Sin ejercicios asignados.</p>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-300 p-2">Ejercicio</th>
                    <th className="border border-slate-300 p-2">Series</th>
                    <th className="border border-slate-300 p-2">Repeticiones</th>
                    <th className="border border-slate-300 p-2">RIR</th>
                    <th className="border border-slate-300 p-2">Técnica</th>
                  </tr>
                </thead>
                <tbody>
                  {day.exercises.map(exercise => (
                    <tr key={exercise.localId}>
                      <td className="border border-slate-300 p-2">{exercise.name}</td>
                      <td className="border border-slate-300 p-2">{exercise.sets}</td>
                      <td className="border border-slate-300 p-2">{exercise.reps_target}</td>
                      <td className="border border-slate-300 p-2">{exercise.rir_target ?? '—'}</td>
                      <td className="border border-slate-300 p-2">{exercise.intensity_technique ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </section>

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md space-y-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en el banco de ejercicios..."
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF5A00] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {CATEGORY_FILTERS.map(filter => {
              const selected = categoryFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategoryFilter(filter.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                    selected
                      ? 'border-[#FF5A00]/50 bg-[#FF5A00]/10 text-[#FF5A00]'
                      : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {EQUIPMENT_FILTERS.map(filter => {
              const selected = equipmentFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setEquipmentFilter(filter.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                    selected
                      ? 'border-[#FF5A00]/50 bg-[#FF5A00]/10 text-[#FF5A00]'
                      : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 font-mono">
            {days.length} día{days.length !== 1 ? 's' : ''} · {totalExercises} ejercicios
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              aria-label="Expandir a pantalla completa"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#FF5A00]/50 hover:text-[#FF5A00]"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Pantalla Completa</span>
            </button>

            {!addingDay ? (
              <button
                type="button"
                onClick={() => setAddingDay(true)}
                className="flex items-center gap-1.5 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#FF5A00]/20"
              >
                <Plus className="w-4 h-4" />
                Añadir Día
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <select
                  value={newDayName}
                  onChange={e => setNewDayName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00]"
                >
                  <option value="">Plantilla...</option>
                  {DAY_SUGGESTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  autoFocus
                  type="text"
                  value={newDayName}
                  onChange={e => setNewDayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addDay(); if (e.key === 'Escape') setAddingDay(false) }}
                  placeholder="o nombre libre..."
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] w-28 shrink-0"
                />
                <button type="button" onClick={addDay}
                  className="bg-[#FF5A00] text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 shrink-0">
                  OK
                </button>
                <button type="button" onClick={() => setAddingDay(false)}
                  className="text-slate-500 hover:text-slate-300 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Days list ── */}
      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
            <SlidersHorizontal className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Sin días todavía</p>
            <p className="text-xs text-slate-600 mt-1">Pulsa &quot;+ Añadir Día&quot; para construir la rutina.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <DayBlockCard
              key={day.localId}
              day={day}
              exerciseBank={exerciseBank}
              searchQuery={search}
              categoryFilter={categoryFilter}
              equipmentFilter={equipmentFilter}
              isActive={activeDay === day.localId}
              onToggle={() => setActiveDay(prev => prev === day.localId ? null : day.localId)}
              onUpdateDay={updated => setDays(prev => prev.map(d => d.localId === day.localId ? updated : d))}
              onDeleteDay={() => {
                setDays(prev => prev.filter(d => d.localId !== day.localId))
                if (activeDay === day.localId) setActiveDay(null)
              }}
            />
          ))}
        </div>
      )}

      {/* ── Save ── */}
      {days.length > 0 && (
        <div className="pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => window.print()}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-[#FF5A00]/50 hover:text-[#FF5A00]"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Exportar a PDF
          </button>
          <button
            type="button"
            onClick={handleSaveRoutine}
            disabled={isSaving}
            className="w-full bg-[#FF5A00] hover:bg-[#ff6a1a] disabled:cursor-not-allowed disabled:opacity-60 text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-[#FF5A00]/20 text-sm tracking-wide"
          >
            {isSaving
              ? 'Guardando en Supabase...'
              : `Guardar Rutina · ${days.length} día${days.length !== 1 ? 's' : ''} · ${totalExercises} ejercicios`}
          </button>
        </div>
      )}
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          aria-label="Salir de pantalla completa"
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition-colors hover:border-[#FF5A00]/50 hover:text-[#FF5A00]"
        >
          <Minimize2 className="h-4 w-4" aria-hidden />
          Salir de pantalla completa
        </button>
      )}
      {/* ── AI Assistant Button ── */}
      <button 
        type="button"
        onClick={openAIAssistant}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white px-5 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(255,90,0,0.4)] z-40 transition-all active:scale-95"
      >
        <Sparkles className="w-5 h-5" />
        Asistente IA
      </button>
      {/* ── AI Assistant Modal ── */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        exerciseOptions={exerciseOptions}
        selectedExerciseId={activeExerciseId}
        onSelectedExerciseChange={setSelectedExerciseId}
        athleteMessage={athleteMessage}
        onAthleteMessageChange={setAthleteMessage}
        isLoading={isAILoading}
        error={aiError}
        aiData={aiData}
        onGenerate={handleSimularIA}
        onReset={() => {
          setAiData(null)
          setAiError(null)
        }}
        onApprove={applyAIAlternative}
      />
    </div>
  )
}
