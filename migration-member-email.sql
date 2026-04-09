-- Add email authorization field to company members
ALTER TABLE company_members 
ADD COLUMN IF NOT EXISTS can_receive_emails BOOLEAN DEFAULT true;

-- Update existing members to true by default (or false if you prefer, but usually we want to keep current parity)
-- UPDATE company_members SET can_receive_emails = true;
