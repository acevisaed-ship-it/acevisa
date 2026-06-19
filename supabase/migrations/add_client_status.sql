-- Add status column to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- Backfill: all existing clients are active
UPDATE clients SET status = 'active' WHERE status IS NULL;
