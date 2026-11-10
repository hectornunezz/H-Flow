"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Link2,
  LoaderCircle,
  Save,
  Scale,
  UserRound,
} from "lucide-react";
import { ApiError, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";
import { WeightProgressChart } from "@/components/weight-progress-chart";
import {
  DashboardErrorState,
  DashboardSkeleton,
} from "@/components/dashboard-feedback";

type Athlete = {
  id: string;
  name: string;
  email: string | null;
  objective: string;
  currentWeight: number;
  isActive: boolean;
  createdAt: string;
};

type CheckIn = {
  id: string;
  athleteId: string;
  weight: number;
  bodyFat: number | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
};

type DataResponse<T> = { data: T };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeight(weight: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(weight);
}

export default function AthleteDetailPage() {
  const params = useParams<{ id: string }>();
  const athleteId = params.id;
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [objective, setObjective] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [portalExpiresAt, setPortalExpiresAt] = useState("");
  const [isCreatingPortalAccess, setIsCreatingPortalAccess] = useState(false);
  const [portalMessage, setPortalMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAthlete() {
      setIsLoading(true);
      setError("");
      try {
        const [athleteResponse, checkInResponse] = await Promise.all([
          apiFetch<DataResponse<Athlete>>(`/athletes/${encodeURIComponent(athleteId)}`, {
            signal: controller.signal,
          }),
          apiFetch<DataResponse<CheckIn[]>>(`/checkins/${encodeURIComponent(athleteId)}`, {
            signal: controller.signal,
          }),
        ]);
        setAthlete(athleteResponse.data);
        setObjective(athleteResponse.data.objective);
        setCurrentWeight(String(athleteResponse.data.currentWeight));
        setCheckIns(checkInResponse.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.location.replace("/login");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el perfil del atleta.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadAthlete();
    return () => controller.abort();
  }, [athleteId, reloadKey]);

  async function saveMetrics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!athlete) return;

    setIsSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const response = await apiFetch<DataResponse<Athlete>>(
        `/athletes/${encodeURIComponent(athlete.id)}/metrics`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objective: objective.trim(),
            currentWeight: Number(currentWeight),
          }),
        },
      );
      setAthlete(response.data);
      setObjective(response.data.objective);
      setCurrentWeight(String(response.data.currentWeight));
      setSaveMessage("Las métricas se actualizaron correctamente.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron actualizar las métricas.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function createPortalAccess() {
    if (!athlete) return;
    setIsCreatingPortalAccess(true);
    setPortalMessage("");
    setError("");
    try {
      const response = await apiFetch<{
        data: { url: string; expiresAt: string };
      }>("/athlete-portal/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id }),
      });
      setPortalUrl(response.data.url);
      setPortalExpiresAt(response.data.expiresAt);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el enlace del portal.",
      );
    } finally {
      setIsCreatingPortalAccess(false);
    }
  }

  async function copyPortalLink() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setPortalMessage("Enlace copiado.");
    } catch {
      setPortalMessage("No se pudo copiar automáticamente. Selecciona y copia el enlace.");
    }
  }

  if (isLoading) {
    return (
      <div aria-label="Cargando perfil del atleta" className="space-y-6" role="status">
        <DashboardSkeleton className="h-4 w-32" />
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 sm:p-6">
          <DashboardSkeleton className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <DashboardSkeleton className="h-3 w-28" />
            <DashboardSkeleton className="h-7 w-2/3" />
            <DashboardSkeleton className="h-3 w-1/3" />
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <DashboardSkeleton className="h-5 w-44" />
          <DashboardSkeleton className="mt-3 h-3 w-72 max-w-full" />
          <DashboardSkeleton className="mt-6 h-56 w-full rounded-xl" />
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <DashboardSkeleton className="h-64 rounded-2xl" />
          <DashboardSkeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !athlete) {
    return (
      <div className="space-y-4">
        <DashboardErrorState
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
        <Link className="inline-flex text-sm text-muted transition hover:text-accent" href="/dashboard/athletes">
          Volver a atletas
        </Link>
      </div>
    );
  }

  if (!athlete) return null;

  return (
    <div>
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-white"
        href="/dashboard/athletes"
      >
        <ArrowLeft size={16} />
        Volver a atletas
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
            <UserRound size={25} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Perfil del atleta
            </p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{athlete.name}</h1>
            <p className="mt-1 truncate text-sm text-muted">{athlete.email || "Sin correo registrado"}</p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
            athlete.isActive
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-white/[0.06] text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              athlete.isActive ? "bg-emerald-400" : "bg-gray-500"
            }`}
          />
          {athlete.isActive ? "Activo" : "Inactivo"}
        </span>
      </header>

      <section className="mt-6 rounded-2xl border border-line bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <h2 className="font-semibold">Portal del atleta</h2>
          <p className="mt-1 text-sm text-muted">
            Genera un enlace privado para que consulte sus planes y registre check-ins.
          </p>
        </div>
        <button
          className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-4 py-2.5 text-sm font-semibold text-[#030712] transition hover:brightness-110 disabled:opacity-60 sm:mt-0"
          disabled={isCreatingPortalAccess}
          onClick={() => void createPortalAccess()}
          type="button"
        >
          {isCreatingPortalAccess ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Link2 size={16} />
          )}
          Crear enlace de acceso
        </button>
        {portalUrl && (
          <div className="mt-4 min-w-0 basis-full sm:mt-0">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                aria-label="Enlace del portal del atleta"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-black/20 px-3 text-xs text-muted"
                readOnly
                value={portalUrl}
              />
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm transition hover:border-accent/50 hover:text-accent"
                onClick={() => void copyPortalLink()}
                type="button"
              >
                <Copy size={15} />
                Copiar
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Válido hasta {formatDate(portalExpiresAt)}. Compártelo solo con este atleta.
              {portalMessage && <span className="ml-2 text-emerald-300">{portalMessage}</span>}
            </p>
          </div>
        )}
      </section>

      {error && (
        <p aria-live="polite" className="mt-6 rounded-lg border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm text-accent-hover" role="alert">
          {error}
        </p>
      )}

      <section aria-labelledby="progress-chart-heading" className="mt-8 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Seguimiento</p>
          <h2 className="mt-1 text-lg font-semibold" id="progress-chart-heading">
            Evolución corporal
          </h2>
          <p className="mt-1 text-xs text-muted">
            Evolución del peso y porcentaje graso según los check-ins registrados.
          </p>
        </header>
        <WeightProgressChart checkIns={checkIns} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-line bg-card">
          <header className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold">Historial de peso</h2>
              <p className="mt-1 text-xs text-muted">Check-ins registrados para este atleta</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
              <Scale size={18} />
            </span>
          </header>

          {checkIns.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Scale className="mx-auto text-muted" size={25} />
              <p className="mt-3 text-sm font-medium">Todavía no hay check-ins</p>
              <p className="mt-1 text-xs text-muted">
                Las mediciones de peso aparecerán aquí cuando se registren.
              </p>
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[510px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Fecha</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Peso</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">% grasa</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {checkIns.map((checkIn) => (
                    <tr key={checkIn.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-muted sm:px-6">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="text-gray-600" size={14} />
                          {formatDate(checkIn.createdAt)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-white sm:px-6">
                        {formatWeight(checkIn.weight)} kg
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted sm:px-6">
                        {checkIn.bodyFat === null
                          ? "—"
                          : `${formatWeight(checkIn.bodyFat)}%`}
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-4 text-muted sm:px-6">
                        {checkIn.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="h-fit rounded-2xl border border-line bg-card p-5 sm:p-6">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Objetivos y medidas
            </p>
            <h2 className="mt-2 text-lg font-semibold">Actualizar métricas</h2>
            <p className="mt-1 text-sm text-muted">Edita el objetivo y el peso actual.</p>
          </header>

          <form className="space-y-4" onSubmit={saveMetrics}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="athlete-objective">
                Objetivo
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-lg border border-line bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-accent"
                id="athlete-objective"
                maxLength={500}
                onChange={(event) => setObjective(event.target.value)}
                required
                value={objective}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="athlete-current-weight">
                Peso actual (kg)
              </label>
              <input
                className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                id="athlete-current-weight"
                min="0.1"
                onChange={(event) => setCurrentWeight(event.target.value)}
                required
                step="0.1"
                type="number"
                value={currentWeight}
              />
            </div>

            {saveMessage && (
              <p aria-live="polite" className="text-sm text-emerald-400" role="status">
                {saveMessage}
              </p>
            )}

            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] px-4 text-sm font-semibold text-[#030712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-4 text-xs text-muted">
            Registrado el {formatDate(athlete.createdAt)}
          </div>
        </section>
      </div>
    </div>
  );
}
