-- ============================================
-- REPORT SYSTEM SCHEMA
-- Run this script in Supabase SQL Editor
-- ============================================

-- 1. Create table file_reports
CREATE TABLE IF NOT EXISTS file_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    ip_address TEXT,
    reason TEXT DEFAULT 'broken_link',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create unique index to prevent spam report (1 IP per file)
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_reports_unique ON file_reports(file_id, ip_address);

-- 3. RLS Policies
ALTER TABLE file_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert report
CREATE POLICY "Anyone can report files"
    ON file_reports FOR INSERT
    WITH CHECK (true);

-- Admin can view reports (if needed)
CREATE POLICY "Admin can view reports"
    ON file_reports FOR SELECT
    USING (auth.role() = 'service_role');

-- 4. RPC Function to submit report and auto-hide file
CREATE OR REPLACE FUNCTION submit_report(
    p_file_id UUID,
    p_ip_address TEXT,
    p_reason TEXT DEFAULT 'broken_link'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as admin to update files table
AS $$
DECLARE
    v_report_count INT;
    v_already_reported BOOLEAN;
BEGIN
    -- Check if this IP reported this file
    SELECT EXISTS (
        SELECT 1 FROM file_reports 
        WHERE file_id = p_file_id AND ip_address = p_ip_address
    ) INTO v_already_reported;
    
    IF v_already_reported THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already reported this file');
    END IF;

    -- Insert report
    INSERT INTO file_reports (file_id, ip_address, reason)
    VALUES (p_file_id, p_ip_address, p_reason);
    
    -- Count total reports for this file
    SELECT COUNT(*) INTO v_report_count
    FROM file_reports
    WHERE file_id = p_file_id;
    
    -- If >= 5 reports -> Hide file (inactive)
    IF v_report_count >= 5 THEN
        UPDATE files
        SET status = 'inactive'
        WHERE id = p_file_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Report submitted. File has been hidden due to high report count.',
            'hidden', true
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Report submitted',
        'hidden', false
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
