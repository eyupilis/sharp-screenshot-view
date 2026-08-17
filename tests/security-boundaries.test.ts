import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260817010000_resolveiq_completion.sql", import.meta.url),
  "utf8",
);
const triage = readFileSync(new URL("../src/lib/triage.server.ts", import.meta.url), "utf8");
const gateway = readFileSync(new URL("../src/lib/ai.server.ts", import.meta.url), "utf8");

describe("security boundaries", () => {
  it("keeps evaluation, ingestion and webhook tables behind RLS", () => {
    for (const table of [
      "evaluation_cases",
      "evaluation_runs",
      "ingestion_jobs",
      "webhook_events",
    ]) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("requires explicit shared knowledge approval and redaction", () => {
    expect(migration).toContain("article.status = 'approved_shared'");
    expect(migration).toContain("article.redaction_status IN ('completed','not_required')");
    expect(triage).toContain('article.freshness === "valid"');
  });

  it("never logs raw AI gateway response bodies", () => {
    expect(gateway).not.toContain("await response.text()");
    expect(gateway).not.toContain('console.error("AI gateway error", error)');
  });
});
