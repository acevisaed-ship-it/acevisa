-- Language/test-prep classes (IELTS, PTE, etc.) as their own batch objects,
-- separate from the 1:1 counselor pipeline. Admin/CEO define the class
-- roster (name, subject, instructor, schedule); the receptionist enrolls
-- students at the front desk and marks daily attendance there instead of
-- (or alongside) a plain walk-in log entry — that attendance then shows up
-- on the client's own profile.

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  name text NOT NULL,                 -- e.g. "IELTS Evening Batch A"
  subject text,                       -- e.g. IELTS / PTE / Duolingo / German (free text)
  instructor_name text,
  schedule_days text[],               -- e.g. {Mon,Wed,Fri}
  schedule_time text,                 -- free text, e.g. "6:00 PM - 8:00 PM" (avoids timezone modeling)
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_branch_active
  ON classes(branch_id, is_active, created_at DESC);

-- A client can be enrolled in more than one class (e.g. IELTS + a separate
-- language class), so this is its own join table rather than a column on
-- clients — mirrors how client_inactive_requests stayed separate from
-- pipeline_stage instead of overloading it.
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id),
  enrolled_by uuid REFERENCES counselors(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'dropped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_client
  ON class_enrollments(client_id, status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class
  ON class_enrollments(class_id, status);

-- Daily attendance, marked at the front desk. One row per enrollment per
-- calendar day (PKT) — the unique constraint is what makes marking present
-- idempotent (re-clicking doesn't double-log the same day). Presence-only,
-- same spirit as the walk-in log: it records what happened, not absences.
CREATE TABLE IF NOT EXISTS class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES class_enrollments(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id),
  attended_on date NOT NULL,
  marked_by uuid REFERENCES counselors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, attended_on)
);

CREATE INDEX IF NOT EXISTS idx_class_attendance_client
  ON class_attendance(client_id, attended_on DESC);
CREATE INDEX IF NOT EXISTS idx_class_attendance_class_date
  ON class_attendance(class_id, attended_on DESC);
