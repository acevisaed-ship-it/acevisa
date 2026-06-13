-- ─────────────────────────────────────────────────────────────────────────────
-- Accounts: receipt_url, counselor allocation, per-service commission policy
-- ─────────────────────────────────────────────────────────────────────────────

-- Receipt upload URLs
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url text;

-- Expense allocation to counselors
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS counselor_id uuid REFERENCES counselors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_counselor_id ON expenses (counselor_id);

-- Per-service commission policy rules
CREATE TABLE IF NOT EXISTS commission_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  service_type text NOT NULL, -- study_visa, work_abroad, visit_immigration, language_ielts
  commission_rate numeric(5,2) NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id, service_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HR: Attendance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present', -- present, absent, half_day, remote, leave
  notes text,
  created_by uuid REFERENCES counselors(id) ON DELETE SET NULL, -- admin who recorded
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (counselor_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_counselor_date ON attendance_records (counselor_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records (date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- HR: Leave Applications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'annual', -- annual, sick, emergency, unpaid, other
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_counselor ON leave_applications (counselor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_applications (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- HR: Policies (SOPs, deduction, termination, attendance, leave)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type text NOT NULL, -- attendance, leave, deduction, termination, sop
  title text NOT NULL,
  content text NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES counselors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_policies_type ON hr_policies (policy_type, is_active);
