/**
 * components/tabs/BibliotecaTab.tsx
 *
 * Catálogo Maestro de Ejercicios — creación y gestión de la biblioteca del studio.
 */

import { addExercise } from '@/app/actions'
import ExerciseList from '@/components/ExerciseList'

interface Props {
  exercises: any[]
}

export default function BibliotecaTab({ exercises }: Props) {
  const byEquipment = exercises.reduce<Record<string, number>>((acc, ex) => {
    const key = ex.equipment || 'General'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
          Catálogo
        </h2>
        <p className="text-lg sm:text-xl font-black text-white mt-1">
          Biblioteca de Ejercicios
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Gestiona el catálogo maestro de movimientos del studio.
        </p>
      </div>

      {/* ── Breakdown por equipamiento ── */}
      {exercises.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
            Total: {exercises.length}
          </span>
          {Object.entries(byEquipment).map(([equip, count]) => (
            <span
              key={equip}
              className="text-[10px] font-semibold text-slate-400 bg-slate-900/40 border border-slate-800/80 px-3 py-1.5 rounded-xl"
            >
              {equip} · {count}
            </span>
          ))}
        </div>
      )}

      {/* ── Formulario nuevo ejercicio ── */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Registrar ejercicio
          </p>
        </div>
        <div className="p-5">
          <form action={addExercise} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              name="name"
              placeholder="Nombre (ej. Sentadilla Búlgara)"
              required
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF5A00] transition-colors shadow-inner"
            />
            <input
              type="text"
              name="muscle_group"
              placeholder="Grupo muscular (ej. Cuádriceps)"
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF5A00] transition-colors shadow-inner"
            />
            <select
              name="equipment"
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors shadow-inner"
            >
              <option value="Barra">Barra (Barbell)</option>
              <option value="Mancuernas">Mancuernas (Dumbbell)</option>
              <option value="Máquina">Máquina (Machine)</option>
              <option value="Polea">Polea (Cable)</option>
              <option value="Peso Corporal">Peso Corporal (Bodyweight)</option>
            </select>
            <select
              name="difficulty"
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-[#FF5A00] transition-colors shadow-inner"
            >
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            <input
              type="url"
              name="video_url"
              placeholder="URL del vídeo (YouTube, Drive...)"
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF5A00] transition-colors shadow-inner sm:col-span-2"
            />
            <button
              type="submit"
              className="sm:col-span-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              Registrar en la Biblioteca
            </button>
          </form>
        </div>
      </div>

      {/* ── Lista de ejercicios ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Catálogo ({exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''})
        </p>
        <ExerciseList exercises={exercises} />
      </div>
    </div>
  )
}
