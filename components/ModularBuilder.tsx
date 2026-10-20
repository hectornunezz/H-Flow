'use client'

import { useState, useRef, useMemo } from 'react'
import {
  Plus, Search, ChevronDown, ChevronUp,
  Trash2, X, Dumbbell, Calendar, SlidersHorizontal,
} from 'lucide-react'
import type { ExerciseBank, IntensityTechnique } from '@/types/workout'
import AIAssistantModal from './AIAssistantModal'
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

const uid = () => Math.random().toString(36).slice(2, 11)

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
  day, exerciseBank, searchQuery,
  onUpdateDay, onDeleteDay, isActive, onToggle,
}: {
  day:          DayBlock
  exerciseBank: ExerciseBank[]
  searchQuery:  string
  onUpdateDay:  (u: DayBlock) => void
  onDeleteDay:  () => void
  isActive:     boolean
  onToggle:     () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue,   setNameValue]   = useState(day.day_name)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return exerciseBank
    return exerciseBank.filter(
      ex => ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)
    )
  }, [exerciseBank, searchQuery])

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
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Banco de Ejercicios'}
            </p>
            <div className="max-h-52 overflow-y-auto space-y-1 [scrollbar-width:thin]">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-4 text-center">Sin resultados para "{searchQuery}"</p>
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
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const [days,       setDays]       = useState<DayBlock[]>([])
  const [activeDay,  setActiveDay]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [addingDay,  setAddingDay]  = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const addDay = () => {
    const name  = newDayName.trim() || `Día ${days.length + 1}`
    const block: DayBlock = { localId: uid(), day_name: name, exercises: [] }
    setDays(prev => [...prev, block])
    setActiveDay(block.localId)
    setNewDayName('')
    setAddingDay(false)
  }

  const handleSimularIA = () => {
    setAiData({
      suggested_exercises: ['Aperturas en Polea', 'Press Inclinado con Mancuernas'],
      biomechanical_reason: 'El atleta reporta molestia en el manguito rotador. Cambiamos a poleas para mantener tensión constante sin forzar la articulación en el punto de máximo estiramiento.',
      adjusted_rir: 3
    });
    setIsAIModalOpen(true);
  };

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0)

  return (
    <div className="flex flex-col gap-4">

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

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 font-mono">
            {days.length} día{days.length !== 1 ? 's' : ''} · {totalExercises} ejercicios
          </p>

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

      {/* ── Days list ── */}
      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
            <SlidersHorizontal className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Sin días todavía</p>
            <p className="text-xs text-slate-600 mt-1">Pulsa "+ Añadir Día" para construir la rutina.</p>
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
      {onSave && days.length > 0 && (
        <div className="pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => onSave(days)}
            className="w-full bg-[#FF5A00] hover:bg-[#ff6a1a] text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-[#FF5A00]/20 text-sm tracking-wide"
          >
            Guardar Rutina · {days.length} día{days.length !== 1 ? 's' : ''} · {totalExercises} ejercicios
          </button>
        </div>
      )}
      {/* ── AI Assistant Button ── */}
      <button 
        onClick={handleSimularIA}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white px-5 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(255,90,0,0.4)] z-40 transition-all active:scale-95"
      >
        <Sparkles className="w-5 h-5" />
        Simular IA
      </button>
      {/* ── AI Assistant Modal ── */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        aiData={aiData}
        onApprove={() => {}}
      />
    </div>
  )
}
