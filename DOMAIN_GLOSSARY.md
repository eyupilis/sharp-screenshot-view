# Domain glossary

| Term             | Meaning                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| Incident         | A time-bounded service degradation or interruption.                                 |
| Triage           | Initial classification, severity proposal and missing-information assessment.       |
| Severity         | P1 critical, P2 high, P3 medium, P4 low. Human-approved value is authoritative.     |
| Evidence         | Tenant-authorized knowledge chunk or resolved incident used to support an AI claim. |
| Confidence       | Locally calibrated evidence strength; it is not model probability.                  |
| No-answer gate   | Below 0.65 evidence confidence, hypotheses/actions are suppressed.                  |
| Runbook          | Reviewed operational diagnosis/mitigation guidance.                                 |
| Postmortem       | Human-approved impact, root cause, lessons and preventive actions.                  |
| Knowledge debt   | Stale, needs-review or deprecated institutional knowledge.                          |
| Tenant           | Isolated organization boundary enforced by RLS.                                     |
| Shared knowledge | Redacted, curator-approved article visible across tenants.                          |
| Action outcome   | Human-recorded result after an approved recommendation is applied externally.       |
