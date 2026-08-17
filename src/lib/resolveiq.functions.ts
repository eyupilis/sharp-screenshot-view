import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runTriagePipeline } from "./triage.server";

export const runTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        // Demo/seed kayitlari RFC dis versiyon bitlerine sahip olabilir; bicim kontrolu yeterli.
        incidentId: z
          .string()
          .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
        failureMode: z.enum(["none", "timeout", "rate_limit"]).default("none"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return runTriagePipeline(context.supabase, context.userId, data.incidentId, data.failureMode);
  });
