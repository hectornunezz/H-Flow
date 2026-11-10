"use client";

import { useRef, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

export type IntensityTechnique = "rest-pause" | "drop-set" | "myo-reps" | "back-off" | "";

export type ModularSet = {
  id: string;
  kilos: string;
  reps: string;
  rir: string;
  technique: IntensityTechnique;
};

export type ModularExercise = {
  id: string;
  name: string;
  sets: ModularSet[];
};

const techniques: { value: IntensityTechnique; label: string }[] = [
  { value: "", label: "Normal" },
  { value: "rest-pause", label: "Rest-Pause" },
  { value: "drop-set", label: "Drop Set" },
  { value: "myo-reps", label: "Myo-Reps" },
  { value: "back-off", label: "Back-Off" },
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createModularExercise(): ModularExercise {
  return {
    id: createId("exercise"),
    name: "",
    sets: [createModularSet()],
  };
}

function createModularSet(): ModularSet {
  return {
    id: createId("set"),
    kilos: "",
    reps: "8",
    rir: "2",
    technique: "",
  };
}

export function formatModularExercises(exercises: ModularExercise[]): string {
  return exercises
    .filter((exercise) => exercise.name.trim())
    .map((exercise) => {
      const sets = exercise.sets
        .map((set, index) => {
          const kilos = set.kilos ? `${set.kilos} kg` : "peso libre";
          const rir = set.rir ? ` · RIR ${set.rir}` : "";
          const technique = techniques.find((item) => item.value === set.technique)?.label;
          return `  ${index + 1}. ${kilos} × ${set.reps || "—"} reps${rir}${
            technique ? ` · ${technique}` : ""
          }`;
        })
        .join("\n");
      return `${exercise.name.trim()}\n${sets}`;
    })
    .join("\n\n");
}

type ModularBuilderProps = {
  exercises: ModularExercise[];
  onChange: (exercises: ModularExercise[]) => void;
};

export default function ModularBuilder({ exercises, onChange }: ModularBuilderProps) {
  const gridRefs = useRef(new Map<string, HTMLDivElement>());

  function updateExercise(exerciseId: string, update: (exercise: ModularExercise) => ModularExercise) {
    onChange(
      exercises.map((exercise) =>
        exercise.id === exerciseId ? update(exercise) : exercise,
      ),
    );
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    field: "kilos" | "reps" | "rir" | "technique",
    value: string,
  ) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === setId ? { ...set, [field]: value } : set,
      ),
    }));
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLInputElement>, exerciseId: string) {
    if (event.key !== "Enter" && event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const grid = gridRefs.current.get(exerciseId);
    if (!grid) return;

    const cells = Array.from(
      grid.querySelectorAll<HTMLInputElement>("[data-grid-cell='true']"),
    );
    const currentIndex = cells.indexOf(event.currentTarget);
    const nextIndex =
      event.key === "ArrowDown"
        ? currentIndex + 3
        : event.key === "ArrowUp"
          ? currentIndex - 3
          : currentIndex + 1;
    if (currentIndex < 0 || !cells[nextIndex]) return;

    cells[nextIndex].focus();
    cells[nextIndex].select();
  }

  return (
    <section aria-label="Constructor modular de entrenamiento" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <label className="block text-sm font-medium">Constructor modular</label>
          <p className="mt-1 text-xs text-muted">
            Edita como una hoja de cálculo: Enter avanza y ↑↓ cambia de serie.
          </p>
        </div>
        <button
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
          onClick={() => onChange([...exercises, createModularExercise()])}
          type="button"
        >
          <Plus aria-hidden="true" size={14} />
          Ejercicio
        </button>
      </div>

      {exercises.map((exercise, exerciseIndex) => (
        <article
          className="rounded-xl border border-line bg-background/60 p-3 sm:p-4"
          key={exercise.id}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/10 text-[11px] font-bold text-accent">
              {String(exerciseIndex + 1).padStart(2, "0")}
            </span>
            <input
              aria-label={`Nombre del ejercicio ${exerciseIndex + 1}`}
              className="h-9 min-w-0 flex-1 border-0 border-b border-line bg-transparent px-1 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted/70 focus:border-accent"
              onChange={(event) =>
                updateExercise(exercise.id, (current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Nombre del ejercicio"
              value={exercise.name}
            />
            <button
              aria-label={`Eliminar ejercicio ${exercise.name || exerciseIndex + 1}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-accent/10 hover:text-accent"
              disabled={exercises.length <= 1}
              onClick={() =>
                onChange(exercises.filter((current) => current.id !== exercise.id))
              }
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[2.4rem_1fr_1fr_1fr_1.2fr_2rem] items-center gap-2 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                <span>Serie</span>
                <span>Kilos</span>
                <span>Reps</span>
                <span>RIR</span>
                <span>Técnica</span>
                <span className="sr-only">Acciones</span>
              </div>
              <div
                ref={(element) => {
                  if (element) gridRefs.current.set(exercise.id, element);
                  else gridRefs.current.delete(exercise.id);
                }}
              >
                {exercise.sets.map((set, setIndex) => (
                  <div
                    className="grid grid-cols-[2.4rem_1fr_1fr_1fr_1.2fr_2rem] items-center gap-2 border-t border-line/70 py-1.5"
                    key={set.id}
                  >
                    <span className="px-1 text-xs font-medium tabular-nums text-muted">
                      {String(setIndex + 1).padStart(2, "0")}
                    </span>
                    {(["kilos", "reps", "rir"] as const).map((field) => (
                      <input
                        aria-label={`${field === "kilos" ? "Kilos" : field === "reps" ? "Repeticiones" : "RIR"}, serie ${setIndex + 1}, ${exercise.name || "ejercicio"}`}
                        className="h-9 w-full rounded-md border border-line bg-card px-2 text-sm tabular-nums text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/20"
                        data-grid-cell="true"
                        key={field}
                        max={field === "rir" ? 10 : undefined}
                        min="0"
                        onChange={(event) =>
                          updateSet(exercise.id, set.id, field, event.target.value)
                        }
                        onKeyDown={(event) => handleGridKeyDown(event, exercise.id)}
                        step={field === "kilos" ? "0.5" : "1"}
                        type="number"
                        value={set[field]}
                      />
                    ))}
                    <select
                      aria-label={`Técnica de intensidad, serie ${setIndex + 1}`}
                      className="h-9 min-w-0 rounded-md border border-line bg-card px-1.5 text-xs text-foreground outline-none focus:border-accent"
                      onChange={(event) =>
                        updateSet(exercise.id, set.id, "technique", event.target.value)
                      }
                      value={set.technique}
                    >
                      {techniques.map((technique) => (
                        <option
                          className="bg-card"
                          key={technique.value || "normal"}
                          value={technique.value}
                        >
                          {technique.label}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label={`Eliminar serie ${setIndex + 1}`}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={exercise.sets.length <= 1}
                      onClick={() =>
                        updateExercise(exercise.id, (current) => ({
                          ...current,
                          sets: current.sets.filter((currentSet) => currentSet.id !== set.id),
                        }))
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-accent transition hover:bg-accent/10"
                onClick={() =>
                  updateExercise(exercise.id, (current) => ({
                    ...current,
                    sets: [...current.sets, createModularSet()],
                  }))
                }
                type="button"
              >
                <Plus aria-hidden="true" size={14} />
                Añadir serie
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
