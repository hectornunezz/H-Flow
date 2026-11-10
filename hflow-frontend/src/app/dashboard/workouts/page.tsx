"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Copy,
  Download,
  Dumbbell,
  LoaderCircle,
  Plus,
  UserRound,
} from "lucide-react";
import {
  DashboardErrorState,
  DashboardSkeleton,
} from "@/components/dashboard-feedback";
import { ApiError, apiDownload, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type Athlete = {
  id: string;
  name: string;
};

type WorkoutPlan = {
  id: string;
  title: string;
  description: string;
  athleteId: string;
  scheduledAt: string | null;
  createdAt: string;
  sourcePlanId?: string | null;
};

type DataResponse<T> = { data: T };

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha programada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha programada";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function WorkoutsPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneFailure, setCloneFailure] = useState<{
    plan: WorkoutPlan;
    message: string;
  } | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState("");
  const [downloadFailure, setDownloadFailure] = useState<{
    plan: WorkoutPlan;
    message: string;
  } | null>(null);

  const loadWorkouts = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const athleteQuery = new URLSearchParams({ page: "1", pageSize: "100" });
      const [workoutResponse, athleteResponse] = await Promise.all([
        apiFetch<DataResponse<WorkoutPlan[]>>("/workouts", { signal }),
        apiFetch<DataResponse<Athlete[]>>(`/athletes?${athleteQuery}`, { signal }),
      ]);
      setPlans(workoutResponse.data);
      setAthletes(athleteResponse.data);
    } catch (requestError) {
      if (signal.aborted) return;
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar las rutinas.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkouts(controller.signal);
    return () => controller.abort();
  }, [loadWorkouts, reloadKey]);

  async function downloadPdf(plan: WorkoutPlan) {
    setDownloadingId(plan.id);
    setDownloadFailure(null);
    try {
      await apiDownload(
        `/workouts/${encodeURIComponent(plan.id)}/pdf`,
        `${plan.title.trim().replace(/[^a-z0-9-_]+/gi, "-") || "rutina"}.pdf`,
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setDownloadFailure({
        plan,
        message:
          requestError instanceof Error
            ? requestError.message
            : "No se pudo descargar el PDF de la rutina.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function cloneMicrocycle(plan: WorkoutPlan) {
    setCloningId(plan.id);
    setCloneFailure(null);
    setCloneSuccess("");
    try {
      const response = await apiFetch<DataResponse<WorkoutPlan>>(
        `/workouts/${encodeURIComponent(plan.id)}/clone`,
        { method: "POST" },
      );
      setPlans((current) => [response.data, ...current]);
      setCloneSuccess(`Microciclo clonado para la semana siguiente: ${plan.title}.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setCloneFailure({
        plan,
        message:
          requestError instanceof Error
            ? requestError.message
            : "No se pudo clonar el microciclo.",
      });
    } finally {
      setCloningId(null);
    }
  }

  const athleteNames = new Map(athletes.map((athlete) => [athlete.id, athlete.name]));

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Biblioteca de entrenamiento
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Rutinas
          </h1>
          <p className="mt-2 text-sm text-muted">
            Consulta las sesiones asignadas y descarga sus documentos.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-fire px-4 text-sm font-semibold text-background transition hover:brightness-110 sm:self-auto"
          href="/dashboard/plans"
        >
          <Plus aria-hidden="true" size={17} />
          Crear y asignar rutina
        </Link>
      </header>

      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Dumbbell aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="font-semibold">Planes de entrenamiento</h2>
              <p className="mt-1 text-xs text-muted">
                {isLoading ? "Actualizando biblioteca" : `${plans.length} rutinas asignadas`}
              </p>
            </div>
          </div>
        </header>

        {downloadFailure && (
          <div className="px-5 pt-5 sm:px-6">
            <DashboardErrorState
              title="No se pudo descargar la rutina"
              message={downloadFailure.message}
              onRetry={() => void downloadPdf(downloadFailure.plan)}
            />
          </div>
        )}

        {cloneSuccess && (
          <p
            aria-live="polite"
            className="mx-5 mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300 sm:mx-6"
            role="status"
          >
            {cloneSuccess}
          </p>
        )}

        {cloneFailure && (
          <div className="px-5 pt-5 sm:px-6">
            <DashboardErrorState
              title="No se pudo clonar el microciclo"
              message={cloneFailure.message}
              onRetry={() => void cloneMicrocycle(cloneFailure.plan)}
            />
          </div>
        )}

        {error ? (
          <div className="p-5 sm:p-6">
            <DashboardErrorState
              message={error}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        ) : isLoading ? (
          <div
            aria-label="Cargando rutinas"
            className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
            role="status"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div className="rounded-xl border border-line bg-background p-5" key={index}>
                <div className="flex items-start justify-between gap-3">
                  <DashboardSkeleton className="h-10 w-10 rounded-xl" />
                  <DashboardSkeleton className="h-8 w-20 rounded-lg" />
                </div>
                <DashboardSkeleton className="mt-5 h-4 w-2/3" />
                <DashboardSkeleton className="mt-3 h-3 w-full" />
                <DashboardSkeleton className="mt-2 h-3 w-4/5" />
                <DashboardSkeleton className="mt-6 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Dumbbell aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-4 text-base font-semibold">Aún no hay rutinas asignadas</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Crea un plan de entrenamiento y asígnalo a un atleta para que aparezca en esta biblioteca.
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-hover"
              href="/dashboard/plans"
            >
              Ir a planes
              <Plus aria-hidden="true" size={16} />
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {plans.map((plan) => (
              <li
                className="flex min-w-0 flex-col rounded-xl border border-line bg-background p-5 transition hover:border-accent/30"
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Dumbbell aria-hidden="true" size={18} />
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Clonar microciclo de ${plan.title}`}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 text-xs font-medium text-accent transition hover:border-accent/50 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={cloningId === plan.id}
                      onClick={() => void cloneMicrocycle(plan)}
                      type="button"
                    >
                      {cloningId === plan.id ? (
                        <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                      ) : (
                        <Copy aria-hidden="true" size={14} />
                      )}
                      Clonar
                    </button>
                    <button
                      aria-label={`Descargar PDF de ${plan.title}`}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={downloadingId === plan.id}
                      onClick={() => void downloadPdf(plan)}
                      type="button"
                    >
                      {downloadingId === plan.id ? (
                        <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                      ) : (
                        <Download aria-hidden="true" size={14} />
                      )}
                      PDF
                    </button>
                  </div>
                </div>
                {plan.sourcePlanId && (
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Microciclo clonado
                  </p>
                )}
                <h3 className="mt-5 truncate text-base font-semibold text-foreground">
                  {plan.title}
                </h3>
                <p className="mt-2 max-h-24 overflow-hidden whitespace-pre-line text-sm leading-6 text-muted">
                  {plan.description}
                </p>
                <div className="mt-auto space-y-3 pt-5 text-xs text-muted">
                  <p className="flex items-center gap-2">
                    <UserRound aria-hidden="true" className="text-accent" size={14} />
                    {athleteNames.get(plan.athleteId) ?? "Atleta"}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="text-accent" size={14} />
                    {formatDate(plan.scheduledAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
