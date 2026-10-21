'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Utensils } from 'lucide-react'

type MealName = 'Desayuno' | 'Almuerzo' | 'Comida' | 'Cena'

type FoodEntry = {
  id: number
  name: string
  quantity: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
}

type Meal = {
  name: MealName
  foods: FoodEntry[]
}

const initialMeals: Meal[] = [
  {
    name: 'Desayuno',
    foods: [
      {
        id: 1,
        name: 'Avena',
        quantity: '80 g',
        calories: 303,
        protein: 10.5,
        carbohydrates: 54,
        fat: 5.2,
      },
      {
        id: 2,
        name: 'Huevo entero',
        quantity: '2 unidades',
        calories: 144,
        protein: 12.6,
        carbohydrates: 0.8,
        fat: 9.6,
      },
    ],
  },
  {
    name: 'Almuerzo',
    foods: [
      {
        id: 3,
        name: 'Yogur griego natural',
        quantity: '170 g',
        calories: 100,
        protein: 17,
        carbohydrates: 6,
        fat: 0.7,
      },
    ],
  },
  {
    name: 'Comida',
    foods: [
      {
        id: 4,
        name: 'Pechuga de pollo',
        quantity: '180 g',
        calories: 297,
        protein: 55.8,
        carbohydrates: 0,
        fat: 6.5,
      },
      {
        id: 5,
        name: 'Arroz cocido',
        quantity: '200 g',
        calories: 260,
        protein: 5.4,
        carbohydrates: 56.4,
        fat: 0.6,
      },
    ],
  },
  {
    name: 'Cena',
    foods: [
      {
        id: 6,
        name: 'Salmón',
        quantity: '150 g',
        calories: 312,
        protein: 30.6,
        carbohydrates: 0,
        fat: 20.1,
      },
    ],
  },
]

const emptyFood: Omit<FoodEntry, 'id'> = {
  name: '',
  quantity: '',
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
}

const numericFields = [
  { key: 'calories', label: 'Kcal', unit: 'kcal' },
  { key: 'protein', label: 'Proteínas', unit: 'g' },
  { key: 'carbohydrates', label: 'Carbohidratos', unit: 'g' },
  { key: 'fat', label: 'Grasas', unit: 'g' },
] as const

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export default function NutritionPlanner() {
  const [meals, setMeals] = useState(initialMeals)
  const [nextId, setNextId] = useState(7)

  const totals = useMemo(
    () =>
      meals.reduce(
        (total, meal) => {
          meal.foods.forEach((food) => {
            total.calories += food.calories
            total.protein += food.protein
            total.carbohydrates += food.carbohydrates
            total.fat += food.fat
          })
          return total
        },
        { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
      ),
    [meals],
  )

  function updateFood(
    mealName: MealName,
    foodId: number,
    field: keyof Omit<FoodEntry, 'id'>,
    value: string,
  ) {
    setMeals((current) =>
      current.map((meal) =>
        meal.name !== mealName
          ? meal
          : {
              ...meal,
              foods: meal.foods.map((food) => {
                if (food.id !== foodId) return food
                if (field === 'name' || field === 'quantity') {
                  return { ...food, [field]: value }
                }
                const numberValue = value === '' ? 0 : Number(value)
                return {
                  ...food,
                  [field]: Number.isFinite(numberValue)
                    ? Math.max(0, numberValue)
                    : 0,
                }
              }),
            },
      ),
    )
  }

  function addFood(mealName: MealName) {
    setMeals((current) =>
      current.map((meal) =>
        meal.name === mealName
          ? { ...meal, foods: [...meal.foods, { ...emptyFood, id: nextId }] }
          : meal,
      ),
    )
    setNextId((current) => current + 1)
  }

  function removeFood(mealName: MealName, foodId: number) {
    setMeals((current) =>
      current.map((meal) =>
        meal.name === mealName
          ? { ...meal, foods: meal.foods.filter((food) => food.id !== foodId) }
          : meal,
      ),
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
            Planificación
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            Plan nutricional
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Organiza comidas y controla los macros diarios.
          </p>
        </header>

        <div className="space-y-5">
          {meals.map((meal) => (
            <section
              key={meal.name}
              aria-labelledby={`meal-${meal.name}`}
              className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70"
            >
              <div className="flex items-center gap-2 border-b border-slate-700/70 px-4 py-3.5 sm:px-5">
                <Utensils
                  aria-hidden="true"
                  className="h-4 w-4 text-[#FF5A00]"
                />
                <h2
                  id={`meal-${meal.name}`}
                  className="text-sm font-bold text-white"
                >
                  {meal.name}
                </h2>
                <span className="ml-auto text-xs text-slate-500">
                  {meal.foods.length} {meal.foods.length === 1 ? 'alimento' : 'alimentos'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr className="bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 sm:px-5">Alimento</th>
                      <th className="px-3 py-3">Cantidad</th>
                      {numericFields.map((field) => (
                        <th key={field.key} className="px-3 py-3 text-right">
                          {field.label}
                        </th>
                      ))}
                      <th className="w-12 px-3 py-3" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {meal.foods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-6 text-center text-xs text-slate-500"
                        >
                          Todavía no hay alimentos en esta comida.
                        </td>
                      </tr>
                    ) : (
                      meal.foods.map((food) => (
                        <tr key={food.id} className="group">
                          <td className="px-4 py-2.5 sm:px-5">
                            <input
                              aria-label={`Alimento en ${meal.name}`}
                              value={food.name}
                              onChange={(event) =>
                                updateFood(meal.name, food.id, 'name', event.target.value)
                              }
                              placeholder="Nombre del alimento"
                              className="w-full min-w-36 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:text-white"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              aria-label={`Cantidad de ${food.name || 'alimento'}`}
                              value={food.quantity}
                              onChange={(event) =>
                                updateFood(
                                  meal.name,
                                  food.id,
                                  'quantity',
                                  event.target.value,
                                )
                              }
                              placeholder="Ej. 150 g"
                              className="w-28 bg-transparent text-sm text-slate-400 outline-none placeholder:text-slate-600 focus:text-white"
                            />
                          </td>
                          {numericFields.map((field) => (
                            <td key={field.key} className="px-3 py-2.5">
                              <input
                                aria-label={`${field.label} de ${food.name || 'alimento'}`}
                                type="number"
                                min="0"
                                step={field.key === 'calories' ? '1' : '0.1'}
                                value={food[field.key]}
                                onChange={(event) =>
                                  updateFood(
                                    meal.name,
                                    food.id,
                                    field.key,
                                    event.target.value,
                                  )
                                }
                                className="w-20 bg-transparent text-right text-sm tabular-nums text-slate-300 outline-none focus:text-white"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => removeFood(meal.name, food.id)}
                              aria-label={`Eliminar ${food.name || 'alimento'}`}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-400"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-800 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => addFood(meal.name)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#FF5A00] transition hover:bg-[#FF5A00]/10"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Añadir Alimento
                </button>
              </div>
            </section>
          ))}
        </div>

        <section
          aria-label="Totales nutricionales del día"
          className="rounded-2xl border border-[#FF5A00]/25 bg-slate-900 p-5 shadow-lg shadow-[#FF5A00]/5 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5A00]">
                Resumen diario
              </p>
              <h2 className="mt-1 text-lg font-black">Totales del día</h2>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {meals.reduce((sum, meal) => sum + meal.foods.length, 0)} alimentos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {numericFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {field.label}
                </p>
                <p className="mt-2 text-xl font-black tabular-nums text-white">
                  {formatNumber(totals[field.key])}
                  <span className="ml-1 text-xs font-semibold text-slate-500">
                    {field.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
