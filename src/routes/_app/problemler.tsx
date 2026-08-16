import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/problemler")({
  head: () => ({
    meta: [
      { title: "Tekrarlayan Desenler — ResolveIQ" },
      { name: "description", content: "Birden çok incident'ta tekrar eden kök neden desenleri ve kalıcı çözüm adayları." },
      { property: "og:title", content: "Tekrarlayan Desenler — ResolveIQ" },
      { property: "og:description", content: "Tekrar eden kök neden desenleri ve kalıcı çözüm adayları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Problems,
});

function Problems() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;

  const { data: problems } = useQuery({
    queryKey: ["problems", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("*")
        .eq("organization_id", org!)
        .order("occurrence_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Tekrarlayan desenler"
        description="Aynı kök nedene işaret eden olay kümeleri. Kalıcı çözüm için problem yönetimine girdi sağlar."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {(problems ?? []).map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>{p.title}</span>
                <span className="rounded border border-brand/30 bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-foreground">
                  {p.occurrence_count} tekrar
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.pattern_summary}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Durum: {p.status}</p>
            </CardContent>
          </Card>
        ))}
        {(problems ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz tekrarlayan desen tespit edilmedi.</p>
        )}
      </div>
    </>
  );
}
