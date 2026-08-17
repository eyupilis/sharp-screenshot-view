import { describe, expect, it } from "vitest";
import {
  canTransition,
  confidenceBand,
  confidenceLabel,
  severityToneClass,
  shouldGenerateActions,
  statusToneClass,
  STATUS_TRANSITIONS,
} from "./domain";

describe("incident state machine", () => {
  it("allows only declared forward transitions", () => {
    expect(canTransition("new", "triage_pending")).toBe(true);
    expect(canTransition("new", "closed")).toBe(false);
    expect(canTransition("closed", "reopened")).toBe(true);
    expect(canTransition("reopened", "investigating")).toBe(true);
    expect(Object.keys(STATUS_TRANSITIONS)).toHaveLength(9);
  });
});

describe("semantic visual tokens", () => {
  it.each(["P1", "P2", "P3", "P4", null] as const)("maps severity %s", (severity) => {
    expect(severityToneClass(severity)).toMatch(/border-/);
  });

  it.each([
    "new",
    "triage_pending",
    "triaged",
    "investigating",
    "resolved",
    "closed",
    "mitigated",
    null,
  ] as const)("maps status %s", (status) => {
    expect(statusToneClass(status)).toMatch(/border-/);
  });
});

describe("evidence confidence policy", () => {
  it.each([
    [0.64, "insufficient", false],
    [0.65, "medium", true],
    [0.8, "high", true],
    [0.9, "very_high", true],
  ] as const)("maps %s to %s", (score, band, allowsAction) => {
    expect(confidenceBand(score)).toBe(band);
    expect(shouldGenerateActions(score)).toBe(allowsAction);
    expect(confidenceLabel(score)).toBeTruthy();
  });
});
