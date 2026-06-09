-- Phase 4: Financial Suite — run in Supabase SQL Editor after core schema + mock clients exist

-- Service agreements / deals
CREATE TABLE IF NOT EXISTS deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES counselors(id),
  service_type text NOT NULL,
  target_country text,
  deal_value numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  stage text NOT NULL DEFAULT 'lead',
  stage_notes text,
  signed_at timestamptz,
  expected_close_date date,
  actual_close_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id),
  counselor_id uuid REFERENCES counselors(id),
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Payments received
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id),
  client_id uuid REFERENCES clients(id),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  payment_method text,
  reference_number text,
  paid_at timestamptz DEFAULT now(),
  recorded_by uuid REFERENCES counselors(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  paid_at date NOT NULL,
  recorded_by uuid REFERENCES counselors(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Counselor commission rules
CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  counselor_id uuid REFERENCES counselors(id) UNIQUE,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10,
  base_salary numeric(10,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Commission rules for counselors
INSERT INTO commission_rules (counselor_id, commission_rate, base_salary) VALUES
  ('55403943-35db-4c2b-94fe-02750ed04352', 12, 80000),
  ('45f23418-fbb7-472c-b9e2-bddc7eac40ff', 10, 75000)
ON CONFLICT (counselor_id) DO NOTHING;

-- Deals
INSERT INTO deals (id, client_id, counselor_id, service_type, target_country, deal_value, stage, signed_at, expected_close_date)
VALUES
  ('d4000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '55403943-35db-4c2b-94fe-02750ed04352', 'study_visa', 'UK', 95000, 'proposal', NULL, CURRENT_DATE + interval '30 days'),
  ('d4000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', '45f23418-fbb7-472c-b9e2-bddc7eac40ff', 'study_visa', 'Germany', 120000, 'agreement_signed', now() - interval '5 days', CURRENT_DATE + interval '60 days'),
  ('d4000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000002', '55403943-35db-4c2b-94fe-02750ed04352', 'language_ielts', 'N/A', 25000, 'lead', NULL, CURRENT_DATE + interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- Invoices
INSERT INTO invoices (id, invoice_number, client_id, deal_id, counselor_id, line_items, subtotal, total, status, due_date)
VALUES
  ('e5000001-0000-0000-0000-000000000001', 'ACE-2025-001', 'a1000001-0000-0000-0000-000000000003', 'd4000001-0000-0000-0000-000000000002', '45f23418-fbb7-472c-b9e2-bddc7eac40ff',
   '[{"description": "Germany Study Visa Service Fee - Stage 1", "amount": 40000}, {"description": "Documentation Processing", "amount": 15000}]'::jsonb,
   55000, 55000, 'sent', CURRENT_DATE + interval '7 days'),
  ('e5000001-0000-0000-0000-000000000002', 'ACE-2025-002', 'a1000001-0000-0000-0000-000000000002', 'd4000001-0000-0000-0000-000000000003', '55403943-35db-4c2b-94fe-02750ed04352',
   '[{"description": "IELTS Preparation Course - 2 months", "amount": 25000}]'::jsonb,
   25000, 25000, 'draft', CURRENT_DATE + interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- Expenses
INSERT INTO expenses (category, description, amount, paid_at, recorded_by)
VALUES
  ('salary', 'June 2025 salary - Hashaam', 80000, CURRENT_DATE - interval '5 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('salary', 'June 2025 salary - Aneeqa', 75000, CURRENT_DATE - interval '5 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('marketing', 'Meta ads - UK campaign June', 35000, CURRENT_DATE - interval '10 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('office', 'Office rent June 2025', 45000, CURRENT_DATE - interval '1 day', '2365c12c-8ad8-4cff-a45d-98137019f1d2'),
  ('tools', 'Vercel + Supabase + Anthropic APIs', 8500, CURRENT_DATE - interval '3 days', '2365c12c-8ad8-4cff-a45d-98137019f1d2');
