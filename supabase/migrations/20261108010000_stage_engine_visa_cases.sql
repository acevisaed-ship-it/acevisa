-- Stage engine, lookups, study dims, visit visa, attestation, checklists, services. Additive. NOT YET APPLIED.

CREATE TABLE IF NOT EXISTS visa_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, label text NOT NULL, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL, iso2 text, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS program_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, label text NOT NULL, order_no int NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id), name text NOT NULL, is_active boolean NOT NULL DEFAULT true,
  UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS stage_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_category_id uuid NOT NULL REFERENCES visa_categories(id),
  code text NOT NULL, label text NOT NULL, order_no int NOT NULL, is_active boolean NOT NULL DEFAULT true,
  UNIQUE (visa_category_id, code)
);
CREATE TABLE IF NOT EXISTS case_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id),
  stage_definition_id uuid NOT NULL REFERENCES stage_definitions(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked','waived')),
  started_at timestamptz, done_at timestamptz, done_by uuid REFERENCES counselors(id), notes text,
  UNIQUE (deal_id, stage_definition_id)
);
CREATE INDEX IF NOT EXISTS idx_case_stages_deal ON case_stages (deal_id);

-- Deals become typed cases
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS visa_category_id uuid REFERENCES visa_categories(id),
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES countries(id),
  ADD COLUMN IF NOT EXISTS program_level_id uuid REFERENCES program_levels(id),
  ADD COLUMN IF NOT EXISTS university_id uuid REFERENCES universities(id),
  ADD COLUMN IF NOT EXISTS intake text,
  ADD COLUMN IF NOT EXISTS case_status text NOT NULL DEFAULT 'active'
    CHECK (case_status IN ('active','withdrawn','rejected','granted','deferred')),
  ADD COLUMN IF NOT EXISTS withdraw_reason text,
  ADD COLUMN IF NOT EXISTS withdraw_stage_id uuid REFERENCES stage_definitions(id),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist_template_id uuid;
CREATE INDEX IF NOT EXISTS idx_deals_visa_category ON deals (visa_category_id);

-- Visit visa structured data (visit_visa_profile jsonb stays read-only until backfilled)
CREATE TABLE IF NOT EXISTS visit_visa_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid UNIQUE NOT NULL REFERENCES deals(id),
  country_id uuid REFERENCES countries(id),
  intended_travel_from date, intended_travel_to date,
  assessment_report_given boolean NOT NULL DEFAULT false, assessment_at timestamptz,
  documents_received boolean NOT NULL DEFAULT false, documents_received_at timestamptz,
  documents_checklist_complete boolean NOT NULL DEFAULT false, documents_complete_at timestamptz,
  appointment_charges numeric(12,2) NOT NULL DEFAULT 0,
  insurance_charges numeric(12,2) NOT NULL DEFAULT 0,
  itinerary_charges numeric(12,2) NOT NULL DEFAULT 0,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_concerns_shared boolean NOT NULL DEFAULT false, concerns_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attestation
CREATE TABLE IF NOT EXISTS attestation_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id), doc_label text NOT NULL, required_count int NOT NULL DEFAULT 1,
  stage_label text, version int NOT NULL DEFAULT 1, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attestation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id),
  requirement_id uuid REFERENCES attestation_requirements(id),
  doc_label text NOT NULL, required_count int NOT NULL DEFAULT 1, attested_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','done')),
  done_at timestamptz, proof_url text
);
CREATE INDEX IF NOT EXISTS idx_attestation_items_deal ON attestation_items (deal_id);

-- Checklist knowledge base (versioned) and per-case copies
CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_category_id uuid NOT NULL REFERENCES visa_categories(id), country_id uuid REFERENCES countries(id),
  version int NOT NULL DEFAULT 1, is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES counselors(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visa_category_id, country_id, version)
);
CREATE TABLE IF NOT EXISTS checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  doc_label text NOT NULL, required boolean NOT NULL DEFAULT true, notes text, order_no int NOT NULL DEFAULT 0
);
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_checklist_template_fk;
ALTER TABLE deals ADD CONSTRAINT deals_checklist_template_fk FOREIGN KEY (checklist_template_id) REFERENCES checklist_templates(id);
CREATE TABLE IF NOT EXISTS case_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id),
  template_item_id uuid REFERENCES checklist_template_items(id),
  doc_label text NOT NULL,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN ('missing','received','verified','na')),
  received_at timestamptz, verified_by uuid REFERENCES counselors(id)
);
CREATE INDEX IF NOT EXISTS idx_case_checklist_deal ON case_checklist_items (deal_id);

-- Ad-hoc services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, category text NOT NULL CHECK (category IN ('file_prep','experience_letter','doc_prep','application','other')),
  default_price numeric(12,2) NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS service_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id), service_id uuid REFERENCES services(id),
  counselor_id uuid NOT NULL REFERENCES counselors(id), amount numeric(12,2) NOT NULL CHECK (amount > 0),
  description text, approved_by uuid REFERENCES counselors(id), charged_at timestamptz NOT NULL DEFAULT now(),
  payment_id uuid REFERENCES payments(id)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['visa_categories','countries','program_levels','universities','stage_definitions','case_stages',
    'visit_visa_cases','attestation_requirements','attestation_items','checklist_templates','checklist_template_items',
    'case_checklist_items','services','service_charges'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
  END LOOP; END $$;
NOTIFY pgrst, 'reload schema';
