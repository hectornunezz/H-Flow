import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LandingLogo } from "./landing-logo";

type LandingHeaderProps = {
  paymentsEnabled: boolean;
};

export function LandingHeader({ paymentsEnabled }: LandingHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <LandingLogo />
      <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
        <a
          className="text-sm text-neutral-400 transition-all duration-300 hover:text-[#EAEAEA]"
          href="#plataforma"
        >
          Plataforma
        </a>
        <a
          className="text-sm text-neutral-400 transition-all duration-300 hover:text-[#EAEAEA]"
          href="#early-access"
        >
          Early Access
        </a>
        {paymentsEnabled && (
          <a
            className="text-sm text-neutral-400 transition-all duration-300 hover:text-[#EAEAEA]"
            href="#precios"
          >
            Precios
          </a>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          className="hidden px-3 py-2 text-sm font-medium text-neutral-300 transition-all duration-300 hover:text-white sm:inline-flex"
          href="/login"
        >
          Iniciar sesión
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-glow transition-all duration-300 hover:bg-[#e07b00]"
          href="/register"
        >
          Acceder a la Beta
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
