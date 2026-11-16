export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!value) {
    throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL.')
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no es una URL válida.')
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHosts.has(url.hostname))) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL debe usar HTTPS (excepto en desarrollo local).')
  }

  return value.replace(/\/+$/, '')
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!value) {
    throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  return value
}
