"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type AccessResponse = {
  data: { trainer: { is_beta_tester: boolean } };
};

export default function BetaPendingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState("");

  async function checkAccess() {
    setIsChecking(true);
    setMessage("");
    try {
      const response = await apiFetch<AccessResponse>("/auth/me");
      if (response.data.trainer.is_beta_tester) {
        router.replace("/dashboard");
      } else {
        setMessage("Tu acceso todavía está pendiente de aprobación.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        router.replace("/login");
        return;
      }
      setMessage("No se pudo comprobar el acceso. Inténtalo de nuevo.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-card p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
        <span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-2xl text-accent">
          ⏳
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Beta privada H-FLOW
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Tu acceso está pendiente</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          El equipo revisará tu solicitud y habilitará el acceso manualmente. Puedes comprobarlo de nuevo cuando recibas la aprobación.
        </p>
        {message && <p aria-live="polite" className="mt-4 text-sm text-orange-300">{message}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 text-sm font-semibold text-[#030712] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            disabled={isChecking}
            onClick={() => void checkAccess()}
            type="button"
          >
            {isChecking ? "Comprobando…" : "Comprobar acceso"}
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-medium text-foreground transition hover:bg-white/5"
            href="/login"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
