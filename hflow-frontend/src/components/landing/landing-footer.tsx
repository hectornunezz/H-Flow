import Link from "next/link";
import { ArrowRight, ArrowUpRight, Dumbbell } from "lucide-react";
import { LandingLogo } from "./landing-logo";

export function LandingFinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
      <div className="relative overflow-hidden rounded-3xl border border-[#FF8C00]/25 bg-[#111111] px-6 py-12 text-center shadow-deep sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,140,0,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#FF8C00] text-[#0A0A0A] shadow-glow">
            <Dumbbell size={21} />
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-[#EAEAEA] sm:text-5xl">
            Tu tiempo vale más que una celda.
          </h2>
          <p className="mt-4 text-sm leading-6 text-neutral-400 sm:text-base">
            Entra en la Beta Cerrada y opera tu coaching con la calma de un sistema premium.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF8C00] px-6 text-sm font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(255,140,0,0.3)] transition-all duration-300 hover:bg-[#e07b00]"
              href="/register"
            >
              Crear mi cuenta
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-800 px-6 text-sm font-semibold text-[#EAEAEA] transition-all duration-300 hover:border-neutral-600 hover:bg-white/[0.04]"
              href="/login"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-800/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <LandingLogo />
        <p>Control absoluto. Cero prisas.</p>
        <Link
          className="inline-flex items-center gap-1.5 transition-all duration-300 hover:text-[#EAEAEA]"
          href="/login"
        >
          Acceso entrenadores
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </footer>
  );
}
