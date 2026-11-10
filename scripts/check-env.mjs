import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
]

const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim())

if (missingVariables.length > 0) {
  console.error(
    `[CRITICAL] Faltan variables de entorno requeridas: ${missingVariables.join(', ')}`,
  )
  process.exitCode = 1
}
