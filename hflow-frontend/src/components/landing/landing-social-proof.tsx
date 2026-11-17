import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Marina Ortiz",
    role: "Coach de fuerza · Madrid",
    quote:
      "Pasé de pelearme con Excel a revisar el día en cinco minutos. Mis atletas notan la diferencia.",
    initials: "MO",
    metric: "11 h / semana recuperadas",
  },
  {
    name: "Álex Ruiz",
    role: "Online coaching · Valencia",
    quote:
      "El motor de vídeo me devolvió el marketing sin quitarme sesiones. Publico más, estreso menos.",
    initials: "AR",
    metric: "3× presencia en redes",
  },
  {
    name: "Nora Vidal",
    role: "Performance studio · Barcelona",
    quote:
      "Por fin veo retención y riesgo en el mismo sitio que los check-ins. Decisiones frías, no urgencias.",
    initials: "NV",
    metric: "94% retención activa",
  },
];

const waitlistStats = [
  { value: "180+", label: "Coaches en lista de espera" },
  { value: "14 h", label: "Media ahorrada / semana" },
  { value: "98%", label: "Satisfacción Early Access" },
];

export function LandingSocialProof() {
  return (
    <section
      aria-labelledby="early-access-heading"
      className="border-y border-neutral-800/80 bg-[#0A0A0A] py-20 sm:py-24"
      id="early-access"
    >
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8C00]">
              Early Access Waitlist
            </p>
            <h2
              className="mt-4 font-display text-3xl font-bold tracking-tight text-[#EAEAEA] sm:text-5xl"
              id="early-access-heading"
            >
              Entrenadores que ya recuperaron su agenda.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-neutral-400">
              La Beta Cerrada de H-FLOW está diseñada para coaches de élite que quieren orden,
              métricas y producción de contenido sin ruido.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {waitlistStats.map((stat) => (
              <div
                className="rounded-2xl border border-neutral-800 bg-[#111111] px-3 py-4 text-center shadow-deep sm:px-4 sm:py-5"
                key={stat.label}
              >
                <p className="font-display text-xl font-bold text-[#FF8C00] sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-[10px] leading-4 text-neutral-500 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article
              className="glass-panel hover-lift flex h-full flex-col rounded-2xl p-6"
              key={item.name}
            >
              <div className="flex items-center gap-1 text-[#FF8C00]">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star fill="currentColor" key={index} size={13} />
                ))}
              </div>
              <p className="mt-5 flex-1 text-sm leading-6 text-neutral-300">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3 border-t border-neutral-800 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FF8C00]/15 text-xs font-bold text-[#FF8C00]">
                  {item.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#EAEAEA]">{item.name}</p>
                  <p className="truncate text-xs text-neutral-500">{item.role}</p>
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-[#FF8C00]/20 bg-[#FF8C00]/[0.06] px-3 py-2 text-[11px] font-medium text-[#FF8C00]">
                {item.metric}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#111111] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="font-display text-xl font-bold text-[#EAEAEA]">
              Únete a la lista de Early Access
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              Solicita tu plaza en la Beta. Verificamos tu correo y te avisamos al activar acceso.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF8C00] px-5 text-sm font-bold text-[#0A0A0A] shadow-[0_0_20px_rgba(255,140,0,0.3)] transition-all duration-300 hover:bg-[#e07b00]"
            href="/register"
          >
            Pedir acceso
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
