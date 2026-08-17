# Contributing

1. Create a short-lived branch; do not rewrite commits already pushed to the Lovable-connected branch.
2. Keep changes tenant-safe, deterministic under failure and auditable.
3. Add/adjust tests for domain, RLS/security, AI eval and accessibility behavior.
4. Run `npm run verify`.
5. Document migrations, prompt versions and material decisions.

Commit messages should describe one coherent working change. Never commit `.env`, service-role keys, API keys, production logs or customer data.
