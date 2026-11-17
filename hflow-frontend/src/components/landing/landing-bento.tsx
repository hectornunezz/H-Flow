import {
  BarChart3,
  CheckCircle2,
  Film,
  LineChart,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    id: "athletes",
    eyebrow: "01 · Operaciones",
    title: "Gestión centralizada de atletas",
    description:
      "Rutinas, check-ins y evolución en un único panel. Sabes quién avanzó y quién necesita atención — sin hojas dispersas.",
    icon: Users,
    className: "md:col-span-2 lg:col-span-2 lg:row-span-2",
    visual: "athletes" as const,
  },
  {
    id: "video",
    eyebrow: "02 · Contenido",
    title: "Motor de vídeo por IA",
    description:
      "Hyperframes convierte un tema en guion, voz y Reel listo para publicar. Marketing sin drenar tu agenda.",
    icon: Film,
    className: "md:col-span-2 lg:col-span-2",
    visual: "video" as const,
  },
  {
    id: "finance",
    eyebrow: "03 · Negocio",
    title: "Control financiero y métricas",
    description:
      "Crecimiento, retención y señales de riesgo en tiempo real. Decisiones de coach-emprendedor con datos claros.",
    icon: LineChart,
    className: "md:col-span-2 lg:col-span-2",
    visual: "finance" as const,
  },
];

function BentoVisual({ type }: { type: "athletes" | "video" | "finance" }) {
  if (type === "athletes") {
    return (
      <div className="mt-8 space-y-3">
        {[
          { name: "Laura M.", status: "Rutina completada", tone: "ok" },
          { name: "Diego R.", status: "Feedback urgente", tone: "alert" },
          { name: "Carla S.", status: "Check-in recibido", tone: "ok" },
        ].map((row) => (
          <div
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-[#0A0A0A]/70 px-3.5 py-3"
            key={row.name}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FF8C00]/15 text-xs font-bold text-[#FF8C00]">
                {row.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <p className="text-sm font-medium text-[#EAEAEA]">{row.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                  {row.tone === "ok" ? (
                    <CheckCircle2 className="text-emerald-400" size={12} />
                  ) : (
                    <ListChecks className="text-amber-300" size={12} />
                  )}
                  {row.status}
                </p>
              </div>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                row.tone === "ok" ? "bg-emerald-400" : "bg-amber-300 animate-pulse-soft"
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-800 bg-[#0A0A0A]/70 p-4">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="text-[#FF8C00]" size={14} />
            Hyperframes
          </span>
          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
            MP4 listo
          </span>
        </div>
        <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-lg border border-neutral-800 bg-[radial-gradient(ellipse_at_60%_20%,rgba(255,140,0,0.25),transparent_55%),#0A0A0A]">
          <p className="max-w-[220px] text-center font-display text-lg font-bold leading-tight text-[#EAEAEA]">
            Cada repetición
            <span className="text-[#FF8C00]"> cuenta.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {[
        { label: "Retención", value: "94%", icon: BarChart3 },
        { label: "MRR estimado", value: "+18%", icon: LineChart },
      ].map(({ label, value, icon: Icon }) => (
        <div
          className="rounded-xl border border-neutral-800 bg-[#0A0A0A]/70 p-4"
          key={label}
        >
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            {label}
            <Icon className="text-[#FF8C00]" size={14} />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#EAEAEA]">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function LandingBento() {
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
      id="plataforma"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8C00]">
          Tres pilares. Un sistema.
        </p>
        <h2
          className="mt-4 font-display text-3xl font-bold tracking-tight text-[#EAEAEA] sm:text-5xl"
          id="features-heading"
        >
          Todo lo que mueve tu negocio,
          <span className="text-neutral-500"> en una cuadrícula clara.</span>
        </h2>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        {features.map(({ id, eyebrow, title, description, icon: Icon, className, visual }) => (
          <article
            className={`group glass-panel hover-lift rounded-2xl p-6 sm:p-7 ${className}`}
            key={id}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF8C00]/10 text-[#FF8C00] transition-all duration-300 group-hover:shadow-glow">
                <Icon size={20} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {eyebrow}
              </span>
            </div>
            <h3 className="mt-6 font-display text-xl font-bold tracking-tight text-[#EAEAEA] sm:text-2xl">
              {title}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">{description}</p>
            <BentoVisual type={visual} />
          </article>
        ))}
      </div>
    </section>
  );
}
