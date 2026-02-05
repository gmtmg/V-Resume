-- V-Resume Initial Schema
-- Phase 1: MVP Database Structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROFILES TABLE (Private - User Information)
-- ===========================================
-- Contains personal information that is NOT exposed to recruiters
-- Only the user and system admins can access this data

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    desired_job_type VARCHAR(200),
    experience TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ===========================================
-- INTERVIEWS TABLE (Public/Scoutable)
-- ===========================================
-- Contains avatar interview recordings visible to recruiters
-- NO raw face/voice data - only processed avatar videos

CREATE TYPE interview_status AS ENUM ('pending', 'approved', 'private');

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    video_url TEXT DEFAULT '',
    summary_text TEXT,
    status interview_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_interviews_profile_id ON interviews(profile_id);

-- Index for status filtering (recruiters browsing approved interviews)
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Interviews: Users can manage their own, recruiters can view approved ones
CREATE POLICY "Users can view own interviews"
    ON interviews FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own interviews"
    ON interviews FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own interviews"
    ON interviews FOR UPDATE
    USING (profile_id = auth.uid());

-- Public read access for approved interviews (for recruiters)
CREATE POLICY "Anyone can view approved interviews"
    ON interviews FOR SELECT
    USING (status = 'approved');

-- ===========================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- ===========================================
-- 1. Create bucket: interview-videos
-- 2. Set to public (for approved videos) or use signed URLs
-- 3. Configure allowed MIME types: video/webm, video/mp4

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE profiles IS 'Private user profile data - NOT exposed to recruiters';
COMMENT ON TABLE interviews IS 'Avatar interview recordings - processed videos only (no raw face/voice)';
COMMENT ON COLUMN interviews.video_url IS 'URL to processed avatar video in Supabase Storage';
COMMENT ON COLUMN interviews.summary_text IS 'AI-generated summary of interview responses';
