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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <ShieldCheck className="h-5 w-5 text-brand" aria-hidden />
          <div className="leading-tight">
            <p className="text-sm font-semibold">ResolveIQ</p>
            <p className="text-[11px] text-sidebar-foreground/60">Incident Intelligence</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label="Ana gezinme">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <img src={logo.url} alt="GTech" className="h-7 w-auto opacity-90" />
          <p className="text-[11px] leading-snug text-sidebar-foreground/60">
            GTech Academy Concept Project
            <br />
            Educational prototype — not an official GTech product
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 lg:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {membership?.organizationName ?? "Tenant yükleniyor…"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {membership?.roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ") || "Rol bilgisi yok"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-brand/30 bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand-foreground sm:inline">
              GTech Academy Concept Project
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
          className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden"
          aria-label="Mobil gezinme"
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
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
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
