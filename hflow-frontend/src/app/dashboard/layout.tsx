"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CreditCard,
  Dumbbell,
  Film,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { TOKEN_STORAGE_KEY } from "@/lib/api";

const navigation = [
  { label: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { label: "Atletas", href: "/dashboard/athletes", icon: Users },
  { label: "Rutinas", href: "/dashboard/plans", icon: Dumbbell },
  { label: "Marketing Studio", href: "/dashboard/marketing", icon: Film },
  { label: "Facturación", href: "/dashboard/billing", icon: CreditCard },
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/login");
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  function signOut() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    router.replace("/login");
  }

  if (!isAuthorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-card px-4 py-4 lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <Link href="/dashboard" className="flex items-center gap-3 px-1">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-black">
            <Activity size={21} strokeWidth={2.8} />
          </span>
          <span className="text-lg font-black tracking-[0.18em]">H-FLOW</span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:mt-12 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:px-3.5 ${
                  active
                    ? "bg-accent/10 text-white"
                    : "text-muted hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-accent" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 hidden rounded-xl border border-line bg-black/20 p-4 lg:mt-auto lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Rendimiento en movimiento
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            El progreso de tu equipo, en un solo lugar.
          </p>
        </div>

        <button
          className="mt-4 hidden items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-muted transition hover:bg-white/[0.05] hover:text-white lg:flex"
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
          className="mt-8 inline-flex items-center gap-2 text-sm text-muted hover:text-white lg:hidden"
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
