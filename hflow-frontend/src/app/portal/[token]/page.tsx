"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Download,
  Dumbbell,
  LoaderCircle,
  Salad,
  Scale,
  Sparkles,
} from "lucide-react";
import { apiDownload, apiFetch, ApiError } from "@/lib/api";
import { WeightProgressChart } from "@/components/weight-progress-chart";

type WorkoutPlan = {
  id: string;
  title: string;
  description: string;
  scheduledAt: string | null;
  createdAt: string;
};

type NutritionPlan = {
  id: string;
  details: string;
  calories: number;
};

type CheckIn = {
  id: string;
  weight: number;
  bodyFat: number | null;
  createdAt: string;
};

type PortalData = {
  data: {
    id: string;
    name: string;
    objective: string;
    currentWeight: number;
    workoutPlan: WorkoutPlan | null;
    nutritionPlan: NutritionPlan | null;
    checkIns: CheckIn[];
  };
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha programada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha programada";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Este enlace no es válido o ha caducado. Pide a tu entrenador que te envíe uno nuevo.";
  }
  return error instanceof Error ? error.message : fallback;
}

export default function AthletePortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [portal, setPortal] = useState<PortalData["data"] | null>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPortal = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch<PortalData>("/athlete-portal/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      setPortal(response.data);
      setWeight(String(response.data.currentWeight));
    } catch (requestError) {
      if (signal?.aborted) return;
      setError(getErrorMessage(requestError, "No se pudo cargar el portal."));
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPortal(controller.signal);
    return () => controller.abort();
  }, [loadPortal]);

  async function submitCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const response = await apiFetch<{ data: CheckIn }>("/athlete-portal/checkins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weight: Number(weight), notes: notes.trim() }),
      });
      setPortal((current) =>
        current
          ? {
              ...current,
              currentWeight: response.data.weight,
              checkIns: [...current.checkIns, response.data],
            }
          : current,
      );
      setNotes("");
      setSuccess("Tu check-in se ha guardado correctamente.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo guardar el check-in."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function downloadPlan(type: "workouts" | "nutrition", planId: string) {
    setDownloading(planId);
    setError("");
    try {
      await apiDownload(
        `/athlete-portal/${type}/${encodeURIComponent(planId)}/pdf`,
        `${type === "workouts" ? "rutina" : "nutricion"}-${planId}.pdf`,
        token,
      );
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, "No se pudo descargar el PDF."));
    } finally {
      setDownloading("");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-7 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-black">
            <Sparkles size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-black tracking-[0.18em]">H-FLOW</span>
          <span className="ml-auto rounded-full border border-line px-3 py-1 text-xs text-muted">
            Portal del atleta
          </span>
        </header>

        {error && (
          <div
            aria-live="polite"
            className="mt-7 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid min-h-[50vh] place-items-center">
            <LoaderCircle aria-label="Cargando portal" className="animate-spin text-accent" size={28} />
          </div>
        ) : portal ? (
          <>
            <section className="mt-10 rounded-2xl border border-line bg-card p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Tu progreso, a tu ritmo
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Hola, {portal.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{portal.objective}</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line bg-black/20 px-4 py-3 text-sm">
                <Scale className="text-accent" size={17} />
                Peso actual
                <strong className="ml-2 text-white">
                  {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
                    portal.currentWeight,
                  )}{" "}
                  kg
                </strong>
              </div>
            </section>

            <section aria-label="Tus planes" className="mt-6 grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Dumbbell size={19} />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold">Rutina activa</h2>
                  </div>
                </div>
                {portal.workoutPlan ? (
                  <>
                    <h3 className="mt-4 font-medium">{portal.workoutPlan.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {portal.workoutPlan.description}
                    </p>
                    <p className="mt-4 text-xs text-muted">
                      Programada: {formatDate(portal.workoutPlan.scheduledAt)}
                    </p>
                    <button
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium transition hover:border-accent/50 hover:text-accent disabled:opacity-60"
                      disabled={downloading === portal.workoutPlan.id}
                      onClick={() => void downloadPlan("workouts", portal.workoutPlan!.id)}
                      type="button"
                    >
                      {downloading === portal.workoutPlan.id ? (
                        <LoaderCircle className="animate-spin" size={15} />
                      ) : (
                        <Download size={15} />
                      )}
                      Descargar rutina PDF
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted">Tu entrenador todavía no ha asignado una rutina.</p>
                )}
              </article>

              <article className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <Salad size={19} />
                </span>
                <h2 className="mt-4 text-lg font-semibold">Plan nutricional</h2>
                {portal.nutritionPlan ? (
                  <>
                    <p className="mt-4 text-sm leading-6 text-muted">{portal.nutritionPlan.details}</p>
                    <p className="mt-4 rounded-lg border border-line bg-black/20 px-3 py-2 text-sm">
                      Objetivo diario:{" "}
                      <strong>{portal.nutritionPlan.calories.toLocaleString("es-ES")} kcal</strong>
                    </p>
                    <button
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium transition hover:border-accent/50 hover:text-accent disabled:opacity-60"
                      disabled={downloading === portal.nutritionPlan.id}
                      onClick={() => void downloadPlan("nutrition", portal.nutritionPlan!.id)}
                      type="button"
                    >
                      {downloading === portal.nutritionPlan.id ? (
                        <LoaderCircle className="animate-spin" size={15} />
                      ) : (
                        <Download size={15} />
                      )}
                      Descargar plan PDF
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted">Tu entrenador todavía no ha asignado un plan.</p>
                )}
              </article>
            </section>

            <section aria-labelledby="progress-chart-heading" className="mt-6 rounded-2xl border border-line bg-card p-5 sm:p-6">
              <header className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Seguimiento
                </p>
                <h2 className="mt-1 text-lg font-semibold" id="progress-chart-heading">
                  Tu evolución corporal
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Evolución del peso y porcentaje graso según tus check-ins.
                </p>
              </header>
              <WeightProgressChart checkIns={portal.checkIns} />
            </section>

            <section aria-labelledby="checkin-heading" className="mt-6 rounded-2xl border border-line bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Scale size={19} />
                </span>
                <div>
                  <h2 className="font-semibold" id="checkin-heading">Registrar check-in</h2>
                  <p className="mt-1 text-xs text-muted">Actualiza tu peso y comparte una nota con tu entrenador.</p>
                </div>
              </div>

              {success && (
                <p aria-live="polite" className="mt-5 flex items-center gap-2 text-sm text-emerald-300" role="status">
                  <Check size={16} />
                  {success}
                </p>
              )}

              <form className="mt-6 grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end" onSubmit={(event) => void submitCheckIn(event)}>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Peso (kg)</span>
                  <input
                    className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition focus:border-accent/70"
                    max={1000}
                    min={1}
                    onChange={(event) => setWeight(event.target.value)}
                    required
                    step="0.1"
                    type="number"
                    value={weight}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Notas (opcional)</span>
                  <input
                    className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent/70"
                    maxLength={5000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="¿Cómo te has sentido esta semana?"
                    value={notes}
                  />
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                  Guardar
                </button>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
