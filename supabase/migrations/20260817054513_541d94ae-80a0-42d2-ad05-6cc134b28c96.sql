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

DROP POLICY IF EXISTS evaluation_cases_select ON public.evaluation_cases;
CREATE POLICY evaluation_cases_select ON public.evaluation_cases FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS evaluation_runs_select ON public.evaluation_runs;
CREATE POLICY evaluation_runs_select ON public.evaluation_runs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS evaluation_runs_insert ON public.evaluation_runs;
CREATE POLICY evaluation_runs_insert ON public.evaluation_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS ingestion_jobs_select ON public.ingestion_jobs;
CREATE POLICY ingestion_jobs_select ON public.ingestion_jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
DROP POLICY IF EXISTS ingestion_jobs_insert ON public.ingestion_jobs;
CREATE POLICY ingestion_jobs_insert ON public.ingestion_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS ingestion_jobs_update ON public.ingestion_jobs;
CREATE POLICY ingestion_jobs_update ON public.ingestion_jobs FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'tenant_admin'))
  WITH CHECK (public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'tenant_admin'));
DROP POLICY IF EXISTS webhook_events_select ON public.webhook_events;
CREATE POLICY webhook_events_select ON public.webhook_events FOR SELECT TO authenticated
  USING (public.has_org_role(organization_id,'tenant_admin') OR public.has_org_role(organization_id,'manager'));

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