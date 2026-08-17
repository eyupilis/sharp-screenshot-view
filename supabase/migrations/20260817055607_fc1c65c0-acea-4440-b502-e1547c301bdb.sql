-- knowledge_chunks: chunk must belong to an article in the same organization
DROP POLICY IF EXISTS kc_insert ON public.knowledge_chunks;
CREATE POLICY kc_insert ON public.knowledge_chunks FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.knowledge_articles a
    WHERE a.id = knowledge_chunks.article_id
      AND a.organization_id = knowledge_chunks.organization_id
  )
);

-- ai_triage_results
DROP POLICY IF EXISTS tri_insert ON public.ai_triage_results;
CREATE POLICY tri_insert ON public.ai_triage_results FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = ai_triage_results.incident_id
      AND i.organization_id = ai_triage_results.organization_id
  )
  AND (
    ai_run_id IS NULL OR EXISTS (
      SELECT 1 FROM public.ai_runs r
      WHERE r.id = ai_triage_results.ai_run_id
        AND r.organization_id = ai_triage_results.organization_id
    )
  )
  AND (
    suggested_system_id IS NULL OR EXISTS (
      SELECT 1 FROM public.financial_systems s
      WHERE s.id = ai_triage_results.suggested_system_id
        AND s.organization_id = ai_triage_results.organization_id
    )
  )
);

-- root_cause_hypotheses
DROP POLICY IF EXISTS rc_insert ON public.root_cause_hypotheses;
CREATE POLICY rc_insert ON public.root_cause_hypotheses FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = root_cause_hypotheses.incident_id
      AND i.organization_id = root_cause_hypotheses.organization_id
  )
  AND (
    ai_run_id IS NULL OR EXISTS (
      SELECT 1 FROM public.ai_runs r
      WHERE r.id = root_cause_hypotheses.ai_run_id
        AND r.organization_id = root_cause_hypotheses.organization_id
    )
  )
);

-- recommended_actions
DROP POLICY IF EXISTS ra_insert ON public.recommended_actions;
CREATE POLICY ra_insert ON public.recommended_actions FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = recommended_actions.incident_id
      AND i.organization_id = recommended_actions.organization_id
  )
  AND (
    ai_run_id IS NULL OR EXISTS (
      SELECT 1 FROM public.ai_runs r
      WHERE r.id = recommended_actions.ai_run_id
        AND r.organization_id = recommended_actions.organization_id
    )
  )
);

-- incident_knowledge_links
DROP POLICY IF EXISTS ikl_insert ON public.incident_knowledge_links;
CREATE POLICY ikl_insert ON public.incident_knowledge_links FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_knowledge_links.incident_id
      AND i.organization_id = incident_knowledge_links.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.knowledge_articles a
    WHERE a.id = incident_knowledge_links.article_id
      AND a.organization_id = incident_knowledge_links.organization_id
  )
);

-- action_executions
DROP POLICY IF EXISTS ae_insert ON public.action_executions;
CREATE POLICY ae_insert ON public.action_executions FOR INSERT TO authenticated
WITH CHECK (
  (public.has_org_role(organization_id, 'responder'::app_role) OR public.has_org_role(organization_id, 'manager'::app_role))
  AND executed_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = action_executions.incident_id
      AND i.organization_id = action_executions.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.recommended_actions ra
    WHERE ra.id = action_executions.action_id
      AND ra.organization_id = action_executions.organization_id
      AND ra.incident_id = action_executions.incident_id
  )
);

-- ai_runs: incident must belong to the same organization
DROP POLICY IF EXISTS air_insert ON public.ai_runs;
CREATE POLICY air_insert ON public.ai_runs FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_member(organization_id)
  AND (
    incident_id IS NULL OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = ai_runs.incident_id
        AND i.organization_id = ai_runs.organization_id
    )
  )
);
