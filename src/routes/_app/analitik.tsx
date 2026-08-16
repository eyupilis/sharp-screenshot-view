import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_LABELS, type Severity } from "@/lib/domain";

export const Route = createFileRoute("/_app/analitik")({
  head: () => ({
    meta: [
      { title: "Analitik — ResolveIQ" },
      { name: "description", content: "Severity dağılımı, AI kabul oranı, bilgi yeniden kullanımı ve denetim izi özetleri." },
      { property: "og:title", content: "Analitik — ResolveIQ" },
      { property: "og:description", content: "Severity dağılımı, AI kabul oranı ve bilgi yeniden kullanımı." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics;
});

function Analytics() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;

  const { data } = useQuery({
    queryKey: ["analytics", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const [incidents, actions, runs, audits] = await Promise.all([
        supabase
          .from("incidents")
          .select("id, status, approved_severity, ai_suggested_severity, reported_severity, knowledge_promoted")
          .eq("organization_id", org!),
        supabase.from("recommended_actions").select("decision").eq("organization_id", org!),
        supabase.from("ai_runs").select("mode, status").eq("organization_id", org!),
        supabase
          .from("audit_logs")
          .select("id, action, entity_type, reason, created_at")
          .eq("organization_id", org!)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      return {
        incidents: incidents.data ?? [],
        actions: actions.data ?? [],
        runs: runs.data ?? [],
        audits: audits.data ?? [],
      };
    },
  });

  const incidents = data?.incidents ?? [];
  const sevCount = (s: Severity) =>
    incidents.filter(
      (i) => (i.approved_severity ?? i.ai_suggested_severity ?? i.reported_severity) === s,
    ).length;
  const decided = (data?.actions ?? []).filter((a) => a.decision !== "pending");
  const approved = decided.filter((a) => a.decision === "approved");
  const acceptanceRate = decided.length ? Math.round((approved.length / decided.length) * 100) : 0;
  const liveRuns = (data?.runs ?? []).filter((r) => r.mode === "live").length;

  const cards = [
    { label: "Toplam incident", value: incidents.length },
    { label: "AI aksiyon kabul oranı", value: `%${acceptanceRate}` },
    { label: "AI çalıştırması (canlı)", value: `${liveRuns}/${data?.runs.length ?? 0}` },
    {
      label: "Bilgiye dönüşen olay",
      value: incidents.filter((i) => i.knowledge_promoted).length,
    },
  ];

  const maxSev = Math.max(1, ...(["P1", "P2", "P3", "P4"] as Severity[]).map(sevCount));

  return (
    <>
      <PageHeader
        title="Analitik ve denetim"
        description="Operasyonel etki, AI güvenilirliği ve karar izlenebilirliği."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Severity dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["P1", "P2", "P3", "P4"] as Severity[]).map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-24 text-xs text-muted-foreground">{SEVERITY_LABELS[s]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(sevCount(s) / maxSev) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums">{sevCount(s)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Denetim izi (son kayıtlar)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.audits ?? []).map((a) => (
              <div key={a.id} className="rounded-md border border-border px-3 py-2 text-xs">
                <p className="font-medium">{a.action}</p>
                <p className="text-muted-foreground">
                  {a.reason ?? a.entity_type} · {new Date(a.created_at).toLocaleString("tr-TR")}
                </p>
              </div>
            ))}
            {(data?.audits ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Denetim kaydı yok.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
