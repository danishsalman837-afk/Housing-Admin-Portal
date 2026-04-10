-- Add accepted_at and rejected_at columns to solicitor_activity table
ALTER TABLE solicitor_activity ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE solicitor_activity ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
