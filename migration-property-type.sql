-- Add property_type column to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS property_type TEXT;
