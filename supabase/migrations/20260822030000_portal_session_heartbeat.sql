-- "Time spent on portal" — genuine active-session tracking, not just the
-- clock-in/clock-out window. One row per counselor per PKT calendar day;
-- the client pings while the tab is visible/focused and the server
-- accumulates only the actual gap between pings (so backgrounded tabs,
-- closed laptops, etc. don't inflate the number).

CREATE TABLE IF NOT EXISTS portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  date date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  last_ping_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_counselor_date ON portal_sessions (counselor_id, date);
