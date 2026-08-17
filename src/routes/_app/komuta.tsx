import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Aktif olaylar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openIncidents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Açık incident yok.</p>
            ) : (
              openIncidents.slice(0, 8).map((i) => (
                <Link
                  key={i.id}
                  to="/olaylar/$id"
                  params={{ id: i.id }}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.reference} · {systemName(i.system_id)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={sev(i)} />
                    <StatusBadge status={i.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son AI çalıştırmaları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.runs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz AI çalıştırması yok.</p>
            ) : (
              data!.runs.map((r) => (
                <div key={r.id} className="rounded-md border border-border px-3 py-2 text-xs">
                  <p className="font-medium">{r.run_type === "triage" ? "Triage" : r.run_type}</p>
                  <p className="text-muted-foreground">
                    {r.mode === "live" ? "Canlı model" : "Deterministik mod"} ·{" "}
                    {new Date(r.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
