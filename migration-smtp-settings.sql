-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add SMTP Settings to Companies
-- Run this in the Supabase SQL Editor to support solicitor-specific email routing
-- ═══════════════════════════════════════════════════════

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS smtp_host TEXT,
ADD COLUMN IF NOT EXISTS smtp_port TEXT DEFAULT '587',
ADD COLUMN IF NOT EXISTS smtp_user TEXT,
ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true;

-- Optional: Add a note or description field if not already present
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT;
