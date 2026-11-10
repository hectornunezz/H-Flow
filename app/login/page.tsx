import { login, signup } from '@/app/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params?.message

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#030712] text-white p-6">
      <div className="bg-[#080f1c] p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-xl shadow-black/30">
        <h1 className="text-2xl font-bold mb-2 text-center">H-Flow SaaS 🚀</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Inicia sesión o regístrate para continuar</p>
        
        {message && (
          <div className="bg-red-950 border border-red-600 text-red-200 px-4 py-2 rounded mb-4 text-sm text-center">
            {message}
          </div>
        )}
        
        <form className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            required
            className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            required
            className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
          />
          <div className="flex gap-3 mt-2">
            <button
              formAction={login}
              className="flex-1 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:brightness-110 text-[#030712] font-bold py-3 rounded-xl transition"
            >
              Entrar
            </button>
            <button
              formAction={signup}
              className="flex-1 border border-[#f97316]/40 bg-[#f97316]/10 hover:bg-[#f97316]/20 text-orange-200 font-semibold py-3 rounded-xl transition"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
