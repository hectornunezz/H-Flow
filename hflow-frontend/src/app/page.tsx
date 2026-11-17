import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";
import { LandingBento } from "@/components/landing/landing-bento";
import { LandingFinalCta, LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";

export const metadata: Metadata = {
  title: "H-FLOW | El fin del caos operativo",
  description:
    "SaaS B2B premium para entrenadores de élite: gestión de atletas, vídeo con IA Hyperframes y métricas de negocio.",
};

export default function Home() {
  const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true";

  return (
    <main className="overflow-x-hidden bg-[#0A0A0A] text-[#EAEAEA]">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-dark-mesh opacity-90" />
      <div className="relative z-10">
        <LandingHeader paymentsEnabled={paymentsEnabled} />
        <LandingHero />
        <LandingBento />
        <LandingSocialProof />
        {paymentsEnabled ? <LandingPricing /> : null}
        <LandingFinalCta />
        <LandingFooter />
      </div>

      <a
        aria-label="Volver arriba"
        className="fixed bottom-5 right-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-neutral-800 bg-[#111111]/90 text-neutral-300 shadow-deep backdrop-blur-md transition-all duration-300 hover:border-[#FF8C00]/40 hover:text-[#FF8C00]"
        href="#"
      >
        <ArrowDown className="rotate-180" size={16} />
      </a>
    </main>
  );
}
