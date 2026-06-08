-- AceVisa / EduConsult AI Platform — Phase 1 schema
-- Run in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Counselors must exist before clients (FK reference)
CREATE TABLE counselors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  ad_ref_code text UNIQUE,
  status text DEFAULT 'active',
  base_salary numeric,
  commission_rate numeric,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  language text NOT NULL,
  city text,
  counselor_id uuid REFERENCES counselors(id),
  ad_source text,
  registration_date timestamptz DEFAULT now(),
  qualification_score integer,
  pipeline_stage integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  message_text text NOT NULL,
  sender text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  stage_tag text
);

CREATE TABLE ai_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) UNIQUE,
  profile_json jsonb,
  generated_at timestamptz DEFAULT now()
);

CREATE TABLE knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  topic text NOT NULL,
  answer text NOT NULL,
  added_by uuid REFERENCES counselors(id),
  added_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE TABLE escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  question_text text NOT NULL,
  conversation_context jsonb,
  timestamp timestamptz DEFAULT now(),
  status text DEFAULT 'open',
  counselor_response text,
  responded_at timestamptz
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  document_name text NOT NULL,
  status text DEFAULT 'requested',
  file_url text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  counselor_id uuid REFERENCES counselors(id),
  scheduled_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  pre_brief_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid REFERENCES counselors(id),
  client_id uuid REFERENCES clients(id),
  task_text text NOT NULL,
  due_date timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  service_type text NOT NULL,
  fee_amount numeric,
  payment_terms text,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  channel text,
  template_used text,
  sent_at timestamptz DEFAULT now(),
  status text
);

CREATE TABLE hrm_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid REFERENCES counselors(id),
  month text,
  base_salary numeric,
  commissions_earned numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_payable numeric,
  paid boolean DEFAULT false
);

CREATE TABLE counselor_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid REFERENCES counselors(id) UNIQUE,
  is_online boolean DEFAULT false,
  auto_reply_enabled boolean DEFAULT false,
  auto_reply_message text DEFAULT 'I''ll get back to you in a moment!',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE response_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  counselor_id uuid REFERENCES counselors(id),
  student_message_at timestamptz NOT NULL,
  response_at timestamptz,
  response_by text,
  response_time_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_clients_counselor_id ON clients(counselor_id);
CREATE INDEX idx_clients_pipeline_stage ON clients(pipeline_stage);
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_meetings_counselor_id ON meetings(counselor_id);
CREATE INDEX idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX idx_tasks_counselor_id ON tasks(counselor_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_response_tracking_client_id ON response_tracking(client_id);
CREATE INDEX idx_response_tracking_counselor_id ON response_tracking(counselor_id);

-- Campaign / ad source system
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  ad_source_code text UNIQUE NOT NULL,
  target_country text,
  target_service text,
  opening_line text NOT NULL,
  context_hint text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaigns_ad_source_code ON campaigns(ad_source_code);

CREATE TABLE complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  client_name text,
  client_phone text,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'open',
  acknowledged_by uuid REFERENCES counselors(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_client_id ON complaints(client_id);
