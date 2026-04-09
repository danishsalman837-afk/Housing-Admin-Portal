-- ═══════════════════════════════════════════════════════
-- SQL Migration: CRM (Solicitor Firms & Members)
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Create 'solicitor_firms' table
CREATE TABLE IF NOT EXISTS solicitor_firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- e.g. 'Solicitor', 'Surveyor'
    main_contact TEXT,
    address TEXT,
    town TEXT,
    county TEXT,
    postcode TEXT,
    website TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create 'company_members' table
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES solicitor_firms(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    job_title TEXT,
    email TEXT,
    mobile TEXT,
    landline TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add assigned_company_id and assigned_solicitor_id to 'submissions' if they don't exist
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS assigned_company_id UUID REFERENCES solicitor_firms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_solicitor_id UUID REFERENCES company_members(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_company ON submissions(assigned_company_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_solicitor ON submissions(assigned_solicitor_id);
