-- Optional structured financial/sponsor intake for Visit Visa inquiries,
-- captured by reception at walk-in registration. Every field inside the
-- JSON is optional — this is background context for the assigned counselor,
-- not a gate on registration. Stored as a single jsonb column, matching the
-- existing pattern used for travel_history / visa_rejection_history /
-- language_test_scores on this table.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS visit_visa_profile jsonb;
