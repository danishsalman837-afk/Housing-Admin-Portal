-- ═══════════════════════════════════════════════════════
-- SQL Migration: Add Attachments Column
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Comment: This column will store an array of objects:
-- [
--   { "name": "image1.jpg", "url": "https://...", "size": 12345 },
--   ...
-- ]
