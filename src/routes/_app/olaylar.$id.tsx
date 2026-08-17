import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileCheck2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runTriage } from "@/lib/resolveiq.functions";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { AiNotice, ConfidenceBar, SeverityBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SEVERITY_LABELS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  FRESHNESS_LABELS,
  confidenceLabel,
  type IncidentStatus,
} from "@/lib/domain";
import { redactSensitiveText } from "@/lib/redaction";

export const Route = createFileRoute("/_app/olaylar/$id")({
  head: () => ({
    meta: [
      { title: "Incident Çalışma Alanı — ResolveIQ" },
      {
        name: "description",
        content:
          "Kanıta dayalı AI triage, kök neden hipotezleri, önerilen aksiyonlar ve insan onayı akışı.",
      },
      { property: "og:title", content: "Incident Çalışma Alanı — ResolveIQ" },
      {
        property: "og:description",
        content: "AI triage, kök neden hipotezleri ve insan onaylı karar akışı.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentWorkspace,
});

function IncidentWorkspace() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;
  const qc = useQueryClient();
  const triageFn = useServerFn(runTriage);
  const [comment, setComment] = useState("");
  const [severityChoice, setSeverityChoice] = useState<string>("");
  const [reason, setReason] = useState("");
  const [postmortemNote, setPostmortemNote] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [failureMode, setFailureMode] = useState<"none" | "timeout" | "rate_limit">(() => {
    if (typeof window === "undefined") return "none";
    const stored = window.sessionStorage.getItem("resolveiq-ai-failure-mode");
    return stored === "timeout" || stored === "rate_limit" ? stored : "none";
  });

  const { data, isLoading } = useQuery({
    queryKey: ["incident", id],
    queryFn: async () => {
      const [
        incident,
        triage,
        hypotheses,
        actions,
        events,
        comments,
        links,
        executions,
        postmortem,
      ] = await Promise.all([
        supabase
          .from("incidents")
          .select("*, financial_systems(name, code, domain)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("ai_triage_results")
          .select("*")
          .eq("incident_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("root_cause_hypotheses")
          .select("*")
          .eq("incident_id", id)
          .order("confidence", { ascending: false }),
        supabase
          .from("recommended_actions")
          .select("*")
          .eq("incident_id", id)
          .order("confidence", { ascending: false }),
        supabase
          .from("incident_events")
          .select("*")
          .eq("incident_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("incident_comments")
          .select("*")
          .eq("incident_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("incident_knowledge_links")
          .select(
            "id, score, link_type, knowledge_articles(id, title, summary, status, freshness, verified)",
          )
          .eq("incident_id", id)
          .order("score", { ascending: false }),
        supabase.from("action_executions").select("*").eq("incident_id", id),
        supabase.from("postmortems").select("*").eq("incident_id", id).maybeSingle(),
      ]);
      return {
        incident: incident.data,
        triage: triage.data?.[0] ?? null,
        hypotheses: hypotheses.data ?? [],
        actions: actions.data ?? [],
        events: events.data ?? [],
        comments: comments.data ?? [],
        links: links.data ?? [],
        executions: executions.data ?? [],
        postmortem: postmortem.data ?? null,
      };
    },
  });

  const incident = data?.incident;
  const refresh = () => qc.invalidateQueries({ queryKey: ["incident", id] });

  const triageMutation = useMutation({
    mutationFn: async () => triageFn({ data: { incidentId: id, failureMode } }),
    onSuccess: (result) => {
      toast.success(
        result.mode === "live"
          ? "AI triage tamamlandı"
          : "AI triage deterministik modda tamamlandı",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function decide(
    table: "root_cause_hypotheses" | "recommended_actions" | "ai_triage_results",
    rowId: string,
    decision: string,
    label: string,
  ) {
    if (!org || !session) return;
    const column = table === "root_cause_hypotheses" ? "status" : "decision";
    const patch: Record<string, unknown> = { [column]: decision };
    if (table !== "root_cause_hypotheses") {
      patch["decided_by"] = session.user.id;
      patch["decided_at"] = new Date().toISOString();
      patch["decision_note"] = label;
    }
    const { error } = await supabase
      .from(table)
      .update(patch as never)
      .eq("id", rowId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("audit_logs").insert({
      organization_id: org,
      actor_id: session.user.id,
      actor_kind: "human",
      action: `${table}_${decision}`,
      entity_type: table,
      entity_id: rowId,
      reason: label,
    });
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "decision",
      summary: label,
      actor_kind: "human",
      actor_id: session.user.id,
    });
    toast.success("Karar kaydedildi");
    refresh();
  }

  async function changeStatus(next: IncidentStatus) {
    if (!org || !session || !incident) return;
    const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
    if (next === "resolved") {
      if (resolutionSummary.trim().length < 10) {
        toast.error("Çözüm özeti en az 10 karakter olmalıdır.");
        return;
      }
      patch["resolved_at"] = new Date().toISOString();
      patch["resolution_summary"] = resolutionSummary.trim();
    }
    const { error } = await supabase
      .from("incidents")
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "status_change",
      summary: `Durum "${STATUS_LABELS[incident.status as IncidentStatus]}" → "${STATUS_LABELS[next]}" olarak güncellendi.`,
      actor_kind: "human",
      actor_id: session.user.id,
    });
    await supabase.from("audit_logs").insert({
      organization_id: org,
      actor_id: session.user.id,
      actor_kind: "human",
      action: "incident_status_change",
      entity_type: "incident",
      entity_id: id,
      reason: `${incident.status} → ${next}`,
    });
    refresh();
  }

  async function approveSeverity() {
    if (!org || !session || !severityChoice) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        approved_severity: severityChoice as "P1" | "P2" | "P3" | "P4",
        severity_decided_by: session.user.id,
        severity_decision_reason: reason || "Manager onayı",
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "severity_decision",
      summary: `Severity ${severityChoice} olarak onaylandı. Gerekçe: ${reason || "belirtilmedi"}`,
      actor_kind: "human",
      actor_id: session.user.id,
    });
    setReason("");
    toast.success("Severity onaylandı");
    refresh();
  }

  async function addComment() {
    if (!org || !session || !comment.trim()) return;
    await supabase.from("incident_comments").insert({
      organization_id: org,
      incident_id: id,
      body: comment.trim(),
      author_id: session.user.id,
    });
    setComment("");
    refresh();
  }

  async function recordActionOutcome(actionId: string, outcome: "success" | "failed") {
    if (!org || !session) return;
    const { error } = await supabase.from("action_executions").insert({
      organization_id: org,
      incident_id: id,
      action_id: actionId,
      outcome,
      note:
        outcome === "success"
          ? "İnsan onayı sonrası uygulandı; doğrulama metrikleri normale döndü."
          : "İnsan onayı sonrası denendi; beklenen etki görülmedi ve geri alındı.",
      executed_by: session.user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "action_outcome",
      summary:
        outcome === "success"
          ? "Onaylanan aksiyon başarıyla uygulandı ve sonucu doğrulandı."
          : "Onaylanan aksiyon başarısız oldu; değişiklik geri alındı.",
      actor_kind: "human",
      actor_id: session.user.id,
    });
    toast.success("Aksiyon sonucu kaydedildi");
    refresh();
  }

  async function savePostmortem(approve: boolean) {
    if (!org || !session || !incident) return;
    const successfulAction = data?.actions.find((action) =>
      data.executions.some(
        (execution) => execution.action_id === action.id && execution.outcome === "success",
      ),
    );
    const payload = {
      organization_id: org,
      incident_id: id,
      timeline: data?.events
        .slice()
        .reverse()
        .map((event) => `${new Date(event.created_at).toLocaleString("tr-TR")}: ${event.summary}`)
        .join("\n"),
      root_cause:
        data?.hypotheses.find((hypothesis) => ["accepted", "confirmed"].includes(hypothesis.status))
          ?.hypothesis ?? "Kök neden, incident incelemesi ve kanıtlar üzerinden doğrulanmalıdır.",
      impact: incident.description,
      lessons:
        postmortemNote.trim() ||
        "Kanıta dayalı triage ve insan onay kapısı, kararın güvenli ve izlenebilir alınmasını sağladı.",
      preventive_actions:
        successfulAction?.title ??
        "İlgili metrikler için erken uyarı eşiği ve periyodik kapasite kontrolü tanımlanmalı.",
      status: approve ? "approved" : "draft",
      approved_by: approve ? session.user.id : null,
      approved_at: approve ? new Date().toISOString() : null,
      created_by: session.user.id,
    };
    const { error } = await supabase.from("postmortems").upsert(payload, {
      onConflict: "incident_id",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "postmortem",
      summary: approve
        ? "Postmortem insan onayıyla yayımlandı."
        : "Postmortem taslağı oluşturuldu.",
      actor_kind: "human",
      actor_id: session.user.id,
    });
    toast.success(approve ? "Postmortem onaylandı" : "Postmortem taslağı kaydedildi");
    refresh();
  }

  async function promoteKnowledge() {
    if (!org || !session || !incident || !data?.postmortem) return;
    const safeBody = redactSensitiveText(
      [
        `Belirti: ${incident.title}`,
        `Kök neden: ${data.postmortem.root_cause ?? "Belirtilmedi"}`,
        `Çözüm: ${incident.resolution_summary ?? data.postmortem.preventive_actions ?? "Belirtilmedi"}`,
        `Dersler: ${data.postmortem.lessons ?? "Belirtilmedi"}`,
      ].join("\n"),
    );
    const { data: article, error } = await supabase
      .from("knowledge_articles")
      .insert({
        organization_id: org,
        title: `${incident.reference} çözüm kaydı — ${incident.title}`,
        summary: "Onaylı postmortemden üretilen, curator incelemesi bekleyen çözüm kaydı.",
        body: safeBody,
        source_type: "incident_postmortem",
        source_incident_id: id,
        status: "under_review",
        visibility: "private",
        freshness: "valid",
        system_id: incident.system_id,
        financial_domain: system?.domain ?? null,
        environment: incident.environment,
        severity:
          incident.approved_severity ??
          incident.ai_suggested_severity ??
          incident.reported_severity,
        confidentiality: "internal",
        redaction_status: "auto_redacted",
        verified: false,
        tags: ["postmortem", incident.category ?? "incident"],
        created_by: session.user.id,
      })
      .select("id")
      .single();
    if (error || !article) {
      toast.error(error?.message ?? "Bilgi kaydı üretilemedi");
      return;
    }
    await supabase.from("knowledge_chunks").insert({
      organization_id: org,
      article_id: article.id,
      chunk_index: 0,
      content: safeBody,
    });
    await supabase.from("incidents").update({ knowledge_promoted: true }).eq("id", id);
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: id,
      event_type: "knowledge_promotion",
      summary: "Postmortem, gizli bilgi redaksiyonundan sonra curator incelemesine gönderildi.",
      actor_kind: "human",
      actor_id: session.user.id,
    });
    toast.success("Bilgi taslağı curator kuyruğuna gönderildi");
    refresh();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (!incident) return <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>;

  const system = incident.financial_systems as unknown as { name?: string; domain?: string } | null;
  const nextStatuses = STATUS_TRANSITIONS[incident.status as IncidentStatus] ?? [];

  return (
    <>
      <Link
        to="/olaylar"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Incident listesi
      </Link>

      <PageHeader
        title={incident.title}
        description={`${incident.reference} · ${system?.name ?? "Sistem atanmamış"} · ${incident.environment}`}
        action={
          <Button onClick={() => triageMutation.mutate()} disabled={triageMutation.isPending}>
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
            {triageMutation.isPending ? "AI çalışıyor…" : "AI triage çalıştır"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={incident.status} />
        <SeverityBadge
          severity={
            incident.approved_severity ??
            incident.ai_suggested_severity ??
            incident.reported_severity
          }
        />
        {nextStatuses.map((s) => (
          <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
            {STATUS_LABELS[s]} olarak işaretle
          </Button>
        ))}
      </div>
      {nextStatuses.includes("resolved") ? (
        <div className="mb-4 max-w-3xl rounded-md border border-border bg-surface p-3">
          <label htmlFor="resolution-summary" className="text-xs font-medium">
            Çözüm özeti (çözüldü durumuna geçiş için zorunlu)
          </label>
          <Textarea
            id="resolution-summary"
            className="mt-2"
            rows={2}
            value={resolutionSummary}
            onChange={(event) => setResolutionSummary(event.target.value)}
            placeholder="Uygulanan değişiklik, doğrulama metriği ve varsa geri alma bilgisi…"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Olay açıklaması</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {incident.description}
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue="triage">
            <TabsList>
              <TabsTrigger value="triage">AI Triage</TabsTrigger>
              <TabsTrigger value="rca">Kök neden</TabsTrigger>
              <TabsTrigger value="actions">Aksiyonlar</TabsTrigger>
              <TabsTrigger value="evidence">Kanıtlar</TabsTrigger>
              <TabsTrigger value="timeline">Zaman çizelgesi</TabsTrigger>
              <TabsTrigger value="postmortem">Postmortem</TabsTrigger>
            </TabsList>

            <TabsContent value="triage" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Triage önerisi</CardTitle>
                  <CardDescription>
                    Kategori, severity önerisi ve eksik bilgi listesi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!data?.triage ? (
                    <p className="text-sm text-muted-foreground">
                      Henüz triage çalıştırılmadı. Yukarıdaki butonla başlatın.
                    </p>
                  ) : (
                    <>
                      <AiNotice mode={data.triage.evidence_confidence > 0 ? "live" : "fallback"} />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Kategori" value={data.triage.category ?? "—"} />
                        <Field
                          label="Önerilen severity"
                          value={data.triage.suggested_severity ?? "—"}
                        />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {confidenceLabel(data.triage.evidence_confidence)}
                          </p>
                          <ConfidenceBar value={data.triage.evidence_confidence} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{data.triage.summary}</p>
                      {data.triage.missing_information.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium">Eksik bilgiler</p>
                          <ul className="list-inside list-disc text-sm text-muted-foreground">
                            {data.triage.missing_information.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="rounded-md border border-border p-3">
                        <p className="mb-2 text-xs font-medium">Severity onayı (insan kararı)</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select value={severityChoice} onValueChange={setSeverityChoice}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Severity seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            className="min-h-9 flex-1"
                            rows={1}
                            placeholder="Gerekçe"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <Button size="sm" onClick={approveSeverity} disabled={!severityChoice}>
                            Onayla
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rca" className="mt-4 space-y-3">
              {data?.hypotheses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hipotez üretilmedi.</p>
              ) : (
                data?.hypotheses.map((h) => (
                  <Card key={h.id}>
                    <CardContent className="space-y-2 pt-5">
                      <p className="text-sm font-medium">{h.hypothesis}</p>
                      <p className="text-sm text-muted-foreground">{h.rationale}</p>
                      <EvidenceRefs evidence={h.evidence} />
                      <ConfidenceBar value={h.confidence} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={h.status !== "proposed"}
                          onClick={() =>
                            decide(
                              "root_cause_hypotheses",
                              h.id,
                              "accepted",
                              `Hipotez kabul edildi: ${h.hypothesis}`,
                            )
                          }
                        >
                          Kabul et
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={h.status !== "proposed"}
                          onClick={() =>
                            decide(
                              "root_cause_hypotheses",
                              h.id,
                              "rejected",
                              `Hipotez reddedildi: ${h.hypothesis}`,
                            )
                          }
                        >
                          Reddet
                        </Button>
                        <span className="self-center text-xs text-muted-foreground">
                          Durum: {h.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-3">
              {data?.actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aksiyon önerisi yok.</p>
              ) : (
                data?.actions.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="space-y-2 pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{a.title}</p>
                        <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          Risk: {a.risk_level}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.detail}</p>
                      <EvidenceRefs evidence={a.evidence} />
                      <ConfidenceBar value={a.confidence} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={a.decision !== "pending"}
                          onClick={() =>
                            decide(
                              "recommended_actions",
                              a.id,
                              "approved",
                              `Aksiyon onaylandı: ${a.title}`,
                            )
                          }
                        >
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={a.decision !== "pending"}
                          onClick={() =>
                            decide(
                              "recommended_actions",
                              a.id,
                              "rejected",
                              `Aksiyon reddedildi: ${a.title}`,
                            )
                          }
                        >
                          Reddet
                        </Button>
                        <span className="self-center text-xs text-muted-foreground">
                          Karar: {a.decision}
                        </span>
                      </div>
                      {a.decision === "approved" &&
                      !data.executions.some((execution) => execution.action_id === a.id) ? (
                        <div className="flex flex-wrap gap-2 rounded-md bg-muted/60 p-2">
                          <Button size="sm" onClick={() => recordActionOutcome(a.id, "success")}>
                            Başarılı uygulandı
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => recordActionOutcome(a.id, "failed")}
                          >
                            Başarısız / geri alındı
                          </Button>
                        </div>
                      ) : null}
                      {data.executions
                        .filter((execution) => execution.action_id === a.id)
                        .map((execution) => (
                          <p key={execution.id} className="text-xs text-muted-foreground">
                            Sonuç: {execution.outcome === "success" ? "başarılı" : "başarısız"} ·{" "}
                            {execution.note}
                          </p>
                        ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="evidence" className="mt-4 space-y-3">
              {data?.links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bu olay için eşleşen doğrulanmış bilgi kaydı bulunamadı.
                </p>
              ) : (
                data?.links.map((l) => {
                  const article = l.knowledge_articles as unknown as {
                    id: string;
                    title: string;
                    summary: string;
                    status: string;
                    freshness: string;
                    verified: boolean;
                  };
                  return (
                    <Card key={l.id}>
                      <CardContent className="space-y-2 pt-5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium">{article.title}</p>
                          <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {FRESHNESS_LABELS[article.freshness] ?? article.freshness}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{article.summary}</p>
                        <ConfidenceBar value={l.score ?? 0} />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent className="space-y-3 pt-5">
                  {data?.events.map((e) => (
                    <div key={e.id} className="border-l-2 border-border pl-3">
                      <p className="text-sm">{e.summary}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.actor_kind === "ai" ? "AI" : "Kullanıcı"} ·{" "}
                        {new Date(e.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="postmortem" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Postmortem ve bilgiye dönüştürme</CardTitle>
                  <CardDescription>
                    Taslak otomatik hazırlanır; yayımlama ve bilgiye dönüştürme insan onayı
                    gerektirir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.postmortem ? (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        <FileCheck2 className="h-4 w-4 text-success" aria-hidden />
                        Postmortem: {data.postmortem.status === "approved" ? "Onaylı" : "Taslak"}
                      </div>
                      <p className="text-muted-foreground">{data.postmortem.root_cause}</p>
                    </div>
                  ) : null}
                  <Textarea
                    rows={4}
                    placeholder="Dersler ve takip notları…"
                    value={postmortemNote}
                    onChange={(event) => setPostmortemNote(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => savePostmortem(false)}>
                      Taslak oluştur
                    </Button>
                    <Button onClick={() => savePostmortem(true)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden /> Onayla ve yayımla
                    </Button>
                    {data?.postmortem?.status === "approved" && !incident.knowledge_promoted ? (
                      <Button variant="outline" onClick={promoteKnowledge}>
                        Bilgi incelemesine gönder
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI dayanıklılık demosu</CardTitle>
              <CardDescription>
                Yalnızca bu tarayıcı oturumunda hata senaryosu simüle eder; üretim işlemi yapmaz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={failureMode}
                onValueChange={(value: "none" | "timeout" | "rate_limit") => {
                  setFailureMode(value);
                  window.sessionStorage.setItem("resolveiq-ai-failure-mode", value);
                }}
              >
                <SelectTrigger aria-label="AI hata modu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Normal</SelectItem>
                  <SelectItem value="timeout">Zaman aşımı</SelectItem>
                  <SelectItem value="rate_limit">Hız sınırı (429)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Hata halinde güvenli deterministik mod devreye girer ve olay akışı kesilmez.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border p-2.5">
                  <p className="text-sm">{c.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ))}
              <Textarea
                rows={3}
                placeholder="Ekip notu ekleyin…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button size="sm" onClick={addComment} disabled={!comment.trim()}>
                Not ekle
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EvidenceRefs({ evidence }: { evidence: unknown }) {
  if (!Array.isArray(evidence) || evidence.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Öneriyi destekleyen kanıtlar">
      {evidence.slice(0, 3).map((item, index) => {
        const ref = item as { title?: string; reference?: string };
        return (
          <span
            key={`${ref.title ?? ref.reference ?? "evidence"}-${index}`}
            className="rounded border border-info/30 bg-info/10 px-2 py-0.5 text-[11px] text-info"
          >
            [{index + 1}] {ref.reference ?? ref.title ?? "Kanıt"}
          </span>
        );
      })}
    </div>
  );
}
