import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Clock3,
  Dumbbell,
  Film,
  Flame,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "H-FLOW | Tu negocio de entrenamiento, en movimiento",
  description:
    "Menos Excel, más coaching. Gestiona atletas, crea planes con IA y produce contenido para redes desde H-FLOW.",
};

const features = [
  {
    number: "01",
    icon: Users,
    title: "Tu CRM. Sin caos.",
    description:
      "Atletas, objetivos, check-ins y evolución en un solo sitio. Siempre sabes quién necesita atención y qué toca hacer.",
    detail: "RELACIONES QUE AVANZAN",
    visual: "crm",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Planes listos. Tú al mando.",
    description:
      "Genera borradores de entrenamiento y nutrición con IA a partir del objetivo y el peso de cada atleta. Revísalos y hazlos tuyos.",
    detail: "IA PARA ENTRENADORES",
    visual: "planner",
  },
  {
    number: "03",
    icon: Film,
    title: "Tu contenido no se toma el día libre.",
    description:
      "Convierte un tema en un guion, una voz y un Reel vertical. Más presencia de marca, menos horas editando.",
    detail: "AUTO-REELS CON IA",
    visual: "reels",
  },
];

const comparison = [
  ["Seguimiento de atletas", "Hojas de cálculo dispersas", "CRM con historial y check-ins"],
  ["Planes", "Copiar, pegar, volver a empezar", "Borradores con IA que tú revisas"],
  ["Marketing", "Publicar cuando queda tiempo", "Guion, voz y Reel en un mismo flujo"],
  ["Tu jornada", "Administración que no termina", "Más espacio para entrenar y crecer"],
];

const plans = [
  {
    name: "Free",
    eyebrow: "Empieza con orden",
    price: "0 €",
    suffix: "para siempre",
    description: "Organiza lo esencial y conoce H-FLOW a tu ritmo.",
    features: [
      "Gestión de atletas",
      "Seguimiento de check-ins",
      "Planes de entrenamiento y nutrición",
      "Portal para tus atletas",
    ],
    action: "Crear cuenta gratis",
    featured: false,
  },
  {
    name: "Pro",
    eyebrow: "Para entrenadores que crecen",
    price: "29 €",
    suffix: "/ mes",
    description: "Automatiza tu flujo y convierte más tiempo en coaching.",
    features: [
      "Todo lo incluido en Free",
      "Generación de planes con IA",
      "Guiones, audio y Auto-Reels",
      "Exportación de informes",
      "Facturación segura con Stripe",
    ],
    action: "Empezar con Pro",
    featured: true,
  },
];

function Logo() {
  return (
    <Link
      aria-label="H-FLOW, inicio"
      className="flex items-center gap-2.5"
      href="/"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-black">
        <ActivityMark />
      </span>
      <span className="text-base font-black tracking-[0.18em]">H-FLOW</span>
    </Link>
  );
}

function ActivityMark() {
  return <Flame aria-hidden="true" size={19} strokeWidth={2.6} />;
}

function FeaturePreview({ type }: { type: string }) {
  if (type === "crm") {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#090a0d] p-4">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <LayoutDashboard className="text-accent" size={15} />
            Atletas
          </div>
          <span className="text-[10px] text-muted">VISTA GENERAL</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-200">
              LM
            </span>
            <div>
              <p className="text-xs font-medium">Laura M.</p>
              <p className="mt-1 text-[10px] text-muted">Objetivo · Fuerza</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
            Activa
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/[0.035] p-2.5">
            <p className="text-[10px] text-muted">Último check-in</p>
            <p className="mt-1 text-xs font-medium">Hace 2 días</p>
          </div>
          <div className="rounded-lg bg-white/[0.035] p-2.5">
            <p className="text-[10px] text-muted">Progreso</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-300">
              <BarChart3 size={12} /> En seguimiento
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "planner") {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#090a0d] p-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Sparkles className="text-accent" size={15} />
          Borrador de entrenamiento
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2.5">
          <Zap className="text-accent" size={14} />
          <span className="text-[11px] text-orange-100">Objetivo: ganar fuerza</span>
          <span className="ml-auto text-[10px] text-muted">IA</span>
        </div>
        <div className="mt-3 space-y-2.5">
          {["Sentadilla · 4 × 6", "Press banca · 4 × 8", "Peso muerto · 3 × 5"].map((item) => (
            <div className="flex items-center gap-2 text-[11px] text-gray-300" key={item}>
              <ListChecks className="text-emerald-400" size={13} />
              {item}
              <Check className="ml-auto text-emerald-400" size={13} />
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-white/[0.07] pt-3 text-[10px] leading-4 text-muted">
          Un punto de partida. Tú decides qué recibe tu atleta.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#090a0d] p-4">
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-600/20 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Film className="text-accent" size={15} />
          Reel listo para revisar
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
          MP4
        </span>
      </div>
      <div className="relative mt-4 flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-[radial-gradient(ellipse_at_55%_20%,rgba(255,85,0,0.28),transparent_52%),linear-gradient(145deg,#191919,#080808)]">
        <div className="max-w-[200px] text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-orange-300">
            H-FLOW · ENTRENA MEJOR
          </p>
          <p className="mt-3 text-xl font-black leading-tight">
            Cada repetición
            <span className="text-accent"> cuenta.</span>
          </p>
        </div>
        <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-accent text-black">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Guion + voz + vídeo
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(ellipse_at_48%_0%,rgba(255,85,0,0.11),transparent_42rem)]" />
      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Logo />
          <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
            <a className="text-sm text-gray-400 transition hover:text-white" href="#plataforma">
              Plataforma
            </a>
            <a className="text-sm text-gray-400 transition hover:text-white" href="#comparativa">
              El cambio
            </a>
            <a className="text-sm text-gray-400 transition hover:text-white" href="#precios">
              Precios
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              className="hidden px-3 py-2 text-sm font-medium text-gray-300 transition hover:text-white sm:inline-flex"
              href="/login"
            >
              Iniciar sesión
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
              href="/register"
            >
              Empieza gratis
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:pb-32 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-200">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_#ff5500]" />
              La plataforma para entrenadores que van en serio
            </div>
            <h1 className="mt-7 max-w-3xl text-[clamp(3.2rem,8vw,6.7rem)] font-black leading-[0.93] tracking-[-0.075em]">
              Deja de perder
              <br />
              <span className="text-accent">14h en Excel.</span>
              <br />
              Vuelve a entrenar.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              Atletas, planes y contenido en un mismo flujo. H-FLOW automatiza el trabajo de
              escritorio para que tú estés donde más importas: con tus clientes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-black shadow-[0_8px_40px_rgba(255,85,0,0.18)] transition hover:-translate-y-0.5 hover:bg-orange-400"
                href="/register"
              >
                Empieza gratis
                <ArrowRight size={16} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-6 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                href="/login"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Check className="text-accent" size={14} />
              Empieza gratis. Sin tarjeta para crear tu cuenta.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[2rem] bg-accent/[0.09] blur-3xl" />
            <div className="relative rounded-2xl border border-white/[0.1] bg-[#0d0f14]/95 p-4 shadow-2xl shadow-black/50 sm:p-5">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-black">
                    <Flame size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-wide">H-FLOW</p>
                    <p className="mt-0.5 text-[10px] text-muted">Panel del entrenador</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] text-emerald-300">
                  Todo en marcha
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4">
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    Atletas activos <Users size={14} className="text-accent" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">24</p>
                  <p className="mt-1 text-[10px] text-gray-500">Tu equipo, de un vistazo</p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    Tiempo recuperado <Clock3 size={14} className="text-accent" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">14<span className="text-base">h</span></p>
                  <p className="mt-1 text-[10px] text-gray-500">Cada semana, fuera de Excel</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold">Tu flujo de trabajo</p>
                  <span className="text-[10px] text-muted">HOY</span>
                </div>
                {[
                  { icon: Users, label: "Check-in de atleta recibido", state: "Actualizado" },
                  { icon: Sparkles, label: "Borrador de plan preparado", state: "Para revisar" },
                  { icon: Film, label: "Nuevo Reel renderizado", state: "Listo" },
                ].map(({ icon: Icon, label, state }) => (
                  <div
                    className="flex items-center gap-3 border-t border-white/[0.06] py-3 first:border-0"
                    key={label}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] text-accent">
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 text-[11px] text-gray-300">{label}</span>
                    <span className="text-[10px] text-gray-500">{state}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/15 bg-accent/[0.055] px-3.5 py-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Zap className="text-accent" size={15} />
                  Menos gestión. Más impacto.
                </div>
                <ArrowUpRight className="text-accent" size={15} />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#151515] px-3.5 py-3 shadow-xl sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300">
                <Check size={16} />
              </span>
              <span className="text-xs font-medium">Todo conectado. Cero hojas sueltas.</span>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="comparison-heading"
          className="border-y border-white/[0.07] bg-[#0a0a0a] py-20 sm:py-24"
          id="comparativa"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                El cambio se nota
              </p>
              <h2
                className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
                id="comparison-heading"
              >
                Mismo negocio.
                <br />
                <span className="text-gray-500">Otra forma de llevarlo.</span>
              </h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="grid grid-cols-[1fr_1fr] bg-[#101010] sm:grid-cols-[1.1fr_1fr_1fr]">
                <div className="hidden p-4 sm:block" />
                <div className="border-l border-white/[0.07] p-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 sm:p-5">
                  Antes
                </div>
                <div className="border-l border-white/[0.07] bg-accent/[0.045] p-4 text-xs font-bold uppercase tracking-[0.14em] text-orange-300 sm:p-5">
                  Con H-FLOW
                </div>
              </div>
              {comparison.map(([topic, before, after]) => (
                <div
                  className="grid grid-cols-[1fr_1fr] border-t border-white/[0.07] sm:grid-cols-[1.1fr_1fr_1fr]"
                  key={topic}
                >
                  <div className="col-span-2 p-4 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-300 sm:col-span-1 sm:p-5">
                    {topic}
                  </div>
                  <div className="flex items-start gap-2 p-4 pt-2 text-xs leading-5 text-gray-500 sm:border-l sm:border-white/[0.07] sm:p-5">
                    <X className="mt-0.5 shrink-0 text-gray-600" size={14} />
                    {before}
                  </div>
                  <div className="flex items-start gap-2 border-l border-white/[0.07] bg-accent/[0.025] p-4 pt-2 text-xs leading-5 text-gray-200 sm:p-5">
                    <Check className="mt-0.5 shrink-0 text-accent" size={14} />
                    {after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
          id="plataforma"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Una plataforma. Un flujo.
              </p>
              <h2
                className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
                id="features-heading"
              >
                Tú entrenas.
                <br />
                <span className="text-gray-500">H-FLOW mueve el resto.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-gray-400">
              Herramientas conectadas para gestionar atletas, dar seguimiento y seguir creciendo.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {features.map(({ number, icon: Icon, title, description, detail, visual }) => (
              <article
                className="group rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 transition hover:-translate-y-1 hover:border-accent/30 sm:p-6"
                key={number}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon size={19} />
                  </span>
                  <span className="text-[10px] font-semibold tracking-[0.16em] text-gray-600">
                    {detail}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-gray-400">{description}</p>
                <div className="mt-5">
                  <FeaturePreview type={visual} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="pricing-heading"
          className="border-y border-white/[0.07] bg-[#0a0a0a] py-20 sm:py-24"
          id="precios"
        >
          <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Sin letra pequeña
              </p>
              <h2
                className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
                id="pricing-heading"
              >
                Elige cómo quieres crecer.
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-400">
                Empieza gratis. Da el salto a Pro cuando quieras automatizar más.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <article
                  className={`relative rounded-2xl border p-6 sm:p-8 ${
                    plan.featured
                      ? "border-accent/50 bg-[linear-gradient(145deg,rgba(255,85,0,0.10),rgba(13,15,20,0.95)_48%)] shadow-[0_0_60px_rgba(255,85,0,0.08)]"
                      : "border-white/[0.09] bg-[#0d0f14]"
                  }`}
                  key={plan.name}
                >
                  {plan.featured && (
                    <span className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                      Más elegido
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                    {plan.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-2 min-h-10 max-w-sm text-sm leading-5 text-gray-400">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.suffix}</span>
                  </div>
                  <Link
                    className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                      plan.featured
                        ? "bg-accent text-black hover:bg-orange-400"
                        : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                    }`}
                    href="/register"
                  >
                    {plan.action}
                    <ArrowRight size={15} />
                  </Link>
                  <ul className="mt-7 space-y-3 border-t border-white/[0.08] pt-6">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-2.5 text-sm text-gray-300" key={feature}>
                        <Check className="mt-0.5 shrink-0 text-accent" size={15} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-gray-500">
              La disponibilidad de algunas funciones puede depender de la configuración de tu cuenta.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-[#0d0f14] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,85,0,0.18),transparent_60%)]" />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent text-black">
                <Dumbbell size={21} />
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                Tu tiempo vale más que una celda.
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-400 sm:text-base">
                Deja atrás el trabajo manual. Lleva tu coaching al siguiente nivel con H-FLOW.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-black transition hover:bg-orange-400"
                  href="/register"
                >
                  Crear mi cuenta
                  <ArrowRight size={16} />
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/[0.05]"
                  href="/login"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.07]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <Logo />
            <p>Menos gestión. Más coaching.</p>
            <Link className="inline-flex items-center gap-1.5 transition hover:text-white" href="/login">
              Acceso entrenadores
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </footer>
      </div>
      <a
        aria-label="Volver arriba"
        className="fixed bottom-5 right-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#151515] text-gray-300 shadow-lg transition hover:border-accent/40 hover:text-accent"
        href="#"
      >
        <ArrowDown className="rotate-180" size={16} />
      </a>
    </main>
  );
}
