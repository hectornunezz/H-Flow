'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export interface NutritionItemInput {
  athlete_id: string
  meal_name: string
  food_item: string
  quantity: string | null
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface NutritionPlanItem extends NutritionItemInput {
  id: string
  created_at: string
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function assertNutritionItem(data: NutritionItemInput): void {
  if (
    !data ||
    typeof data !== 'object' ||
    !isUuid(data.athlete_id) ||
    typeof data.meal_name !== 'string' ||
    data.meal_name.trim().length === 0 ||
    typeof data.food_item !== 'string' ||
    data.food_item.trim().length === 0 ||
    (data.quantity !== null && typeof data.quantity !== 'string') ||
    ![data.calories, data.protein, data.carbs, data.fats].every(
      (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
    )
  ) {
    throw new Error('Los datos del alimento no son válidos.')
  }
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(`No se pudo verificar la sesión: ${error.message}`)
  }
  if (!user) {
    throw new Error('Debes iniciar sesión para continuar.')
  }

  return { supabase, user }
}

async function assertCanManageAthlete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  athleteId: string,
): Promise<void> {
  const { data: athlete, error } = await supabase
    .from('profiles')
    .select('id, trainer_id, role')
    .eq('id', athleteId)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo verificar el atleta: ${error.message}`)
  }
  if (!athlete || athlete.role !== 'athlete' || athlete.trainer_id !== userId) {
    throw new Error('No tienes permiso para gestionar este plan nutricional.')
  }
}

export async function saveNutritionItem(
  data: NutritionItemInput,
): Promise<NutritionPlanItem> {
  try {
    assertNutritionItem(data)

    const { supabase, user } = await getAuthenticatedUser()
    await assertCanManageAthlete(supabase, user.id, data.athlete_id)

    const { data: item, error } = await supabase
      .from('nutrition_plans')
      .insert({
        athlete_id: data.athlete_id,
        meal_name: data.meal_name.trim(),
        food_item: data.food_item.trim(),
        quantity: data.quantity?.trim() || null,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
      })
      .select(
        'id, athlete_id, meal_name, food_item, quantity, calories, protein, carbs, fats, created_at',
      )
      .single()

    if (error || !item) {
      throw new Error(`No se pudo guardar el alimento: ${error?.message ?? 'sin datos'}`)
    }

    revalidatePath('/')
    return item
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado al guardar el alimento.'
    console.error('[saveNutritionItem]', message)
    throw new Error(message)
  }
}

export async function getNutritionPlan(
  athleteId: string,
): Promise<NutritionPlanItem[]> {
  try {
    if (!isUuid(athleteId)) {
      throw new Error('El identificador del atleta no es válido.')
    }

    const { supabase, user } = await getAuthenticatedUser()
    const { data: athlete, error: athleteError } = await supabase
      .from('profiles')
      .select('id, trainer_id, role')
      .eq('id', athleteId)
      .maybeSingle()

    if (athleteError) {
      throw new Error(`No se pudo verificar el atleta: ${athleteError.message}`)
    }
    if (
      !athlete ||
      athlete.role !== 'athlete' ||
      (athlete.id !== user.id && athlete.trainer_id !== user.id)
    ) {
      throw new Error('No tienes permiso para consultar este plan nutricional.')
    }

    const { data, error } = await supabase
      .from('nutrition_plans')
      .select(
        'id, athlete_id, meal_name, food_item, quantity, calories, protein, carbs, fats, created_at',
      )
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`No se pudo recuperar el plan nutricional: ${error.message}`)
    }

    return data ?? []
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error inesperado al recuperar el plan nutricional.'
    console.error('[getNutritionPlan]', message)
    throw new Error(message)
  }
}
