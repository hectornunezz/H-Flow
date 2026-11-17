import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  hint: ReactNode;
};

export function MetricCard({ label, icon, value, hint }: MetricCardProps) {
  return (
    <article className="group rounded-2xl border border-neutral-800 bg-[#111111] p-5 shadow-deep transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FF8C00]/35 hover:shadow-glow sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF8C00]/10 text-[#FF8C00] transition-all duration-300 group-hover:shadow-glow">
          {icon}
        </span>
      </div>
      <div className="mt-6 font-display text-4xl font-semibold tracking-tight text-[#EAEAEA]">
        {value}
      </div>
      <div className="mt-2 text-xs text-neutral-500">{hint}</div>
    </article>
  );
}
