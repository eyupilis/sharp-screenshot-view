import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABELS, type IncidentStatus } from "@/lib/domain";

export const Route = createFileRoute("/_app/olaylar/")({
  head: () => ({
    meta: [
      { title: "Incident'lar — ResolveIQ" },
      { name: "description", content: "Tüm finansal incident kayıtlarını arayın, filtreleyin ve durumlarını izleyin." },
      { property: "og:title", content: "Incident'lar — ResolveIQ" },
      { property: "og:description", content: "Finansal incident kayıtlarını arayın ve izleyin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentList,
});

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "open", label: "Açık" },
  { key: "new", label: STATUS_LABELS.new },
  { key: "investigating", label: STATUS_LABELS.investigating },
  { key: "resolved", label: STATUS_LABELS.resolved },
];

function IncidentList() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const { data: incidents } = useQuery({
    queryKey: ["incidents", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("id, reference, title, description, status, approved_severity, ai_suggested_severity, reported_severity, detected_at")
        .eq("organization_id", org!)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (incidents ?? []).filter((i) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "open"
          ? !["closed", "resolved"].includes(i.status)
          : i.status === filter;
    const text = `${i.reference} ${i.title} ${i.description}`.toLocaleLowerCase("tr");
    return matchesFilter && (q.trim() === "" || text.includes(q.toLocaleLowerCase("tr")));
  });

  return (
    <>
      <PageHeader
        title="Incident'lar"
        description="Kayıtlı tüm olaylar ve güncel durumları."
        action={
          <Button asChild>
            <Link to="/olaylar/yeni">Yeni incident bildir</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Input
          className="ml-auto w-full sm:w-64"
          placeholder="Referans veya başlık ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Kayıt bulunamadı.</p>
          ) : (
            rows.map((i) => (
              <Link
                key={i.id}
                to="/olaylar/$id"
                params={{ id: i.id }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.reference} · {new Date(i.detected_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SeverityBadge
                    severity={i.approved_severity ?? i.ai_suggested_severity ?? i.reported_severity}
                  />
                  <StatusBadge status={i.status as IncidentStatus} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
