-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add Agent Name Column
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Comment: This column will store the name of the agent who submitted the lead.
