# AI decisions

- Prompt contract lives in `src/prompts/triage.ts`; human-readable mirror in `prompts/triage-system.md`.
- Temperature 0.2 favors reproducibility.
- Output is limited to three hypotheses and four actions.
- Gateway errors are mapped to safe public categories; upstream bodies are discarded.
- Failure injection is allowed only for manager/admin roles in demo organizations.
- Stale/needs-review/deprecated knowledge stays visible as knowledge debt but is not actionable retrieval input.
- Evaluation suite is deterministic and persisted as versioned summary runs.
