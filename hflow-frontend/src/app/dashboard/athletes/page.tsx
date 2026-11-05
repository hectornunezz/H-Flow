"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ApiError, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type Athlete = {
  id: string;
  name: string;
  email: string | null;
  objective: string;
  currentWeight: number;
  isActive: boolean;
  createdAt: string;
};

type AthleteListResponse = {
  data: Athlete[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type CreateAthleteResponse = { data: Athlete };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [pagination, setPagination] = useState<AthleteListResponse["pagination"]>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [objective, setObjective] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const importFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAthletes = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pagination.pageSize),
    });
    if (debouncedSearch) query.set("search", debouncedSearch);

    try {
      const response = await apiFetch<AthleteListResponse>(`/athletes?${query}`, { signal });
      setAthletes(response.data);
      setPagination(response.pagination);
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
          : "No se pudo cargar la lista de atletas.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [debouncedSearch, page, pagination.pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAthletes(controller.signal);
    return () => controller.abort();
  }, [loadAthletes, refreshKey]);

  const closeCreateModal = useCallback(() => {
    setIsCreateOpen(false);
    setCreateError("");
    setName("");
    setEmail("");
    setObjective("");
    setCurrentWeight("");
  }, []);

  async function createAthlete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      await apiFetch<CreateAthleteResponse>("/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          objective: objective.trim(),
          currentWeight: Number(currentWeight),
        }),
      });
      closeCreateModal();
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el atleta. Inténtalo de nuevo.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportMessage("");
    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      setImportError("Selecciona un archivo CSV exportado desde Excel.");
      event.target.value = "";
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await apiFetch<{ data: { imported: number } }>("/athletes/import-csv", {
        method: "POST",
        body: formData,
      });
      setImportMessage(
        `Se importaron ${response.data.imported} ${
          response.data.imported === 1 ? "atleta" : "atletas"
        }.`,
      );
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setImportError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo importar el archivo CSV.",
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  function changePage(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, pagination.totalPages)));
  }

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Tu equipo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Atletas</h1>
          <p className="mt-2 text-sm text-muted">
            Busca, organiza y acompaña el progreso de tus atletas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <input
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void importCsv(event)}
            ref={importFileInput}
            type="file"
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-white transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isImporting}
            onClick={() => importFileInput.current?.click()}
            type="button"
          >
            <FileUp size={17} />
            {isImporting ? "Importando..." : "Importar desde Excel/CSV"}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-black transition hover:bg-orange-400"
            onClick={() => setIsCreateOpen(true)}
            type="button"
          >
            <Plus size={17} strokeWidth={2.5} />
            Añadir atleta
          </button>
        </div>
      </header>

      {importError && (
        <p
          aria-live="polite"
          className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {importError}
        </p>
      )}
      {importMessage && (
        <p
          aria-live="polite"
          className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          role="status"
        >
          {importMessage}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        CSV con encabezados nombre/name, objetivo/objective y peso/weight. Hasta 1000 atletas y 5 MB.
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={17}
            />
            <input
              aria-label="Buscar atletas"
              className="h-10 w-full rounded-lg border border-line bg-black/20 pl-10 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, email u objetivo"
              value={search}
            />
          </div>
          <p className="text-xs text-muted">
            {isLoading ? "Cargando..." : `${pagination.total} ${pagination.total === 1 ? "atleta" : "atletas"}`}
          </p>
        </div>

        {error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button
              className="mt-3 text-sm font-medium text-white hover:text-accent"
              onClick={() => setRefreshKey((value) => value + 1)}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-muted">Cargando atletas...</div>
        ) : athletes.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users className="mx-auto text-muted" size={26} />
            <p className="mt-3 text-sm font-medium">
              {debouncedSearch ? "No encontramos atletas" : "Aún no tienes atletas"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {debouncedSearch
                ? "Prueba con otro nombre, correo u objetivo."
                : "Añade tu primer atleta para empezar a hacer seguimiento."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Atleta</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Objetivo</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Peso</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Estado</th>
                    <th className="px-5 py-3.5 font-medium sm:px-6">Fecha de alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {athletes.map((athlete) => (
                    <tr
                      className="cursor-pointer transition hover:bg-white/[0.025]"
                      key={athlete.id}
                      onClick={() => router.push(`/dashboard/athletes/${encodeURIComponent(athlete.id)}`)}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <Link
                          className="flex min-w-0 items-center gap-3"
                          href={`/dashboard/athletes/${encodeURIComponent(athlete.id)}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted">
                            <UserRound size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-white">{athlete.name}</span>
                            <span className="block truncate text-xs text-muted">
                              {athlete.email || "Sin correo"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[210px] truncate px-5 py-4 text-muted sm:px-6">
                        {athlete.objective}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted sm:px-6">
                        {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
                          athlete.currentWeight,
                        )}{" "}
                        kg
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
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
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted sm:px-6">
                        {formatDate(athlete.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-line px-4 py-4 sm:px-6">
              <span className="text-xs text-muted">
                Página {pagination.page} de {Math.max(pagination.totalPages, 1)}
              </span>
              <div className="flex gap-2">
                <button
                  aria-label="Página anterior"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page <= 1 || isLoading}
                  onClick={() => changePage(page - 1)}
                  type="button"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  aria-label="Página siguiente"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page >= pagination.totalPages || isLoading}
                  onClick={() => changePage(page + 1)}
                  type="button"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <section
            aria-labelledby="create-athlete-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl border border-line bg-card p-5 shadow-2xl shadow-black/50 sm:p-7"
            role="dialog"
          >
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Nuevo perfil
                </p>
                <h2 className="mt-2 text-xl font-semibold" id="create-athlete-title">
                  Añadir atleta
                </h2>
                <p className="mt-1 text-sm text-muted">Completa los datos iniciales del atleta.</p>
              </div>
              <button
                aria-label="Cerrar modal"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-white"
                onClick={closeCreateModal}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <form className="space-y-4" onSubmit={createAthlete}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="athlete-name">
                  Nombre
                </label>
                <input
                  autoFocus
                  className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                  id="athlete-name"
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="athlete-email">
                  Correo electrónico <span className="font-normal text-muted">(opcional)</span>
                </label>
                <input
                  className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                  id="athlete-email"
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>
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
                <label className="mb-1.5 block text-sm font-medium" htmlFor="athlete-weight">
                  Peso actual (kg)
                </label>
                <input
                  className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none focus:border-accent"
                  id="athlete-weight"
                  min="0.1"
                  onChange={(event) => setCurrentWeight(event.target.value)}
                  required
                  step="0.1"
                  type="number"
                  value={currentWeight}
                />
              </div>

              {createError && (
                <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                  {createError}
                </p>
              )}

              <footer className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  className="h-10 rounded-lg border border-line px-4 text-sm text-muted transition hover:text-white disabled:opacity-50"
                  disabled={isCreating}
                  onClick={closeCreateModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? "Guardando..." : "Crear atleta"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
