import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, CircleHelp, PlayCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/yardim")({
  head: () => ({ meta: [{ title: "Yardım — ResolveIQ" }] }),
  component: Help,
});

function Help() {
  return (
    <>
      <PageHeader
        title="Yardım ve demo rehberi"
        description="ResolveIQ akışını güvenli biçimde göstermek için kısa yollar."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <HelpCard
          icon={PlayCircle}
          title="5 dakikalık mutlu yol"
          description="Incident → kanıt → onay → sonuç → postmortem → bilgi"
        >
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Triage kuyruğundan timeout olayını açın.</li>
            <li>AI triage çalıştırın ve numaralı kanıtları gösterin.</li>
            <li>Severity, hipotez ve aksiyonu insan olarak onaylayın.</li>
            <li>Aksiyon sonucunu başarılı kaydedin.</li>
            <li>Postmortem yayımlayıp bilgi incelemesine gönderin.</li>
          </ol>
          <Button asChild className="mt-4">
            <Link to="/triage">Triage kuyruğunu aç</Link>
          </Button>
        </HelpCard>
        <HelpCard
          icon={ShieldCheck}
          title="Hata yolu"
          description="Model kesilse de kontrollü devam"
        >
          <p className="text-sm text-muted-foreground">
            Incident ekranında AI dayanıklılık demosunu “Zaman aşımı” veya “429” olarak seçin.
            Sistem güvenli fallback’e geçer; kanıt %65 altındaysa aksiyon üretmez.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/olaylar">Incident seç</Link>
          </Button>
        </HelpCard>
        <HelpCard
          icon={BookOpenCheck}
          title="Bilgi yönetişimi"
          description="Tazelik, redaksiyon ve curator kapısı"
        >
          <p className="text-sm text-muted-foreground">
            Stale ve needs-review kayıtları Bilgi Merkezi’nde görünür. Deprecated kayıtlar
            retrieval’dan tamamen çıkarılır; yeni postmortem kayıtları doğrulanmadan kanıt olmaz.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/bilgi">Bilgi Merkezi’ni aç</Link>
          </Button>
        </HelpCard>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
        ResolveIQ, GTech Academy eğitim kapsamında hazırlanmış bir konsept projedir; resmi GTech
        ürünü değildir.
      </div>
    </>
  );
}

function HelpCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof PlayCircle;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-brand" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
