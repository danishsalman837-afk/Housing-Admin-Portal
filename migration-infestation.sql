-- Add infestation column to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS infestation TEXT;
