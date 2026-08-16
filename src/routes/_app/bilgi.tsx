import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KNOWLEDGE_STATUS_LABELS, FRESHNESS_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_app/bilgi")({
  head: () => ({
    meta: [
      { title: "Bilgi Merkezi — ResolveIQ" },
      { name: "description", content: "Doğrulanmış runbook'lar, çözüm kayıtları ve tazelik durumlarıyla kurumsal incident hafızası." },
      { property: "og:title", content: "Bilgi Merkezi — ResolveIQ" },
      { property: "og:description", content: "Doğrulanmış runbook'lar ve kurumsal incident hafızası." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgeCenter,
});

function KnowledgeCenter() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: articles } = useQuery({
    queryKey: ["knowledge", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("id, title, summary, status, freshness, verified, tags, reuse_count, success_count, visibility, updated_at, financial_domain")
        .eq("organization_id", org!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (articles ?? []).filter((a) => {
    const text = `${a.title} ${a.summary} ${a.tags.join(" ")}`.toLocaleLowerCase("tr");
    return q.trim() === "" || text.includes(q.toLocaleLowerCase("tr"));
  });

  async function review(id: string) {
    if (!org || !session) return;
    const { error } = await supabase
      .from("knowledge_articles")
      .update({
        freshness: "valid",
        status: "approved_private",
        verified: true,
        verified_by: session.user.id,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("audit_logs").insert({
      organization_id: org,
      actor_id: session.user.id,
      actor_kind: "human",
      action: "knowledge_reviewed",
      entity_type: "knowledge_articles",
      entity_id: id,
      reason: "Curator incelemesi tamamlandı",
    });
    toast.success("Kayıt güncel olarak işaretlendi");
    qc.invalidateQueries({ queryKey: ["knowledge", org] });
  }

  return (
    <>
      <PageHeader
        title="Bilgi Merkezi"
        description="Yalnızca incelemeden geçmiş kayıtlar AI önerilerinde kanıt olarak kullanılır."
        action={
          <Input
            className="w-full sm:w-72"
            placeholder="Başlık, özet veya etiket ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{a.title}</p>
                <span className="shrink-0 rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {FRESHNESS_LABELS[a.freshness] ?? a.freshness}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{a.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded border border-border px-1.5 py-0.5">
                  {KNOWLEDGE_STATUS_LABELS[a.status] ?? a.status}
                </span>
                <span className="rounded border border-border px-1.5 py-0.5">
                  {a.visibility === "shared" ? "Paylaşılan" : "Tenant içi"}
                </span>
                {a.tags.slice(0, 4).map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5 py-0.5">
                    #{t}
                  </span>
                ))}
                <span className="ml-auto">
                  {a.reuse_count} kullanım · {a.success_count} başarı
                </span>
              </div>
              {a.freshness !== "valid" && (
                <Button size="sm" variant="outline" onClick={() => review(a.id)}>
                  İncelendi olarak işaretle
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>
        )}
      </div>
    </>
  );
}
