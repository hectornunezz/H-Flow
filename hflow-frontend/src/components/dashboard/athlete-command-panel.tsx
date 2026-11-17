import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquareWarning, TimerReset } from "lucide-react";
import { DashboardErrorState, DashboardSkeleton } from "@/components/dashboard-feedback";

export type CommandAthlete = {
  id: string;
  name: string;
  objective: string;
  status: "completed" | "needs_feedback" | "no_plan" | "tracking";
  detail: string;
};

type AthleteCommandPanelProps = {
  athletes: CommandAthlete[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
};

const statusStyles: Record<
  CommandAthlete["status"],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "Rutina completada",
    className: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    icon: CheckCircle2,
  },
  needs_feedback: {
    label: "Feedback urgente",
    className: "bg-amber-400/10 text-amber-200 border-amber-400/20",
    icon: MessageSquareWarning,
  },
  no_plan: {
    label: "Sin plan activo",
    className: "bg-red-400/10 text-red-200 border-red-400/20",
    icon: TimerReset,
  },
  tracking: {
    label: "En seguimiento",
    className: "bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/20",
    icon: TimerReset,
  },
};

export function AthleteCommandPanel({
  athletes,
  isLoading,
  error,
  onRetry,
}: AthleteCommandPanelProps) {
  return (
    <section
      aria-labelledby="command-panel-heading"
      className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111] shadow-deep"
    >
      <header className="flex flex-col justify-between gap-3 border-b border-neutral-800 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF8C00]">
            Tiempo real
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[#EAEAEA]" id="command-panel-heading">
            Panel de control de atletas
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Quién completó la rutina y quién necesita tu feedback ahora.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-[#0A0A0A] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />
          Live pulse
        </span>
      </header>

      {error ? (
        <div className="p-5">
          <DashboardErrorState title="No se pudo cargar el panel" message={error} onRetry={onRetry} />
        </div>
      ) : isLoading ? (
        <div aria-label="Cargando estado de atletas" className="space-y-4 p-5 sm:p-6" role="status">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="flex items-center gap-4" key={index}>
              <DashboardSkeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <DashboardSkeleton className="h-3 w-40" />
                <DashboardSkeleton className="h-3 w-56 max-w-full" />
              </div>
              <DashboardSkeleton className="h-7 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : athletes.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-sm font-medium text-[#EAEAEA]">Sin señales todavía</p>
          <p className="mt-1 text-xs text-neutral-500">
            Cuando tengas atletas activos, su estado operativo aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-800/80">
          {athletes.map((athlete) => {
            const style = statusStyles[athlete.status];
            const Icon = style.icon;
            return (
              <li
                className="flex flex-col gap-3 px-5 py-4 transition-all duration-300 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                key={athlete.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-800 bg-[#0A0A0A] text-xs font-bold text-[#FF8C00]">
                    {athlete.name
                      .split(" ")
                      .map((part) => part[0] ?? "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <Link
                      className="truncate font-medium text-[#EAEAEA] transition-all duration-300 hover:text-[#FF8C00]"
                      href={`/dashboard/athletes/${encodeURIComponent(athlete.id)}`}
                    >
                      {athlete.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {athlete.objective} · {athlete.detail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${style.className}`}
                  >
                    <Icon size={13} />
                    {style.label}
                  </span>
                  <Link
                    aria-label={`Abrir perfil de ${athlete.name}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-all duration-300 hover:text-[#EAEAEA]"
                    href={`/dashboard/athletes/${encodeURIComponent(athlete.id)}`}
                  >
                    Abrir
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
