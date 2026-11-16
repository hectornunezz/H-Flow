import Link from 'next/link'
import { login, signup } from '@/app/actions'

interface AuthFormProps {
  mode: 'login' | 'register'
  message?: string
}

export function AuthForm({ mode, message }: AuthFormProps) {
  const isRegister = mode === 'register'

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#030712] text-white p-6">
      <div className="bg-[#080f1c] p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-xl shadow-black/30">
        <h1 className="text-2xl font-bold mb-2 text-center">H-Flow SaaS 🚀</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          {isRegister ? 'Crea tu cuenta para solicitar acceso a la beta' : 'Inicia sesión o regístrate para continuar'}
        </p>

        {message && (
          <div className="bg-red-950 border border-red-600 text-red-200 px-4 py-2 rounded mb-4 text-sm text-center">
            {message}
          </div>
        )}

        <form action={isRegister ? signup : login} className="flex flex-col gap-4">
          {isRegister && (
            <input
              name="name"
              type="text"
              placeholder="Nombre"
              autoComplete="name"
              required
              className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            autoComplete="email"
            required
            className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 6 : undefined}
            required
            className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
          />
          <button
            className="w-full bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:brightness-110 text-[#030712] font-bold py-3 rounded-xl transition"
          >
            {isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <Link
            href={isRegister ? '/login' : '/register'}
            className="font-semibold text-orange-300 transition hover:text-orange-200"
          >
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </Link>
        </p>
      </div>
    </main>
  )
}
