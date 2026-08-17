# ResolveIQ implementation contract

Read `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `DOMAIN_GLOSSARY.md` and `TESTING.md` before modifying core flows.

Definition of done: tenant boundary remains enforced by RLS and application queries; AI output is schema-valid and cited; low evidence produces no actions; state changes are human initiated; audit trail is written; format, lint, typecheck, tests, coverage, secret scan, production build and built-worker smoke test pass.

Never place secrets in client bundles, logs, prompts, examples or commits. Keep the GTech Academy educational disclaimer visible.
