import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BadgeHelp,
  BookOpen,
  BarChart3,
  Bot,
  Settings,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMembership, ROLE_LABELS } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/gtech-logo.png.asset.json";

const NAV = [
  { to: "/komuta", label: "Komuta Merkezi", icon: LayoutDashboard },
  { to: "/triage", label: "Triage Kuyruğu", icon: ListChecks },
  { to: "/olaylar", label: "Incident'lar", icon: Activity },
  { to: "/bilgi", label: "Bilgi Merkezi", icon: BookOpen },
  { to: "/ai-kalitesi", label: "AI Kalitesi", icon: Bot },
  { to: "/problemler", label: "Tekrarlayan Desenler", icon: Repeat },
  { to: "/analitik", label: "Analitik", icon: BarChart3 },
  { to: "/yonetim", label: "Yönetim", icon: Settings },
  { to: "/yardim", label: "Yardım", icon: BadgeHelp },
] as const;

export function AppShell({ userId, children }: { userId: string; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: membership } = useMembership(userId);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-20 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight">ResolveIQ</p>
            <p className="text-[11px] text-sidebar-foreground/55">Incident Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Ana gezinme">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-brand"
                    aria-hidden
                  />
                ) : null}
                <item.icon className={cn("h-4 w-4", active && "text-brand")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <img src={logo.url} alt="GTech" className="h-7 w-auto opacity-85" />
          <p className="text-[11px] leading-snug text-sidebar-foreground/50">
            GTech Academy Concept Project
            <br />
            Educational prototype — not an official GTech product
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:h-20 lg:px-8">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {membership?.organizationName ?? "Tenant yükleniyor…"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {membership?.roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ") || "Rol bilgisi yok"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-brand/25 bg-brand-soft/35 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-foreground md:inline-flex">
              <span className="pulse-dot" aria-hidden /> Concept Project
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" aria-hidden /> Çıkış
            </Button>
          </div>
        </header>

        <nav
          className="flex gap-1.5 overflow-x-auto border-b border-border bg-surface/60 px-3 py-2.5 lg:hidden"
          aria-label="Mobil gezinme"
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-gradient-brand font-medium text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
