import { login, signup } from '@/app/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params?.message

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md shadow-xl">
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
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña (mínimo 6 caracteres)"
            required
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-3 mt-2">
            <button
              formAction={login}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors"
            >
              Entrar
            </button>
            <button
              formAction={signup}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded transition-colors"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}