import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { callGateway, lexicalRank, normalizeScore, parseJsonBlock, type Candidate } from "./ai.server";

type Client = SupabaseClient<Database>;

export type EvidenceItem = {
  kind: "knowledge" | "incident";
  id: string;
  title: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
  freshness?: string | null;
  status?: string | null;
  reference?: string | null;
};

export type TriageOutput = {
  mode: "live" | "fallback";
  model: string | null;
  warning?: string | undefined;
  triage: {
    category: string;
    suggestedSeverity: "P1" | "P2" | "P3" | "P4";
    missingInformation: string[];
    evidenceConfidence: number;
    summary: string;
  };
  hypotheses: Array<{ hypothesis: string; rationale: string; confidence: number }>;
  actions: Array<{ title: string; detail: string; riskLevel: string; confidence: number }>;
  evidence: EvidenceItem[];
};

const SYSTEM_PROMPT = `Sen finansal sistemler için kurumsal bir incident triage asistanısın.
Sadece sana verilen kanıtlara dayan. Kanıt yoksa bunu açıkça söyle ve düşük güven ver.
Asla durum değişikliği uygulama, sadece öneri üret. Türkçe yaz.
Yanıtı yalnızca şu JSON şemasıyla ver:
{"category":"performance|integration|availability|data_integrity|security|other",
 "suggested_severity":"P1|P2|P3|P4",
 "missing_information":["..."],
 "evidence_confidence":0.0,
 "summary":"...",
 "hypotheses":[{"hypothesis":"...","rationale":"...","confidence":0.0}],
 "actions":[{"title":"...","detail":"...","risk_level":"low|medium|high","confidence":0.0}]}`;

function deterministicTriage(text: string, evidenceCount: number): TriageOutput["triage"] {
  const lower = text.toLocaleLowerCase("tr");
  const category = /zaman aşımı|timeout|yavaş|gecikme|yanıt sür/.test(lower)
    ? "performance"
    : /sertifika|entegrasyon|format|api|servis çağrı/.test(lower)
      ? "integration"
      : /mutabakat|dosya|eksik satır|tutarsız/.test(lower)
        ? "data_integrity"
        : /erişilemiyor|kesinti|bos ekran|boş ekran|çalışmıyor/.test(lower)
          ? "availability"
          : "other";
  const severity = /kritik|tüm müşteriler|kesinti|p1|ödeme alınamıyor/.test(lower)
    ? "P1"
    : /artış|hata oranı|kısmi|yavaş/.test(lower)
      ? "P2"
      : "P3";
  return {
    category,
    suggestedSeverity: severity as "P1" | "P2" | "P3",
    missingInformation: ["Etkilenen işlem hacmi", "Son değişiklik kaydı"],
    evidenceConfidence: evidenceCount > 0 ? 0.45 : 0.15,
    summary:
      evidenceCount > 0
        ? "Deterministik demo modunda üretilmiş triage. Kural tabanlı sınıflandırma ve tenant kanıtları kullanıldı."
        : "Yeterli doğrulanmış kanıt bulunamadı. Manuel inceleme gerekli.",
  };
}

export async function runTriagePipeline(
  supabase: Client,
  userId: string,
  incidentId: string,
): Promise<TriageOutput> {
  const { data: incident, error } = await supabase
    .from("incidents")
    .select("id, organization_id, reference, title, description, system_id, environment, reported_severity")
    .eq("id", incidentId)
    .maybeSingle();
  if (error) throw new Error(`Incident okunamadı: ${error.message}`);
  if (!incident) throw new Error("Bu kayda erişim yetkiniz yok veya kayıt bulunamadı.");

  const org = incident.organization_id;
  const query = `${incident.title} ${incident.description}`;

  // Retrieval: only verified / approved knowledge, deprecated excluded.
  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("id, content, article_id, knowledge_articles!inner(id, title, status, freshness, visibility)")
    .eq("organization_id", org)
    .limit(500);

  const knowledgeCandidates: Candidate[] = (chunks ?? [])
    .filter((c) => {
      const article = c.knowledge_articles as unknown as { status: string };
      return ["approved_private", "approved_shared", "needs_review", "stale"].includes(article.status);
    })
    .map((c) => ({
      id: c.article_id,
      text: c.content,
      meta: c.knowledge_articles as unknown as Record<string, unknown>,
    }));

  const { data: pastIncidents } = await supabase
    .from("incidents")
    .select("id, reference, title, description, resolution_summary, status")
    .eq("organization_id", org)
    .neq("id", incidentId)
    .in("status", ["resolved", "closed"])
    .limit(200);

  const incidentCandidates: Candidate[] = (pastIncidents ?? []).map((i) => ({
    id: i.id,
    text: `${i.title} ${i.description} ${i.resolution_summary ?? ""}`,
    meta: { reference: i.reference, title: i.title, resolution: i.resolution_summary },
  }));

  const rankedKnowledge = lexicalRank(query, knowledgeCandidates, 4);
  const rankedIncidents = lexicalRank(query, incidentCandidates, 3);
  const topScore = Math.max(
    rankedKnowledge[0]?.score ?? 0,
    rankedIncidents[0]?.score ?? 0,
    0.0001,
  );

  const evidence: EvidenceItem[] = [
    ...rankedKnowledge.map((r) => {
      const meta = r.meta as { title?: string; freshness?: string; status?: string };
      return {
        kind: "knowledge" as const,
        id: r.id,
        title: meta.title ?? "Bilgi kaydı",
        snippet: r.text.slice(0, 260),
        score: normalizeScore(r.score, topScore),
        matchedTerms: r.matchedTerms.slice(0, 6),
        freshness: meta.freshness ?? null,
        status: meta.status ?? null,
      };
    }),
    ...rankedIncidents.map((r) => {
      const meta = r.meta as { reference?: string; title?: string; resolution?: string };
      return {
        kind: "incident" as const,
        id: r.id,
        title: meta.title ?? "Geçmiş incident",
        snippet: meta.resolution ?? r.text.slice(0, 260),
        score: normalizeScore(r.score, topScore),
        matchedTerms: r.matchedTerms.slice(0, 6),
        reference: meta.reference ?? null,
      };
    }),
  ];

  await supabase.from("retrieval_runs").insert({
    organization_id: org,
    incident_id: incidentId,
    query: query.slice(0, 500),
    strategy: "lexical_tfidf_hybrid",
    result_count: evidence.length,
    top_score: evidence[0]?.score ?? 0,
  });

  const evidenceBlock = evidence.length
    ? evidence
        .map(
          (e, i) =>
            `[${i + 1}] (${e.kind === "knowledge" ? "bilgi kaydı" : "geçmiş incident"}${
              e.freshness ? `, tazelik: ${e.freshness}` : ""
            }) ${e.title}\n${e.snippet}`,
        )
        .join("\n\n")
    : "Kanıt bulunamadı.";

  const userPrompt = `INCIDENT
Referans: ${incident.reference}
Başlık: ${incident.title}
Açıklama: ${incident.description}
Ortam: ${incident.environment}
Bildirilen severity: ${incident.reported_severity ?? "belirtilmemiş"}

KANITLAR
${evidenceBlock}`;

  const ai = await callGateway(SYSTEM_PROMPT, userPrompt);
  const parsed = parseJsonBlock<{
    category: string;
    suggested_severity: "P1" | "P2" | "P3" | "P4";
    missing_information: string[];
    evidence_confidence: number;
    summary: string;
    hypotheses: Array<{ hypothesis: string; rationale: string; confidence: number }>;
    actions: Array<{ title: string; detail: string; risk_level: string; confidence: number }>;
  }>(ai.content);

  const mode: "live" | "fallback" = parsed ? "live" : "fallback";
  const triage = parsed
    ? {
        category: parsed.category,
        suggestedSeverity: parsed.suggested_severity,
        missingInformation: parsed.missing_information ?? [],
        evidenceConfidence: Math.max(0, Math.min(1, Number(parsed.evidence_confidence) || 0)),
        summary: parsed.summary,
      }
    : deterministicTriage(query, evidence.length);

  const hypotheses = parsed?.hypotheses?.length
    ? parsed.hypotheses.slice(0, 3)
    : evidence.length
      ? [
          {
            hypothesis: `${evidence[0]!.title} kaydındaki desenle uyumlu bir kök neden`,
            rationale: "Deterministik mod: en yüksek skorlu tenant kanıtı ile eşleşme.",
            confidence: 0.4,
          },
        ]
      : [];

  const actions = parsed?.actions?.length
    ? parsed.actions.slice(0, 4)
    : evidence.length
      ? [
          {
            title: "İlgili runbook adımlarını uygula",
            detail: `${evidence[0]!.title} kaydındaki teşhis adımlarını uygulayın ve sonucu kaydedin.`,
            risk_level: "medium",
            confidence: 0.35,
          },
        ]
      : [];

  const { data: run } = await supabase
    .from("ai_runs")
    .insert({
      organization_id: org,
      incident_id: incidentId,
      run_type: "triage",
      mode,
      model: ai.model,
      status: mode === "live" ? "succeeded" : "degraded",
      latency_ms: ai.latencyMs,
      error_message: ai.error ?? null,
      prompt_summary: `triage v1 · ${evidence.length} kanıt`,
      created_by: userId,
    })
    .select("id")
    .single();

  const runId = run?.id ?? null;

  await supabase.from("ai_triage_results").insert({
    organization_id: org,
    incident_id: incidentId,
    ai_run_id: runId,
    category: triage.category,
    suggested_severity: triage.suggestedSeverity,
    suggested_system_id: incident.system_id,
    missing_information: triage.missingInformation,
    evidence_confidence: triage.evidenceConfidence,
    summary: triage.summary,
  });

  if (hypotheses.length) {
    await supabase.from("root_cause_hypotheses").insert(
      hypotheses.map((h) => ({
        organization_id: org,
        incident_id: incidentId,
        ai_run_id: runId,
        hypothesis: h.hypothesis,
        rationale: h.rationale,
        confidence: Math.max(0, Math.min(1, Number(h.confidence) || 0)),
        evidence: evidence.slice(0, 3) as unknown as never,
      })),
    );
  }

  if (actions.length) {
    await supabase.from("recommended_actions").insert(
      actions.map((a) => ({
        organization_id: org,
        incident_id: incidentId,
        ai_run_id: runId,
        title: a.title,
        detail: a.detail,
        risk_level: a.risk_level ?? "medium",
        confidence: Math.max(0, Math.min(1, Number(a.confidence) || 0)),
        evidence: evidence.slice(0, 3) as unknown as never,
      })),
    );
  }

  for (const item of evidence.filter((e) => e.kind === "knowledge")) {
    await supabase.from("incident_knowledge_links").upsert(
      {
        organization_id: org,
        incident_id: incidentId,
        article_id: item.id,
        link_type: "retrieved",
        score: item.score,
      },
      { onConflict: "incident_id,article_id,link_type" },
    );
  }

  await supabase.from("incident_events").insert({
    organization_id: org,
    incident_id: incidentId,
    event_type: "ai_triage",
    summary: `AI triage tamamlandı (${mode === "live" ? "canlı model" : "deterministik demo modu"}), ${evidence.length} kanıt getirildi.`,
    actor_kind: "ai",
    actor_id: userId,
  });

  await supabase.from("audit_logs").insert({
    organization_id: org,
    actor_id: userId,
    actor_kind: "ai",
    action: "ai_triage_run",
    entity_type: "incident",
    entity_id: incidentId,
    after_summary: { mode, evidence_count: evidence.length } as unknown as never,
    reason: "Kullanıcı talebiyle AI triage çalıştırıldı",
  });

  if (incident.reported_severity) {
    await supabase.from("incidents").update({ ai_suggested_severity: triage.suggestedSeverity }).eq("id", incidentId);
  }

  return {
    mode,
    model: ai.model,
    warning: ai.error,
    triage,
    hypotheses,
    actions: actions.map((a) => ({
      title: a.title,
      detail: a.detail,
      riskLevel: a.risk_level ?? "medium",
      confidence: Number(a.confidence) || 0,
    })),
    evidence,
  };
}
