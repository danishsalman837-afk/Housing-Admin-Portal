-- Add accepted_at column to solicitor_activity table
ALTER TABLE solicitor_activity ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
