# Evaluation plan

The `golden-tr-v1` suite contains 25 Turkish financial incident cases covering performance, integration, availability, data integrity, security and other; P1–P4; evidence-present and evidence-absent paths.

Release gates:

- Category accuracy ≥92%
- Severity accuracy ≥88%
- No-answer correctness 100%
- Tenant leakage 0
- Deprecated-action rate 0
- JSON schema validity 100%
- Built worker landing 200; unsigned webhook 401

Run `npm run test:eval`. Store version, totals and accuracies in `evaluation_runs`. Any prompt/retrieval change must compare against the prior version, inspect failures by category and add a regression case for production incidents.
