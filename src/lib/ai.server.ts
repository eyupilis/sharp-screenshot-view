/** Server-only helpers: lexical retrieval + Lovable AI Gateway calls. */

const STOPWORDS = new Set([
  "ve",
  "ile",
  "bir",
  "bu",
  "da",
  "de",
  "icin",
  "için",
  "olarak",
  "olan",
  "var",
  "yok",
  "sonra",
  "once",
  "önce",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "was",
  "were",
  "are",
  "not",
  "has",
  "have",
]);

export function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export type Candidate = { id: string; text: string; meta: Record<string, unknown> };
export type ScoredCandidate = Candidate & { score: number; matchedTerms: string[] };

/**
 * Deterministic lexical retrieval (TF-IDF over the tenant corpus).
 * No embeddings are claimed: this is an auditable, reproducible baseline.
 */
export function lexicalRank(query: string, candidates: Candidate[], limit = 5): ScoredCandidate[] {
  const queryTerms = Array.from(new Set(tokenize(query)));
  if (queryTerms.length === 0 || candidates.length === 0) return [];

  const docTokens = candidates.map((c) => tokenize(c.text));
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const tokens of docTokens) if (tokens.includes(term)) count++;
    df.set(term, count);
  }
  const n = candidates.length;

  const scored = candidates.map((candidate, index) => {
    const tokens = docTokens[index] ?? [];
    const length = Math.max(tokens.length, 1);
    let score = 0;
    const matchedTerms: string[] = [];
    for (const term of queryTerms) {
      const tf = tokens.filter((t) => t === term).length;
      if (tf === 0) continue;
      matchedTerms.push(term);
      const idf = Math.log(1 + n / (1 + (df.get(term) ?? 0)));
      score += (tf / length) * idf * 10;
    }
    const coverage = matchedTerms.length / queryTerms.length;
    return { ...candidate, score: Number((score * (0.5 + coverage)).toFixed(4)), matchedTerms };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function normalizeScore(score: number, top: number) {
  if (top <= 0) return 0;
  return Math.min(1, Number((score / top).toFixed(2)));
}

export type AiCallResult = {
  mode: "live" | "fallback";
  model: string | null;
  content: string | null;
  latencyMs: number;
  error?: string;
};

export type AiFailureMode = "none" | "timeout" | "rate_limit";

export async function callGateway(
  systemPrompt: string,
  userPrompt: string,
  failureMode: AiFailureMode = "none",
): Promise<AiCallResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const started = Date.now();
  if (failureMode !== "none") {
    return {
      mode: "fallback",
      model: null,
      content: null,
      latencyMs: 1,
      error: failureMode === "timeout" ? "AI zaman aşımı (demo)" : "AI hız sınırı (demo)",
    };
  }
  if (!apiKey) {
    return {
      mode: "fallback",
      model: null,
      content: null,
      latencyMs: 0,
      error: "LOVABLE_API_KEY yok",
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });
    if (!response.ok) {
      console.error(`AI gateway failed [${response.status}]`);
      return {
        mode: "fallback",
        model: null,
        content: null,
        latencyMs: Date.now() - started,
        error: response.status === 429 ? "AI hız sınırı" : `AI hatası (${response.status})`,
      };
    }
    const json = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      mode: "live",
      model: json.model ?? "google/gemini-3.5-flash",
      content: json.choices?.[0]?.message?.content ?? null,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error(`AI gateway ${timedOut ? "timed out" : "request failed"}`);
    return {
      mode: "fallback",
      model: null,
      content: null,
      latencyMs: Date.now() - started,
      error: timedOut ? "AI zaman aşımı" : "AI servisine ulaşılamadı",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonBlock<T>(content: string | null): T | null {
  if (!content) return null;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
