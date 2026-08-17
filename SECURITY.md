# Security model

## Trust boundaries

Browser → authenticated Supabase client → Postgres RLS. Server functions validate bearer claims and use the same user-scoped RLS client. Only the signed webhook handler may load the service-role client, dynamically and server-side.

## Controls

- Tenant-prefilter retrieval; private data never enters a cross-tenant candidate set.
- Shared knowledge requires `approved_shared`, `visibility=shared` and completed/not-required redaction.
- Profiles are self-readable only; all domain tables have RLS.
- Webhook secret comparison uses SHA-256 constant-time comparison; payload is capped at 256 KB and Zod validated; idempotency key is required.
- File metadata is capped at 10 MB; text ingestion redacts common secret, email and Turkish IBAN patterns before persistence.
- AI gateway timeout is 15 seconds. Response bodies, prompts, credentials and raw exceptions are not logged.
- AI JSON is Zod validated and its claimed confidence is capped by locally calibrated retrieval confidence.
- Deprecated, stale, needs-review and unverified knowledge cannot generate actions.
- Human approval is required for severity, hypothesis, action, outcome, postmortem and knowledge publication.
- Audit and incident events preserve actor, reason, time and entity.

## Threats and residual risk

Prompt injection inside documents is treated as untrusted content, but production should add malware scanning, richer PII/DLP, immutable/WORM audit retention, per-user rate limiting, SIEM export, KMS-managed secret rotation and independent penetration testing. See `docs/ai-chatbot/THREAT_MODEL.md`.

Report suspected vulnerabilities privately to the project owner; do not open public issues containing exploit details or secrets.
