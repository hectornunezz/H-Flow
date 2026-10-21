'use client'

import { useState } from 'react'
import { Activity, Check, Dumbbell, Sparkles, X } from 'lucide-react'

export interface AIAssistantData {
  suggested_exercises: string[]
  biomechanical_reason: string
  adjusted_rir: number
}

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseOptions: Array<{ id: string; label: string }>
  selectedExerciseId: string
  onSelectedExerciseChange: (exerciseId: string) => void
  athleteMessage: string
  onAthleteMessageChange: (message: string) => void
  isLoading: boolean
  error: string | null
  aiData: AIAssistantData | null
  onGenerate: () => void
  onReset: () => void
  onApprove: (exerciseName: string) => void
}

export default function AIAssistantModal({
  isOpen,
  onClose,
  exerciseOptions,
  selectedExerciseId,
  onSelectedExerciseChange,
  athleteMessage,
  onAthleteMessageChange,
  isLoading,
  error,
  aiData,
  onGenerate,
  onReset,
  onApprove,
}: AIAssistantModalProps) {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('')
  const selectedSuggestion = aiData?.suggested_exercises.includes(selectedSuggestionId)
    ? selectedSuggestionId
    : aiData?.suggested_exercises[0] ?? ''

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300 ease-in-out animate-in fade-in zoom-in-95"
      onClick={() => {
        if (!isLoading) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-title"
        className="relative w-full max-w-lg overflow-hidden bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out animate-in fade-in zoom-in-95"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 text-[#FF5A00]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 id="ai-assistant-title" className="text-sm font-bold tracking-wide text-white uppercase">
              Sugerencia Biomecánica
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {aiData ? (
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Orientación biomecánica</span>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{aiData.biomechanical_reason}</p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Elige una alternativa</span>
              <div className="space-y-2">
                {aiData.suggested_exercises.map(exercise => {
                  const selected = selectedSuggestion === exercise

                  return (
                    <button
                      key={exercise}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedSuggestionId(exercise)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-lg text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#FF5A00]/10 border-[#FF5A00]/50 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <Dumbbell className="w-3.5 h-3.5 text-[#FF5A00] shrink-0" />
                      <span>{exercise}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#FF5A00]" />
                <span className="text-xs font-semibold text-slate-300">RIR sugerido</span>
              </div>
              <span className="px-3 py-1 text-xs font-bold font-mono text-[#FF5A00] bg-[#FF5A00]/10 border border-[#FF5A00]/20 rounded-md">
                RIR {aiData.adjusted_rir}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-amber-200/80">
              La sugerencia es orientativa y no sustituye una valoración profesional. Si hay dolor, no fuerces el movimiento.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ai-current-exercise" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Ejercicio a revisar
              </label>
              <select
                id="ai-current-exercise"
                value={selectedExerciseId}
                onChange={event => onSelectedExerciseChange(event.target.value)}
                disabled={exerciseOptions.length === 0 || isLoading}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#FF5A00] disabled:opacity-50"
              >
                {exerciseOptions.length === 0 ? (
                  <option value="">Añade primero un ejercicio a la rutina</option>
                ) : (
                  exerciseOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ai-athlete-message" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Molestia o dificultad reportada
              </label>
              <textarea
                id="ai-athlete-message"
                value={athleteMessage}
                onChange={event => onAthleteMessageChange(event.target.value)}
                maxLength={1000}
                rows={4}
                disabled={isLoading}
                placeholder="Describe qué siente el atleta y en qué momento del movimiento..."
                className="w-full resize-y bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#FF5A00] disabled:opacity-50"
              />
              <p className="text-right text-[10px] text-slate-600">{athleteMessage.length}/1000</p>
            </div>

            <p className="text-[11px] leading-relaxed text-amber-200/80">
              La IA ofrece orientación general, no un diagnóstico médico. Ante dolor intenso o persistente, consulta a un profesional.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mx-6 mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Descartar
          </button>
          {aiData ? (
            <>
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Nueva consulta
              </button>
              <button
                type="button"
                onClick={() => onApprove(selectedSuggestion)}
                disabled={!selectedSuggestion}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#FF5A00]/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar alternativa</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading || exerciseOptions.length === 0 || !athleteMessage.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A00] hover:bg-[#ff6a1a] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#FF5A00]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Analizando...' : 'Analizar con IA'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
