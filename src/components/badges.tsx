import { cn } from "@/lib/utils";
import {
  SEVERITY_LABELS,
  STATUS_LABELS,
  severityToneClass,
  statusToneClass,
  type IncidentStatus,
  type Severity,
} from "@/lib/domain";

export function SeverityBadge({ severity }: { severity?: string | null }) {
  if (!severity) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        severityToneClass(severity),
      )}
    >
      {SEVERITY_LABELS[severity as Severity] ?? severity}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        statusToneClass(status),
      )}
    >
      {STATUS_LABELS[status as IncidentStatus] ?? status}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">%{pct}</span>
    </div>
  );
}

export function AiNotice({ mode, warning }: { mode?: string; warning?: string | null }) {
  return (
    <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
      AI önerisi henüz operasyonel karar değildir; uygulanması için insan onayı gerekir.
      {mode === "fallback"
        ? " Şu anda deterministik demo modu çalışıyor (model yanıtı alınamadı)."
        : null}
      {warning ? ` (${warning})` : null}
    </p>
  );
}
