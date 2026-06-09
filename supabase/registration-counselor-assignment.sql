-- Registration counselor assignment — run in Supabase SQL Editor

ALTER TABLE counselors ADD COLUMN IF NOT EXISTS role text DEFAULT 'counselor';

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS default_counselor_id uuid REFERENCES counselors(id);

-- Set your admin account(s):
-- UPDATE counselors SET role = 'admin' WHERE email = 'your@email.com';
