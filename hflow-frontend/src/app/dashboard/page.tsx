"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Users,
} from "lucide-react";
import { ApiError, apiDownload, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";
import {
  DashboardErrorState,
  DashboardSkeleton,
} from "@/components/dashboard-feedback";
import {
  AthleteCommandPanel,
  type CommandAthlete,
} from "@/components/dashboard/athlete-command-panel";
import { MetricCard } from "@/components/dashboard/metric-card";

type Athlete = {
  id: string;
  name: string;
  objective: string;
  currentWeight: number;
  isActive: boolean;
  createdAt: string;
};

type DashboardStats = {
  data: {
    activeAthletes: number;
    growth: {
      period: "month-over-month";
      thisMonthRegistrations: number;
      lastMonthRegistrations: number;
      percentage: number | null;
    };
    recentAthletes: Athlete[];
  };
};

type RetentionAlert = {
  id: string;
  name: string;
  lastCheckInAt: string | null;
  daysSinceCheckIn: number | null;
  hasActivePlan: boolean;
  reasons: ("no_recent_checkin" | "no_active_plan")[];
};

type RetentionAlertsResponse = {
  data: {
    thresholdDays: number;
    count: number;
    alerts: RetentionAlert[];
  };
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPercentage(value: number | null): string {
  if (value === null) return "Sin datos del mes anterior";
  const percentage = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
    signDisplay: "always",
  }).format(value);
  return `${percentage}% frente al mes anterior`;
}

function buildCommandAthletes(
  recentAthletes: Athlete[],
  retentionAlerts: RetentionAlert[],
): CommandAthlete[] {
  const alertsById = new Map(retentionAlerts.map((alert) => [alert.id, alert]));
  const fromRecent = recentAthletes.map((athlete): CommandAthlete => {
    const alert = alertsById.get(athlete.id);
    if (alert?.reasons.includes("no_active_plan")) {
      return {
        id: athlete.id,
        name: athlete.name,
        objective: athlete.objective,
        status: "no_plan",
        detail: "Asigna un plan para desbloquear seguimiento",
      };
    }
    if (alert?.reasons.includes("no_recent_checkin")) {
      return {
        id: athlete.id,
        name: athlete.name,
        objective: athlete.objective,
        status: "needs_feedback",
        detail: alert.lastCheckInAt
          ? `Sin check-in hace ${alert.daysSinceCheckIn} días`
          : "Sin check-ins registrados",
      };
    }
    if (athlete.isActive) {
      return {
        id: athlete.id,
        name: athlete.name,
        objective: athlete.objective,
        status: "completed",
        detail: "Actividad reciente dentro de rango",
      };
    }
    return {
      id: athlete.id,
      name: athlete.name,
      objective: athlete.objective,
      status: "tracking",
      detail: "Seguimiento en pausa",
    };
  });

  const missingAlerts = retentionAlerts
    .filter((alert) => !recentAthletes.some((athlete) => athlete.id === alert.id))
    .map((alert): CommandAthlete => ({
      id: alert.id,
      name: alert.name,
      objective: "Revisión pendiente",
      status: alert.reasons.includes("no_active_plan") ? "no_plan" : "needs_feedback",
      detail: alert.reasons.includes("no_active_plan")
        ? "Sin plan asignado"
        : alert.lastCheckInAt
          ? `Sin check-in hace ${alert.daysSinceCheckIn} días`
          : "Sin check-ins",
    }));

  return [...fromRecent, ...missingAlerts].slice(0, 8);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats["data"] | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [retentionAlerts, setRetentionAlerts] = useState<RetentionAlert[]>([]);
  const [retentionError, setRetentionError] = useState("");
  const [isRetentionLoading, setIsRetentionLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsRetentionLoading(true);
    setError("");
    setRetentionError("");

    async function loadStats() {
      try {
        const response = await apiFetch<DashboardStats>("/dashboard/stats", {
          signal: controller.signal,
        });
        setStats(response.data);
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
            : "No se pudieron cargar las estadísticas.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    async function loadRetentionAlerts() {
      try {
        const response = await apiFetch<RetentionAlertsResponse>("/dashboard/retention-alerts", {
          signal: controller.signal,
        });
        setRetentionAlerts(response.data.alerts);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.location.replace("/login");
          return;
        }
        setRetentionError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las alertas de retención.",
        );
      } finally {
        if (!controller.signal.aborted) setIsRetentionLoading(false);
      }
    }

    void loadStats();
    void loadRetentionAlerts();
    return () => controller.abort();
  }, [reloadKey]);

  const growth = stats?.growth.percentage ?? null;
  const isPositiveGrowth = growth !== null && growth >= 0;
  const commandAthletes = useMemo(
    () => buildCommandAthletes(stats?.recentAthletes ?? [], retentionAlerts),
    [stats?.recentAthletes, retentionAlerts],
  );
  const completedCount = commandAthletes.filter((item) => item.status === "completed").length;
  const urgentCount = commandAthletes.filter(
    (item) => item.status === "needs_feedback" || item.status === "no_plan",
  ).length;

  async function exportMonthlyReport() {
    setIsExporting(true);
    setExportError("");
    const reportMonth = new Date().toISOString().slice(0, 7);
    try {
      await apiDownload(
        "/dashboard/export-report",
        `hflow-informe-atletas-${reportMonth}.csv`,
        undefined,
        "text/csv",
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setExportError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo exportar el informe.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8C00]">
            Command Center
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#EAEAEA] sm:text-4xl">
            Resumen
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Control absoluto del equipo: métricas estables, señales claras y cero ruido.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="inline-flex items-center gap-2 text-xs text-neutral-500">
            <CalendarDays size={15} />
            {new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date())}
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-[#111111] px-4 py-2.5 text-sm font-medium text-[#EAEAEA] transition-all duration-300 hover:border-[#FF8C00]/50 hover:text-[#FF8C00] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isExporting}
            onClick={() => void exportMonthlyReport()}
            type="button"
          >
            <Download size={16} />
            {isExporting ? "Generando informe..." : "Exportar Informe Mensual"}
          </button>
        </div>
      </header>

      {exportError && (
        <div className="mt-4">
          <DashboardErrorState
            title="No se pudo exportar el informe"
            message={exportError}
            onRetry={() => void exportMonthlyReport()}
          />
        </div>
      )}

      {error && (
        <div className="mt-7">
          <DashboardErrorState
            message={error}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      )}

      <section aria-label="Indicadores clave" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="Atletas activos en tu equipo"
          icon={<Users size={18} />}
          label="Atletas activos"
          value={
            isLoading ? (
              <DashboardSkeleton className="h-10 w-20" />
            ) : error ? (
              <span className="text-neutral-500">—</span>
            ) : (
              stats?.activeAthletes ?? 0
            )
          }
        />
        <MetricCard
          hint={
            <span className="inline-flex items-center gap-1.5">
              {growth !== null &&
                (isPositiveGrowth ? (
                  <ArrowUpRight className="text-emerald-400" size={14} />
                ) : (
                  <ArrowDownRight className="text-orange-300" size={14} />
                ))}
              {isLoading
                ? "Calculando variación"
                : error
                  ? "Datos no disponibles"
                  : formatPercentage(growth)}
            </span>
          }
          icon={<Activity size={18} />}
          label="Crecimiento mensual"
          value={
            isLoading ? (
              <DashboardSkeleton className="h-10 w-24" />
            ) : error ? (
              <span className="text-neutral-500">—</span>
            ) : growth === null ? (
              <span className="text-2xl text-neutral-500">N/D</span>
            ) : (
              <span className={isPositiveGrowth ? "text-emerald-400" : "text-orange-300"}>
                {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(growth)}%
              </span>
            )
          }
        />
        <MetricCard
          hint="Rutinas al día en el panel operativo"
          icon={<CheckCircle2 size={18} />}
          label="Rutinas al día"
          value={
            isLoading || isRetentionLoading ? (
              <DashboardSkeleton className="h-10 w-16" />
            ) : (
              completedCount
            )
          }
        />
        <MetricCard
          hint="Requieren feedback o plan"
          icon={<AlertTriangle size={18} />}
          label="Atención urgente"
          value={
            isLoading || isRetentionLoading ? (
              <DashboardSkeleton className="h-10 w-16" />
            ) : (
              <span className={urgentCount > 0 ? "text-amber-300" : undefined}>{urgentCount}</span>
            )
          }
        />
      </section>

      <div className="mt-8">
        <AthleteCommandPanel
          athletes={commandAthletes}
          error={error || retentionError}
          isLoading={isLoading || isRetentionLoading}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      </div>

      <section
        aria-labelledby="retention-alerts-heading"
        className="mt-8 overflow-hidden rounded-2xl border border-amber-400/20 bg-[#111111] shadow-deep"
      >
        <header className="flex items-center justify-between gap-4 border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
              <AlertTriangle size={19} />
            </span>
            <div>
              <h2 className="font-display font-semibold text-[#EAEAEA]" id="retention-alerts-heading">
                Alertas de retención
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Atletas sin check-in reciente o sin planes asignados
              </p>
            </div>
          </div>
          {!isRetentionLoading && !retentionError && (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-200">
              {retentionAlerts.length} en riesgo
            </span>
          )}
        </header>

        {retentionError ? (
          <div className="p-5">
            <DashboardErrorState
              title="No se pudieron cargar las alertas"
              message={retentionError}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        ) : isRetentionLoading ? (
          <div aria-label="Revisando actividad de atletas" className="space-y-4 p-5 sm:p-6" role="status">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="flex items-center justify-between gap-4" key={index}>
                <div className="flex-1 space-y-2">
                  <DashboardSkeleton className="h-3 w-36" />
                  <DashboardSkeleton className="h-5 w-48 max-w-full rounded-full" />
                </div>
                <DashboardSkeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : retentionAlerts.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8 sm:px-6">
            <CheckCircle2 className="shrink-0 text-emerald-400" size={20} />
            <p className="text-sm text-neutral-400">
              No hay atletas en riesgo de retención en este momento.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800/80">
            {retentionAlerts.map((alert) => (
              <li
                className="flex flex-col justify-between gap-3 px-5 py-4 transition-all duration-300 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:px-6"
                key={alert.id}
              >
                <div className="min-w-0">
                  <Link
                    className="font-medium text-[#EAEAEA] transition-all duration-300 hover:text-[#FF8C00]"
                    href={`/dashboard/athletes/${encodeURIComponent(alert.id)}`}
                  >
                    {alert.name}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {alert.reasons.includes("no_recent_checkin") && (
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                        {alert.lastCheckInAt
                          ? `Sin check-in hace ${alert.daysSinceCheckIn} días`
                          : "Sin check-ins"}
                      </span>
                    )}
                    {alert.reasons.includes("no_active_plan") && (
                      <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-xs text-red-200">
                        Sin plan asignado
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  aria-label={`Ver perfil de ${alert.name}`}
                  className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-neutral-500 transition-all duration-300 hover:text-[#EAEAEA]"
                  href={`/dashboard/athletes/${encodeURIComponent(alert.id)}`}
                >
                  Ver atleta
                  <ArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111] shadow-deep">
        <div className="flex flex-col justify-between gap-2 border-b border-neutral-800 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display font-semibold text-[#EAEAEA]">Últimos atletas</h2>
            <p className="mt-1 text-xs text-neutral-500">Los cinco registros más recientes</p>
          </div>
          {stats && (
            <span className="text-xs text-neutral-500">
              {stats.growth.thisMonthRegistrations} nuevos este mes
            </span>
          )}
        </div>

        {error ? (
          <div className="px-5 py-8 text-sm text-neutral-500">
            Reintenta la carga del resumen para volver a consultar los atletas.
          </div>
        ) : isLoading ? (
          <div aria-label="Cargando atletas recientes" className="space-y-4 p-5 sm:p-6" role="status">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="flex items-center gap-4" key={index}>
                <DashboardSkeleton className="h-9 w-9 shrink-0 rounded-full" />
                <DashboardSkeleton className="h-3 w-1/3" />
                <DashboardSkeleton className="ml-auto h-3 w-24" />
              </div>
            ))}
          </div>
        ) : !stats?.recentAthletes.length ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto text-neutral-500" size={24} />
            <p className="mt-3 text-sm font-medium text-[#EAEAEA]">Todavía no hay atletas</p>
            <p className="mt-1 text-xs text-neutral-500">Cuando registres atletas, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Atleta</th>
                  <th className="px-6 py-3.5 font-medium">Objetivo</th>
                  <th className="px-6 py-3.5 font-medium">Peso actual</th>
                  <th className="px-6 py-3.5 font-medium">Estado</th>
                  <th className="px-6 py-3.5 font-medium">Fecha de alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {stats.recentAthletes.map((athlete) => (
                  <tr
                    className="transition-all duration-300 hover:bg-white/[0.02]"
                    key={athlete.id}
                  >
                    <td className="px-6 py-4 font-medium text-[#EAEAEA]">{athlete.name}</td>
                    <td className="max-w-[200px] truncate px-6 py-4 text-neutral-500">
                      {athlete.objective}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                      {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
                        athlete.currentWeight,
                      )}{" "}
                      kg
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                          athlete.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-white/[0.06] text-neutral-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            athlete.isActive ? "bg-emerald-400" : "bg-neutral-500"
                          }`}
                        />
                        {athlete.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                      {formatDate(athlete.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
