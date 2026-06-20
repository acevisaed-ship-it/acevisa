-- Team commission policy (single-row settings table)
-- referral_rate:      % of deal commission paid to the referring counselor when another counselor closes their referred lead
-- pool_rate:          % of every closed deal commission that goes into the shared team pool
-- pool_distribution:  how the pool is split — 'equal' (even split) | 'performance' (by individual commission earned that month)
-- pool_enabled:       master switch for the team pool
-- referral_enabled:   master switch for referral commissions

CREATE TABLE IF NOT EXISTS team_commission_policy (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_enabled     boolean NOT NULL DEFAULT false,
  referral_rate        numeric(5,2) NOT NULL DEFAULT 5,      -- e.g. 5 = 5%
  pool_enabled         boolean NOT NULL DEFAULT false,
  pool_rate            numeric(5,2) NOT NULL DEFAULT 5,      -- e.g. 5 = 5% of each deal
  pool_distribution    text NOT NULL DEFAULT 'equal'         -- 'equal' | 'performance'
    CHECK (pool_distribution IN ('equal', 'performance')),
  notes                text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Seed a default row so the API always finds one
INSERT INTO team_commission_policy (referral_enabled, referral_rate, pool_enabled, pool_rate, pool_distribution)
VALUES (false, 5, false, 5, 'equal')
ON CONFLICT DO NOTHING;
