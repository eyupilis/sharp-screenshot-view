<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# ResolveIQ agent contract

- Keep TypeScript strict and run `npm run verify` before a push.
- Preserve tenant isolation: retrieval and writes must be tenant-prefiltered before ranking or generation.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, webhook secrets, raw gateway bodies or `.env` content.
- AI is advisory. Do not add autonomous status, severity, action or sharing changes.
- Require evidence citations, the `%65` no-answer gate, Zod validation and a safe deterministic fallback.
- Do not make deprecated/stale/unverified knowledge actionable.
- Add an audit event for every material human or AI decision.
- Do not rewrite published git history; commits on the connected branch sync to Lovable.
