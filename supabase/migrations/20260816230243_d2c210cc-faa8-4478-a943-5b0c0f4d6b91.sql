-- ResolveIQ core schema
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('reporter','responder','manager','curator','tenant_admin','platform_admin');
CREATE TYPE public.incident_status AS ENUM ('new','triage_pending','triaged','investigating','mitigated','resolved','knowledge_review','closed','reopened');
CREATE TYPE public.severity_level AS ENUM ('P1','P2','P3','P4');
CREATE TYPE public.knowledge_status AS ENUM ('draft','under_review','approved_private','proposed_shared','approved_shared','needs_review','stale','deprecated','rejected');
CREATE TYPE public.knowledge_visibility AS ENUM ('private','shared');
CREATE TYPE public.freshness_status AS ENUM ('valid','needs_review','stale','deprecated');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'responder',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, role)
);

CREATE TABLE public.financial_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  domain text NOT NULL,
  environment text NOT NULL DEFAULT 'prod',
  criticality public.severity_level NOT NULL DEFAULT 'P2',
  owner_team text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reference text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status public.incident_status NOT NULL DEFAULT 'new',
  reported_severity public.severity_level,
  ai_suggested_severity public.severity_level,
  approved_severity public.severity_level,
  severity_decided_by uuid REFERENCES auth.users(id),
  severity_decision_reason text,
  category text,
  system_id uuid REFERENCES public.financial_systems(id),
  environment text NOT NULL DEFAULT 'prod',
  owner_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolution_summary text,
  knowledge_promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, reference)
);

CREATE TABLE public.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  actor_kind text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  run_type text NOT NULL,
  mode text NOT NULL DEFAULT 'live',
  model text,
  status text NOT NULL DEFAULT 'succeeded',
  latency_ms integer,
  error_message text,
  prompt_summary text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_triage_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  ai_run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  category text,
  suggested_severity public.severity_level,
  suggested_system_id uuid REFERENCES public.financial_systems(id),
  missing_information text[] NOT NULL DEFAULT '{}',
  evidence_confidence numeric NOT NULL DEFAULT 0,
  summary text,
  decision text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.root_cause_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  ai_run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  hypothesis text NOT NULL,
  rationale text,
  confidence numeric NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recommended_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  ai_run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text,
  risk_level text NOT NULL DEFAULT 'medium',
  confidence numeric NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.action_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.recommended_actions(id) ON DELETE CASCADE,
  outcome text NOT NULL,
  note text,
  executed_by uuid REFERENCES auth.users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.postmortems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE UNIQUE,
  timeline text,
  root_cause text,
  impact text,
  lessons text,
  preventive_actions text,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  source_type text NOT NULL DEFAULT 'incident',
  source_incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  status public.knowledge_status NOT NULL DEFAULT 'draft',
  visibility public.knowledge_visibility NOT NULL DEFAULT 'private',
  freshness public.freshness_status NOT NULL DEFAULT 'valid',
  system_id uuid REFERENCES public.financial_systems(id),
  financial_domain text,
  environment text,
  version_range text,
  region text,
  incident_type text,
  severity public.severity_level,
  confidentiality text NOT NULL DEFAULT 'internal',
  redaction_status text NOT NULL DEFAULT 'not_required',
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  last_reviewed_at timestamptz,
  reuse_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_chunks_fts ON public.knowledge_chunks USING gin (search_vector);
CREATE INDEX knowledge_chunks_trgm ON public.knowledge_chunks USING gin (content gin_trgm_ops);
CREATE INDEX incidents_search_trgm ON public.incidents USING gin ((title || ' ' || description) gin_trgm_ops);

CREATE TABLE public.retrieval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  query text NOT NULL,
  strategy text NOT NULL DEFAULT 'hybrid_lexical',
  result_count integer NOT NULL DEFAULT 0,
  top_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_knowledge_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'retrieved',
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, article_id, link_type)
);

CREATE TABLE public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  pattern_summary text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  actor_kind text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  reason text,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_memberships m
    WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE demo_org uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO demo_org FROM public.organizations WHERE slug = 'demo-bank' LIMIT 1;
  IF demo_org IS NOT NULL THEN
    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (demo_org, NEW.id, 'manager'), (demo_org, NEW.id, 'responder')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER knowledge_touch BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_select ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_self ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

GRANT SELECT ON public.organization_memberships TO authenticated;
GRANT ALL ON public.organization_memberships TO service_role;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_select ON public.organization_memberships FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_systems TO authenticated;
GRANT ALL ON public.financial_systems TO service_role;
ALTER TABLE public.financial_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_select ON public.financial_systems FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY fs_write ON public.financial_systems FOR ALL TO authenticated
  USING (public.has_org_role(organization_id,'tenant_admin')) WITH CHECK (public.has_org_role(organization_id,'tenant_admin'));

GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY inc_select ON public.incidents FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY inc_insert ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND created_by = auth.uid());
CREATE POLICY inc_update ON public.incidents FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'responder') OR public.has_org_role(organization_id,'manager'))
  WITH CHECK (public.has_org_role(organization_id,'responder') OR public.has_org_role(organization_id,'manager'));

GRANT SELECT, INSERT ON public.incident_events TO authenticated;
GRANT ALL ON public.incident_events TO service_role;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ev_select ON public.incident_events FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY ev_insert ON public.incident_events FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT ON public.incident_comments TO authenticated;
GRANT ALL ON public.incident_comments TO service_role;
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cm_select ON public.incident_comments FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY cm_insert ON public.incident_comments FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id) AND author_id = auth.uid());

GRANT SELECT, INSERT ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY air_select ON public.ai_runs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY air_insert ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.ai_triage_results TO authenticated;
GRANT ALL ON public.ai_triage_results TO service_role;
ALTER TABLE public.ai_triage_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY tri_select ON public.ai_triage_results FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY tri_insert ON public.ai_triage_results FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY tri_update ON public.ai_triage_results FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'manager')) WITH CHECK (public.has_org_role(organization_id,'manager'));

GRANT SELECT, INSERT, UPDATE ON public.root_cause_hypotheses TO authenticated;
GRANT ALL ON public.root_cause_hypotheses TO service_role;
ALTER TABLE public.root_cause_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_select ON public.root_cause_hypotheses FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY rc_insert ON public.root_cause_hypotheses FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY rc_update ON public.root_cause_hypotheses FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.recommended_actions TO authenticated;
GRANT ALL ON public.recommended_actions TO service_role;
ALTER TABLE public.recommended_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ra_select ON public.recommended_actions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY ra_insert ON public.recommended_actions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY ra_update ON public.recommended_actions FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'manager')) WITH CHECK (public.has_org_role(organization_id,'manager'));

GRANT SELECT, INSERT ON public.action_executions TO authenticated;
GRANT ALL ON public.action_executions TO service_role;
ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ae_select ON public.action_executions FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY ae_insert ON public.action_executions FOR INSERT TO authenticated
  WITH CHECK ((public.has_org_role(organization_id,'responder') OR public.has_org_role(organization_id,'manager')) AND executed_by = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.postmortems TO authenticated;
GRANT ALL ON public.postmortems TO service_role;
ALTER TABLE public.postmortems ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_select ON public.postmortems FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY pm_insert ON public.postmortems FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY pm_update ON public.postmortems FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'manager')) WITH CHECK (public.has_org_role(organization_id,'manager'));

GRANT SELECT, INSERT, UPDATE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY ka_select ON public.knowledge_articles FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR (visibility = 'shared' AND status = 'approved_shared'));
CREATE POLICY ka_insert ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY ka_update ON public.knowledge_articles FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id,'manager') OR public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'responder'))
  WITH CHECK (public.has_org_role(organization_id,'manager') OR public.has_org_role(organization_id,'curator') OR public.has_org_role(organization_id,'responder'));

GRANT SELECT, INSERT, DELETE ON public.knowledge_chunks TO authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY kc_select ON public.knowledge_chunks FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY kc_insert ON public.knowledge_chunks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT ON public.retrieval_runs TO authenticated;
GRANT ALL ON public.retrieval_runs TO service_role;
ALTER TABLE public.retrieval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_select ON public.retrieval_runs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY rr_insert ON public.retrieval_runs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT ON public.incident_knowledge_links TO authenticated;
GRANT ALL ON public.incident_knowledge_links TO service_role;
ALTER TABLE public.incident_knowledge_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY ikl_select ON public.incident_knowledge_links FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY ikl_insert ON public.incident_knowledge_links FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.problems TO authenticated;
GRANT ALL ON public.problems TO service_role;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_select ON public.problems FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY pr_write ON public.problems FOR ALL TO authenticated
  USING (public.has_org_role(organization_id,'manager')) WITH CHECK (public.has_org_role(organization_id,'manager'));

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_select ON public.audit_logs FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY al_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(organization_id));