import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, BookOpen, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/komuta" });
  }, [loading, session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/komuta" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/komuta`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Hesap oluşturuldu. Giriş yapabilirsiniz.");
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google ile giriş başarısız oldu.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/komuta" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" aria-hidden />
          <span className="font-semibold">ResolveIQ</span>
        </div>
        <img src={logo.url} alt="GTech" className="h-7 w-auto" />
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-foreground">
            GTech Academy Concept Project
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">
            Finansal arızaları kanıta dayalı zekâyla yönetin
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            ResolveIQ; kart, ödeme, mutabakat ve çekirdek bankacılık sistemlerinde yaşanan
            incident'ları sınıflandırır, kök neden hipotezleri üretir ve her öneriyi kurum
            içi doğrulanmış bilgi kayıtlarına dayandırır. Kararı her zaman insan verir.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              {
                icon: Sparkles,
                title: "Kanıtlı AI triage",
                text: "Kategori, severity önerisi ve eksik bilgi listesi — her biri kaynak gösterir.",
              },
              {
                icon: BookOpen,
                title: "Kurumsal hafıza",
                text: "Çözülen her incident, incelemeden geçtikten sonra yeniden kullanılabilir bilgiye dönüşür.",
              },
              {
                icon: Lock,
                title: "Tenant izolasyonu ve denetim izi",
                text: "Veriler kurum bazında ayrışır; her AI çalıştırması ve insan kararı loglanır.",
              },
            ].map((f) => (
              <li key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted-foreground">
            Educational prototype — not an official GTech product. Tüm veriler kurgusaldır.
          </p>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Çalışma alanına giriş</CardTitle>
            <CardDescription>Demo tenant: Demo Bank</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Giriş</TabsTrigger>
                <TabsTrigger value="signup">Kayıt</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form className="space-y-3" onSubmit={signIn}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-posta</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
                  <Button type="submit" className="w-full" disabled={busy}>
                    Giriş yap
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form className="space-y-3" onSubmit={signUp}>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Ad soyad</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">E-posta</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
                  <Button type="submit" className="w-full" disabled={busy}>
                    Hesap oluştur
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> veya <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Google ile devam et
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
