-- ═══════════════════════════════════════════════════════
-- SQL Migration: Agent Data Backup & Edit Tracking
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS agent_data JSONB,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Optional: Index for filtering by edited status
CREATE INDEX IF NOT EXISTS idx_submissions_is_edited ON submissions(is_edited);
