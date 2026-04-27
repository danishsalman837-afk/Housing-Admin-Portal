-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add Export Integrity Columns (ROBUST)
-- ═══════════════════════════════════════════════════════

-- 1. Add 'is_submitted' and 'lead_stage' columns if they don't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_stage TEXT;

-- 2. Backfill existing data
-- Rule: Any lead that is NOT 'Agent Saved' is considered submitted (is_submitted = true)
-- We sync the 'lead_stage' column with the existing "leadStatus" column for consistency.

UPDATE submissions 
SET is_submitted = true,
    lead_stage = "leadStatus"
WHERE "leadStatus" IS NOT NULL 
  AND "leadStatus" != 'Agent Saved'
  AND (is_submitted = false OR is_submitted IS NULL);

-- Rule: Leads that are specifically 'Agent Saved' are drafts (is_submitted = false)
UPDATE submissions
SET is_submitted = false,
    lead_stage = 'Draft'
WHERE "leadStatus" = 'Agent Saved';

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_submissions_is_submitted ON submissions(is_submitted);
CREATE INDEX IF NOT EXISTS idx_submissions_lead_stage ON submissions(lead_stage);
