export type IncidentStatus =
  | "new"
  | "triage_pending"
  | "triaged"
  | "investigating"
  | "mitigated"
  | "resolved"
  | "knowledge_review"
  | "closed"
  | "reopened";

export type Severity = "P1" | "P2" | "P3" | "P4";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  new: "Yeni",
  triage_pending: "Triage bekliyor",
  triaged: "Triage edildi",
  investigating: "İnceleniyor",
  mitigated: "Etki azaltıldı",
  resolved: "Çözüldü",
  knowledge_review: "Bilgi incelemesi",
  closed: "Kapatıldı",
  reopened: "Yeniden açıldı",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  P1: "P1 Kritik",
  P2: "P2 Yüksek",
  P3: "P3 Orta",
  P4: "P4 Düşük",
};

/** Allowed incident status transitions. AI can never apply these on its own. */
export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ["triage_pending"],
  triage_pending: ["triaged", "investigating"],
  triaged: ["investigating"],
  investigating: ["mitigated", "resolved"],
  mitigated: ["resolved"],
  resolved: ["knowledge_review", "closed"],
  knowledge_review: ["closed"],
  closed: ["reopened"],
  reopened: ["investigating"],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus) {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const KNOWLEDGE_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  under_review: "İncelemede",
  approved_private: "Onaylı (tenant)",
  proposed_shared: "Paylaşım önerildi",
  approved_shared: "Onaylı (paylaşılan)",
  needs_review: "Gözden geçirilmeli",
  stale: "Eskimiş",
  deprecated: "Kullanımdan kaldırıldı",
  rejected: "Reddedildi",
};

export const FRESHNESS_LABELS: Record<string, string> = {
  valid: "Güncel",
  needs_review: "Gözden geçirilmeli",
  stale: "Eskimiş",
  deprecated: "Kullanım dışı",
};

export function severityToneClass(sev?: string | null) {
  switch (sev) {
    case "P1":
      return "border-sev-p1/40 bg-sev-p1/10 text-sev-p1";
    case "P2":
      return "border-sev-p2/40 bg-sev-p2/10 text-sev-p2";
    case "P3":
      return "border-sev-p3/40 bg-sev-p3/10 text-sev-p3";
    default:
      return "border-sev-p4/40 bg-sev-p4/10 text-sev-p4";
  }
}

export function statusToneClass(status?: string | null) {
  switch (status) {
    case "new":
    case "triage_pending":
      return "border-warning/40 bg-warning/10 text-warning";
    case "investigating":
    case "triaged":
      return "border-info/40 bg-info/10 text-info";
    case "resolved":
    case "closed":
      return "border-success/40 bg-success/10 text-success";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function confidenceLabel(value: number) {
  if (value >= 0.9) return "Çok yüksek güven · doğrudan kanıt";
  if (value >= 0.8) return "Yüksek güven · insan onayı gerekli";
  if (value >= 0.65) return "Orta güven · ek doğrulama gerekli";
  return "Düşük güven · öneri üretilemez";
}

export function confidenceBand(value: number) {
  if (value >= 0.9) return "very_high" as const;
  if (value >= 0.8) return "high" as const;
  if (value >= 0.65) return "medium" as const;
  return "insufficient" as const;
}

export function shouldGenerateActions(evidenceConfidence: number) {
  return evidenceConfidence >= 0.65;
}

export const DISCLAIMER = "AI önerisi henüz operasyonel karar değildir.";
