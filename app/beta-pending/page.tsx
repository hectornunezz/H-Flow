import Link from 'next/link'

export default function BetaPendingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#030712] px-5 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#080f1c] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-2xl text-orange-400">
          ⏳
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          Beta privada H-FLOW
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Tu acceso está pendiente</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Hemos recibido tu cuenta. El equipo revisará tu solicitud y habilitará el acceso manualmente.
          Puedes volver a comprobarlo cuando recibas la aprobación.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 text-sm font-semibold text-[#030712] transition hover:brightness-110"
            href="/"
          >
            Comprobar acceso
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            href="/login"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  )
}
