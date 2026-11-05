"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarClock,
  Download,
  Film,
  LoaderCircle,
  Mic2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  ApiError,
  apiDownload,
  apiFetch,
  apiFetchBlob,
  TOKEN_STORAGE_KEY,
} from "@/lib/api";

type MarketingEpisode = {
  id: string;
  topic: string;
  audience: string;
  tone: string;
  scheduledAt: string;
  status: "scheduled" | "generating" | "completed" | "failed" | string;
  script: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type EpisodeResponse = { data: MarketingEpisode[] };
type ScheduleResponse = { data: MarketingEpisode };

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  generating: "Generando",
  completed: "Completado",
  failed: "Fallido",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string): string {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400";
  if (status === "failed") return "bg-red-500/10 text-red-300";
  if (status === "generating") return "bg-orange-500/10 text-orange-300";
  return "bg-white/[0.06] text-muted";
}

export default function MarketingPage() {
  const [episodes, setEpisodes] = useState<MarketingEpisode[]>([]);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [audioSources, setAudioSources] = useState<Record<string, string>>({});
  const audioSourcesRef = useRef(new Map<string, string>());
  const [videoSources, setVideoSources] = useState<Record<string, string>>({});
  const videoSourcesRef = useRef(new Map<string, string>());

  const loadEpisodes = useCallback(async () => {
    setError("");
    try {
      const response = await apiFetch<EpisodeResponse>("/marketing/episodes");
      setEpisodes(response.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los episodios.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEpisodes();
  }, [loadEpisodes]);

  const hasPendingEpisodes = episodes.some(
    (episode) => episode.status === "scheduled" || episode.status === "generating",
  );

  useEffect(() => {
    if (!hasPendingEpisodes) return;
    const timer = window.setInterval(() => {
      void loadEpisodes();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [hasPendingEpisodes, loadEpisodes]);

  useEffect(
    () => () => {
      for (const source of Array.from(audioSourcesRef.current.values())) {
        URL.revokeObjectURL(source);
      }
      audioSourcesRef.current.clear();
      for (const source of Array.from(videoSourcesRef.current.values())) {
        URL.revokeObjectURL(source);
      }
      videoSourcesRef.current.clear();
    },
    [],
  );

  async function scheduleEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    setIsScheduling(true);

    try {
      const response = await apiFetch<ScheduleResponse>("/marketing/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim(),
          tone: tone.trim(),
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        }),
      });

      setEpisodes((current) => [
        response.data,
        ...current.filter((episode) => episode.id !== response.data.id),
      ]);
      setTopic("");
      setAudience("");
      setTone("");
      setScheduledAt("");
      setSuccess("El Reel quedó programado correctamente.");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo programar el Reel.",
      );
    } finally {
      setIsScheduling(false);
    }
  }

  async function toggleAudio(episode: MarketingEpisode) {
    if (playingAudioId === episode.id) {
      setPlayingAudioId(null);
      return;
    }
    if (audioSourcesRef.current.has(episode.id)) {
      setPlayingAudioId(episode.id);
      return;
    }
    if (!episode.audioUrl) return;

    setLoadingAudioId(episode.id);
    setError("");
    try {
      const audioBlob = await apiFetchBlob(episode.audioUrl);
      const source = URL.createObjectURL(audioBlob);
      audioSourcesRef.current.set(episode.id, source);
      setAudioSources((current) => ({ ...current, [episode.id]: source }));
      setPlayingAudioId(episode.id);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el audio.",
      );
    } finally {
      setLoadingAudioId(null);
    }
  }

  async function loadVideo(episode: MarketingEpisode) {
    if (!episode.videoUrl || videoSourcesRef.current.has(episode.id)) return;
    setLoadingVideoId(episode.id);
    setError("");
    try {
      const videoBlob = await apiFetchBlob(episode.videoUrl);
      const source = URL.createObjectURL(videoBlob);
      videoSourcesRef.current.set(episode.id, source);
      setVideoSources((current) => ({ ...current, [episode.id]: source }));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el vídeo.",
      );
    } finally {
      setLoadingVideoId(null);
    }
  }

  async function downloadVideo(episode: MarketingEpisode) {
    if (!episode.videoUrl) return;
    setDownloadingVideoId(episode.id);
    setError("");
    try {
      await apiDownload(
        `${episode.videoUrl}?download=true`,
        `hflow-reel-${episode.id}.mp4`,
        undefined,
        "video/mp4",
      );
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo descargar el vídeo.",
      );
    } finally {
      setDownloadingVideoId(null);
    }
  }

  async function refreshEpisodes() {
    setIsRefreshing(true);
    await loadEpisodes();
  }

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Contenido para redes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Marketing Studio
          </h1>
          <p className="mt-2 text-sm text-muted">
            Programa Reels y sigue su generación desde un solo lugar.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-line px-3 text-sm text-muted transition hover:border-white/20 hover:text-white disabled:opacity-50 sm:self-auto"
          disabled={isRefreshing || isLoading}
          onClick={() => void refreshEpisodes()}
          type="button"
        >
          {isRefreshing ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={15} />
          )}
          Actualizar
        </button>
      </header>

      {error && (
        <p
          aria-live="polite"
          className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-line bg-card p-5 sm:p-6">
        <header className="mb-6 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Sparkles size={19} />
          </span>
          <div>
            <h2 className="font-semibold">Programar un Reel</h2>
            <p className="mt-1 text-sm text-muted">
              Describe el contenido y se generará automáticamente.
            </p>
          </div>
        </header>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={scheduleEpisode}>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="reel-topic">
              Tema
            </label>
            <input
              className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-accent"
              id="reel-topic"
              maxLength={300}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ej. Cómo mejorar la técnica de sentadilla"
              required
              value={topic}
            />
            <p className="mt-1 text-right text-xs text-muted">{topic.length}/300</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="reel-audience">
              Audiencia
            </label>
            <input
              className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-accent"
              id="reel-audience"
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Ej. Personas principiantes"
              required
              value={audience}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="reel-tone">
              Tono
            </label>
            <input
              className="h-11 w-full rounded-lg border border-line bg-black/20 px-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-accent"
              id="reel-tone"
              onChange={(event) => setTone(event.target.value)}
              placeholder="Ej. Enérgico y cercano"
              required
              value={tone}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="reel-schedule">
              Fecha de publicación{" "}
              <span className="font-normal text-muted">(opcional)</span>
            </label>
            <div className="relative">
              <CalendarClock
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={16}
              />
              <input
                className="h-11 w-full rounded-lg border border-line bg-black/20 pl-10 pr-3 text-sm text-muted outline-none transition focus:border-accent"
                id="reel-schedule"
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                onChange={(event) => setScheduledAt(event.target.value)}
                type="datetime-local"
                value={scheduledAt}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              Si no eliges fecha, el proceso comienza de inmediato.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3">
            {formError && (
              <p
                aria-live="polite"
                className="text-sm text-red-300"
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
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isScheduling}
              type="submit"
            >
              {isScheduling ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              {isScheduling ? "Programando..." : "Programar Reel"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tus Reels</h2>
            <p className="mt-1 text-sm text-muted">
              {hasPendingEpisodes
                ? "El estado se actualiza automáticamente cada 15 segundos."
                : "Estado y contenido generado."}
            </p>
          </div>
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            {episodes.length} / 100
          </span>
        </header>

        {isLoading ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="animate-spin text-accent" size={17} />
              Cargando episodios...
            </div>
          </div>
        ) : episodes.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-5 py-14 text-center">
            <Film className="mx-auto text-muted" size={27} />
            <p className="mt-3 text-sm font-medium">Todavía no hay Reels</p>
            <p className="mt-1 text-xs text-muted">
              Programa tu primer vídeo para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode) => {
              const label = statusLabels[episode.status] ?? episode.status;
              const isPending =
                episode.status === "scheduled" || episode.status === "generating";
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-line bg-card"
                  key={episode.id}
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-accent">
                        <Film size={20} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6">{episode.topic}</h3>
                        <p className="mt-1 text-sm text-muted">
                          Audiencia: {episode.audience}
                        </p>
                        <p className="mt-1 text-xs text-muted">Tono: {episode.tone}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                          <CalendarClock size={13} />
                          {episode.status === "completed" && episode.completedAt
                            ? `Completado ${formatDate(episode.completedAt)}`
                            : episode.status === "scheduled"
                              ? `Programado ${formatDate(episode.scheduledAt)}`
                              : `Creado ${formatDate(episode.createdAt)}`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(episode.status)}`}
                    >
                      {isPending ? (
                        <LoaderCircle className="animate-spin" size={13} />
                      ) : episode.status === "failed" ? (
                        <AlertCircle size={13} />
                      ) : episode.status === "completed" ? (
                        <Sparkles size={13} />
                      ) : (
                        <CalendarClock size={13} />
                      )}
                      {label}
                    </span>
                  </div>

                  {episode.status === "failed" && episode.errorMessage && (
                    <div className="border-t border-red-500/10 bg-red-500/[0.04] px-5 py-3 text-sm text-red-300 sm:px-6">
                      {episode.errorMessage}
                    </div>
                  )}

                  {episode.status === "completed" && episode.script && (
                    <details className="border-t border-line">
                      <summary className="cursor-pointer px-5 py-3 text-xs font-medium text-muted transition hover:text-white sm:px-6">
                        Ver guion generado
                      </summary>
                      <p className="whitespace-pre-line px-5 pb-4 text-sm leading-6 text-gray-300 sm:px-6">
                        {episode.script}
                      </p>
                    </details>
                  )}

                  {episode.status === "completed" && (
                    <div className="space-y-3 border-t border-line p-4 sm:p-5">
                      {episode.videoUrl && videoSources[episode.id] && (
                        <video
                          className="max-h-[560px] w-full rounded-xl bg-black object-contain"
                          controls
                          preload="metadata"
                          src={videoSources[episode.id]}
                        >
                          Tu navegador no admite la reproducción de vídeo.
                        </video>
                      )}

                      {episode.videoUrl && (
                        <div className="flex flex-wrap items-center gap-3">
                          {!videoSources[episode.id] && (
                            <button
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-white disabled:opacity-50"
                              disabled={loadingVideoId === episode.id}
                              onClick={() => void loadVideo(episode)}
                              type="button"
                            >
                              {loadingVideoId === episode.id ? (
                                <LoaderCircle className="animate-spin" size={14} />
                              ) : (
                                <Play size={14} />
                              )}
                              {loadingVideoId === episode.id ? "Cargando vídeo..." : "Reproducir vídeo"}
                            </button>
                          )}
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-white disabled:opacity-50"
                            disabled={downloadingVideoId === episode.id}
                            onClick={() => void downloadVideo(episode)}
                            type="button"
                          >
                            {downloadingVideoId === episode.id ? (
                              <LoaderCircle className="animate-spin" size={14} />
                            ) : (
                              <Download size={14} />
                            )}
                            {downloadingVideoId === episode.id ? "Descargando..." : "Descargar MP4"}
                          </button>
                        </div>
                      )}

                      {episode.audioUrl && (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-white disabled:opacity-50"
                            disabled={loadingAudioId === episode.id}
                            onClick={() => void toggleAudio(episode)}
                            type="button"
                          >
                            {loadingAudioId === episode.id ? (
                              <LoaderCircle className="animate-spin" size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                            {playingAudioId === episode.id ? "Ocultar audio" : "Reproducir audio"}
                          </button>
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                            <Mic2 size={13} />
                            Narración
                          </span>
                        </div>
                      )}
                      {playingAudioId === episode.id && audioSources[episode.id] && (
                        <audio
                          className="h-10 w-full"
                          controls
                          preload="metadata"
                          src={audioSources[episode.id]}
                        >
                          Tu navegador no admite la reproducción de audio.
                        </audio>
                      )}
                      {!episode.videoUrl && !episode.audioUrl && (
                        <p className="text-sm text-muted">
                          El episodio se completó, pero no hay medios disponibles.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
