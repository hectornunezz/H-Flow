"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ApiError, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

type SubscriptionOverview = {
  data: {
    plan: "Free" | "Pro";
    subscriptionStatus: string;
    currentPeriodEnd: string | null;
    aiUsage: {
      generatedThisMonth: number;
      completedThisMonth: number;
    };
  };
};

type ExamplePayment = {
  date: string;
  description: string;
  amount: string;
  status: string;
};

const examplePayments: ExamplePayment[] = [
  { date: "04 nov 2026", description: "Suscripción Pro (ejemplo)", amount: "29,00 €", status: "Simulado" },
  { date: "04 oct 2026", description: "Suscripción Pro (ejemplo)", amount: "29,00 €", status: "Simulado" },
  { date: "04 sep 2026", description: "Suscripción Pro (ejemplo)", amount: "29,00 €", status: "Simulado" },
];

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Activa",
    trialing: "Prueba activa",
    past_due: "Pago pendiente",
    canceled: "Cancelada",
    unpaid: "Sin pagar",
    inactive: "Sin suscripción",
  };
  return labels[status] ?? status;
}

export default function BillingPage() {
  const [overview, setOverview] = useState<SubscriptionOverview["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [error, setError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const loadOverview = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch<SubscriptionOverview>("/payments/subscription", { signal });
      setOverview(response.data);
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
          : "No se pudo cargar la información de facturación.",
      );
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadOverview(controller.signal);
    return () => controller.abort();
  }, [loadOverview]);

  async function startCheckout() {
    setIsStartingCheckout(true);
    setCheckoutError("");
    try {
      const response = await apiFetch<{ data: { url: string } }>("/payments/checkout", {
        method: "POST",
      });
      window.location.assign(response.data.url);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.location.replace("/login");
        return;
      }
      setCheckoutError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo iniciar Stripe Checkout.",
      );
      setIsStartingCheckout(false);
    }
  }

  const isPro = overview?.plan === "Pro";
  const periodEnd = formatDate(overview?.currentPeriodEnd ?? null);

  return (
    <div>
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Cuenta y pagos
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Facturación</h1>
          <p className="mt-2 text-sm text-muted">
            Gestiona tu plan, revisa el uso de IA y actualiza tu suscripción.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-muted">
          <CreditCard size={15} />
          Pagos protegidos por Stripe
        </div>
      </header>

      {error && (
        <div
          aria-live="polite"
          className="mt-7 flex flex-col justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:flex-row sm:items-center"
          role="alert"
        >
          <span>{error}</span>
          <button
            className="inline-flex shrink-0 items-center gap-2 font-medium text-white hover:text-accent"
            onClick={() => {
              const controller = new AbortController();
              void loadOverview(controller.signal);
            }}
            type="button"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      <section aria-label="Plan actual" className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="relative overflow-hidden rounded-2xl border border-line bg-card p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CreditCard size={16} className="text-accent" />
                Plan actual
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <h2 className="text-4xl font-semibold tracking-tight">
                  {isLoading ? "—" : (overview?.plan ?? "—")}
                </h2>
                {!isLoading && overview && (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      isPro
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.04] text-muted"
                    }`}
                  >
                    {statusLabel(overview.subscriptionStatus)}
                  </span>
                )}
              </div>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
                {isPro
                  ? "Tu suscripción Pro está activa. Stripe gestiona los próximos cobros."
                  : "Estás en el plan Free. Activa Pro para completar tu suscripción mensual con Stripe."}
              </p>
              {periodEnd && isPro && (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                  <Clock3 size={14} />
                  Próxima renovación: {periodEnd}
                </p>
              )}
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles size={22} />
            </span>
          </div>

          <div className="relative mt-8 border-t border-line pt-6">
            {checkoutError && (
              <p aria-live="polite" className="mb-4 text-sm text-red-300" role="alert">
                {checkoutError}
              </p>
            )}
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || isStartingCheckout || isPro}
              onClick={() => void startCheckout()}
              type="button"
            >
              {isStartingCheckout ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : isPro ? (
                <Check size={17} />
              ) : (
                <ArrowUpRight size={17} />
              )}
              {isStartingCheckout
                ? "Conectando con Stripe…"
                : isPro
                  ? "Plan Pro activo"
                  : "Mejorar a Pro"}
            </button>
            <p className="mt-3 text-xs text-muted">
              {isPro
                ? "Tu suscripción se mantiene mientras esté activa en Stripe."
                : "Continuar te llevará a la página segura de Stripe Checkout."}
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Uso de IA este mes</p>
              <h2 className="mt-2 text-2xl font-semibold">Generación de contenido</h2>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Sparkles size={18} />
            </span>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-white/[0.02] p-4">
              <p className="text-xs text-muted">Episodios creados</p>
              <p className="mt-3 text-3xl font-semibold">
                {isLoading ? "—" : (overview?.aiUsage.generatedThisMonth ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/[0.02] p-4">
              <p className="text-xs text-muted">Completados</p>
              <p className="mt-3 text-3xl font-semibold">
                {isLoading ? "—" : (overview?.aiUsage.completedThisMonth ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            Recuento de episodios de marketing creados durante el mes natural actual.
          </p>
        </article>
      </section>

      <section aria-labelledby="payment-history-heading" className="mt-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Actividad
            </p>
            <h2 className="mt-2 text-xl font-semibold" id="payment-history-heading">
              Historial de pagos
            </h2>
          </div>
          <span className="text-xs text-muted">Datos de demostración · no son cargos reales</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="hidden grid-cols-[1fr_1.5fr_0.7fr_0.7fr] gap-4 border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
            <span>Fecha</span>
            <span>Descripción</span>
            <span>Importe</span>
            <span>Estado</span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {examplePayments.map((payment) => (
              <li
                className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1fr_1.5fr_0.7fr_0.7fr] sm:items-center sm:gap-4"
                key={payment.date}
              >
                <span className="text-muted">{payment.date}</span>
                <span>{payment.description}</span>
                <span className="font-medium">{payment.amount}</span>
                <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted">
                  {payment.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          El backend aún no expone facturas reales; consulta el portal de Stripe para tus pagos efectivos.
        </p>
      </section>
    </div>
  );
}
