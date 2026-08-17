-- ResolveIQ completion pack: richer demo corpus, evaluation, ingestion and webhook audit.
-- Idempotent data inserts use fixed UUIDs/keys so demo resets remain reproducible.

CREATE TABLE IF NOT EXISTS public.evaluation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_key text NOT NULL,
  input_text text NOT NULL,
  expected_category text NOT NULL,
  expected_severity public.severity_level NOT NULL,
  evidence_required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, case_key)
);

DROP POLICY IF EXISTS profiles_self ON public.profiles;
CREATE POLICY profiles_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_incident_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'resolved' AND length(trim(COALESCE(NEW.resolution_summary, ''))) < 10 THEN
    RAISE EXCEPTION 'resolution_summary is required before resolving an incident';
  END IF;
  IF NOT (
    (OLD.status = 'new' AND NEW.status = 'triage_pending') OR
    (OLD.status = 'triage_pending' AND NEW.status IN ('triaged','investigating')) OR
    (OLD.status = 'triaged' AND NEW.status = 'investigating') OR
    (OLD.status = 'investigating' AND NEW.status IN ('mitigated','resolved')) OR
    (OLD.status = 'mitigated' AND NEW.status = 'resolved') OR
    (OLD.status = 'resolved' AND NEW.status IN ('knowledge_review','closed')) OR
    (OLD.status = 'knowledge_review' AND NEW.status = 'closed') OR
    (OLD.status = 'closed' AND NEW.status = 'reopened') OR
    (OLD.status = 'reopened' AND NEW.status = 'investigating')
  ) THEN
    RAISE EXCEPTION 'invalid incident status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_incident_status_transition() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS incidents_status_guard ON public.incidents;
CREATE TRIGGER incidents_status_guard BEFORE UPDATE OF status ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.enforce_incident_status_transition();

CREATE TABLE IF NOT EXISTS public.evaluation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  suite_version text NOT NULL,
  total_cases integer NOT NULL,
  passed_cases integer NOT NULL,
  category_accuracy numeric NOT NULL,
  severity_accuracy numeric NOT NULL,
  no_answer_accuracy numeric NOT NULL,
  mode text NOT NULL DEFAULT 'deterministic',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  sha256 text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','scanning','chunking','review','completed','rejected')),
  redaction_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  idempotency_key text NOT NULL,
  event_type text NOT NULL,
  payload_digest text NOT NULL,
  status text NOT NULL DEFAULT 'accepted',
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, source, idempotency_key)
);

GRANT SELECT ON public.evaluation_cases TO authenticated;
GRANT SELECT, INSERT ON public.evaluation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ingestion_jobs TO authenticated;
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.evaluation_cases, public.evaluation_runs, public.ingestion_jobs, public.webhook_events TO service_role;

ALTER TABLE public.evaluation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY evaluation_cases_select ON public.evaluation_cases FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY evaluation_runs_select ON public.evaluation_runs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY evaluation_runs_insert ON public.evaluation_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY ingestion_jobs_select ON public.ingestion_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY ingestion_jobs_insert ON public.ingestion_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY ingestion_jobs_update ON public.ingestion_jobs FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'tenant_admin'))
  WITH CHECK (public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'tenant_admin'));
CREATE POLICY webhook_events_select ON public.webhook_events FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id,'tenant_admin') OR public.has_org_role(organization_id,'manager'));

-- Shared chunks are visible only when their parent article completed redaction and approval.
DROP POLICY IF EXISTS kc_select ON public.knowledge_chunks;
CREATE POLICY kc_select ON public.knowledge_chunks FOR SELECT TO authenticated
  USING (
    public.is_org_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.knowledge_articles article
      WHERE article.id = knowledge_chunks.article_id
        AND article.visibility = 'shared'
        AND article.status = 'approved_shared'
        AND article.redaction_status IN ('completed','not_required')
    )
  );

-- Nine additional Demo Bank incidents: 15 tenant-local incidents in total.
INSERT INTO public.incidents
  (id, organization_id, reference, title, description, status, reported_severity, approved_severity, category, system_id, environment, detected_at, acknowledged_at, resolved_at, resolution_summary, knowledge_promoted, created_at)
VALUES
  ('b1000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','INC-2180','FAST transferlerinde TXN_TIMEOUT_504 artışı','Yeni sürümden sonra FAST transfer çağrılarında TXN_TIMEOUT_504 oranı %9 oldu. DB bağlantı havuzu doygunluğu gözlendi.','triage_pending','P1',NULL,NULL,'a1000000-0000-0000-0000-000000000003','prod',now()-interval '35 minutes',NULL,NULL,NULL,false,now()-interval '35 minutes'),
  ('b1000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','INC-2160','Kart provizyon yanıtlarında gecikme','p95 yanıt süresi 1600 ms seviyesine çıktı; müşteri etkisi sınırlı.','resolved','P2','P2','performance','a1000000-0000-0000-0000-000000000001','prod',now()-interval '7 days',now()-interval '7 days'+interval '8 minutes',now()-interval '7 days'+interval '70 minutes','Idle bağlantılar temizlendi ve havuz alarmı eklendi.',true,now()-interval '7 days'),
  ('b1000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','INC-2149','Mobil oturum yenileme API hatası','Token yenileme API çağrılarında kısmi 502 hatası alındı.','closed','P2','P2','integration','a1000000-0000-0000-0000-000000000004','prod',now()-interval '15 days',now()-interval '15 days'+interval '9 minutes',now()-interval '15 days'+interval '55 minutes','Gateway rota kuralı düzeltildi.',true,now()-interval '15 days'),
  ('b1000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','INC-2138','Mutabakat raporunda mükerrer kayıt','Retry sırasında idempotency anahtarı kaybolduğu için 18 işlem iki kez raporlandı.','resolved','P2','P2','data_integrity','a1000000-0000-0000-0000-000000000005','prod',now()-interval '22 days',now()-interval '22 days'+interval '12 minutes',now()-interval '22 days'+interval '110 minutes','İdempotency anahtarı kalıcı depoya alındı ve rapor düzeltildi.',true,now()-interval '22 days'),
  ('b1000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','INC-2124','Core batch disk alanı uyarısı','Batch geçici dosyaları temizlenmediği için disk kullanımı %91 oldu.','closed','P3','P3','availability','a1000000-0000-0000-0000-000000000003','prod',now()-interval '31 days',now()-interval '31 days'+interval '20 minutes',now()-interval '31 days'+interval '80 minutes','Geçici dosya yaşam döngüsü kuralı tanımlandı.',true,now()-interval '31 days'),
  ('b1000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','INC-2181','3D Secure sağlayıcı yanıt formatı değişti','Yeni reasonCode alanı parser tarafından işlenemiyor.','new','P3',NULL,'integration','a1000000-0000-0000-0000-000000000002','prod',now()-interval '2 hours',NULL,NULL,NULL,false,now()-interval '2 hours'),
  ('b1000000-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','INC-2178','Mobil bildirim kuyruğu gecikiyor','Push kuyruğu tüketimi 25 dakika geriden geliyor.','investigating','P3','P3','performance','a1000000-0000-0000-0000-000000000004','prod',now()-interval '8 hours',now()-interval '7 hours 45 minutes',NULL,NULL,false,now()-interval '8 hours'),
  ('b1000000-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','INC-2157','Ödeme gateway sertifika süresi uyarısı','Üretim ara sertifikasının bitmesine 14 gün kaldı.','mitigated','P3','P3','integration','a1000000-0000-0000-0000-000000000002','prod',now()-interval '10 days',now()-interval '10 days'+interval '30 minutes',NULL,'Yeni sertifika test ortamında doğrulandı, üretim geçişi planlandı.',false,now()-interval '10 days'),
  ('b1000000-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','INC-2115','Kart switch eski node bellek artışı','Eski node üzerinde bellek kullanımı kademeli yükseldi.','closed','P3','P3','performance','a1000000-0000-0000-0000-000000000001','prod',now()-interval '45 days',now()-interval '45 days'+interval '18 minutes',now()-interval '45 days'+interval '90 minutes','Node kademeli boşaltıldı ve bellek profili alındı.',true,now()-interval '45 days')
ON CONFLICT (organization_id, reference) DO NOTHING;

-- Six additional knowledge records: 12 tenant-local records, including 5+ runbooks and 3 stale/deprecated.
INSERT INTO public.knowledge_articles
  (id, organization_id, title, summary, body, source_type, source_incident_id, status, visibility, freshness, system_id, financial_domain, environment, version_range, region, incident_type, severity, confidentiality, redaction_status, verified, last_reviewed_at, reuse_count, success_count, tags, created_at)
VALUES
  ('d1000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','FAST TXN_TIMEOUT_504 ve DB havuzu runbook','Sürüm sonrası FAST timeout artışında DB havuzu ve rollback doğrulama adımları.','Belirti: TXN_TIMEOUT_504. Teşhis: aktif bağlantı, bekleyen thread ve son release farkını karşılaştır. Çözüm: insan onayıyla havuzu kademeli artır; sonuç yoksa sürümü geri al. Doğrulama: hata oranı %1 altı.','runbook',NULL,'approved_private','private','valid','a1000000-0000-0000-0000-000000000003','core','prod','core 8.x','TR','performance','P1','internal','not_required',true,now()-interval '5 days',4,4,'{"fast","txn_timeout_504","db pool","release"}',now()-interval '10 days'),
  ('d1000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','API idempotency kontrol runbook','Finansal retry akışlarında mükerrer kayıtları önleme kontrol listesi.','Her istekte değişmez idempotency anahtarı üret. Anahtarı yanıtla birlikte kalıcı sakla. Retry öncesi önceki sonucu oku. Mutabakat sayacı ile doğrula.','runbook','b1000000-0000-0000-0000-000000000011','approved_private','private','valid','a1000000-0000-0000-0000-000000000005','settlement','prod','recon 2.x','TR','data_integrity','P2','internal','not_required',true,now()-interval '18 days',3,3,'{"idempotency","retry","mutabakat"}',now()-interval '20 days'),
  ('d1000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Gateway 502 teşhis runbook','Mobil ve ödeme gateway 502 hatalarında rota ve upstream sağlık kontrolü.','Rota eşleşmesini, upstream health check ve timeout zincirini doğrula. Değişiklik önce canary ortamında test edilir.','runbook','b1000000-0000-0000-0000-000000000010','approved_shared','shared','valid',NULL,'channels','prod','gateway 5.x','TR','integration','P2','internal','completed',true,now()-interval '12 days',5,4,'{"gateway","502","upstream"}',now()-interval '14 days'),
  ('d1000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','Batch geçici dosya yaşam döngüsü','Disk kullanımını güvenli sınırda tutmak için temizlik ve alarm standardı.','Geçici dosyaları 24 saat sonra sil. %70 uyarı, %85 kritik alarm tanımla. Silme görevini örneklemle doğrula.','standard','b1000000-0000-0000-0000-000000000012','approved_private','private','valid','a1000000-0000-0000-0000-000000000003','core','prod','genel','TR','availability','P3','internal','not_required',true,now()-interval '25 days',2,2,'{"batch","disk","lifecycle"}',now()-interval '28 days'),
  ('d1000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','Eski token yenileme bypass notu','Gateway 3.x için geçmişte kullanılan geçici bypass; artık uygulanmamalı.','Bu yöntem güvenlik kontrolünü zayıflattığı için deprecated edildi. Güncel gateway rota runbookunu kullanın.','runbook',NULL,'deprecated','private','deprecated','a1000000-0000-0000-0000-000000000004','channels','prod','gateway 3.x','TR','security','P1','restricted','not_required',false,now()-interval '360 days',0,0,'{"deprecated","token","bypass"}',now()-interval '500 days'),
  ('d1000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','Push kuyruğu ölçekleme notu','Eski tüketici ayarları; yeni sürüm için doğrulama bekliyor.','Tüketici sayısını kuyruk gecikmesine göre kademeli artır. Bu kayıt yeni broker sürümünde henüz doğrulanmadı.','runbook',NULL,'needs_review','private','needs_review','a1000000-0000-0000-0000-000000000004','channels','prod','broker 2.x','TR','performance','P3','internal','not_required',false,now()-interval '190 days',1,0,'{"push","queue","consumer"}',now()-interval '200 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.knowledge_chunks (organization_id, article_id, chunk_index, content)
SELECT article.organization_id, article.id, 0, article.title || ' — ' || article.summary || ' ' || article.body
FROM public.knowledge_articles article
WHERE article.id BETWEEN 'd1000000-0000-0000-0000-000000000008'::uuid AND 'd1000000-0000-0000-0000-000000000013'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.knowledge_chunks chunk WHERE chunk.article_id = article.id);

INSERT INTO public.postmortems (organization_id, incident_id, timeline, root_cause, impact, lessons, preventive_actions, status, approved_at, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000003','Dosya farkı tespit edildi; kuyruk gecikmesi giderildi; düzeltme dosyası yayımlandı.','Kuyruk tüketicisi gün sonu penceresine yetişemedi.','40 dakikalık işlemler ilk dosyada yoktu.','Dosya üretiminden önce kaynak-kuyruk watermark kontrolü gerekir.','Watermark kapısı ve satır sayısı alarmı eklendi.','approved',now()-interval '11 days',now()-interval '11 days'),
  ('11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000011','Mükerrer kayıt alarmı; retry analizi; idempotency düzeltmesi; rapor yeniden üretimi.','Retry katmanı kalıcı idempotency anahtarını taşımadı.','18 işlem mükerrer raporlandı; finansal kayıt düzeltilerek doğrulandı.','İdempotency finansal API sözleşmesinin zorunlu parçası olmalı.','Idempotency testleri CI kapısına eklendi.','approved',now()-interval '21 days',now()-interval '21 days')
ON CONFLICT (incident_id) DO NOTHING;

INSERT INTO public.problems (organization_id, title, pattern_summary, occurrence_count, status)
SELECT '11111111-1111-1111-1111-111111111111', valueset.title, valueset.summary, valueset.occurrences, 'candidate'
FROM (VALUES
  ('API retry ve idempotency deseni','Mutabakat ve mobil entegrasyonlarında retry güvenliği ortak kalıcı iyileştirme gerektiriyor.',3),
  ('Gateway sertifika yaşam döngüsü','Sertifika yenileme ve truststore değişiklikleri tekrar eden entegrasyon riski oluşturuyor.',3)
) AS valueset(title, summary, occurrences)
WHERE NOT EXISTS (SELECT 1 FROM public.problems problem WHERE problem.organization_id='11111111-1111-1111-1111-111111111111' AND problem.title=valueset.title);

INSERT INTO public.recommended_actions (id, organization_id, incident_id, title, detail, risk_level, confidence, decision, decision_note, created_at)
VALUES
  ('c1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000003','Kuyruk tüketicisini kademeli artır','Watermark doğrulamasıyla iki ek tüketici aç.','medium',0.81,'approved','Uygulandı.',now()-interval '12 days'),
  ('c1000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000009','Idle bağlantıları temizle','60 saniyeyi aşan idle bağlantıları sonlandır.','low',0.84,'approved','Uygulandı.',now()-interval '7 days'),
  ('c1000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000010','Gateway rota kuralını düzelt','Canary doğrulamasından sonra rota önceliğini güncelle.','medium',0.78,'approved','Uygulandı.',now()-interval '15 days'),
  ('c1000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000011','Idempotency anahtarını kalıcılaştır','Retry boyunca aynı anahtarı kullan ve önceki sonucu döndür.','medium',0.89,'approved','Uygulandı.',now()-interval '22 days'),
  ('c1000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000012','Geçici dosya temizliğini çalıştır','24 saatten eski geçici dosyaları kontrollü temizle.','low',0.83,'approved','Uygulandı.',now()-interval '31 days'),
  ('c1000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000016','Node trafiğini kademeli boşalt','Eski node trafiğini diğer node’lara taşı.','medium',0.76,'approved','Uygulandı.',now()-interval '45 days'),
  ('c1000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000002','Sertifika alarmı ekle','30/14/7 günlük son kullanma alarmları tanımla.','low',0.92,'approved','Uygulandı.',now()-interval '18 days'),
  ('c1000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','b1000000-0000-0000-0000-000000000001','Kapasite alarmını doğrula','%70 uyarı ve %85 kritik eşiğini yük testinde doğrula.','low',0.91,'approved','Uygulandı.',now()-interval '26 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.action_executions (organization_id, incident_id, action_id, outcome, note, executed_at)
SELECT '11111111-1111-1111-1111-111111111111', action.incident_id, action.id, 'success', 'İnsan onayı sonrası uygulandı; beklenen doğrulama metriği sağlandı.', action.created_at + interval '30 minutes'
FROM public.recommended_actions action
WHERE action.id BETWEEN 'c1000000-0000-0000-0000-000000000004'::uuid AND 'c1000000-0000-0000-0000-000000000011'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.action_executions execution WHERE execution.action_id = action.id);

INSERT INTO public.evaluation_cases (organization_id, case_key, input_text, expected_category, expected_severity, evidence_required)
SELECT '11111111-1111-1111-1111-111111111111', 'EV-' || lpad(series::text,3,'0'),
  CASE (series-1)%6
    WHEN 0 THEN 'Kart switch timeout ve bağlantı havuzu doygunluğu'
    WHEN 1 THEN '3D Secure sertifika handshake hatası'
    WHEN 2 THEN 'Mutabakat dosyasında eksik satır'
    WHEN 3 THEN 'Mobil servis erişilemiyor'
    WHEN 4 THEN 'Yetkisiz token kullanımı şüphesi'
    ELSE 'Sınıflandırılamayan genel operasyon notu'
  END,
  CASE (series-1)%6 WHEN 0 THEN 'performance' WHEN 1 THEN 'integration' WHEN 2 THEN 'data_integrity' WHEN 3 THEN 'availability' WHEN 4 THEN 'security' ELSE 'other' END,
  CASE WHEN series IN (2,7,13,19,25) THEN 'P1'::public.severity_level WHEN series%3=0 THEN 'P2'::public.severity_level ELSE 'P3'::public.severity_level END,
  series%5<>0
FROM generate_series(1,25) series
ON CONFLICT (organization_id, case_key) DO NOTHING;

INSERT INTO public.incident_events (organization_id, incident_id, event_type, summary, actor_kind, created_at)
SELECT '11111111-1111-1111-1111-111111111111', incident.id, 'created', 'Demo olay veri seti kapsamında oluşturuldu.', 'system', incident.created_at
FROM public.incidents incident
WHERE incident.id BETWEEN 'b1000000-0000-0000-0000-000000000008'::uuid AND 'b1000000-0000-0000-0000-000000000016'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.incident_events event WHERE event.incident_id=incident.id AND event.event_type='created');
