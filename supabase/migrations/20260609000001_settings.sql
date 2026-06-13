-- Admin portal settings (single-row table, upserted by key)
CREATE TABLE IF NOT EXISTS portal_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed defaults
INSERT INTO portal_settings (key, value) VALUES
  ('notifications', '{"newClient": true, "complaint": true, "escalation": true, "meetingReminder": true, "weeklyDigest": false}'::jsonb),
  ('security',      '{"requireMfa": false, "sessionTimeout": "30", "ipWhitelist": ""}'::jsonb),
  ('appearance',    '{"compactMode": false, "showAvatars": true, "dateFormat": "DD/MM/YYYY"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
