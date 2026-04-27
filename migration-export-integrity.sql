-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add Export Integrity Columns
-- ═══════════════════════════════════════════════════════

-- 1. Add 'is_submitted' and 'lead_stage' columns
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_stage TEXT;

-- 2. Backfill existing data
-- Any lead that isn't 'Agent Saved' or 'Archived' is considered submitted
UPDATE submissions 
SET is_submitted = true,
    lead_stage = leadStatus
WHERE leadStatus IS NOT NULL 
  AND leadStatus != 'Agent Saved'
  AND is_submitted = false;

-- Leads that were draft but now we mark them explicitly
UPDATE submissions
SET is_submitted = false,
    lead_stage = 'Draft'
WHERE leadStatus = 'Agent Saved';

-- 3. Create index for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_submissions_is_submitted ON submissions(is_submitted);
CREATE INDEX IF NOT EXISTS idx_submissions_lead_stage ON submissions(lead_stage);
