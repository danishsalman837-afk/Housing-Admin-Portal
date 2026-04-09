-- ═══════════════════════════════════════════════════════
-- SQL Migration: Solicitor Activity Workflow
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Add new columns to the 'submissions' table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS unique_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS actual_status TEXT DEFAULT 'New';

-- 2. Drop table if a partial version exists from a previous attempt
DROP TABLE IF EXISTS solicitor_activity;

-- 3. Create the 'solicitor_activity' table
--    lead_id = INTEGER (matches submissions.id)
--    solicitor_id = UUID (matches company_members.id)
CREATE TABLE solicitor_activity (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    solicitor_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Allocated' CHECK (status IN ('Allocated', 'Sent', 'Accepted', 'Rejected')),
    rejection_reason TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_solicitor_activity_lead_id ON solicitor_activity(lead_id);
CREATE INDEX IF NOT EXISTS idx_solicitor_activity_solicitor_id ON solicitor_activity(solicitor_id);
CREATE INDEX IF NOT EXISTS idx_solicitor_activity_status ON solicitor_activity(status);
CREATE INDEX IF NOT EXISTS idx_submissions_unique_token ON submissions(unique_token);

-- 5. Generate unique tokens for existing leads that don't have one
UPDATE submissions
SET unique_token = gen_random_uuid()::text
WHERE unique_token IS NULL;
