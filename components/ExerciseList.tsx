'use client'

import { useState } from 'react'
import { deleteExercise } from '@/app/actions'

export default function ExerciseList({ exercises }: { exercises: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.muscle_group && ex.muscle_group.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="🔍 Buscar ejercicio o grupo muscular..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
      />

      <div className="bg-gray-900 shadow-lg rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Biblioteca de Ejercicios ({filtered.length}):
        </h2>
        {filtered.length > 0 ? (
          <ul className="divide-y divide-gray-800">
            {filtered.map((ex: any) => (
              <li key={ex.id} className="py-3 flex justify-between items-center">
                <span className="font-medium text-white">{ex.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
                    {ex.muscle_group || 'Sin grupo muscular'}
                  </span>
                  <form action={deleteExercise}>
                    <input type="hidden" name="id" value={ex.id} />
                    <button
                      type="submit"
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-red-900/50 bg-red-950/30 transition-colors"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No se encontraron ejercicios.</p>
        )}
      </div>
    </div>
  )
}