import { ArrowUpRight, CircleDashed } from "lucide-react";

type DashboardSectionPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardSectionPlaceholder({
  title,
  description,
}: DashboardSectionPlaceholderProps) {
  return (
    <section className="flex min-h-[55vh] flex-col justify-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        H-FLOW / Workspace
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 max-w-2xl rounded-2xl border border-line bg-card p-6 sm:p-8">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
          <CircleDashed size={21} />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Todo listo para empezar</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <a
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white transition hover:text-accent"
          href="/dashboard"
        >
          Volver al resumen
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
