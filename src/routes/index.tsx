import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Gauge,
  Lock,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/gtech-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResolveIQ — Finansal Incident Zekâsı" },
      {
        name: "description",
        content:
          "ResolveIQ, finansal sistem arızalarını kanıta dayalı AI triage, kök neden hipotezleri ve kurumsal bilgi hafızasıyla yönetir.",
      },
      { property: "og:title", content: "ResolveIQ — Finansal Incident Zekâsı" },
      {
        property: "og:description",
        content: "Kanıta dayalı AI triage, kök neden analizi ve kurumsal bilgi hafızası.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "Kanıtlı AI triage",
    text: "Kategori, severity önerisi ve eksik bilgi listesi — her satır kaynak gösterir, düşük kanıtta model susar.",
  },
  {
    icon: BookOpen,
    title: "Kurumsal hafıza",
    text: "Çözülen her incident, küratör incelemesinden geçtikten sonra yeniden kullanılabilir runbook'a dönüşür.",
  },
  {
    icon: Lock,
    title: "Tenant izolasyonu",
    text: "Veriler kurum bazında ayrışır; retrieval önce tenant filtresinden geçer, sonra sıralanır.",
  },
  {
    icon: Workflow,
    title: "İnsan kararı esas",
    text: "AI yalnızca öneri üretir. Statü, severity ve aksiyon değişimini her zaman bir insan onaylar.",
  },
  {
    icon: Gauge,
    title: "Ölçülebilir kalite",
    text: "Değerlendirme senaryolarıyla kategori, severity ve no-answer doğruluğu sürekli izlenir.",
  },
  {
    icon: Activity,
    title: "Tam denetim izi",
    text: "Her AI çalıştırması ve her insan kararı zaman damgalı audit kaydına yazılır.",
  },
] as const;

const METRICS = [
  { value: "P1→P4", label: "Severity yönetimi" },
  { value: "%65", label: "Kanıt eşiği altında no-answer" },
  { value: "12+", label: "Doğrulanmış bilgi kaydı" },
  { value: "100%", label: "Kararlarda denetim izi" },
] as const;

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  // Preserve a same-origin relative return path (used by the OAuth consent flow).
  function nextPath(): string | null {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("next");
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
    return raw;
  }

  function afterAuth() {
    const next = nextPath();
    if (next) window.location.href = next;
    else navigate({ to: "/komuta" });
  }

  useEffect(() => {
    if (!loading && session) afterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else afterAuth();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${nextPath() ?? "/komuta"}`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Hesap oluşturuldu. Giriş yapabilirsiniz.");
  }

  async function google() {
    const next = nextPath();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: next ? `${window.location.origin}${next}` : window.location.origin,
    });
    if (result.error) {
      toast.error("Google ile giriş başarısız oldu.");
      return;
    }
    if (result.redirected) return;
    afterAuth();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="aurora" aria-hidden />
      <div
        className="brand-orb pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 opacity-40"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] grid-field" aria-hidden />

      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="GTech" className="h-9 w-auto" />
          <span className="hidden h-7 w-px bg-border sm:block" aria-hidden />
          <div className="hidden leading-tight sm:block">
            <p className="font-display text-[15px] font-semibold tracking-tight">ResolveIQ</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Incident Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button size="sm" variant="outline" asChild>
            <a href="#giris">Giriş yap</a>
          </Button>
        </div>
      </header>


      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <section className="grid items-start gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-foreground">
              <span className="pulse-dot" aria-hidden /> GTech Academy Concept Project
            </span>

            <h1 className="mt-7 font-display text-[2.65rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Finansal arızaları
              <br />
              <span className="text-gradient-brand">kanıta dayalı zekâyla</span>
              <br />
              yönetin.
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              ResolveIQ; kart, ödeme, mutabakat ve çekirdek bankacılık sistemlerinde yaşanan
              incident'ları sınıflandırır, kök neden hipotezleri üretir ve her öneriyi kurum içi
              doğrulanmış bilgi kayıtlarına dayandırır. Kararı her zaman insan verir.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <a href="#giris">
                  Çalışma alanına gir <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#yetenekler">Yetenekleri incele</a>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.label} className="bg-surface px-4 py-4">
                  <dt className="font-display text-xl font-semibold text-foreground">{m.value}</dt>
                  <dd className="mt-1 text-[11px] leading-snug text-muted-foreground">{m.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div id="giris" className="rise panel panel-glow p-6 sm:p-7 lg:sticky lg:top-10">
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold">Çalışma alanına giriş</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Demo tenant: <span className="font-mono text-brand-foreground">Demo Bank</span>
              </p>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="mb-5 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Giriş</TabsTrigger>
                <TabsTrigger value="signup">Kayıt</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form className="space-y-4" onSubmit={signIn}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="ad.soyad@demobank.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Parola</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={busy}>
                    Giriş yap
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={signUp}>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Ad soyad</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">E-posta</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password2">Parola</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={busy}>
                    Hesap oluştur
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> veya
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" size="lg" className="w-full" onClick={google}>
              Google ile devam et
            </Button>

            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              Educational prototype — not an official GTech product. Tüm veriler kurgusaldır.
            </p>
          </div>
        </section>

        <section id="yetenekler" className="pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-foreground">
                Platform yetenekleri
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Operasyon ekibinin komuta masası
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Tespitten kapanışa kadar tek akış: triage, kök neden, aksiyon onayı, postmortem ve
              bilgi kaydı — hepsi denetlenebilir.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="panel group p-5 transition-colors hover:border-brand/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand/25 bg-brand-soft/40 text-brand transition-colors group-hover:bg-brand-soft/70">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="panel relative overflow-hidden p-8 text-center sm:p-12">
            <div className="aurora opacity-70" aria-hidden />
            <div className="relative">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                Incident zekâsını demo tenant üzerinde deneyin
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Gerçekçi kurgusal veri seti, 15 incident, doğrulanmış runbook'lar ve tam denetim izi
                hazır durumda.
              </p>
              <Button size="lg" className="mt-6" asChild>
                <a href="#giris">
                  Hemen başla <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground lg:px-8">
          <p>ResolveIQ · GTech Academy Concept Project</p>
          <img src={logo.url} alt="GTech" className="h-7 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  );
}
