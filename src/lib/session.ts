import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SessionState = {
  session: Session | null;
  loading: boolean;
};

const initialSessionState: SessionState = { session: null, loading: true };
let sessionState = initialSessionState;
let sessionStoreStarted = false;
const sessionListeners = new Set<() => void>();

function publishSession(next: SessionState) {
  sessionState = next;
  sessionListeners.forEach((listener) => listener());
}

function startSessionStore() {
  if (sessionStoreStarted || typeof window === "undefined") return;
  sessionStoreStarted = true;

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    publishSession({ session: nextSession, loading: false });
  });

  void supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        publishSession({ session: null, loading: false });
        return;
      }
      publishSession({ session: data.session, loading: false });
    })
    .catch(() => publishSession({ session: null, loading: false }));

  window.addEventListener(
    "pagehide",
    () => {
      authListener.subscription.unsubscribe();
    },
    { once: true },
  );
}

function subscribeToSession(listener: () => void) {
  sessionListeners.add(listener);
  startSessionStore();
  return () => sessionListeners.delete(listener);
}

function getSessionSnapshot() {
  return sessionState;
}

function getServerSessionSnapshot() {
  return initialSessionState;
}

export function useSession() {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
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
      if (!userId) return null;
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", userId);
      if (error) throw error;
      if (!data?.length) return null;
      const first = data[0];
      if (!first) return null;
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
