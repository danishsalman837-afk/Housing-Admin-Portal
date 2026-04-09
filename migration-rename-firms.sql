-- ═══════════════════════════════════════════════════════
-- SQL Migration: Rename solicitor_firms to companies
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Ensure 'companies' table exists and has data from solicitor_firms
-- (If you already created the table via UI, this will ensure data is moved)
INSERT INTO companies (id, name, type, main_contact, address, town, county, postcode, website, active, created_at)
SELECT id, name, type, main_contact, address, town, county, postcode, website, active, created_at
FROM solicitor_firms
ON CONFLICT (id) DO NOTHING;

-- 2. Update 'company_members' foreign key
ALTER TABLE company_members 
DROP CONSTRAINT IF EXISTS company_members_company_id_fkey;

ALTER TABLE company_members
ADD CONSTRAINT company_members_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 3. Update 'submissions' foreign key
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_assigned_company_id_fkey;

ALTER TABLE submissions
ADD CONSTRAINT submissions_assigned_company_id_fkey 
FOREIGN KEY (assigned_company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- 4. Clean up
-- DROP TABLE solicitor_firms; -- Uncomment this line ONLY after verifying data is in 'companies'
