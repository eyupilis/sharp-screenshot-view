# ResolveIQ

ResolveIQ, finansal sistem incident'larını tenant kapsamlı kanıtlarla triage eden; insan onayıyla kök neden, aksiyon, postmortem ve kurumsal bilgi akışını yöneten eğitim amaçlı bir uygulamadır.

> **GTech Academy Concept Project** — Educational prototype; not an official GTech product.

## Öne çıkan akışlar

- Supabase Auth, çok kiracılı RLS ve altı rol
- Incident durum makinesi, severity kararı ve değiştirilemez olay/audit izi
- Tenant ön filtreli TF-IDF retrieval, doğrulanmış paylaşılan bilgi ve numaralı kanıtlar
- Lovable AI Gateway + 15 saniye timeout + deterministik fallback
- `%65` kanıt eşiği; eşik altında güvenli reddetme ve aksiyon üretmeme
- Zod ile yapılandırılmış AI çıktısı; deprecated/stale bilginin aksiyondan dışlanması
- İnsan onaylı hipotez/aksiyon, uygulama sonucu, postmortem ve curator incelemesi
- Belge alım hattı, redaksiyon, tazelik/knowledge-debt görünümü
- 25 vakalık AI değerlendirme merkezi ve hata enjeksiyonu
- İmzalı, idempotent incident webhook'u ve MCP araçları

## Teknoloji

TanStack Start, React 19, TypeScript strict, Vite 8, Tailwind CSS, shadcn/Radix, Supabase/Postgres/RLS, Lovable AI Gateway, Zod ve Vitest.

## Başlangıç

```bash
npm install
cp .env.example .env
npm run dev
```

Gerekli değişken adları `.env.example` dosyasındadır. Gizli değerleri repoya eklemeyin.

```bash
npm run verify       # format, lint, type, coverage, secrets, build, HTTP smoke
npm run test:eval    # 25 vakalık altın veri seti
npm run test:a11y    # erişilebilirlik regresyonu
npm run test:security
```

## Demo veri seti

Demo Bank tenant'ında 15 incident, 12 bilgi kaydı, 5'ten fazla runbook, 4 postmortem, 4 tekrarlayan problem kümesi, 10 aksiyon sonucu ve 25 değerlendirme vakası bulunur. İkinci tenant, RLS izolasyon testleri içindir.

Önerilen mutlu yol: `INC-2180` FAST `TXN_TIMEOUT_504` → DB havuzu kanıtı → insan onayı → sonuç → postmortem → bilgi incelemesi. Hata yolu için incident ekranındaki AI dayanıklılık modunu `Zaman aşımı` veya `429` seçin.

## Rotalar

`/komuta`, `/triage`, `/olaylar`, `/bilgi`, `/ai-kalitesi`, `/problemler`, `/analitik`, `/yonetim`, `/yardim`; kalite rotası `/design-system`.

## Lovable senkronu

Proje [Lovable editor](https://lovable.dev/projects/18ce11f1-d5fa-42a1-b530-9b35ed7ab675) ile bağlıdır. `main` dalına gönderilen çalışan commit'ler editöre senkron olur. Yayımlanmış geçmişi force-push/rebase ile yeniden yazmayın.

## Dokümantasyon

- [Mimari](ARCHITECTURE.md)
- [Güvenlik](SECURITY.md)
- [Test stratejisi](TESTING.md)
- [Teknik kararlar](TECH_DECISIONS.md)
- [AI/RAG proje profili](docs/ai-chatbot/PROJECT_PROFILE.md)
- [OpenAPI sözleşmesi](docs/api/openapi.yaml)

## Sınır

AI önerileri operasyonel karar değildir. ResolveIQ hiçbir üretim aksiyonunu otonom uygulamaz; severity, hipotez, aksiyon, postmortem ve bilgi paylaşımı için açık insan kararı gerekir.
