// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextEnv: typeof import('@next/env') = require('@next/env')

nextEnv.loadEnvConfig(process.cwd())

const requiredVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
] as const

const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim())

if (missingVariables.length > 0) {
  console.error(
    `[CRITICAL] Faltan variables de entorno requeridas: ${missingVariables.join(', ')}`,
  )
  process.exitCode = 1
}
