/**
 * lib/supabase.ts
 *
 * Cliente Supabase de propósito general para uso en Client Components y
 * en API Routes del servidor que NO necesiten el helper SSR con cookies.
 *
 * Para Server Components / Actions que requieran el contexto de sesión
 * autenticada usa `utils/supabase/server.ts` (ya existente en el proyecto).
 *
 * Decision técnica: usamos `@supabase/supabase-js` directamente aquí porque:
 *  1. Las API Routes de Next.js (Edge o Node) no tienen acceso al store
 *     de cookies del navegador — no tienen por qué pasar por el helper SSR.
 *  2. El Client Component AgendaWidget hace llamadas anónimas a la BD
 *     (tasks es pública / sin RLS de momento) por lo que el anonKey es suficiente.
 */

import { createClient } from '@supabase/supabase-js'

// Estas vars son NEXT_PUBLIC → presentes en el bundle del cliente también.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[H-Flow] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)