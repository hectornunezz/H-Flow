import { AlertCircle, RotateCw } from "lucide-react";

type DashboardErrorStateProps = {
  title?: string;
  message: string;
  onRetry: () => void;
};

export function DashboardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-md bg-surface ${className}`}
    />
  );
}

export function DashboardErrorState({
  title = "No se pudieron cargar los datos",
  message,
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-4 rounded-xl border border-accent/20 bg-accent/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-accent" size={18} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/25 px-3 text-sm font-medium text-accent transition hover:border-accent/50 hover:bg-gradient-to-r from-[#f97316] to-[#ea580c]/10"
        onClick={onRetry}
        type="button"
      >
        <RotateCw aria-hidden="true" size={15} />
        Reintentar
      </button>
    </div>
  );
}
