import Link from "next/link";
import { Flame } from "lucide-react";

export function LandingLogo() {
  return (
    <Link aria-label="H-FLOW, inicio" className="group flex items-center gap-2.5" href="/">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF8C00] text-[#0A0A0A] shadow-glow transition-all duration-300 group-hover:shadow-glow-lg">
        <Flame aria-hidden="true" size={18} strokeWidth={2.6} />
      </span>
      <span className="font-display text-base font-bold tracking-[0.18em] text-[#EAEAEA]">
        H-FLOW
      </span>
    </Link>
  );
}
