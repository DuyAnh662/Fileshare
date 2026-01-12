-- ============================================
-- SCHEMA FOR PENDING_FILES (Files for approval)
-- Run this script in Supabase SQL Editor
-- ============================================

-- Table for pending files (use pending_files instead of check as check is SQL keyword)
CREATE TABLE IF NOT EXISTS pending_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(20) CHECK (file_type IN ('apk', 'ipa', 'exe', 'zip', 'other')),
  drive_link TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pending_files_created_at ON pending_files(created_at DESC);

-- Row Level Security
ALTER TABLE pending_files ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Allow INSERT only, NO SELECT
-- Code doesn't need to read row after insert
-- Anonymous users only need INSERT
CREATE POLICY "allow_anon_insert_pending"
  ON pending_files
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_insert_pending"
  ON pending_files
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admin (service_role) can read/delete - no policy needed as service_role bypasses RLS

-- ============================================
-- ADD HIDDEN COLUMN TO FILES TABLE (if not exists)
-- ============================================
ALTER TABLE files ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Update policy to hide hidden files
DROP POLICY IF EXISTS "Public can view approved files" ON files;
DROP POLICY IF EXISTS "Public can view approved and visible files" ON files;
CREATE POLICY "Public can view visible files"
  ON files FOR SELECT
  USING (hidden = false);