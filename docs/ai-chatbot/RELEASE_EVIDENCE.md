# Release evidence

Release candidate: ResolveIQ 1.0.0-rc1.

- Production build: automated by `npm run build`
- TypeScript strict: `npm run typecheck`
- Unit/eval/accessibility/security: Vitest suite
- Core rule coverage gate: ≥90% statements/functions/lines and ≥85% branches
- Secret scan: tracked text only; `.env` excluded
- Runtime smoke: imports built Cloudflare worker, verifies landing 200 and unsigned webhook 401
- Demo corpus: 15 tenant incidents, 12 knowledge, 5+ runbooks, 4 postmortems, 4 problem clusters, 10 outcomes, 25 eval cases
- Known limitation: cloud-browser service cannot reach workspace-local addresses; live visual QA is performed after Lovable synchronization/publish.

Do not mark a release final until `npm run verify` passes on the committed tree and the connected preview is manually checked on desktop/mobile.
