-- EC AIHR - Migration v6: durable, tenant-scoped workforce assistant reports
-- Safe to run more than once.

ALTER TABLE ai_agent_interactions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS openai_response_id TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS report_slug TEXT,
  ADD COLUMN IF NOT EXISTS report_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_agent_interactions_response_source_check'
  ) THEN
    ALTER TABLE ai_agent_interactions
      ADD CONSTRAINT ai_agent_interactions_response_source_check
      CHECK (response_source IN ('openai', 'deterministic'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_interactions_report_slug
  ON ai_agent_interactions(report_slug)
  WHERE report_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_interactions_response
  ON ai_agent_interactions(openai_response_id)
  WHERE openai_response_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_agent_interactions_org_created
  ON ai_agent_interactions(org_id, created_at DESC);

ALTER TABLE ai_agent_interactions ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN ai_agent_interactions.report_payload IS
  'Validated structured report JSON. Never stores or executes model-generated HTML.';
