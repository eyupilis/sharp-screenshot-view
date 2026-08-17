import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/triage")({
  head: () => ({
    meta: [
      { title: "Triage Kuyruğu — ResolveIQ" },
      {
        name: "description",
        content: "AI triage bekleyen ve insan onayı gereken finansal incident kayıtları.",
      },
      { property: "og:title", content: "Triage Kuyruğu — ResolveIQ" },
      {
        property: "og:description",
        content: "AI triage bekleyen ve insan onayı gereken kayıtlar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TriageQueue,
});

function TriageQueue() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;

  const { data } = useQuery({
    queryKey: ["triage-queue", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const [incidents, results] = await Promise.all([
        supabase
          .from("incidents")
          .select(
            "id, reference, title, status, reported_severity, ai_suggested_severity, approved_severity, detected_at",
          )
          .eq("organization_id", org!)
          .in("status", ["new", "triage_pending", "triaged"])
          .order("detected_at", { ascending: true }),
        supabase
          .from("ai_triage_results")
          .select("incident_id, evidence_confidence, category, suggested_severity")
          .eq("organization_id", org!),
      ]);
      return { incidents: incidents.data ?? [], results: results.data ?? [] };
    },
  });

  const resultFor = (incidentId: string) => data?.results.find((r) => r.incident_id === incidentId);

  return (
    <>
      <PageHeader
        title="Triage kuyruğu"
        description="AI önerisi bekleyen ve severity onayı gereken kayıtlar. Kararı her zaman insan verir."
      />
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {(data?.incidents ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Kuyruk boş.</p>
          ) : (
            data!.incidents.map((i) => {
              const result = resultFor(i.id);
              return (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.reference} ·{" "}
                      {result
                        ? `AI önerisi: ${result.suggested_severity ?? "—"} · ${result.category ?? "kategori yok"} · kanıt güveni %${Math.round(result.evidence_confidence * 100)}`
                        : "AI triage çalıştırılmadı"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityBadge
                      severity={
                        i.approved_severity ?? i.ai_suggested_severity ?? i.reported_severity
                      }
                    />
                    <StatusBadge status={i.status} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/olaylar/$id" params={{ id: i.id }}>
                        Aç
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
