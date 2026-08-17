import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { SeverityBadge, StatusBadge } from "@/components/badges";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/komuta")({
  head: () => ({
    meta: [
      { title: "Komuta Merkezi — ResolveIQ" },
      {
        name: "description",
        content: "Açık finansal incident'ların canlı durumu, severity dağılımı ve triage kuyruğu.",
      },
      { property: "og:title", content: "Komuta Merkezi — ResolveIQ" },
      {
        property: "og:description",
        content: "Açık incident'ların canlı durumu ve triage kuyruğu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;

  const { data } = useQuery({
    queryKey: ["command-center", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const [incidents, systems, runs] = await Promise.all([
        supabase
          .from("incidents")
          .select(
            "id, reference, title, status, approved_severity, ai_suggested_severity, reported_severity, detected_at, system_id",
          )
          .eq("organization_id", org!)
          .order("detected_at", { ascending: false })
          .limit(60),
        supabase
          .from("financial_systems")
          .select("id, name, code, criticality")
          .eq("organization_id", org!),
        supabase
          .from("ai_runs")
          .select("id, mode, status, created_at, run_type")
          .eq("organization_id", org!)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        incidents: incidents.data ?? [],
        systems: systems.data ?? [],
        runs: runs.data ?? [],
      };
    },
  });

  const incidents = data?.incidents ?? [];
  const openIncidents = incidents.filter((i) => !["closed", "resolved"].includes(i.status));
  const sev = (i: (typeof incidents)[number]) =>
    i.approved_severity ?? i.ai_suggested_severity ?? i.reported_severity;
  const p1 = openIncidents.filter((i) => sev(i) === "P1").length;
  const awaitingTriage = openIncidents.filter((i) =>
    ["new", "triage_pending"].includes(i.status),
  ).length;
  const systemName = (id: string | null) =>
    data?.systems.find((s) => s.id === id)?.name ?? "Sistem atanmamış";

  const stats = [
    { label: "Açık incident", value: openIncidents.length },
    { label: "P1 kritik", value: p1 },
    { label: "Triage bekleyen", value: awaitingTriage },
    { label: "İzlenen sistem", value: data?.systems.length ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Komuta Merkezi"
        description="Finansal servislerdeki açık olayların anlık görünümü."
        action={
          <Button asChild>
            <Link to="/olaylar/yeni">Yeni incident bildir</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, idx) => (
          <div key={s.label} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </p>
              <span
                className={
                  idx === 1
                    ? "h-2 w-2 rounded-full bg-sev-p1"
                    : "h-2 w-2 rounded-full bg-brand/60"
                }
                aria-hidden
              />
            </div>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">Aktif olaylar</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/olaylar">Tümü</Link>
            </Button>
          </div>
          <div className="space-y-2 p-3">
            {openIncidents.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Açık incident yok.</p>
            ) : (
              openIncidents.slice(0, 8).map((i) => (
                <Link
                  key={i.id}
                  to="/olaylar/$id"
                  params={{ id: i.id }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-surface-strong/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{i.reference}</span> · {systemName(i.system_id)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={sev(i)} />
                    <StatusBadge status={i.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">Son AI çalıştırmaları</h2>
          </div>
          <div className="space-y-2 p-3">
            {(data?.runs ?? []).length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Henüz AI çalıştırması yok.
              </p>
            ) : (
              data!.runs.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-surface-strong/40 px-3 py-2.5 text-xs"
                >
                  <p className="font-medium">{r.run_type === "triage" ? "Triage" : r.run_type}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {r.mode === "live" ? "Canlı model" : "Deterministik mod"} ·{" "}
                    {new Date(r.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
