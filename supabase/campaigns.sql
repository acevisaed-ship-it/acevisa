-- Campaign / ad source system — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  ad_source_code text UNIQUE NOT NULL,
  target_country text,
  target_service text,
  opening_line text NOT NULL,
  context_hint text,
  default_counselor_id uuid REFERENCES counselors(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO campaigns (campaign_name, ad_source_code, target_country, target_service, opening_line, context_hint) VALUES
('UK Study 2026', 'uk-study-2026', 'UK', 'Study Visa', 'Hi [name]! I can see you''re interested in studying in the UK — excellent choice. To get started, can you tell me which level you''re thinking about — undergraduate or postgraduate?', 'Student came from UK study ad. Prioritise UK universities and IELTS requirements.'),
('Canada Jobs 2026', 'ca-jobs-2026', 'Canada', 'Job Abroad', 'Hi [name]! Great to connect — I see you''re exploring work opportunities in Canada. Tell me, do you already have a field or profession in mind, or are you still exploring options?', 'Student came from Canada jobs ad. Prioritise work permit and job placement services.'),
('IELTS Fast Track', 'ielts-2026', NULL, 'Language Learning', 'Hi [name]! I see you''re looking to boost your IELTS score — smart move. What band score are you targeting, and when is your test date?', 'Student came from IELTS ad. Prioritise test prep services and training timeline.'),
('Visit Visa UAE', 'uae-visit-2026', 'UAE', 'Visit Visa', 'Hi [name]! Planning a trip to the UAE — I can help make that happen smoothly. Is this for tourism, family visit, or something else?', 'Student came from UAE visit visa ad. Prioritise visit visa processing service.')
ON CONFLICT (ad_source_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_campaigns_ad_source_code ON campaigns(ad_source_code);
