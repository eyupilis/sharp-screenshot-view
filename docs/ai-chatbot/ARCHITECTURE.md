# AI and RAG architecture

1. Authenticate and resolve user/tenant through Supabase claims and RLS.
2. Load the incident from the authorized scope.
3. Retrieve valid approved private chunks plus completed-redaction approved shared chunks; load only resolved/closed tenant incidents.
4. Rank with deterministic TF-IDF and record the retrieval run.
5. Calibrate evidence confidence from match coverage, corroboration and raw strength.
6. Build a numbered evidence block and call Lovable AI Gateway with `triage-v2.0`.
7. Validate JSON with Zod and cap model confidence to retrieval confidence.
8. Under 0.65, suppress hypotheses/actions and request missing evidence.
9. Persist suggestions, citations, AI mode/latency and audit events. Humans decide.

The current baseline intentionally does not claim vector embeddings. Future hybrid retrieval requires offline eval superiority and the same prefilter/citation rules.
