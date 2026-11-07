-- Language tests, instructor capability/sessions/incentives, salary structures, payroll. Additive. NOT YET APPLIED.

CREATE TABLE IF NOT EXISTS staff_capabilities (
  counselor_id uuid NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  capability   text NOT NULL CHECK (capability IN ('instructor')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (counselor_id, capability)
);
CREATE TABLE IF NOT EXISTS exam_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS language_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id), deal_id uuid REFERENCES deals(id),
  exam_org_id uuid REFERENCES exam_organizations(id),
  test_type text NOT NULL CHECK (test_type IN ('LRW','Speaking','Both')),
  received_amount numeric(12,2) NOT NULL DEFAULT 0, payment_id uuid REFERENCES payments(id), payment_proof_url text,
  test_date date,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','scheduled','completed','cancelled','no_show')),
  result text, created_by uuid REFERENCES counselors(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_test_id uuid NOT NULL REFERENCES language_tests(id),
  instructor_id uuid NOT NULL REFERENCES counselors(id),
  session_type text NOT NULL CHECK (session_type IN ('LRW','Speaking')),
  scheduled_at timestamptz NOT NULL, room text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show'))
);
CREATE TABLE IF NOT EXISTS instructor_commission_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES counselors(id), session_type text NOT NULL CHECK (session_type IN ('LRW','Speaking')),
  plan_type text NOT NULL CHECK (plan_type IN ('percent','tier')), rate numeric(5,2),
  effective_from date NOT NULL DEFAULT CURRENT_DATE, effective_to date
);
CREATE TABLE IF NOT EXISTS instructor_incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id uuid NOT NULL REFERENCES test_sessions(id), instructor_id uuid NOT NULL REFERENCES counselors(id),
  gross_base numeric(12,2) NOT NULL, rate_snapshot numeric(5,2) NOT NULL, amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','held','paid','reversed')),
  reverses_id uuid REFERENCES instructor_incentives(id), payable_period date, payroll_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES counselors(id), effective_from date NOT NULL DEFAULT CURRENT_DATE, effective_to date,
  basic numeric(12,2) NOT NULL DEFAULT 0, created_by uuid REFERENCES counselors(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS salary_structure_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id uuid NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  label text NOT NULL, line_type text NOT NULL CHECK (line_type IN ('earning','deduction')),
  calc text NOT NULL CHECK (calc IN ('fixed','percent_of_basic','percent_of_gross')), value numeric(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id), period date NOT NULL,       -- first day of payroll month
  pay_date date NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  approved_by uuid REFERENCES counselors(id), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, period)
);
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id), counselor_id uuid NOT NULL REFERENCES counselors(id),
  basic numeric(12,2) NOT NULL DEFAULT 0, allowances numeric(12,2) NOT NULL DEFAULT 0, deductions numeric(12,2) NOT NULL DEFAULT 0,
  incentives_earned numeric(12,2) NOT NULL DEFAULT 0, incentives_held numeric(12,2) NOT NULL DEFAULT 0,
  adjustments numeric(12,2) NOT NULL DEFAULT 0, carried_in numeric(12,2) NOT NULL DEFAULT 0, carried_out numeric(12,2) NOT NULL DEFAULT 0,
  net numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','carried_forward','partial')),
  UNIQUE (payroll_run_id, counselor_id)
);
CREATE TABLE IF NOT EXISTS payroll_item_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  line_type text NOT NULL CHECK (line_type IN ('basic','earning','deduction','incentive','held','adjustment','clawback','advance_repayment','carry_in','carry_out')),
  amount numeric(12,2) NOT NULL, source_ref text, note text, order_no int NOT NULL DEFAULT 0
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['staff_capabilities','exam_organizations','language_tests','test_sessions','instructor_commission_plans',
    'instructor_incentives','salary_structures','salary_structure_lines','payroll_runs','payroll_items','payroll_item_lines'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
  END LOOP; END $$;
NOTIFY pgrst, 'reload schema';
