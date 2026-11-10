"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  ClipboardList,
  Dumbbell,
  Film,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch, TOKEN_STORAGE_KEY } from "@/lib/api";

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true";

const navigation = [
  { label: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { label: "Atletas", href: "/dashboard/athletes", icon: Users },
  { label: "Rutinas", href: "/dashboard/plans", icon: Dumbbell },
  { label: "Reportes", href: "/dashboard/reports", icon: ClipboardList },
  { label: "Marketing Studio", href: "/dashboard/marketing", icon: Film },
  ...(PAYMENTS_ENABLED
    ? [{ label: "Facturación", href: "/dashboard/billing", icon: CreditCard }]
    : []),
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
];

function HFlowMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 32 32"
    >
      <path
        d="M6 6v20M26 6v20M6 16h5l3-7 5 14 3-7h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M4 6h4M24 6h4M4 26h4M24 26h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizationFailed, setAuthorizationFailed] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();
    let active = true;
    void apiFetch<{ data: { trainer: { is_beta_tester: boolean } } }>("/auth/me", {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!active) return;
        if (data.trainer?.is_beta_tester !== true) {
          router.replace("/beta-pending");
          return;
        }
        setIsAuthorized(true);
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          router.replace("/login");
          return;
        }
        setAuthorizationFailed(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [router]);

  function signOut() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    router.replace("/login");
  }

  if (!isAuthorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-center">
        {authorizationFailed ? (
          <div className="max-w-sm">
            <p className="text-sm text-muted">No se pudo verificar el acceso a H-FLOW.</p>
            <button
              className="mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-[#030712]"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-card px-4 py-4 lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <Link
          href="/dashboard"
          aria-label="H-FLOW, inicio del panel"
          className="group flex items-center gap-3 px-1"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-fire text-background shadow-lg shadow-accent/20 transition group-hover:shadow-accent/30">
            <HFlowMark />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black tracking-[0.18em] text-foreground">
              H-FLOW
            </span>
            <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.19em] text-muted">
              HEALTH PERFORMANCE
            </span>
          </span>
        </Link>

        <p className="mb-2 mt-7 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70 lg:block">
          Workspace
        </p>
        <nav
          aria-label="Navegación principal"
          className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group/nav relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:px-3.5 ${
                  active
                    ? "bg-accent/[0.08] text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-fire"
                  />
                )}
                <Icon
                  aria-hidden="true"
                  size={17}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={active ? "text-accent" : "transition-colors group-hover/nav:text-accent"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 hidden border-t border-line pt-5 lg:mt-auto lg:block">
          <div className="rounded-xl border border-line bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                H-FLOW Performance
              </span>
            </div>
            <p className="mt-3 text-sm font-medium leading-5 text-foreground">
              Coaching, con datos en contexto.
            </p>
            <div
              aria-hidden="true"
              className="mt-4 h-px bg-gradient-to-r from-accent via-accent-strong/50 to-transparent"
            />
          </div>
        </div>

        <button
          className="mt-4 hidden items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-muted transition hover:bg-surface hover:text-foreground lg:flex"
          onClick={signOut}
          type="button"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:ml-64 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
        <button
          className="mt-8 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground lg:hidden"
          onClick={signOut}
          type="button"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
