import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { AiNotice, ConfidenceBar, SeverityBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/design-system")({ component: DesignSystem });

function DesignSystem() {
  return (
    <>
      <PageHeader
        title="ResolveIQ tasarım sistemi"
        description="Gizli kalite rotası · erişilebilir bileşen ve durum örnekleri."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Severity ve durum</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <SeverityBadge severity="P1" />
            <SeverityBadge severity="P2" />
            <SeverityBadge severity="P3" />
            <SeverityBadge severity="P4" />
            <StatusBadge status="new" />
            <StatusBadge status="investigating" />
            <StatusBadge status="resolved" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI güveni ve bildirim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AiNotice mode="live" />
            <ConfidenceBar value={0.92} />
            <ConfidenceBar value={0.72} />
            <ConfidenceBar value={0.42} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eylemler</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Birincil</Button>
            <Button variant="outline">İkincil</Button>
            <Button variant="destructive">Riskli</Button>
            <Button disabled>Devre dışı</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Renk tokenları</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-xs">
            <Swatch name="Brand" className="bg-brand" />
            <Swatch name="Success" className="bg-success" />
            <Swatch name="Warning" className="bg-warning" />
            <Swatch name="Info" className="bg-info" />
            <Swatch name="Surface" className="bg-surface-strong" />
            <Swatch name="Primary" className="bg-primary" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div>
      <div className={`h-12 rounded-md border border-border ${className}`} />
      <p className="mt-1 text-muted-foreground">{name}</p>
    </div>
  );
}
