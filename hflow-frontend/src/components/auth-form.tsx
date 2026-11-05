"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type AuthResponse = {
  data: {
    token: string;
  };
};

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await apiFetch<AuthResponse>(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password },
          ),
        },
      );

      if (!result.data?.token) {
        throw new Error("El servidor no devolvió un token de acceso.");
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, result.data.token);
      router.replace("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo completar la solicitud. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-[420px]">
        <Link href="/" className="mx-auto mb-9 flex w-fit items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-black">
            <Activity size={21} strokeWidth={2.8} />
          </span>
          <span className="text-lg font-black tracking-[0.18em]">H-FLOW</span>
        </Link>

        <div className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/30 sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {isRegister ? "Empieza hoy" : "Bienvenido de nuevo"}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {isRegister ? "Crea tu cuenta" : "Inicia sesión"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isRegister
                ? "Prepara tu espacio de entrenamiento en H-FLOW."
                : "Accede a tu espacio de rendimiento."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-200">
                  Nombre
                </label>
                <input
                  autoComplete="name"
                  className="h-11 w-full rounded-lg border border-line bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  id="name"
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                  required
                  value={name}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-200">
                Correo electrónico
              </label>
              <input
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-line bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                id="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@ejemplo.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-200">
                Contraseña
              </label>
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="h-11 w-full rounded-lg border border-line bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                id="password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                type="password"
                value={password}
              />
            </div>

            {error && (
              <p
                aria-live="polite"
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                  {isRegister ? "Creando cuenta..." : "Iniciando sesión..."}
                </>
              ) : (
                <>
                  {isRegister ? "Crear cuenta" : "Entrar"}
                  <ArrowRight aria-hidden="true" size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"}{" "}
            <Link
              className="font-medium text-white transition hover:text-accent"
              href={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Al continuar, aceptas los términos y la política de privacidad de H-FLOW.
        </p>
      </section>
    </main>
  );
}
