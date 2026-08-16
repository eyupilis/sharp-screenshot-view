import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export type Membership = {
  organizationId: string;
  organizationName: string;
  roles: string[];
};

export function useMembership(userId?: string) {
  return useQuery({
    queryKey: ["membership", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Membership | null> => {
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", userId!);
      if (error) throw error;
      if (!data?.length) return null;
      const first = data[0]!;
      return {
        organizationId: first.organization_id,
        organizationName: (first.organizations as unknown as { name: string })?.name ?? "Tenant",
        roles: data.map((row) => row.role),
      };
    },
  });
}

export const ROLE_LABELS: Record<string, string> = {
  reporter: "Reporter",
  responder: "Incident Responder",
  manager: "Incident Manager",
  curator: "Knowledge Curator",
  tenant_admin: "Tenant Admin",
  platform_admin: "Platform Admin",
};
