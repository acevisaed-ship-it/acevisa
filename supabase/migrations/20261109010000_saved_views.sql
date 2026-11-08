-- Saved report views (filters + grouping + columns under a name). Additive. Starter views are shared with every admin.
CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,                          -- null = starter view shipped with the system
  name text NOT NULL,
  config jsonb NOT NULL,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_views_starter_name ON saved_views (name) WHERE owner_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON saved_views (owner_id);
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON saved_views FROM anon, authenticated;

INSERT INTO saved_views (owner_id, name, shared, config) VALUES
  (NULL, 'Applications by country', true,
   '{"view":"v_cases_report","preset":"all","groupBy":"country","sumField":"received"}'::jsonb),
  (NULL, 'Cases per stage', true,
   '{"view":"v_cases_report","preset":"all","groupBy":"current_stage"}'::jsonb),
  (NULL, 'Money collected this month', true,
   '{"view":"v_payments_wide","dateField":"paid_at","preset":"this_month","groupBy":"service_type","sumField":"amount"}'::jsonb),
  (NULL, 'Outstanding balances', true,
   '{"view":"v_cases_report","preset":"all","filters":[{"field":"remaining","op":"gt","value":"0"}]}'::jsonb),
  (NULL, 'Commission pending by counselor', true,
   '{"view":"v_incentives_wide","preset":"all","sel":{"status":["pending_clearance"]},"groupBy":"counselor_name","sumField":"amount"}'::jsonb)
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
