-- Add pixel_id column to connections table for Meta Pixel tracking
ALTER TABLE connections ADD COLUMN IF NOT EXISTS pixel_id text;
