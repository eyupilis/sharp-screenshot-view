# Technical decisions

## ADR-001 — Supabase RLS as authorization source

Application filtering is defense in depth; every tenant table also enforces RLS. This prevents a missed client filter from becoming cross-tenant exposure.

## ADR-002 — Auditable lexical retrieval baseline

TF-IDF is deterministic, cheap and explainable. The product does not claim embeddings. A future hybrid/vector path must retain ACL prefiltering, citations and eval comparison.

## ADR-003 — Evidence confidence independent of model confidence

Model confidence is capped by local retrieval calibration. Below 0.65, no action is stored. This makes failure behavior deterministic and testable.

## ADR-004 — Human-in-the-loop state changes

AI writes suggestions only. Humans approve severity, hypotheses, actions, outcomes, postmortems and publication; each decision writes audit/event records.

## ADR-005 — Cloudflare-compatible TanStack versions

TanStack packages are pinned to the patched compatible set (`react-start 1.168.46`, `react-router 1.170.29`, `router-plugin 1.168.32`) because the earlier patch set produced a circular CSRF middleware initialization failure in the built worker.

## ADR-006 — Honest deterministic fallback

Missing key, timeout, 429, invalid JSON or network failure produces a visible fallback mode. Raw upstream bodies are not logged and the UI never implies a live model ran.
