import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FlaskConical, ShieldAlert, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { useMembership, useSession } from "@/lib/session";
import { EVAL_CASES, runDeterministicEval } from "@/lib/eval-cases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/ai-kalitesi")({
  head: () => ({ meta: [{ title: "AI Kalitesi — ResolveIQ" }] }),
  component: AiQuality,
});

function AiQuality() {
  const { session } = useSession();
  const { data: membership } = useMembership(session?.user.id);
  const org = membership?.organizationId;
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const evaluation = runDeterministicEval();

  const { data } = useQuery({
    queryKey: ["ai-quality", org],
    enabled: Boolean(org),
    queryFn: async () => {
      const [runs, triage, retrievals] = await Promise.all([
        supabase
          .from("ai_runs")
          .select("mode, status, latency_ms, created_at")
          .eq("organization_id", org!),
        supabase
          .from("ai_triage_results")
          .select("evidence_confidence, decision")
          .eq("organization_id", org!),
        supabase
          .from("retrieval_runs")
          .select("result_count, top_score, strategy")
          .eq("organization_id", org!),
      ]);
      return {
        runs: runs.data ?? [],
        triage: triage.data ?? [],
        retrievals: retrievals.data ?? [],
      };
    },
  });

  const runs = data?.runs ?? [];
  const degraded = runs.filter((run) => run.status !== "succeeded").length;
  const averageConfidence = data?.triage.length
    ? data.triage.reduce((total, item) => total + item.evidence_confidence, 0) / data.triage.length
    : 0;
  const p95Latency =
    [...runs].map((run) => run.latency_ms ?? 0).sort((a, b) => a - b)[
      Math.max(0, Math.ceil(runs.length * 0.95) - 1)
    ] ?? 0;

  async function persistEvaluation() {
    if (!org || !session) return;
    const passed = evaluation.results.filter(
      (result) => result.categoryPass && result.severityPass,
    ).length;
    await supabase.from("evaluation_runs").insert({
      organization_id: org,
      suite_version: "golden-tr-v1",
      total_cases: evaluation.results.length,
      passed_cases: passed,
      category_accuracy: evaluation.categoryAccuracy,
      severity_accuracy: evaluation.severityAccuracy,
      no_answer_accuracy: evaluation.noAnswerAccuracy,
      mode: "deterministic",
      created_by: session.user.id,
    });
    setLastRunAt(new Date());
  }

  return (
    <>
      <PageHeader
        title="AI Kalitesi ve değerlendirme merkezi"
        description="Kanıt kalitesi, güvenli reddetme, gecikme ve deterministik regresyon seti."
        action={
          <Button onClick={() => void persistEvaluation()}>
            <FlaskConical className="mr-1.5 h-4 w-4" aria-hidden /> 25 vakayı çalıştır
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Kategori doğruluğu"
          value={`%${Math.round(evaluation.categoryAccuracy * 100)}`}
        />
        <Metric
          label="Severity doğruluğu"
          value={`%${Math.round(evaluation.severityAccuracy * 100)}`}
        />
        <Metric label="Ortalama kanıt güveni" value={`%${Math.round(averageConfidence * 100)}`} />
        <Metric label="p95 AI gecikmesi" value={`${p95Latency} ms`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Altın veri seti · {EVAL_CASES.length} vaka</CardTitle>
            <CardDescription>
              Kural tabanlı fallback, canlı modelden bağımsız olarak her sürümde aynı sonucu üretir.
              Son çalıştırma:{" "}
              {lastRunAt ? lastRunAt.toLocaleString("tr-TR") : "henüz çalıştırılmadı"}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-auto">
            {evaluation.results.map((result) => {
              const passed = result.categoryPass && result.severityPass;
              return (
                <div
                  key={result.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  {passed ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-label="Geçti"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                      aria-label="Kaldı"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {result.id} · {result.input}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Çıktı: {result.category} / {result.severity} · Beklenen:{" "}
                      {result.expectedCategory} / {result.expectedSeverity}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Güvenlik kapıları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <QualityRow label="Tenant ön filtresi" value="Etkin" />
              <QualityRow label="Kanıt eşiği" value="%65" />
              <QualityRow label="Deprecated dışlama" value="Etkin" />
              <QualityRow label="Zod çıktı şeması" value="Etkin" />
              <QualityRow label="İnsan onayı" value="Zorunlu" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Canlı çalışma sağlığı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QualityRow label="Toplam çalışma" value={String(runs.length)} />
              <QualityRow label="Güvenli moda düşen" value={String(degraded)} />
              <Progress
                value={runs.length ? ((runs.length - degraded) / runs.length) * 100 : 100}
              />
              <p className="flex gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                Model hatasında olay akışı durmaz; deterministik fallback ve düşük güven etiketi
                kullanılır.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
