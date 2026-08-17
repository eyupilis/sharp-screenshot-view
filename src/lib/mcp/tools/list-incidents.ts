import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "list_incidents",
  title: "List incidents",
  description:
    "List incidents in the signed-in user's tenant, newest first. Optionally filter by status or severity.",
  inputSchema: {
    status: z
      .enum([
        "new",
        "triage_pending",
        "triaged",
        "investigating",
        "mitigated",
        "resolved",
        "knowledge_review",
        "closed",
        "reopened",
      ])
      .optional()
      .describe("Filter by incident status."),
    severity: z.enum(["P1", "P2", "P3", "P4"]).optional().describe("Filter by approved severity."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of incidents."),
  },
  outputSchema: { incidents: z.array(z.record(z.string(), z.unknown())) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, severity, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("incidents")
      .select(
        "id, reference, title, status, environment, category, approved_severity, reported_severity, ai_suggested_severity, detected_at, resolved_at",
      )
      .order("detected_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (severity) query = query.eq("approved_severity", severity);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { incidents: data ?? [] },
    };
  },
});
