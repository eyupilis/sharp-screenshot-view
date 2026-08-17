# Testing and release gates

`npm run verify` executes formatting, ESLint, TypeScript, Vitest coverage, secret scanning, production build and built Cloudflare-worker HTTP smoke checks.

| Layer         | Command                 | Release expectation                                                      |
| ------------- | ----------------------- | ------------------------------------------------------------------------ |
| Unit/domain   | `npm test`              | State, confidence, retrieval, redaction and fallback pass                |
| Coverage      | `npm run test:coverage` | Core business rules ≥90%; current gate 90/85/90/90                       |
| AI eval       | `npm run test:eval`     | 25 cases; category ≥92%, severity ≥88%, no-answer 100%                   |
| Accessibility | `npm run test:a11y`     | No axe violations detectable in jsdom (color contrast manually reviewed) |
| Security      | `npm run test:security` | RLS/shared ACL/logging boundaries pass                                   |
| Secrets       | `npm run secret:scan`   | No private key or common provider secret patterns in tracked text        |
| HTTP smoke    | `npm run test:e2e`      | Built worker returns 200 on landing and 401 on unsigned webhook          |

Manual release QA: sign up/login, tenant role labels, all navigation routes, `INC-2180` happy path, timeout + 429 fallback, low-evidence no-action path, state transition restrictions, curator review, mobile navigation and console errors.
