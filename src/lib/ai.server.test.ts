import { describe, expect, it } from "vitest";
import { callGateway, lexicalRank, normalizeScore, parseJsonBlock, tokenize } from "./ai.server";

describe("retrieval helpers", () => {
  it("tokenizes Turkish text and removes stop words", () => {
    expect(tokenize("Kart switch ile zaman aşımı var")).toEqual(
      expect.arrayContaining(["kart", "switch", "zaman", "aşımı"]),
    );
    expect(tokenize("Kart switch ile zaman aşımı var")).not.toContain("ile");
  });

  it("ranks the relevant tenant candidate first", () => {
    const ranked = lexicalRank("TXN_TIMEOUT_504 db bağlantı havuzu", [
      { id: "relevant", text: "TXN_TIMEOUT_504 için DB bağlantı havuzu runbook", meta: {} },
      { id: "other", text: "Sertifika zinciri yenileme", meta: {} },
    ]);
    expect(ranked[0]?.id).toBe("relevant");
    expect(ranked[0]?.matchedTerms.length).toBeGreaterThan(1);
    expect(normalizeScore(5, 10)).toBe(0.5);
    expect(normalizeScore(5, 0)).toBe(0);
  });

  it("parses fenced and plain JSON defensively", () => {
    expect(parseJsonBlock<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(parseJsonBlock("not json")).toBeNull();
    expect(parseJsonBlock("{broken")).toBeNull();
  });
});

describe("AI failure injection", () => {
  it.each([
    ["timeout", "AI zaman aşımı (demo)"],
    ["rate_limit", "AI hız sınırı (demo)"],
  ] as const)("falls back safely for %s", async (mode, message) => {
    const result = await callGateway("system", "user", mode);
    expect(result.mode).toBe("fallback");
    expect(result.content).toBeNull();
    expect(result.error).toBe(message);
  });
});
