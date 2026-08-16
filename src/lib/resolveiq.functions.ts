import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runTriagePipeline } from "./triage.server";

export const runTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ incidentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    return runTriagePipeline(context.supabase, context.userId, data.incidentId);
  });
