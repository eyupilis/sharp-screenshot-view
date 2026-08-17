import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMembership } from "@/lib/session";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEVERITY_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_app/olaylar/yeni")({
  head: () => ({
    meta: [
      { title: "Yeni Incident — ResolveIQ" },
      {
        name: "description",
        content:
          "Finansal sistemlerde tespit edilen yeni bir olayı yapılandırılmış biçimde bildirin.",
      },
      { property: "og:title", content: "Yeni Incident — ResolveIQ" },
      {
        property: "og:description",
        content: "Yeni bir finansal olayı yapılandırılmış biçimde bildirin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewIncident,
});

function NewIncident() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemId, setSystemId] = useState<string>("");
  const [environment, setEnvironment] = useState("production");
  const [severity, setSeverity] = useState<string>("P3");
  const [busy, setBusy] = useState(false);

  const { data: systems } = useQuery({
    queryKey: ["systems", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_systems")
        .select("id, name, code, domain")
        .eq("organization_id", org!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !session) return;
    setBusy(true);
    const reference = `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        organization_id: org,
        reference,
        title,
        description,
        system_id: systemId || null,
        environment,
        reported_severity: severity as "P1" | "P2" | "P3" | "P4",
        status: "triage_pending",
        created_by: session.user.id,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Kayıt oluşturulamadı");
      return;
    }
    await supabase.from("incident_events").insert({
      organization_id: org,
      incident_id: data.id,
      event_type: "created",
      summary: "Incident bildirildi ve triage kuyruğuna alındı.",
      actor_kind: "human",
      actor_id: session.user.id,
    });
    toast.success(`${reference} oluşturuldu`);
    navigate({ to: "/olaylar/$id", params: { id: data.id } });
  }

  return (
    <>
      <PageHeader
        title="Yeni incident bildir"
        description="Yapılandırılmış giriş, AI triage'ın kanıt kalitesini doğrudan etkiler."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Olay detayları</CardTitle>
          <CardDescription>
            Belirtiler, etki alanı ve gözlemlenen hata mesajlarını olabildiğince somut yazın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="title">Başlık</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="POS işlemlerinde zaman aşımı artışı"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Açıklama</Label>
              <Textarea
                id="desc"
                required
                rows={7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ne zaman başladı, hangi işlemler etkilendi, hata kodları, son değişiklikler…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Sistem</Label>
                <Select value={systemId} onValueChange={setSystemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(systems ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ortam</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bildirilen severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Nihai severity AI önerisi sonrası Incident Manager onayıyla belirlenir.
            </p>
            <Button type="submit" disabled={busy}>
              Kaydet ve triage'a gönder
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
