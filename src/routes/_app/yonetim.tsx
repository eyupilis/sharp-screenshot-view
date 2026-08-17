import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, KeyRound, ServerCog, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { useMembership, useSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/yonetim")({
  head: () => ({ meta: [{ title: "Yönetim — ResolveIQ" }] }),
  component: Administration,
});

function Administration() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;
  const { data } = useQuery({
    queryKey: ["administration", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const [members, systems, articles, audits] = await Promise.all([
        supabase
          .from("organization_memberships")
          .select("id, role, user_id")
          .eq("organization_id", org!),
        supabase.from("financial_systems").select("id").eq("organization_id", org!),
        supabase.from("knowledge_articles").select("id, freshness").eq("organization_id", org!),
        supabase.from("audit_logs").select("id").eq("organization_id", org!),
      ]);
      return {
        members: members.data ?? [],
        systems: systems.data ?? [],
        articles: articles.data ?? [],
        audits: audits.data ?? [],
      };
    },
  });
  const stale = data?.articles.filter((article) => article.freshness !== "valid").length ?? 0;

  return (
    <>
      <PageHeader
        title="Tenant yönetimi"
        description="Roller, veri sınırları, entegrasyon sözleşmeleri ve sistem sağlığı."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard
          icon={ShieldCheck}
          title="Kimlik ve yetki"
          description="Supabase Auth + tenant kapsamlı RLS"
        >
          <Row label="Üyelik kaydı" value={String(data?.members.length ?? 0)} />
          <Row label="Etkin roller" value={membership?.roles.join(", ") || "—"} />
          <Row label="Tenant izolasyonu" value="RLS ile zorunlu" />
        </AdminCard>
        <AdminCard
          icon={Database}
          title="Veri ve bilgi sağlığı"
          description="Tenant veri seti ve bilgi borcu"
        >
          <Row label="Finansal sistem" value={String(data?.systems.length ?? 0)} />
          <Row label="Bilgi kaydı" value={String(data?.articles.length ?? 0)} />
          <Row label="İnceleme bekleyen" value={String(stale)} />
        </AdminCard>
        <AdminCard
          icon={ServerCog}
          title="AI çalışma politikası"
          description="Güvenli ve geri alınabilir çalışma"
        >
          <Row label="Canlı model" value="Lovable AI Gateway" />
          <Row label="Fallback" value="Deterministik TF-IDF + kurallar" />
          <Row label="Zaman aşımı" value="15 saniye" />
        </AdminCard>
        <AdminCard
          icon={KeyRound}
          title="Entegrasyon ve denetim"
          description="MCP, webhook ve değiştirilemez olay izi"
        >
          <Row label="MCP araçları" value="list / get / create / search" />
          <Row label="Webhook" value="OpenAPI 3.1 sözleşmesi" />
          <Row label="Denetim kaydı" value={String(data?.audits.length ?? 0)} />
        </AdminCard>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Demo hata modu incident çalışma alanından yalnızca mevcut tarayıcı oturumu için seçilir. Bu
        kontrol üretim ayarını değiştirmez.
      </p>
    </>
  );
}

function AdminCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-brand" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
