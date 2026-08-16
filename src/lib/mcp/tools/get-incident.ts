import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "get_incident",
  title: "Get incident detail",
  description:
    "Fetch one incident with its AI root-cause hypotheses and recommended actions, by incident id or reference (e.g. INC-1042).",
  inputSchema: {
    incident: z.string().trim().min(1).describe("Incident UUID or human reference code."),
  },
  outputSchema: {
    incident: z.record(z.string(), z.unknown()),
    hypotheses: z.array(z.record(z.string(), z.unknown())),
    recommended_actions: z.array(z.record(z.string(), z.unknown())),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ incident }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incident);
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq(isUuid ? "id" : "reference", incident)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `Incident not found: ${incident}` }], isError: true };

    const [{ data: hypotheses }, { data: actions }] = await Promise.all([
      supabase
        .from("root_cause_hypotheses")
        .select("*")
        .eq("incident_id", data.id)
        .order("confidence", { ascending: false }),
      supabase.from("recommended_actions").select("*").eq("incident_id", data.id),
    ]);

    const payload = { incident: data, hypotheses: hypotheses ?? [], recommended_actions: actions ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
