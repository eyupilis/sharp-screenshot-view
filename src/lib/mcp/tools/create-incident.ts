import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "create_incident",
  title: "Report incident",
  description: "Create a new incident record in the signed-in user's tenant.",
  inputSchema: {
    title: z.string().trim().min(3).describe("Short incident title."),
    description: z.string().trim().min(10).describe("What is happening, impact and symptoms."),
    environment: z.enum(["prod", "staging", "test"]).default("prod").describe("Affected environment."),
    reported_severity: z
      .enum(["P1", "P2", "P3", "P4"])
      .optional()
      .describe("Severity reported by the human."),
    category: z.string().trim().optional().describe("Optional category, e.g. payment, card, core-banking."),
  },
  outputSchema: { incident: z.record(z.string(), z.unknown()) },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, environment, reported_severity, category }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId!)
      .limit(1)
      .maybeSingle();
    if (membershipError) throw new ToolError(membershipError.message);
    if (!membership) throw new ToolError("No tenant membership found for this user.");

    const reference = `INC-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        organization_id: membership.organization_id,
        reference,
        title,
        description,
        environment: environment ?? "prod",
        reported_severity: reported_severity ?? null,
        category: category ?? null,
        created_by: userId,
        detected_at: new Date().toISOString(),
      })
      .select("id, reference, title, status, environment, reported_severity")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { incident: data },
    };
  },
});
