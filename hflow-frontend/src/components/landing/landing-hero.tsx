import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Film,
  Flame,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:px-10 lg:pb-32 lg:pt-24">
      <div className="animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF8C00]/25 bg-[#FF8C00]/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF8C00]">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[#FF8C00] shadow-glow" />
          Beta cerrada · Entrenadores de élite
        </div>

        <h1 className="mt-7 max-w-3xl font-display text-[clamp(2.8rem,7.2vw,5.8rem)] font-bold leading-[0.95] tracking-[-0.05em] text-[#EAEAEA]">
          El fin del
          <br />
          <span className="text-[#FF8C00]">caos operativo.</span>
        </h1>

        <p className="mt-7 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg sm:leading-8">
          H-FLOW centraliza atletas, planes, vídeo con IA y métricas de negocio. Menos Excel,
          más coaching de alto rendimiento — con control absoluto y cero prisas.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF8C00] px-6 text-sm font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(255,140,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e07b00] hover:shadow-[0_0_28px_rgba(255,140,0,0.4)]"
            href="/register"
          >
            Solicitar acceso Beta
            <ArrowRight size={16} />
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-white/[0.02] px-6 text-sm font-semibold text-[#EAEAEA] backdrop-blur-md transition-all duration-300 hover:border-neutral-600 hover:bg-white/[0.05]"
            href="/login"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
          <Check className="text-[#FF8C00]" size={14} />
          Verificación por correo · Acceso por invitación
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-xl animate-fade-up [animation-delay:120ms]">
        <div className="absolute -inset-10 rounded-[2.5rem] bg-[#FF8C00]/[0.08] blur-3xl" />
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111]/90 p-4 shadow-deep backdrop-blur-xl sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(255,140,0,0.12),transparent_45%)]" />

          <div className="relative flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF8C00] text-[#0A0A0A]">
                <Flame size={15} />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide text-[#EAEAEA]">Command Center</p>
                <p className="mt-0.5 text-[10px] text-neutral-500">Panel del entrenador</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] text-emerald-300">
              Operativo
            </span>
          </div>

          <div className="relative grid grid-cols-2 gap-3 py-4">
            <div className="rounded-xl border border-neutral-800 bg-[#0A0A0A]/60 p-3.5 transition-all duration-300 hover:border-[#FF8C00]/30">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                Atletas activos <Users size={14} className="text-[#FF8C00]" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-[#EAEAEA]">24</p>
              <p className="mt-1 text-[10px] text-neutral-600">Equipo bajo control</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-[#0A0A0A]/60 p-3.5 transition-all duration-300 hover:border-[#FF8C00]/30">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                Horas recuperadas <Clock3 size={14} className="text-[#FF8C00]" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-[#EAEAEA]">
                14<span className="text-base">h</span>
              </p>
              <p className="mt-1 text-[10px] text-neutral-600">Cada semana</p>
            </div>
          </div>

          <div className="relative rounded-xl border border-neutral-800 bg-[#0A0A0A]/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#EAEAEA]">Flujo de hoy</p>
              <span className="text-[10px] text-neutral-500">EN VIVO</span>
            </div>
            {[
              { icon: Users, label: "Check-ins sincronizados", state: "Al día" },
              { icon: Sparkles, label: "Plan IA listo para revisar", state: "Pendiente" },
              { icon: Film, label: "Reel Hyperframes renderizado", state: "Listo" },
            ].map(({ icon: Icon, label, state }) => (
              <div
                className="flex items-center gap-3 border-t border-neutral-800/80 py-3 first:border-0"
                key={label}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-[#FF8C00]">
                  <Icon size={15} />
                </span>
                <span className="flex-1 text-[11px] text-neutral-300">{label}</span>
                <span className="text-[10px] text-neutral-500">{state}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-3 flex items-center justify-between rounded-xl border border-[#FF8C00]/20 bg-[#FF8C00]/[0.06] px-3.5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#EAEAEA]">
              <Zap className="text-[#FF8C00]" size={15} />
              Control absoluto. Cero prisas.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
