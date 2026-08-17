import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// TanStack Start installs its default CSRF request middleware when no custom
// request middleware overrides it. `attachSupabaseAuth` attaches the browser
// session bearer token so serverFns using requireSupabaseAuth are authorized.
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
