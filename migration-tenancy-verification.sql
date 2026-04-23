-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add Tenancy Verification Fields
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS tenancy_on_name TEXT,
ADD COLUMN IF NOT EXISTS tenancy_type TEXT,
ADD COLUMN IF NOT EXISTS is_name_on_joint TEXT,
ADD COLUMN IF NOT EXISTS other_tenant_name TEXT,
ADD COLUMN IF NOT EXISTS actual_tenant_fullname TEXT;

-- Comment: These fields are used for the Tenancy Verification logic in the Agent Web Form and Admin Portal.
