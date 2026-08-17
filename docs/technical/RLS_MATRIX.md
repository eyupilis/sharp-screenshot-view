# RLS matrix

| Data group                                   | Read                                          | Write                                   | Cross-tenant exception          |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------- | ------------------------------- |
| Organizations and memberships                | Current organization members                  | Tenant admin-controlled paths           | None                            |
| Profiles                                     | Self only                                     | Self only                               | None                            |
| Incidents, events and comments               | Current organization members                  | Membership plus role/application guards | None                            |
| AI, retrieval, hypothesis and action records | Current organization members                  | Authenticated server/user flow          | None                            |
| Knowledge articles/chunks                    | Current organization private; approved shared | Curator/manager application guards      | Only redacted `approved_shared` |
| Evaluation and ingestion                     | Current organization members                  | Authorized tenant/demo flow             | None                            |
| Audit logs                                   | Current organization members                  | Insert only; no normal update/delete    | None                            |
| Webhook events                               | Current organization members                  | Signed service endpoint                 | None                            |

Static security tests assert that tenant prefiltering occurs before ranking, shared knowledge requires approved/redacted state, and the service-role client is loaded only inside the signed webhook handler.
