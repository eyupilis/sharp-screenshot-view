import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listIncidents from "./tools/list-incidents";
import getIncident from "./tools/get-incident";
import searchKnowledge from "./tools/search-knowledge";
import createIncident from "./tools/create-incident";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pixel-perfect-clone",
  title: "Pixel Perfect Clone",
  version: "0.1.0",
  instructions:
    "ResolveIQ incident intelligence tools. Use `list_incidents` and `get_incident` to inspect incidents and their AI root-cause hypotheses, `search_knowledge` to find past resolutions in the knowledge base, and `create_incident` to report a new incident. All data is scoped to the signed-in user's tenant.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listIncidents, getIncident, searchKnowledge, createIncident],
});
