"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type AuthResponse = {
  data: {
    token?: string;
    requiresEmailVerification?: boolean;
    email?: string;
    message?: string;
    emailed?: boolean;
    debugVerificationCode?: string;
    trainer?: { is_beta_tester?: boolean };
  };
};

type AuthFormProps = {
  mode: "login" | "register";
};

const inputClassName =
  "h-11 w-full rounded-lg border border-neutral-800 bg-[#1A1A1A] px-3 text-sm text-[#EAEAEA] outline-none transition placeholder:text-neutral-500 focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/40";

const primaryButtonClassName =
  "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FF8C00] px-4 text-sm font-semibold text-[#0A0A0A] shadow-[0_0_15px_rgba(255,140,0,0.3)] transition hover:bg-[#e07b00] disabled:cursor-not-allowed disabled:opacity-60";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  function completeAuthenticatedSession(result: AuthResponse) {
    if (!result.data?.token) {
      throw new Error("El servidor no devolvió un token de acceso.");
    }
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.data.token);
    router.replace(result.data.trainer?.is_beta_tester === true ? "/dashboard" : "/beta-pending");
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      const result = await apiFetch<AuthResponse>(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister
              ? { name: name.trim(), email: email.trim(), password }
              : { email: email.trim(), password },
          ),
        },
      );

      if (isRegister && result.data?.requiresEmailVerification) {
        const nextEmail = result.data.email ?? email.trim().toLowerCase();
        setEmail(nextEmail);
        setDebugCode(result.data.debugVerificationCode ?? null);
        setInfoMessage(
          result.data.message ??
            "Te hemos enviado un código de verificación de 6 dígitos a tu correo.",
        );
        setStep("verify");
        return;
      }

      completeAuthenticatedSession(result);
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

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await apiFetch<AuthResponse>("/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
        }),
      });
      completeAuthenticatedSession(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo verificar el correo. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setInfoMessage("");
    setIsResending(true);

    try {
      const result = await apiFetch<AuthResponse>("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setDebugCode(result.data.debugVerificationCode ?? null);
      setInfoMessage(result.data.message ?? "Te hemos reenviado el código de verificación.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo reenviar el código. Inténtalo de nuevo.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-5 py-12">
      <section className="w-full max-w-[420px]">
        <Link href="/" className="mx-auto mb-9 flex w-fit items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF8C00] text-[#0A0A0A] shadow-[0_0_15px_rgba(255,140,0,0.35)]">
            <Activity size={21} strokeWidth={2.8} />
          </span>
          <span className="text-lg font-black tracking-[0.18em] text-[#EAEAEA]">H-FLOW</span>
        </Link>

        <div className="rounded-2xl border border-neutral-800 bg-[#111111] p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] sm:p-9">
          {isRegister && step === "verify" ? (
            <>
              <div className="mb-8">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-neutral-800 bg-[#1A1A1A] text-[#FF8C00]">
                  <MailCheck size={22} strokeWidth={2.2} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8C00]">
                  Verifica tu correo
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#EAEAEA]">
                  Activa tu acceso a la Beta
                </h1>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Hemos enviado un código de 6 dígitos a{" "}
                  <span className="font-medium text-[#EAEAEA]">{email}</span>. Introdúcelo para
                  activar tu cuenta.
                </p>
              </div>

              <form onSubmit={handleVerificationSubmit} className="space-y-5">
                <div>
                  <label htmlFor="verificationCode" className="mb-2 block text-sm font-medium text-[#EAEAEA]">
                    Código de verificación
                  </label>
                  <input
                    autoComplete="one-time-code"
                    className={`${inputClassName} tracking-[0.35em]`}
                    id="verificationCode"
                    inputMode="numeric"
                    maxLength={6}
                    minLength={6}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    pattern="\d{6}"
                    placeholder="••••••"
                    required
                    value={verificationCode}
                  />
                </div>

                {debugCode && (
                  <p className="rounded-lg border border-[#FF8C00]/25 bg-[#FF8C00]/10 px-3 py-2.5 text-sm text-[#FF8C00]">
                    Modo desarrollo: tu código es <span className="font-semibold">{debugCode}</span>
                  </p>
                )}

                {infoMessage && (
                  <p className="rounded-lg border border-neutral-700 bg-[#1A1A1A] px-3 py-2.5 text-sm text-neutral-300">
                    {infoMessage}
                  </p>
                )}

                {error && (
                  <p
                    aria-live="polite"
                    className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button className={primaryButtonClassName} disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Verificar y continuar
                      <ArrowRight aria-hidden="true" size={17} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 space-y-3 text-center text-sm text-neutral-400">
                <button
                  className="font-medium text-[#EAEAEA] transition hover:text-[#FF8C00] disabled:opacity-60"
                  disabled={isResending}
                  onClick={() => void handleResendCode()}
                  type="button"
                >
                  {isResending ? "Reenviando código..." : "Reenviar código"}
                </button>
                <p>
                  ¿Correo incorrecto?{" "}
                  <button
                    className="font-medium text-[#EAEAEA] transition hover:text-[#FF8C00]"
                    onClick={() => {
                      setStep("credentials");
                      setVerificationCode("");
                      setDebugCode(null);
                      setError("");
                      setInfoMessage("");
                    }}
                    type="button"
                  >
                    Volver al registro
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF8C00]">
                  {isRegister ? "Beta cerrada" : "Bienvenido de nuevo"}
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#EAEAEA]">
                  {isRegister ? "Crea tu cuenta" : "Inicia sesión"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {isRegister
                    ? "Solicita acceso a la Beta Cerrada de H-FLOW. Verificaremos tu correo antes de continuar."
                    : "Accede a tu espacio de rendimiento."}
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                {isRegister && (
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#EAEAEA]">
                      Nombre
                    </label>
                    <input
                      autoComplete="name"
                      className={inputClassName}
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
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#EAEAEA]">
                    Correo electrónico
                  </label>
                  <input
                    autoComplete="email"
                    className={inputClassName}
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
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#EAEAEA]">
                    Contraseña
                  </label>
                  <input
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    className={inputClassName}
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

                <button className={primaryButtonClassName} disabled={isSubmitting} type="submit">
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

              <p className="mt-7 text-center text-sm text-neutral-400">
                {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"}{" "}
                <Link
                  className="font-medium text-[#EAEAEA] transition hover:text-[#FF8C00]"
                  href={isRegister ? "/login" : "/register"}
                >
                  {isRegister ? "Inicia sesión" : "Regístrate"}
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Al continuar, aceptas los términos y la política de privacidad de H-FLOW.
        </p>
      </section>
    </main>
  );
}
