"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Apple,
  CalendarDays,
  Download,
  Dumbbell,
  LoaderCircle,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { ApiError, apiDownload, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";
import {
  DashboardErrorState,
  DashboardSkeleton,
} from "@/components/dashboard-feedback";
import ModularBuilder, {
  createModularExercise,
  formatModularExercises,
  type ModularExercise,
} from "@/components/modular-builder";

type Athlete = {
  id: string;
  name: string;
  objective: string;
  currentWeight: number;
  isActive: boolean;
};

type WorkoutPlan = {
  id: string;
  title: string;
  description: string;
  athleteId: string;
  scheduledAt: string | null;
  createdAt: string;
};

type NutritionPlan = {
  id: string;
  details: string;
  calories: number;
  athleteId: string;
};

type DataResponse<T> = { data: T };
type PlanType = "workout" | "nutrition";
type GeneratedPlan =
  | { type: "workout"; title: string; description: string }
  | { type: "nutrition"; details: string; calories: number };

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

export default function PlansPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [planType, setPlanType] = useState<PlanType>("workout");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<ModularExercise[]>(() => [
    createModularExercise(),
  ]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [nutritionDetails, setNutritionDetails] = useState("");
  const [calories, setCalories] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const athleteQuery = new URLSearchParams({ page: "1", pageSize: "100" });
      const [athleteResponse, workoutResponse, nutritionResponse] = await Promise.all([
        apiFetch<DataResponse<Athlete[]> & { pagination?: unknown }>(
          `/athletes?${athleteQuery}`,
          { signal },
        ),
        apiFetch<DataResponse<WorkoutPlan[]>>("/workouts", { signal }),
        apiFetch<DataResponse<NutritionPlan[]>>("/nutrition", { signal }),
      ]);
      setAthletes(athleteResponse.data);
      setWorkouts(workoutResponse.data);
      setNutritionPlans(nutritionResponse.data);
      setSelectedAthleteId((current) => current || athleteResponse.data[0]?.id || "");
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
          : "No se pudieron cargar los planes.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (!selectedAthleteId) {
      setFormError("Selecciona un atleta antes de crear el plan.");
      return;
    }

    const modularDescription = formatModularExercises(exercises);
    if (planType === "workout" && !modularDescription) {
      setFormError("Añade al menos un ejercicio al constructor modular.");
      return;
    }

    setIsCreating(true);
    try {
      if (planType === "workout") {
        const response = await apiFetch<DataResponse<WorkoutPlan>>("/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: [modularDescription, description.trim()]
              .filter(Boolean)
              .join("\n\n"),
            athleteId: selectedAthleteId,
            ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
          }),
        });
        setWorkouts((current) => [response.data, ...current]);
        setTitle("");
        setDescription("");
        setExercises([createModularExercise()]);
        setScheduledAt("");
      } else {
        const response = await apiFetch<DataResponse<NutritionPlan>>("/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            details: nutritionDetails.trim(),
            calories: Number(calories),
            athleteId: selectedAthleteId,
          }),
        });
        setNutritionPlans((current) => [response.data, ...current]);
        setNutritionDetails("");
        setCalories("");
      }
      const athleteName =
        athletes.find((athlete) => athlete.id === selectedAthleteId)?.name ?? "el atleta";
      setSuccess(`Plan ${planType === "workout" ? "de entrenamiento" : "nutricional"} asignado a ${athleteName}.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el plan. Inténtalo de nuevo.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function generatePlanWithAi() {
    setFormError("");
    setSuccess("");
    if (!selectedAthleteId) {
      setFormError("Selecciona un atleta antes de generar un plan.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiFetch<DataResponse<GeneratedPlan>>("/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: selectedAthleteId, type: planType }),
      });

      if (response.data.type === "workout") {
        setTitle(response.data.title);
        setDescription(response.data.description);
      } else {
        setNutritionDetails(response.data.details);
        setCalories(String(response.data.calories));
      }

      setSuccess("Borrador generado. Revísalo y ajústalo antes de asignarlo.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo generar el borrador con IA.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadPdf(plan: WorkoutPlan) {
    setDownloadingId(plan.id);
    setError("");
    try {
      await apiDownload(
        `/workouts/${encodeURIComponent(plan.id)}/pdf`,
        `workout-plan-${plan.id}.pdf`,
      );
    } catch (downloadError) {
      if (downloadError instanceof ApiError && downloadError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        router.replace("/login");
        return;
      }
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo descargar el PDF.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  const filteredWorkouts = workouts.filter(
    (plan) => !selectedAthleteId || plan.athleteId === selectedAthleteId,
  );
  const filteredNutritionPlans = nutritionPlans.filter(
    (plan) => !selectedAthleteId || plan.athleteId === selectedAthleteId,
  );

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Entrenamiento y nutrición
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Planes</h1>
          <p className="mt-2 text-sm text-muted">
            Crea planes personalizados y asígnalos directamente a tus atletas.
          </p>
        </div>
      </header>

      {error && (
        <div className="mt-6">
          <DashboardErrorState
            message={error}
            onRetry={() => {
              const controller = new AbortController();
              void loadData(controller.signal);
            }}
          />
        </div>
      )}

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Nuevo plan
            </p>
            <h2 className="mt-2 text-lg font-semibold">Diseña un plan</h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Genera un borrador con el objetivo y peso actual del atleta seleccionado.
            </p>
            <button
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent transition hover:border-accent/60 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isGenerating || athletes.length === 0 || !selectedAthleteId}
              onClick={() => void generatePlanWithAi()}
              type="button"
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isGenerating ? "Generando borrador..." : "Generar con IA ⚡"}
            </button>
          </header>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-line bg-black/20 p-1">
            <button
              aria-pressed={planType === "workout"}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
                planType === "workout"
                  ? "bg-white/[0.08] text-white"
                  : "text-muted hover:text-white"
              }`}
              onClick={() => {
                setPlanType("workout");
                setFormError("");
                setSuccess("");
              }}
              type="button"
            >
              <Dumbbell size={16} className={planType === "workout" ? "text-accent" : ""} />
              Entrenamiento
            </button>
            <button
              aria-pressed={planType === "nutrition"}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
                planType === "nutrition"
                  ? "bg-white/[0.08] text-white"
                  : "text-muted hover:text-white"
              }`}
              onClick={() => {
                setPlanType("nutrition");
                setFormError("");
                setSuccess("");
              }}
              type="button"
            >
              <Apple size={16} className={planType === "nutrition" ? "text-accent" : ""} />
              Nutrición
            </button>
          </div>

          <form className="space-y-4" onSubmit={createPlan}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="plan-athlete">
                Asignar a atleta
              </label>
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-line bg-black/20 pl-10 pr-3 text-sm text-white outline-none focus:border-accent disabled:opacity-50"
                  disabled={isLoading || athletes.length === 0}
                  id="plan-athlete"
                  onChange={(event) => {
                    setSelectedAthleteId(event.target.value);
                    setSuccess("");
                  }}
                  required
                  value={selectedAthleteId}
                >
                  <option className="bg-card" value="">
                    {isLoading ? "Cargando atletas..." : "Selecciona un atleta"}
                  </option>
                  {athletes.map((athlete) => (
                    <option className="bg-card" key={athlete.id} value={athlete.id}>
                      {athlete.name}{athlete.isActive ? "" : " (inactivo)"}
                    </option>
                  ))}
                </select>
              </div>
              {!isLoading && athletes.length === 0 && !error && (
                <p className="mt-2 text-xs text-muted">
                  Añade primero un atleta para poder asignarle un plan.
                </p>
              )}
            </div>

            {planType === "workout" ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="workout-title">
                    Nombre de la rutina
                  </label>
                  <input
                    className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                    id="workout-title"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej. Fuerza - Semana 1"
                    required
                    value={title}
                  />
                </div>
                <ModularBuilder exercises={exercises} onChange={setExercises} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="workout-description">
                    Notas e indicaciones{" "}
                    <span className="font-normal text-muted">(opcional)</span>
                  </label>
                  <textarea
                    className="min-h-32 w-full resize-y rounded-lg border border-line bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-accent"
                    id="workout-description"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={"Descansos, tempo, calentamiento y otras indicaciones..."}
                    value={description}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="workout-date">
                    Fecha programada <span className="font-normal text-muted">(opcional)</span>
                  </label>
                  <input
                    className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm text-muted outline-none focus:border-accent"
                    id="workout-date"
                    onChange={(event) => setScheduledAt(event.target.value)}
                    type="datetime-local"
                    value={scheduledAt}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="nutrition-details">
                    Detalles del plan
                  </label>
                  <textarea
                    className="min-h-40 w-full resize-y rounded-lg border border-line bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-accent"
                    id="nutrition-details"
                    onChange={(event) => setNutritionDetails(event.target.value)}
                    placeholder={"Desayuno: ...\nComida: ...\nCena: ..."}
                    required
                    value={nutritionDetails}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="nutrition-calories">
                    Calorías diarias (kcal)
                  </label>
                  <input
                    className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                    id="nutrition-calories"
                    min="0"
                    onChange={(event) => setCalories(event.target.value)}
                    required
                    step="1"
                    type="number"
                    value={calories}
                  />
                </div>
              </>
            )}

            {formError && (
              <p
                aria-live="polite"
                className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2.5 text-sm text-accent-hover"
                role="alert"
              >
                {formError}
              </p>
            )}
            {success && (
              <p aria-live="polite" className="text-sm text-emerald-400" role="status">
                {success}
              </p>
            )}

            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] px-4 text-sm font-semibold text-[#030712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreating || isLoading || athletes.length === 0}
              type="submit"
            >
              {isCreating ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              {isCreating ? "Guardando plan..." : "Crear y asignar plan"}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Dumbbell className="text-accent" size={17} />
                <h2 className="text-sm font-semibold">Rutinas asignadas</h2>
              </div>
              <span className="text-xs text-muted">{filteredWorkouts.length}</span>
            </header>
            {isLoading ? (
              <div aria-label="Cargando rutinas" className="space-y-4 p-5" role="status">
                {Array.from({ length: 3 }, (_, index) => (
                  <div className="flex items-center justify-between gap-4" key={index}>
                    <div className="flex-1 space-y-2">
                      <DashboardSkeleton className="h-3 w-2/3" />
                      <DashboardSkeleton className="h-3 w-1/3" />
                    </div>
                    <DashboardSkeleton className="h-9 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No se pudieron cargar las rutinas. Reintenta la solicitud.
              </p>
            ) : filteredWorkouts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No hay rutinas para este atleta.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {filteredWorkouts.map((plan) => (
                  <li
                    className="flex items-center justify-between gap-3 px-5 py-4"
                    key={plan.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{plan.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <CalendarDays size={13} />
                        {formatDate(plan.scheduledAt ?? plan.createdAt)}
                      </p>
                    </div>
                    <button
                      aria-label={`Descargar PDF de ${plan.title}`}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={downloadingId === plan.id}
                      onClick={() => void downloadPdf(plan)}
                      type="button"
                    >
                      {downloadingId === plan.id ? (
                        <LoaderCircle className="animate-spin" size={14} />
                      ) : (
                        <Download size={14} />
                      )}
                      PDF
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Apple className="text-accent" size={17} />
                <h2 className="text-sm font-semibold">Planes nutricionales</h2>
              </div>
              <span className="text-xs text-muted">{filteredNutritionPlans.length}</span>
            </header>
            {isLoading ? (
              <div aria-label="Cargando planes nutricionales" className="space-y-4 p-5" role="status">
                {Array.from({ length: 3 }, (_, index) => (
                  <div className="space-y-2" key={index}>
                    <DashboardSkeleton className="h-3 w-full" />
                    <DashboardSkeleton className="h-3 w-4/5" />
                    <DashboardSkeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No se pudieron cargar los planes nutricionales. Reintenta la solicitud.
              </p>
            ) : filteredNutritionPlans.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No hay planes nutricionales para este atleta.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {filteredNutritionPlans.map((plan) => (
                  <li className="px-5 py-4" key={plan.id}>
                    <p className="line-clamp-3 whitespace-pre-line text-sm leading-6 text-white">
                      {plan.details}
                    </p>
                    <p className="mt-2 text-xs text-muted">{plan.calories} kcal / día</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
