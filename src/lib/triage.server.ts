import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  callGateway,
  lexicalRank,
  normalizeScore,
  parseJsonBlock,
  type Candidate,
  type AiFailureMode,
} from "./ai.server";
import { inferCategory, inferSeverity } from "./triage-rules";
import { shouldGenerateActions } from "./domain";
import { TRIAGE_SYSTEM_PROMPT } from "@/prompts/triage";
import { z } from "zod";

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

const TriageResponseSchema = z.object({
  category: z.enum([
    "performance",
    "integration",
    "availability",
    "data_integrity",
    "security",
    "other",
  ]),
  suggested_severity: z.enum(["P1", "P2", "P3", "P4"]),
  missing_information: z.array(z.string().max(180)).max(8),
  evidence_confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(1200),
  hypotheses: z
    .array(
      z.object({
        hypothesis: z.string().min(1).max(500),
        rationale: z.string().min(1).max(1000),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(3),
  actions: z
    .array(
      z.object({
        title: z.string().min(1).max(240),
        detail: z.string().min(1).max(1200),
        risk_level: z.enum(["low", "medium", "high"]),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(4),
});

function deterministicTriage(text: string, evidenceConfidence: number): TriageOutput["triage"] {
  const category = inferCategory(text);
  const severity = inferSeverity(text);
  return {
    category,
    suggestedSeverity: severity,
    missingInformation:
      evidenceConfidence >= 0.65
        ? ["Etkilenen işlem hacmi", "Son değişiklik kaydı"]
        : ["Doğrulanmış benzer kayıt", "Hata kodu ve zaman aralığı", "Etkilenen işlem hacmi"],
    evidenceConfidence,
    summary:
      evidenceConfidence >= 0.65
        ? "Deterministik güvenli modda üretilmiş triage. Kural tabanlı sınıflandırma ve tenant kanıtları kullanıldı."
        : "Yeterli doğrulanmış kanıt bulunamadı. Manuel inceleme gerekli.",
  };
}

function calibratedEvidenceConfidence(
  query: string,
  ranked: Array<{ matchedTerms: string[]; score: number }>,
) {
  if (ranked.length === 0) return 0.18;
  const queryTermCount = Math.max(new Set(query.toLocaleLowerCase("tr").split(/\s+/)).size, 1);
  const uniqueMatches = new Set(ranked.flatMap((item) => item.matchedTerms)).size;
  const coverage = uniqueMatches / Math.min(queryTermCount, 12);
  const corroboration = Math.min(ranked.length / 4, 1);
  const rawStrength = Math.min((ranked[0]?.score ?? 0) / 0.45, 1);
  return Number(
    Math.min(0.94, 0.28 + coverage * 0.38 + corroboration * 0.18 + rawStrength * 0.1).toFixed(2),
  );
}

export async function runTriagePipeline(
  supabase: Client,
  userId: string,
  incidentId: string,
  failureMode: AiFailureMode = "none",
): Promise<TriageOutput> {
  const { data: incident, error } = await supabase
    .from("incidents")
    .select(
      "id, organization_id, reference, title, description, system_id, environment, reported_severity",
    )
    .eq("id", incidentId)
    .maybeSingle();
  if (error) throw new Error(`Incident okunamadı: ${error.message}`);
  if (!incident) throw new Error("Bu kayda erişim yetkiniz yok veya kayıt bulunamadı.");

  const org = incident.organization_id;
  const query = `${incident.title} ${incident.description}`;
  let effectiveFailureMode = failureMode;
  if (failureMode !== "none") {
    const [organization, memberships] = await Promise.all([
      supabase.from("organizations").select("is_demo").eq("id", org).maybeSingle(),
      supabase
        .from("organization_memberships")
        .select("role")
        .eq("organization_id", org)
        .eq("user_id", userId),
    ]);
    const canSimulate =
      organization.data?.is_demo === true &&
      (memberships.data ?? []).some((membership) =>
        ["manager", "tenant_admin", "platform_admin"].includes(membership.role),
      );
    if (!canSimulate) effectiveFailureMode = "none";
  }

  // Retrieval: only verified / approved knowledge, deprecated excluded.
  const [tenantChunks, sharedChunks] = await Promise.all([
    supabase
      .from("knowledge_chunks")
      .select(
        "id, content, article_id, knowledge_articles!inner(id, title, status, freshness, visibility)",
      )
      .eq("organization_id", org)
      .limit(500),
    supabase
      .from("knowledge_chunks")
      .select(
        "id, content, article_id, knowledge_articles!inner(id, title, status, freshness, visibility)",
      )
      .neq("organization_id", org)
      .eq("knowledge_articles.visibility", "shared")
      .eq("knowledge_articles.status", "approved_shared")
      .limit(200),
  ]);

  const chunks = [...(tenantChunks.data ?? []), ...(sharedChunks.data ?? [])];

  const knowledgeCandidates: Candidate[] = chunks
    .filter((c) => {
      const article = c.knowledge_articles as unknown as { status: string; freshness: string };
      return (
        ["approved_private", "approved_shared"].includes(article.status) &&
        article.freshness === "valid"
      );
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
  const evidenceConfidence = calibratedEvidenceConfidence(query, [
    ...rankedKnowledge,
    ...rankedIncidents,
  ]);
  const topScore = Math.max(rankedKnowledge[0]?.score ?? 0, rankedIncidents[0]?.score ?? 0, 0.0001);

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
    strategy: "tenant_prefiltered_lexical_tfidf_v2",
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

  const ai = await callGateway(TRIAGE_SYSTEM_PROMPT, userPrompt, effectiveFailureMode);
  const parsedJson = parseJsonBlock<unknown>(ai.content);
  const parsedResult = TriageResponseSchema.safeParse(parsedJson);
  const parsed = parsedResult.success ? parsedResult.data : null;

  const mode: "live" | "fallback" = parsed ? "live" : "fallback";
  const triage = parsed
    ? {
        category: parsed.category,
        suggestedSeverity: parsed.suggested_severity,
        missingInformation: parsed.missing_information ?? [],
        evidenceConfidence: Math.min(parsed.evidence_confidence, evidenceConfidence),
        summary: parsed.summary,
      }
    : deterministicTriage(query, evidenceConfidence);

  const hasEnoughEvidence = shouldGenerateActions(triage.evidenceConfidence);

  const hypotheses = parsed?.hypotheses?.length
    ? parsed.hypotheses.slice(0, 3)
    : hasEnoughEvidence && evidence.length
      ? [
          {
            hypothesis: `${evidence[0]!.title} kaydındaki desenle uyumlu bir kök neden`,
            rationale: "Deterministik mod: en yüksek skorlu tenant kanıtı ile eşleşme.",
            confidence: Math.min(0.78, triage.evidenceConfidence),
          },
        ]
      : [];

  const actions = parsed?.actions?.length
    ? parsed.actions.slice(0, 4)
    : hasEnoughEvidence && evidence.length
      ? [
          {
            title: "İlgili runbook adımlarını uygula",
            detail: `${evidence[0]!.title} kaydındaki teşhis adımlarını uygulayın ve sonucu kaydedin.`,
            risk_level: "medium",
            confidence: Math.min(0.74, triage.evidenceConfidence),
          },
        ]
      : [];

  const groundedHypotheses = hasEnoughEvidence ? hypotheses : [];
  const groundedActions = hasEnoughEvidence ? actions : [];

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
      prompt_summary: `triage v2.0 · ${evidence.length} kanıt · güven ${triage.evidenceConfidence}`,
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

  if (groundedHypotheses.length) {
    await supabase.from("root_cause_hypotheses").insert(
      groundedHypotheses.map((h) => ({
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

  if (groundedActions.length) {
    await supabase.from("recommended_actions").insert(
      groundedActions.map((a) => ({
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
    await supabase
      .from("incidents")
      .update({ ai_suggested_severity: triage.suggestedSeverity })
      .eq("id", incidentId);
  }

  return {
    mode,
    model: ai.model,
    warning: ai.error,
    triage,
    hypotheses: groundedHypotheses,
    actions: groundedActions.map((a) => ({
      title: a.title,
      detail: a.detail,
      riskLevel: a.risk_level ?? "medium",
      confidence: Number(a.confidence) || 0,
    })),
    evidence,
  };
}
