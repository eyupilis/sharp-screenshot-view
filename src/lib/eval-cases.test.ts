import { describe, expect, it } from "vitest";
import { EVAL_CASES, runDeterministicEval } from "./eval-cases";

describe("golden evaluation suite", () => {
  it("contains the required 25 realistic cases", () => {
    expect(EVAL_CASES).toHaveLength(25);
    expect(new Set(EVAL_CASES.map((item) => item.id)).size).toBe(25);
  });

  it("meets release quality thresholds", () => {
    const result = runDeterministicEval();
    expect(
      result.results
        .filter((item) => !item.categoryPass)
        .map((item) => `${item.id}:${item.category}->${item.expectedCategory}`),
    ).toEqual([]);
    expect(
      result.results
        .filter((item) => !item.severityPass)
        .map((item) => `${item.id}:${item.severity}->${item.expectedSeverity}`),
    ).toEqual([]);
    expect(result.categoryAccuracy).toBeGreaterThanOrEqual(0.92);
    expect(result.severityAccuracy).toBeGreaterThanOrEqual(0.88);
    expect(result.noAnswerAccuracy).toBe(1);
  });
});
