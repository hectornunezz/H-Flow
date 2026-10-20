'use client'

import { useState } from 'react'
import { deleteExercise } from '@/app/actions'

export default function ExerciseList({ exercises }: { exercises: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.muscle_group && ex.muscle_group.toLowerCase().includes(search.toLowerCase())) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-3 sm:space-y-4">
      <input
        type="search"
        placeholder="Buscar ejercicio, grupo o equipo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner min-h-11"
      />

      <div className="bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800/80">
        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white">
          Biblioteca ({filtered.length})
        </h2>
        {filtered.length > 0 ? (
          <ul className="divide-y divide-slate-800/60">
            {filtered.map((ex: any) => (
              <li key={ex.id} className="py-4 flex flex-col gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base break-words">{ex.name}</span>
                    <span className="text-[10px] sm:text-xs bg-slate-800 text-blue-400 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {ex.equipment || 'General'}
                    </span>
                    <span className="text-[10px] sm:text-xs bg-slate-800 text-purple-400 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {ex.difficulty || 'Intermedio'}
                    </span>
                    <span className="text-[10px] sm:text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {ex.muscle_group || 'Sin grupo'}
                    </span>
                  </div>

                  {ex.video_url && (
                    <a
                      href={ex.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline font-medium pt-1"
                    >
                      Ver vídeo del coach
                    </a>
                  )}
                </div>

                <form action={deleteExercise} className="self-stretch sm:self-end">
                  <input type="hidden" name="id" value={ex.id} />
                  <button
                    type="submit"
                    className="w-full sm:w-auto text-rose-400 hover:text-rose-300 text-xs px-3 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 transition-colors min-h-10"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 italic text-sm">No se encontraron ejercicios.</p>
        )}
      </div>
    </div>
  )
}
