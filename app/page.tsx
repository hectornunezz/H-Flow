import { createClient } from '@/utils/supabase/server'
import { addExercise, addWorkout, addExerciseToWorkout, signout } from './actions'
import ExerciseList from '@/components/ExerciseList'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // 1. Auto-asegurar que el usuario tenga su perfil creado (Autosuficiente)
  await supabase.from('profiles').upsert([
    {
      id: user.id,
      email: user.email,
      full_name: user.email?.split('@')[0] || 'Coach',
      role: 'coach'
    }
  ], { onConflict: 'id' })

  // 2. Consultas a la base de datos
  const { data: exercises, error: exerciseError } = await supabase.from('exercises').select('*')
  
  const { data: workouts, error: workoutError } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        id,
        sets,
        reps,
        exercises (
          id,
          name,
          muscle_group
        )
      )
    `)
    .eq('coach_id', user.id)

  return (
    <main className="p-8 max-w-4xl mx-auto text-white space-y-8">
      {/* Cabecera y Sesión */}
      <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold mb-1">H-Flow SaaS - Panel 🚀</h1>
          <p className="text-gray-400 text-sm">Sesión activa: {user.email}</p>
        </div>
        <form action={signout}>
          <button className="bg-red-600/80 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded transition-colors">
            Cerrar Sesión
          </button>
        </form>
      </div>

      {/* Mensaje de error detallado si falla algo */}
      {(exerciseError || workoutError) && (
        <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded text-sm space-y-1">
          <p className="font-bold">Error de Supabase:</p>
          {exerciseError && <p>Ejercicios: {exerciseError.message}</p>}
          {workoutError && <p>Rutinas: {workoutError.message}</p>}
        </div>
      )}

      {/* SECCIÓN 1: Gestión de Rutinas y Asociación de Ejercicios */}
      <div className="bg-gray-900 shadow-lg rounded-lg p-6 border border-gray-800 space-y-6">
        <h2 className="text-xl font-semibold text-white">Gestor de Rutinas</h2>
        
        <form action={addWorkout} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            name="title" 
            placeholder="Título de la rutina (ej. Día de Pierna)" 
            required 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 flex-1"
          />
          <input 
            type="text" 
            name="description" 
            placeholder="Descripción (opcional)" 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 sm:w-64"
          />
          <button 
            type="submit" 
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-5 py-2 rounded transition-colors"
          >
            Crear Rutina
          </button>
        </form>

        {/* Listado de Rutinas con sus Ejercicios */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-300">Tus Rutinas Activas:</h3>
          {workouts && workouts.length > 0 ? (
            workouts.map((w: any) => (
              <div key={w.id} className="bg-gray-800/60 border border-gray-700/60 p-5 rounded-lg space-y-4">
                <div>
                  <h4 className="font-bold text-lg text-white">{w.title}</h4>
                  <p className="text-sm text-gray-400">{w.description || 'Sin descripción'}</p>
                </div>

                {/* Lista de ejercicios dentro de esta rutina */}
                <div className="bg-gray-900/50 p-3 rounded border border-gray-800">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ejercicios en esta rutina:</p>
                  {w.workout_exercises && w.workout_exercises.length > 0 ? (
                    <ul className="divide-y divide-gray-800 text-sm">
                      {w.workout_exercises.map((we: any) => (
                        <li key={we.id} className="py-2 flex justify-between items-center">
                          <span className="font-medium text-white">{we.exercises?.name}</span>
                          <span className="text-gray-400 text-xs bg-gray-800 px-2.5 py-1 rounded border border-gray-700">
                            {we.sets} series × {we.reps} reps
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay ejercicios añadidos a esta rutina todavía.</p>
                  )}
                </div>

                {/* Formulario para añadir un ejercicio existente a esta rutina */}
                {exercises && exercises.length > 0 && (
                  <form action={addExerciseToWorkout} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-700/40">
                    <input type="hidden" name="workout_id" value={w.id} />
                    <select 
                      name="exercise_id" 
                      required 
                      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                    >
                      <option value="">Selecciona un ejercicio...</option>
                      {exercises.map((ex: any) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.muscle_group || 'General'})
                        </option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      name="sets" 
                      defaultValue="3" 
                      placeholder="Series" 
                      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-20 text-center"
                    />
                    <input 
                      type="text" 
                      name="reps" 
                      defaultValue="10" 
                      placeholder="Reps" 
                      className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white w-24 text-center"
                    />
                    <button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
                    >
                      Añadir
                    </button>
                  </form>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic text-sm">No tienes rutinas creadas todavía.</p>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: Biblioteca de Ejercicios */}
      <div className="bg-gray-900 shadow-lg rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-white">Añadir Nuevo Ejercicio a la Biblioteca</h2>
        <form action={addExercise} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            name="name" 
            placeholder="Nombre (ej. Press de banca)" 
            required 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 flex-1"
          />
          <input 
            type="text" 
            name="muscle_group" 
            placeholder="Grupo muscular (ej. Pecho)" 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 sm:w-64"
          />
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded transition-colors"
          >
            Guardar
          </button>
        </form>
      </div>

      {/* SECCIÓN 3: Lista interactiva de ejercicios con buscador */}
      <ExerciseList exercises={exercises || []} />
    </main>
  )
}