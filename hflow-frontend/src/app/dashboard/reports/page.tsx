"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  LoaderCircle,
  Plus,
  Upload,
  Video,
} from "lucide-react";
import { ApiError, apiFetch, apiFetchBlob, TOKEN_STORAGE_KEY } from "@/lib/api";
import {
  DashboardErrorState,
  DashboardSkeleton,
} from "@/components/dashboard-feedback";
import {
  calculateAverageRirDifference,
  calculateRirDifference,
} from "@/lib/rir-calculation";

type WorkoutPlan = {
  id: string;
  title: string;
  athleteId: string;
  scheduledAt: string | null;
};

type WorkoutSetReport = {
  id: string;
  workoutPlanId: string;
  exercise: string;
  setNumber: number;
  targetRir: number;
  actualRir: number | null;
  actualKg: number | null;
  videoFileName: string | null;
  createdAt: string;
  workoutPlan: {
    id: string;
    title: string;
    athleteId: string;
    scheduledAt: string | null;
    athlete: { name: string };
  };
};

type Athlete = { id: string; name: string };
type DataResponse<T> = { data: T };
type ActualDraft = { actualRir: string; actualKg: string };

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function RirComparison({ target, actual }: { target: number; actual: number | null }) {
  if (actual === null) {
    return <span className="text-xs text-muted">Pendiente</span>;
  }
  const difference = calculateRirDifference(target, actual);
  if (difference === null) {
    return <span className="text-xs text-muted">Pendiente</span>;
  }
  const isOnTarget = difference === 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums ${
        isOnTarget
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-accent/10 text-accent-hover"
      }`}
    >
      {isOnTarget ? (
        <Check aria-hidden="true" size={13} />
      ) : difference > 0 ? (
        <ArrowUpRight aria-hidden="true" size={13} />
      ) : (
        <ArrowDownRight aria-hidden="true" size={13} />
      )}
      {difference > 0 ? "+" : ""}
      {difference.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
    </span>
  );
}

function SetVideo({
  report,
  onUpload,
  isUploading,
}: {
  report: WorkoutSetReport;
  onUpload: (report: WorkoutSetReport, file: File) => void;
  isUploading: boolean;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");

  useEffect(() => {
    if (!report.videoFileName) {
      setVideoUrl("");
      setVideoError("");
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";
    setVideoError("");
    void apiFetchBlob(`/workouts/reports/sets/${encodeURIComponent(report.id)}/video`, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setVideoError(error instanceof Error ? error.message : "No se pudo cargar el vídeo.");
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report.id, report.videoFileName]);

  return (
    <div className="w-full max-w-[220px]">
      {report.videoFileName ? (
        videoUrl ? (
          <video
            aria-label={`Vídeo de ${report.exercise}, serie ${report.setNumber}`}
            className="aspect-video w-full rounded-lg border border-line bg-black object-cover"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
          />
        ) : (
          <div
            className="grid aspect-video place-items-center rounded-lg border border-line bg-black/30 px-3 text-center text-xs text-muted"
            role={videoError ? "alert" : "status"}
          >
            {videoError || <LoaderCircle aria-hidden="true" className="animate-spin text-accent" size={18} />}
          </div>
        )
      ) : (
        <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-line bg-black/20 text-muted">
          <div className="flex items-center gap-2 text-xs">
            <Video aria-hidden="true" size={15} />
            Sin vídeo
          </div>
        </div>
      )}
      <label className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-accent transition hover:bg-accent/10">
        {isUploading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />
        ) : (
          <Upload aria-hidden="true" size={13} />
        )}
        {report.videoFileName ? "Reemplazar vídeo" : "Subir vídeo"}
        <input
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(report, file);
            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WorkoutSetReport[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, ActualDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [exercise, setExercise] = useState("");
  const [setNumber, setSetNumber] = useState("1");
  const [targetRir, setTargetRir] = useState("2");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const [reportResponse, planResponse, athleteResponse] = await Promise.all([
        apiFetch<DataResponse<WorkoutSetReport[]>>("/workouts/reports", { signal }),
        apiFetch<DataResponse<WorkoutPlan[]>>("/workouts", { signal }),
        apiFetch<DataResponse<Athlete[]>>("/athletes?page=1&pageSize=100", { signal }),
      ]);
      setReports(reportResponse.data);
      setPlans(planResponse.data);
      setAthletes(athleteResponse.data);
      setSelectedPlanId((current) => current || planResponse.data[0]?.id || "");
      setDrafts(
        Object.fromEntries(
          reportResponse.data.map((report) => [
            report.id,
            {
              actualRir: report.actualRir === null ? "" : String(report.actualRir),
              actualKg: report.actualKg === null ? "" : String(report.actualKg),
            },
          ]),
        ),
      );
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
          : "No se pudieron cargar los datos del Hub de Reportes.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, reloadKey]);

  const filteredReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          selectedAthleteId === "all" ||
          report.workoutPlan.athleteId === selectedAthleteId,
      ),
    [reports, selectedAthleteId],
  );
  const completedReports = filteredReports.filter((report) => report.actualRir !== null);
  const averageDifference = calculateAverageRirDifference(filteredReports);

  async function createReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFeedback("");
    if (!selectedPlanId) {
      setFormError("Selecciona una rutina antes de registrar una serie.");
      return;
    }
    setIsCreating(true);
    try {
      await apiFetch<DataResponse<WorkoutSetReport>>("/workouts/reports/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutPlanId: selectedPlanId,
          exercise: exercise.trim(),
          setNumber: Number(setNumber),
          targetRir: Number(targetRir),
        }),
      });
      setExercise("");
      setSetNumber("1");
      setTargetRir("2");
      setFormOpen(false);
      setFeedback("Serie añadida al informe. Ya puedes completar la ejecución real y su vídeo.");
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFormError(
        requestError instanceof Error ? requestError.message : "No se pudo registrar la serie.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function saveActual(report: WorkoutSetReport) {
    const draft = drafts[report.id];
    if (!draft) return;
    setSavingId(report.id);
    setFeedback("");
    try {
      const response = await apiFetch<DataResponse<WorkoutSetReport>>(
        `/workouts/reports/sets/${encodeURIComponent(report.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualRir: draft.actualRir === "" ? null : Number(draft.actualRir),
            actualKg: draft.actualKg === "" ? null : Number(draft.actualKg),
          }),
        },
      );
      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, ...response.data } : item,
        ),
      );
      setFeedback(`Ejecución de ${report.exercise}, serie ${report.setNumber}, guardada.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFeedback(
        requestError instanceof Error ? requestError.message : "No se pudieron guardar los valores.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function uploadVideo(report: WorkoutSetReport, file: File) {
    if (file.size > 100 * 1024 * 1024) {
      setFeedback("El vídeo no puede superar 100 MB.");
      return;
    }
    setUploadingId(report.id);
    setFeedback("");
    try {
      const body = new FormData();
      body.append("video", file);
      await apiFetch<DataResponse<{ setId: string; videoUploaded: boolean }>>(
        `/workouts/reports/sets/${encodeURIComponent(report.id)}/video`,
        { method: "POST", body },
      );
      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, videoFileName: file.name } : item,
        ),
      );
      setFeedback(`Vídeo guardado junto a ${report.exercise}, serie ${report.setNumber}.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFeedback(
        requestError instanceof Error ? requestError.message : "No se pudo guardar el vídeo.",
      );
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Análisis de ejecución
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hub de Reportes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            RIR pautado frente a real, carga ejecutada y vídeo de cada serie en un único espacio privado.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-fire px-3.5 text-sm font-semibold text-background transition hover:brightness-110 sm:self-auto"
          onClick={() => {
            setFormOpen((open) => !open);
            setFormError("");
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          Registrar serie
        </button>
      </header>

      {formOpen && (
        <form
          className="mt-6 grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_8rem_8rem_auto]"
          onSubmit={(event) => void createReport(event)}
        >
          <label className="text-xs font-medium text-muted">
            Rutina
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
              onChange={(event) => setSelectedPlanId(event.target.value)}
              required
              value={selectedPlanId}
            >
              <option className="bg-card" value="">Selecciona una rutina</option>
              {plans.map((plan) => (
                <option className="bg-card" key={plan.id} value={plan.id}>
                  {athletes.find((athlete) => athlete.id === plan.athleteId)?.name ?? "Atleta"} · {plan.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Ejercicio
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
              maxLength={120}
              onChange={(event) => setExercise(event.target.value)}
              placeholder="Ej. Sentadilla"
              required
              value={exercise}
            />
          </label>
          <label className="text-xs font-medium text-muted">
            Serie
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
              max="50"
              min="1"
              onChange={(event) => setSetNumber(event.target.value)}
              required
              type="number"
              value={setNumber}
            />
          </label>
          <label className="text-xs font-medium text-muted">
            RIR pautado
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
              max="10"
              min="0"
              onChange={(event) => setTargetRir(event.target.value)}
              required
              step="0.5"
              type="number"
              value={targetRir}
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg border border-accent/30 px-3 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-50"
            disabled={isCreating || plans.length === 0}
            type="submit"
          >
            {isCreating ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Plus aria-hidden="true" size={15} />
            )}
            Añadir
          </button>
          {formError && (
            <p className="text-sm text-accent-hover sm:col-span-2 lg:col-span-5" role="alert">
              {formError}
            </p>
          )}
        </form>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="mt-4 rounded-lg border border-line bg-card px-4 py-3 text-sm text-muted"
          role="status"
        >
          {feedback}
        </p>
      )}

      {error ? (
        <div className="mt-8">
          <DashboardErrorState
            message={error}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        </div>
      ) : (
        <>
          <section aria-label="Resumen de ejecución" className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Series registradas",
                value: isLoading ? "—" : String(filteredReports.length),
                detail: "En las rutinas asignadas",
                icon: ClipboardList,
              },
              {
                label: "Ejecución completada",
                value: isLoading
                  ? "—"
                  : filteredReports.length
                    ? `${Math.round((completedReports.length / filteredReports.length) * 100)}%`
                    : "—",
                detail: `${completedReports.length} de ${filteredReports.length} con RIR real`,
                icon: Check,
              },
              {
                label: "Desviación media de RIR",
                value:
                  averageDifference === null
                    ? "—"
                    : `${averageDifference > 0 ? "+" : ""}${averageDifference.toLocaleString("es-ES", { maximumFractionDigits: 1 })}`,
                detail: "Real menos pautado",
                icon: Activity,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <article className="rounded-2xl border border-line bg-card p-4 sm:p-5" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted">{label}</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon aria-hidden="true" size={15} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
                <p className="mt-1 text-[11px] text-muted">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-line bg-card">
            <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Series efectivas</h2>
                <p className="mt-1 text-xs text-muted">Vídeos privados, asociados al ejercicio y serie.</p>
              </div>
              <label className="text-xs font-medium text-muted">
                Filtrar atleta
                <select
                  className="ml-2 h-9 min-w-40 rounded-lg border border-line bg-background px-2.5 text-xs text-foreground outline-none focus:border-accent"
                  onChange={(event) => setSelectedAthleteId(event.target.value)}
                  value={selectedAthleteId}
                >
                  <option className="bg-card" value="all">Todos los atletas</option>
                  {athletes.map((athlete) => (
                    <option className="bg-card" key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </label>
            </header>

            {isLoading ? (
              <div aria-label="Cargando reportes" className="space-y-4 p-5" role="status">
                {Array.from({ length: 3 }, (_, index) => (
                  <div className="flex gap-4" key={index}>
                    <DashboardSkeleton className="h-16 w-28 rounded-lg" />
                    <div className="flex-1 space-y-3">
                      <DashboardSkeleton className="h-3 w-1/3" />
                      <DashboardSkeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Video aria-hidden="true" size={21} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">Aún no hay series reportadas</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                  Registra el RIR pautado para cada serie; después añade el RIR real, la carga y el vídeo directamente en su fila.
                </p>
                {plans.length === 0 ? (
                  <Link
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover"
                    href="/dashboard/plans"
                  >
                    Crear una rutina
                    <Plus aria-hidden="true" size={15} />
                  </Link>
                ) : (
                  <button
                    className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-accent/30 px-3 text-sm font-semibold text-accent hover:bg-accent/10"
                    onClick={() => setFormOpen(true)}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={15} />
                    Registrar primera serie
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredReports.map((report) => {
                  const draft = drafts[report.id] ?? {
                    actualRir: report.actualRir === null ? "" : String(report.actualRir),
                    actualKg: report.actualKg === null ? "" : String(report.actualKg),
                  };
                  return (
                    <article
                      className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px]"
                      key={report.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                              {report.workoutPlan.athlete.name} · {formatDate(report.workoutPlan.scheduledAt)}
                            </p>
                            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
                              {report.exercise}
                              <span className="ml-2 text-xs font-medium text-muted">
                                Serie {String(report.setNumber).padStart(2, "0")}
                              </span>
                            </h3>
                            <p className="mt-1 text-xs text-muted">{report.workoutPlan.title}</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Desvío RIR
                            </span>
                            <RirComparison actual={report.actualRir} target={report.targetRir} />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-line bg-background/70 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              RIR pautado
                            </p>
                            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                              {report.targetRir}
                            </p>
                          </div>
                          <label className="rounded-lg border border-line bg-background/70 p-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              RIR real
                            </span>
                            <input
                              aria-label={`RIR real de ${report.exercise}, serie ${report.setNumber}`}
                              className="mt-1 h-7 w-full border-0 bg-transparent p-0 text-lg font-semibold tabular-nums text-foreground outline-none focus:text-accent"
                              max="10"
                              min="0"
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [report.id]: { ...draft, actualRir: event.target.value },
                                }))
                              }
                              placeholder="—"
                              step="0.5"
                              type="number"
                              value={draft.actualRir}
                            />
                          </label>
                          <label className="rounded-lg border border-line bg-background/70 p-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Kilos reales
                            </span>
                            <input
                              aria-label={`Kilos reales de ${report.exercise}, serie ${report.setNumber}`}
                              className="mt-1 h-7 w-full border-0 bg-transparent p-0 text-lg font-semibold tabular-nums text-foreground outline-none focus:text-accent"
                              max="1000"
                              min="0"
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [report.id]: { ...draft, actualKg: event.target.value },
                                }))
                              }
                              placeholder="— kg"
                              step="0.5"
                              type="number"
                              value={draft.actualKg}
                            />
                          </label>
                        </div>
                        <button
                          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-foreground disabled:opacity-50"
                          disabled={savingId === report.id}
                          onClick={() => void saveActual(report)}
                          type="button"
                        >
                          {savingId === report.id ? (
                            <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
                          ) : (
                            <Check aria-hidden="true" size={14} />
                          )}
                          Guardar ejecución
                        </button>
                      </div>
                      <SetVideo
                        isUploading={uploadingId === report.id}
                        onUpload={(selectedReport, file) => void uploadVideo(selectedReport, file)}
                        report={report}
                      />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
