# Threat model

| Threat                        | Control                                                                                   | Residual risk                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Cross-tenant retrieval        | RLS + tenant prefilter; only redacted approved shared exception                           | Policy regression; covered by static tests and migration review    |
| Prompt injection in documents | Treat content only as evidence, fixed system contract, schema output, no autonomous tools | Model may repeat malicious text; add classifier/DLP in production  |
| Hallucinated action           | Citation requirement, local confidence cap, 0.65 no-answer gate, human approval           | Human automation bias; train operators and sample audits           |
| Secret leakage in logs        | No raw gateway bodies; secret scan; server-only env                                       | Third-party telemetry configuration must be independently reviewed |
| Webhook spoof/replay          | Secret, constant-time compare, idempotency, size/schema checks                            | Add rotating HMAC timestamp and rate limit in production           |
| Unsafe stale guidance         | Retrieval accepts only valid approved records                                             | Review cadence must be operationally enforced                      |
| Excess privilege              | Role/RLS policies; service-role import only in server webhook                             | Periodic access review required                                    |
| File malware/PII              | Type/size gate and text redaction                                                         | Binary scanning/extraction is review-only in prototype             |
