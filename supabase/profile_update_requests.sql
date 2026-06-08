-- Chat-triggered profile update requests (Section 10)
CREATE TABLE profile_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  triggered_by_message text NOT NULL,
  proposed_changes jsonb NOT NULL,
  reviewed_fields jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES counselors(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profile_update_requests_client_id ON profile_update_requests(client_id);
CREATE INDEX idx_profile_update_requests_status ON profile_update_requests(status);
