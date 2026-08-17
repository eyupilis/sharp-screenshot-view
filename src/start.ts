import { createStart } from "@tanstack/react-start";

// TanStack Start installs its default CSRF request middleware when no custom
// request middleware overrides it. Individual server functions attach their
// authenticated Supabase client with requireSupabaseAuth.
export const startInstance = createStart(() => ({}));
