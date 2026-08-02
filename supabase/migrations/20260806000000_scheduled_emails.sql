-- Queue for portal "Send later" emails (Bluehost SMTP via app)
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id  uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  from_address  text NOT NULL,
  to_addresses  text NOT NULL,
  cc_addresses  text,
  bcc_addresses text,
  subject       text NOT NULL,
  body_text     text,
  body_html     text,
  reply_to_uid  text,
  send_at       timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message text,
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_emails_due_idx
  ON scheduled_emails (status, send_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS scheduled_emails_counselor_idx
  ON scheduled_emails (counselor_id, created_at DESC);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
-- Access is via service-role from API routes only (session-authenticated)
