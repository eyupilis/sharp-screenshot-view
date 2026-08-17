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
import { FileText, UploadCloud } from "lucide-react";
import { redactSensitiveText } from "@/lib/redaction";

export const Route = createFileRoute("/_app/bilgi")({
  head: () => ({
    meta: [
      { title: "Bilgi Merkezi — ResolveIQ" },
      {
        name: "description",
        content:
          "Doğrulanmış runbook'lar, çözüm kayıtları ve tazelik durumlarıyla kurumsal incident hafızası.",
      },
      { property: "og:title", content: "Bilgi Merkezi — ResolveIQ" },
      {
        property: "og:description",
        content: "Doğrulanmış runbook'lar ve kurumsal incident hafızası.",
      },
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
  const [uploading, setUploading] = useState(false);

  const { data: articles } = useQuery({
    queryKey: ["knowledge", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select(
          "id, title, summary, status, freshness, verified, tags, reuse_count, success_count, visibility, updated_at, financial_domain",
        )
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

  async function ingest(file: File | undefined) {
    if (!file || !org || !session) return;
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("tr") ?? "";
    if (!["txt", "md", "pdf", "docx"].includes(extension)) {
      toast.error("Yalnızca TXT, Markdown, PDF ve DOCX kabul edilir.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya 10 MB sınırını aşıyor.");
      return;
    }
    setUploading(true);
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const isText = extension === "txt" || extension === "md";
    const rawText = isText ? new TextDecoder().decode(bytes) : "";
    const safeText = redactSensitiveText(rawText).slice(0, 50_000);

    const { error: jobError } = await supabase.from("ingestion_jobs").insert({
      organization_id: org,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      sha256,
      status: isText ? "completed" : "review",
      redaction_status: isText ? "completed" : "pending",
      created_by: session.user.id,
    });
    if (jobError) {
      setUploading(false);
      toast.error(jobError.message);
      return;
    }

    if (isText && safeText.trim()) {
      const { data: article, error } = await supabase
        .from("knowledge_articles")
        .insert({
          organization_id: org,
          title: file.name.replace(/\.(txt|md)$/i, ""),
          summary: "Belge alım hattından gelen ve curator incelemesi bekleyen bilgi kaydı.",
          body: safeText,
          source_type: "document_upload",
          status: "under_review",
          visibility: "private",
          freshness: "valid",
          confidentiality: "internal",
          redaction_status: "completed",
          verified: false,
          tags: ["document-upload", extension],
          created_by: session.user.id,
        })
        .select("id")
        .single();
      if (error || !article) {
        setUploading(false);
        toast.error(error?.message ?? "Belge bilgi kaydına dönüştürülemedi");
        return;
      }
      await supabase.from("knowledge_chunks").insert({
        organization_id: org,
        article_id: article.id,
        chunk_index: 0,
        content: safeText,
      });
    }
    setUploading(false);
    toast.success(
      isText
        ? "Belge redakte edildi ve curator incelemesine alındı"
        : "Belge meta verisi kaydedildi; güvenli metin çıkarma incelemesi bekliyor",
    );
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
      <Card className="mb-4 border-dashed">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand-foreground">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Kaynak belge alım hattı</p>
            <p className="text-xs text-muted-foreground">
              TXT/Markdown otomatik redakte edilip parçalanır; PDF/DOCX güvenli inceleme kuyruğuna
              alınır. En fazla 10 MB.
            </p>
          </div>
          <Button asChild variant="outline" disabled={uploading}>
            <label className="cursor-pointer">
              <UploadCloud className="mr-1.5 h-4 w-4" aria-hidden />
              {uploading ? "İşleniyor…" : "Belge seç"}
              <input
                className="sr-only"
                type="file"
                accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  void ingest(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        </CardContent>
      </Card>
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
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>}
      </div>
    </>
  );
}
