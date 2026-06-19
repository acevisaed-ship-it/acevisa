-- Add avatar_url column to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS avatar_url text;
