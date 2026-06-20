-- Per-counselor email account configuration
-- Admin sets these credentials; counselors see their own inbox automatically.

CREATE TABLE IF NOT EXISTS counselor_email_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id   uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  email_address  text NOT NULL,
  display_name   text,
  imap_host      text NOT NULL DEFAULT 'mail.bluehost.com',
  imap_port      integer NOT NULL DEFAULT 993,
  smtp_host      text NOT NULL DEFAULT 'mail.bluehost.com',
  smtp_port      integer NOT NULL DEFAULT 465,
  app_password   text NOT NULL,     -- Use app-specific password, not main account password
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id)
);
