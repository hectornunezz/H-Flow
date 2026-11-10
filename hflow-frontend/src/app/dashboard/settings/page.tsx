"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import {
  Check,
  LoaderCircle,
  Save,
  Upload,
  UserRound,
} from "lucide-react";
import { ApiError, apiFetch, apiMediaUrl, TOKEN_STORAGE_KEY } from "@/lib/api";

type TrainerProfile = {
  name: string;
  email: string;
  avatarUrl: string | null;
  specialty: string;
  experienceYears: number;
  bio: string;
};

type ProfileResponse = { data: TrainerProfile };

const emptyProfile: TrainerProfile = {
  name: "",
  email: "",
  avatarUrl: null,
  specialty: "",
  experienceYears: 0,
  bio: "",
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<TrainerProfile>(emptyProfile);
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch<ProfileResponse>("/profile", { signal });
      setProfile(response.data);
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
          : "No se pudo cargar el perfil.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSuccess("");
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Selecciona una imagen JPEG o PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setAvatarFile(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    const formData = new FormData();
    formData.set("name", profile.name.trim());
    formData.set("specialty", profile.specialty.trim());
    formData.set("experienceYears", String(profile.experienceYears));
    formData.set("bio", profile.bio.trim());
    if (password) formData.set("password", password);
    if (avatarFile) formData.set("avatar", avatarFile);

    try {
      const response = await apiFetch<ProfileResponse>("/profile", {
        method: "PUT",
        body: formData,
      });
      setProfile((current) => ({ ...current, ...response.data }));
      setAvatarFile(null);
      setPassword("");
      setSuccess("Perfil actualizado correctamente.");
      if (fileInput.current) fileInput.current.value = "";
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const imageSrc = previewUrl || (profile.avatarUrl ? apiMediaUrl(profile.avatarUrl) : "");

  return (
    <div>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Cuenta
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Configuración</h1>
        <p className="mt-2 text-sm text-muted">
          Actualiza tu perfil profesional, contraseña e imagen de marca.
        </p>
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
      {success && (
        <div
          aria-live="polite"
          className="mt-7 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          role="status"
        >
          <Check size={16} />
          {success}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={(event) => void saveProfile(event)}>
        <section aria-labelledby="profile-section-heading" className="rounded-2xl border border-line bg-card p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold" id="profile-section-heading">Perfil profesional</h2>
            <p className="mt-1 text-sm text-muted">Información visible para tu equipo y atletas.</p>
          </div>

          <div className="flex flex-col gap-6 border-b border-line pb-7 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-black/30 text-muted">
              {imageSrc ? (
                <Image
                  alt="Avatar o logo del entrenador"
                  className="h-full w-full object-cover"
                  height={96}
                  src={imageSrc}
                  unoptimized
                  width={96}
                />
              ) : (
                <UserRound size={32} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Foto de perfil o logo de marca</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Formatos JPEG o PNG, hasta 5 MB.
              </p>
              <input
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={selectAvatar}
                ref={fileInput}
                type="file"
              />
              <button
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium transition hover:border-accent/50 hover:text-accent"
                onClick={() => fileInput.current?.click()}
                type="button"
              >
                <Upload size={15} />
                Elegir imagen
              </button>
              {avatarFile && <p className="mt-2 text-xs text-muted">{avatarFile.name}</p>}
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block font-medium">Nombre</span>
              <input
                autoComplete="name"
                className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent/70"
                maxLength={100}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                required
                value={profile.name}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">Correo electrónico</span>
              <input
                autoComplete="email"
                className="h-11 w-full cursor-not-allowed rounded-xl border border-line bg-black/10 px-3.5 text-sm text-muted"
                readOnly
                value={profile.email}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">Especialidad</span>
              <input
                className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent/70"
                maxLength={100}
                onChange={(event) => setProfile({ ...profile, specialty: event.target.value })}
                placeholder="Ej. Fuerza y acondicionamiento"
                required
                value={profile.specialty}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium">Años de experiencia</span>
              <input
                className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition focus:border-accent/70"
                max={80}
                min={0}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    experienceYears: event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
                required
                type="number"
                value={profile.experienceYears}
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="mb-2 block font-medium">Biografía</span>
              <textarea
                className="min-h-32 w-full resize-y rounded-xl border border-line bg-black/20 px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-muted/70 focus:border-accent/70"
                maxLength={2000}
                onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                placeholder="Cuéntales a tus atletas sobre tu experiencia y enfoque."
                required
                value={profile.bio}
              />
              <span className="mt-1 block text-right text-xs text-muted">
                {profile.bio.length}/2000
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="security-section-heading" className="rounded-2xl border border-line bg-card p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold" id="security-section-heading">Seguridad</h2>
            <p className="mt-1 text-sm text-muted">Deja este campo vacío para conservar tu contraseña actual.</p>
          </div>
          <label className="block max-w-xl text-sm">
            <span className="mb-2 block font-medium">Nueva contraseña</span>
            <input
              autoComplete="new-password"
              className="h-11 w-full rounded-xl border border-line bg-black/20 px-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent/70"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Al menos 8 caracteres"
              type="password"
              value={password}
            />
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-3 text-sm font-semibold text-[#030712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isSaving}
            type="submit"
          >
            {isSaving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
