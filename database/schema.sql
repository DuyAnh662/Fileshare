-- ============================================
-- SCHEMA FOR FILE SHARING SYSTEM
-- Run this script in Supabase SQL Editor
-- ============================================

-- Table to store file info
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(20) CHECK (file_type IN ('apk', 'ipa', 'exe', 'zip', 'other')),
  drive_link TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  rejection_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0
);

-- Index for fast search
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Public can view approved files
CREATE POLICY "Public can view approved files"
  ON files FOR SELECT
  USING (status = 'approved');

-- Anyone can submit files (status = pending)
CREATE POLICY "Anyone can submit files"
  ON files FOR INSERT
  WITH CHECK (status = 'pending');

-- Only admin can edit/delete
-- (Admin will use service_role key to bypass RLS)

-- ============================================
-- INSTRUCTIONS:
-- 1. Create Supabase project at https://supabase.com
-- 2. Go to SQL Editor
-- 3. Paste and run this script
-- 4. Copy URL and anon key to config.js
-- ============================================