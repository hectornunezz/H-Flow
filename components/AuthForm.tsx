"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerCoachAction,
  verifyEmailOtpAction,
  resendEmailOtpAction,
  loginCoachAction,
} from "@/app/actions";

interface AuthFormProps {
  mode?: "login" | "register";
}

export default function AuthForm({ mode = "register" }: AuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Datos del entrenador
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);

  // Estado de los 6 dígitos OTP
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const submittedEmail = (formData.get("email") as string)?.trim() || "";
    setEmail(submittedEmail);

    try {
      if (mode === "register") {
        const res = await registerCoachAction(formData);
        if (!res.success) {
          setErrorMsg(res.error || "No se pudo completar el registro.");
        } else if (res.requiresVerification) {
          setDevCode(res.devOtpCode);
          setStep("verify");
          setInfoMsg(`Hemos enviado un código de 6 dígitos a ${submittedEmail}`);
        }
      } else {
        const res = await loginCoachAction(formData);
        if (!res.success) {
          setErrorMsg(res.error || "No se pudo iniciar sesión.");
        } else if (res.redirectTo) {
          router.push(res.redirectTo);
          router.refresh();
        }
      }
    } catch {
      setErrorMsg("Error inesperado de comunicación. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    const digit = clean.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const fullCode = otpDigits.join("");

    if (fullCode.length !== 6) {
      setErrorMsg("Introduce los 6 dígitos del código de verificación.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyEmailOtpAction(email, fullCode);
      if (!res.success) {
        setErrorMsg(res.error || "Código inválido.");
      } else {
        router.push(res.redirectTo || "/");
        router.refresh();
      }
    } catch {
      setErrorMsg("No se pudo verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const res = await resendEmailOtpAction(email);
      if (res.success) {
        setDevCode(res.devOtpCode);
        setOtpDigits(["", "", "", "", "", ""]);
        setInfoMsg("Nuevo código de 6 dígitos enviado a tu bandeja de entrada.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#EAEAEA] flex flex-col justify-between relative overflow-hidden selection:bg-[#FF8C00] selection:text-black">
      {/* Halo de luz ambiental Naranja Fuego */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[520px] h-[520px] rounded-full bg-[#FF8C00]/10 blur-[140px]" />
      </div>

      {/* Header Corporativo Superior */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-neutral-900/80">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#111111] border border-[#FF8C00]/50 flex items-center justify-center shadow-[0_0_15px_rgba(255,140,0,0.25)] group-hover:border-[#FF8C00] transition-all">
            <span className="text-[#FF8C00] font-black tracking-tighter text-lg">H</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-base leading-none">
              H-FLOW
            </span>
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">
              Strength OS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] border border-neutral-800 text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF8C00] animate-pulse" />
            Invite-Only Beta v1.0
          </span>
        </div>
      </header>

      {/* Contenedor Central */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-[#111111]/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          {step === "form" ? (
            <>
              <div className="mb-7 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/30 text-[#FF8C00] text-xs font-semibold mb-3">
                  S&amp;C &amp; Powerlifting SaaS
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {mode === "register" ? "Solicita Acceso a H-Flow" : "Acceso para Entrenadores"}
                </h1>
                <p className="text-sm text-neutral-400 mt-2">
                  {mode === "register"
                    ? "Controla 1RM, RIR, RPE, check-ins técnicos y vídeos IA desde un único panel."
                    : "Entra a tu consola central de programación y seguimiento de atletas."}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Nombre completo o Marca de Coaching
                      </label>
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Ej. Héctor Núñez · Performance"
                        className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Especialidad principal
                      </label>
                      <select
                        name="specialty"
                        defaultValue="Powerlifting & Fuerza"
                        className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-neutral-800 text-sm text-white focus:outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition-all"
                      >
                        <option value="Powerlifting & Fuerza">Powerlifting &amp; Fuerza (RIR / RPE)</option>
                        <option value="Preparación Física (S&C)">Preparación Física &amp; Alto Rendimiento</option>
                        <option value="Hipertrofia & Recomposición">Hipertrofia &amp; Culturismo Natural</option>
                        <option value="Centro / Estudio Presencial">Centro de Entrenamiento / Box</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Correo electrónico profesional
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="coach@tudominio.com"
                    className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 rounded-xl bg-[#161616] border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-5 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] disabled:opacity-50 text-black font-bold text-sm tracking-tight shadow-[0_0_25px_rgba(255,140,0,0.35)] hover:shadow-[0_0_35px_rgba(255,140,0,0.55)] transition-all cursor-pointer"
                >
                  {isLoading
                    ? "Procesando acceso..."
                    : mode === "register"
                    ? "Crear cuenta y verificar correo →"
                    : "Entrar al Dashboard →"}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center text-xs text-neutral-400">
                {mode === "register" ? (
                  <>
                    ¿Ya tienes cuenta verificada?{" "}
                    <Link
                      href="/login"
                      className="text-[#FF8C00] font-semibold hover:underline"
                    >
                      Inicia sesión
                    </Link>
                  </>
                ) : (
                  <>
                    ¿Aún no estás en la Beta Cerrada?{" "}
                    <Link
                      href="/register"
                      className="text-[#FF8C00] font-semibold hover:underline"
                    >
                      Solicita acceso
                    </Link>
                  </>
                )}
              </div>
            </>
          ) : (
            /* PASO 2: VERIFICACIÓN POR CÓDIGO DE 6 DÍGITOS */
            <div>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#FF8C00]/15 border border-[#FF8C00]/40 text-[#FF8C00] flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(255,140,0,0.25)] font-bold text-lg">
                  ✉
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Verifica tu correo
                </h2>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Introduce el código de seguridad de 6 dígitos enviado a{" "}
                  <span className="text-white font-semibold">{email}</span> para activar tu entorno.
                </p>
              </div>

              {infoMsg && (
                <div className="mb-4 p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs text-center">
                  {infoMsg}
                </div>
              )}

              {devCode && (
                <div className="mb-5 p-3 rounded-xl bg-[#FF8C00]/10 border border-[#FF8C00]/40 text-xs text-center">
                  <span className="text-neutral-300">Modo Demo Local — Tu código OTP es: </span>
                  <span className="font-mono font-extrabold text-[#FF8C00] tracking-widest text-sm">
                    {devCode}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div className="flex items-center justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[#161616] border border-neutral-800 text-white focus:outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00] transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#FF8C00] hover:bg-[#e07b00] disabled:opacity-50 text-black font-bold text-sm tracking-tight shadow-[0_0_25px_rgba(255,140,0,0.35)] transition-all cursor-pointer"
                >
                  {isLoading ? "Verificando código..." : "Activar cuenta y entrar a H-Flow →"}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="hover:text-white transition-colors"
                >
                  ← Cambiar correo
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-[#FF8C00] font-semibold hover:underline"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Minimalista */}
      <footer className="relative z-10 w-full py-5 text-center text-[11px] text-neutral-500 border-t border-neutral-900/80">
        H-Flow Performance Systems · Diseñado para Entrenadores de Fuerza y Preparadores Físicos
      </footer>
    </div>
  );
}