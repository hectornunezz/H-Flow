import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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

export function LandingPricing() {
  return (
    <section
      aria-labelledby="pricing-heading"
      className="border-y border-neutral-800/80 bg-[#0A0A0A] py-20 sm:py-24"
      id="precios"
    >
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8C00]">
            Sin letra pequeña
          </p>
          <h2
            className="mt-4 font-display text-3xl font-bold tracking-tight text-[#EAEAEA] sm:text-5xl"
            id="pricing-heading"
          >
            Elige cómo quieres crecer.
          </h2>
          <p className="mt-4 text-sm leading-6 text-neutral-400">
            Empieza gratis. Da el salto a Pro cuando quieras automatizar más.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              className={`relative rounded-2xl border p-6 transition-all duration-300 sm:p-8 ${
                plan.featured
                  ? "border-[#FF8C00]/40 bg-[linear-gradient(145deg,rgba(255,140,0,0.1),rgba(17,17,17,0.95)_48%)] shadow-glow"
                  : "border-neutral-800 bg-[#111111] hover:border-neutral-700"
              }`}
              key={plan.name}
            >
              {plan.featured && (
                <span className="absolute right-6 top-6 rounded-full bg-[#FF8C00] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0A0A0A]">
                  Más elegido
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#FF8C00]">
                {plan.eyebrow}
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold text-[#EAEAEA]">{plan.name}</h3>
              <p className="mt-2 min-h-10 max-w-sm text-sm leading-5 text-neutral-400">
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold tracking-tight text-[#EAEAEA]">
                  {plan.price}
                </span>
                <span className="text-sm text-neutral-500">{plan.suffix}</span>
              </div>
              <Link
                className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all duration-300 ${
                  plan.featured
                    ? "bg-[#FF8C00] text-[#0A0A0A] shadow-glow hover:bg-[#e07b00]"
                    : "border border-neutral-800 bg-white/[0.03] text-[#EAEAEA] hover:bg-white/[0.06]"
                }`}
                href="/register"
              >
                {plan.action}
                <ArrowRight size={15} />
              </Link>
              <ul className="mt-7 space-y-3 border-t border-neutral-800 pt-6">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2.5 text-sm text-neutral-300" key={feature}>
                    <Check className="mt-0.5 shrink-0 text-[#FF8C00]" size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
