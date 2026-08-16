import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "search_knowledge",
  title: "Search knowledge base",
  description:
    "Search the tenant's incident knowledge articles by keyword across title, summary and body.",
  inputSchema: {
    query: z.string().trim().min(2).describe("Keyword or phrase to search for."),
    limit: z.number().int().min(1).max(25).default(10).describe("Maximum number of articles."),
  },
  outputSchema: { articles: z.array(z.record(z.string(), z.unknown())) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const escaped = query.replace(/[%,()]/g, " ");
    const { data, error } = await supabase
      .from("knowledge_articles")
      .select(
        "id, title, summary, status, verified, freshness, tags, financial_domain, incident_type, reuse_count, updated_at",
      )
      .or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%,body.ilike.%${escaped}%`)
      .order("reuse_count", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
