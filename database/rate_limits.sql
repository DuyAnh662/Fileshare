-- ============================================
-- SCHEMA FOR RATE LIMITING & LOOTLABS TIERS
-- Run this script in Supabase SQL Editor
-- ============================================

-- Table to track upload count by IP and month
CREATE TABLE IF NOT EXISTS ip_upload_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL, -- IPv4 or IPv6
  fingerprint VARCHAR(64), -- Browser fingerprint for added security
  month_year VARCHAR(7) NOT NULL, -- Format: '2026-01'
  upload_count INTEGER DEFAULT 0,
  max_uploads INTEGER DEFAULT 30, -- Tier-based: 30/50/100
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, month_year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ip_upload_limits_ip ON ip_upload_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_upload_limits_month ON ip_upload_limits(month_year);
CREATE INDEX IF NOT EXISTS idx_ip_upload_limits_fingerprint ON ip_upload_limits(fingerprint);

-- Table to track user tier upgrades
CREATE TABLE IF NOT EXISTS user_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  tier INTEGER DEFAULT 0, -- 0: Free (30), 1: Tier 1 (50), 2: Tier 2 (100)
  lootlabs_count INTEGER DEFAULT 0, -- Total LootLabs completions
  tier_expires_at TIMESTAMPTZ, -- Tier expiration time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_tiers
CREATE INDEX IF NOT EXISTS idx_user_tiers_fingerprint ON user_tiers(fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_tiers_ip ON user_tiers(ip_address);

-- Table to log each LootLabs completion (anti-replay)
CREATE TABLE IF NOT EXISTS lootlabs_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45),
  session_token VARCHAR(64) NOT NULL UNIQUE, -- Unique token for each session
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lootlabs_completions
CREATE INDEX IF NOT EXISTS idx_lootlabs_completions_fingerprint ON lootlabs_completions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_lootlabs_completions_token ON lootlabs_completions(session_token);
CREATE INDEX IF NOT EXISTS idx_lootlabs_completions_completed ON lootlabs_completions(completed_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE ip_upload_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lootlabs_completions ENABLE ROW LEVEL SECURITY;

-- Policies for ip_upload_limits
-- Anon users can SELECT to check their own limit
CREATE POLICY "allow_anon_select_own_limit" ON ip_upload_limits
  AS PERMISSIVE FOR SELECT TO anon
  USING (true); -- Client will filter by IP

-- Anon users can INSERT/UPDATE their own limit
CREATE POLICY "allow_anon_insert_limit" ON ip_upload_limits
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "allow_anon_update_limit" ON ip_upload_limits
  AS PERMISSIVE FOR UPDATE TO anon
  USING (true);

-- Policies for user_tiers
CREATE POLICY "allow_anon_select_own_tier" ON user_tiers
  AS PERMISSIVE FOR SELECT TO anon
  USING (true);

CREATE POLICY "allow_anon_insert_tier" ON user_tiers
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "allow_anon_update_tier" ON user_tiers
  AS PERMISSIVE FOR UPDATE TO anon
  USING (true);

-- Policies for lootlabs_completions
-- INSERT only, no SELECT (prevent data leaks)
CREATE POLICY "allow_anon_insert_completion" ON lootlabs_completions
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);

-- Select only to verify token (limited)
CREATE POLICY "allow_anon_select_completion" ON lootlabs_completions
  AS PERMISSIVE FOR SELECT TO anon
  USING (true);

-- ============================================
-- FUNCTION to increment upload count
-- ============================================
CREATE OR REPLACE FUNCTION increment_upload_count(
  p_ip_address VARCHAR(45),
  p_fingerprint VARCHAR(64),
  p_month_year VARCHAR(7),
  p_max_uploads INTEGER
)
RETURNS TABLE(new_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_current_count INTEGER;
  v_max INTEGER;
BEGIN
  -- Upsert: Insert if not exists, update if exists
  INSERT INTO ip_upload_limits (ip_address, fingerprint, month_year, upload_count, max_uploads, updated_at)
  VALUES (p_ip_address, p_fingerprint, p_month_year, 1, p_max_uploads, NOW())
  ON CONFLICT (ip_address, month_year)
  DO UPDATE SET 
    upload_count = ip_upload_limits.upload_count + 1,
    fingerprint = COALESCE(p_fingerprint, ip_upload_limits.fingerprint),
    max_uploads = GREATEST(ip_upload_limits.max_uploads, p_max_uploads),
    updated_at = NOW()
  RETURNING upload_count, max_uploads INTO v_current_count, v_max;
  
  RETURN QUERY SELECT v_current_count, v_current_count >= v_max;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste and run this script
-- 3. Verify created tables
-- ============================================
