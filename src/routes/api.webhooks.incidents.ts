import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PayloadSchema = z.object({
  organizationSlug: z.string().min(2).max(80),
  sourceReference: z.string().min(1).max(120),
  title: z.string().min(5).max(240),
  description: z.string().min(10).max(8_000),
  severity: z.enum(["P1", "P2", "P3", "P4"]).default("P3"),
  environment: z.enum(["prod", "production", "staging", "test"]).default("prod"),
  systemCode: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/webhooks/incidents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 256_000) return json({ error: "payload_too_large" }, 413);
        const configuredSecret = process.env["RESOLVEIQ_WEBHOOK_SECRET"];
        const suppliedSecret = request.headers.get("x-resolveiq-secret") ?? "";
        if (!configuredSecret || !(await constantTimeEqual(configuredSecret, suppliedSecret))) {
          return json({ error: "unauthorized" }, 401);
        }
        const idempotencyKey = request.headers.get("idempotency-key");
        if (!idempotencyKey || idempotencyKey.length > 160) {
          return json({ error: "missing_idempotency_key" }, 400);
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }
        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "invalid_payload" }, 422);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const payload = parsed.data;
        const { data: organization } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("slug", payload.organizationSlug)
          .maybeSingle();
        if (!organization) return json({ error: "tenant_not_found" }, 404);

        const { data: existing } = await supabaseAdmin
          .from("webhook_events")
          .select("incident_id")
          .eq("organization_id", organization.id)
          .eq("source", "incident-webhook")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existing) return json({ status: "duplicate", incidentId: existing.incident_id }, 200);

        const { data: system } = payload.systemCode
          ? await supabaseAdmin
              .from("financial_systems")
              .select("id")
              .eq("organization_id", organization.id)
              .eq("code", payload.systemCode)
              .maybeSingle()
          : { data: null };
        const digest = await sha256(JSON.stringify(payload));
        const reference = `WH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${idempotencyKey.slice(0, 10)}`;
        const { data: incident, error } = await supabaseAdmin
          .from("incidents")
          .insert({
            organization_id: organization.id,
            reference,
            title: payload.title,
            description: `${payload.description}\nKaynak referansı: ${payload.sourceReference}`,
            reported_severity: payload.severity,
            environment: payload.environment,
            system_id: system?.id ?? null,
            status: "triage_pending",
          })
          .select("id")
          .single();
        if (error || !incident) return json({ error: "persistence_failed" }, 500);

        await Promise.all([
          supabaseAdmin.from("webhook_events").insert({
            organization_id: organization.id,
            source: "incident-webhook",
            idempotency_key: idempotencyKey,
            event_type: "incident.created",
            payload_digest: digest,
            incident_id: incident.id,
          }),
          supabaseAdmin.from("incident_events").insert({
            organization_id: organization.id,
            incident_id: incident.id,
            event_type: "created",
            summary: "İmzalı webhook üzerinden oluşturuldu ve triage kuyruğuna alındı.",
            actor_kind: "system",
          }),
        ]);
        return json({ status: "accepted", incidentId: incident.id, reference }, 202);
      },
    },
  },
});

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function constantTimeEqual(left: string, right: string) {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
