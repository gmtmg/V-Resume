-- V-Resume Phase 2: Feature Expansion Schema
-- マッチングプラットフォーム拡張

-- ===========================================
-- 1. PROFILES TABLE EXTENSIONS
-- ===========================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_category VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_locations TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_conditions JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Index for auth user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- Index for searchable profiles
CREATE INDEX IF NOT EXISTS idx_profiles_searchable ON profiles(is_searchable) WHERE is_searchable = TRUE;

-- ===========================================
-- 2. COMPANIES TABLE (企業)
-- ===========================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    auth_user_id UUID REFERENCES auth.users(id),
    plan_type VARCHAR(50) DEFAULT 'free',
    monthly_view_limit INTEGER DEFAULT 10,
    views_used_this_month INTEGER DEFAULT 0,
    billing_reset_date DATE DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for auth user lookup
CREATE INDEX IF NOT EXISTS idx_companies_auth_user_id ON companies(auth_user_id);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

-- ===========================================
-- 3. VIDEO_VIEWS TABLE (閲覧ログ)
-- ===========================================

CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    view_token VARCHAR(100) UNIQUE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    billing_period DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
);

-- Unique constraint to prevent duplicate billing per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_views_unique_billing
    ON video_views(company_id, interview_id, billing_period);

-- Index for company view history
CREATE INDEX IF NOT EXISTS idx_video_views_company ON video_views(company_id, viewed_at DESC);

-- ===========================================
-- 4. OFFERS TABLE (オファー)
-- ===========================================

-- Create offer status enum if not exists
DO $$ BEGIN
    CREATE TYPE offer_status AS ENUM ('pending', 'viewed', 'accepted', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
    message TEXT,
    position_title VARCHAR(200),
    status offer_status DEFAULT 'pending',
    accept_token VARCHAR(100) UNIQUE,
    reject_token VARCHAR(100) UNIQUE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);

-- Index for profile's received offers
CREATE INDEX IF NOT EXISTS idx_offers_profile ON offers(profile_id, sent_at DESC);

-- Index for company's sent offers
CREATE INDEX IF NOT EXISTS idx_offers_company ON offers(company_id, sent_at DESC);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_offers_accept_token ON offers(accept_token);
CREATE INDEX IF NOT EXISTS idx_offers_reject_token ON offers(reject_token);

-- ===========================================
-- 5. SMS_VERIFICATIONS TABLE (SMS認証ログ)
-- ===========================================

CREATE TABLE IF NOT EXISTS sms_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'registration', 'login'
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookup
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone, expires_at DESC);

-- ===========================================
-- 6. MASTER TABLES (マスターデータ)
-- ===========================================

-- 職種カテゴリマスター
CREATE TABLE IF NOT EXISTS job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_code VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 勤務地マスター（都道府県）
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    region VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see/edit their own company
CREATE POLICY "Companies can view own company"
    ON companies FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Companies can insert own company"
    ON companies FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Companies can update own company"
    ON companies FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Video Views: Companies can see their own views
CREATE POLICY "Companies can view own video_views"
    ON video_views FOR SELECT
    USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY "Companies can insert video_views"
    ON video_views FOR INSERT
    WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Offers: Companies can manage their sent offers
CREATE POLICY "Companies can view own offers"
    ON offers FOR SELECT
    USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY "Companies can insert offers"
    ON offers FOR INSERT
    WITH CHECK (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

CREATE POLICY "Companies can update own offers"
    ON offers FOR UPDATE
    USING (company_id IN (SELECT id FROM companies WHERE auth_user_id = auth.uid()));

-- Offers: Profiles can view their received offers
CREATE POLICY "Profiles can view received offers"
    ON offers FOR SELECT
    USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Profiles: Allow viewing searchable profiles for companies
CREATE POLICY "Companies can view searchable profiles"
    ON profiles FOR SELECT
    USING (
        is_searchable = TRUE
        AND EXISTS (SELECT 1 FROM companies WHERE auth_user_id = auth.uid())
    );

-- Master tables: Public read access
CREATE POLICY "Anyone can view job_categories"
    ON job_categories FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Anyone can view locations"
    ON locations FOR SELECT
    USING (is_active = TRUE);

-- SMS Verifications: No direct access (use service role)
-- This ensures SMS codes are only accessible via server-side API

-- ===========================================
-- 8. UPDATED_AT TRIGGERS
-- ===========================================

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 9. HELPER FUNCTIONS
-- ===========================================

-- Function to reset monthly view counts
CREATE OR REPLACE FUNCTION reset_monthly_view_counts()
RETURNS void AS $$
BEGIN
    UPDATE companies
    SET views_used_this_month = 0,
        billing_reset_date = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE
    WHERE billing_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and increment view count
CREATE OR REPLACE FUNCTION record_video_view(
    p_company_id UUID,
    p_interview_id UUID,
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_company companies%ROWTYPE;
    v_existing video_views%ROWTYPE;
    v_billing_period DATE;
    v_view_token VARCHAR(100);
BEGIN
    -- Get current billing period
    v_billing_period := DATE_TRUNC('month', CURRENT_DATE)::DATE;

    -- Check if view already exists for this billing period
    SELECT * INTO v_existing
    FROM video_views
    WHERE company_id = p_company_id
      AND interview_id = p_interview_id
      AND billing_period = v_billing_period;

    IF FOUND THEN
        -- Already viewed this month, return existing
        RETURN jsonb_build_object(
            'success', TRUE,
            'is_new_view', FALSE,
            'view_id', v_existing.id
        );
    END IF;

    -- Get company info
    SELECT * INTO v_company FROM companies WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Company not found');
    END IF;

    -- Check view limit
    IF v_company.views_used_this_month >= v_company.monthly_view_limit THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Monthly view limit reached',
            'limit', v_company.monthly_view_limit,
            'used', v_company.views_used_this_month
        );
    END IF;

    -- Generate view token
    v_view_token := encode(gen_random_bytes(32), 'hex');

    -- Insert view record
    INSERT INTO video_views (company_id, interview_id, profile_id, view_token, billing_period)
    VALUES (p_company_id, p_interview_id, p_profile_id, v_view_token, v_billing_period);

    -- Increment counter
    UPDATE companies
    SET views_used_this_month = views_used_this_month + 1
    WHERE id = p_company_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'is_new_view', TRUE,
        'view_token', v_view_token,
        'remaining_views', v_company.monthly_view_limit - v_company.views_used_this_month - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 10. MASTER DATA INSERT
-- ===========================================

-- Job Categories (職種カテゴリ)
INSERT INTO job_categories (code, name, sort_order) VALUES
    ('engineering', 'エンジニア・技術職', 1),
    ('sales', '営業', 2),
    ('marketing', 'マーケティング・広報', 3),
    ('design', 'デザイン・クリエイティブ', 4),
    ('hr', '人事・総務', 5),
    ('finance', '経理・財務', 6),
    ('consulting', 'コンサルティング', 7),
    ('management', '経営・管理職', 8),
    ('service', 'サービス・接客', 9),
    ('medical', '医療・福祉', 10),
    ('education', '教育', 11),
    ('legal', '法務', 12),
    ('other', 'その他', 99)
ON CONFLICT (code) DO NOTHING;

-- Locations (都道府県)
INSERT INTO locations (code, name, region, sort_order) VALUES
    ('01', '北海道', '北海道', 1),
    ('02', '青森県', '東北', 2),
    ('03', '岩手県', '東北', 3),
    ('04', '宮城県', '東北', 4),
    ('05', '秋田県', '東北', 5),
    ('06', '山形県', '東北', 6),
    ('07', '福島県', '東北', 7),
    ('08', '茨城県', '関東', 8),
    ('09', '栃木県', '関東', 9),
    ('10', '群馬県', '関東', 10),
    ('11', '埼玉県', '関東', 11),
    ('12', '千葉県', '関東', 12),
    ('13', '東京都', '関東', 13),
    ('14', '神奈川県', '関東', 14),
    ('15', '新潟県', '中部', 15),
    ('16', '富山県', '中部', 16),
    ('17', '石川県', '中部', 17),
    ('18', '福井県', '中部', 18),
    ('19', '山梨県', '中部', 19),
    ('20', '長野県', '中部', 20),
    ('21', '岐阜県', '中部', 21),
    ('22', '静岡県', '中部', 22),
    ('23', '愛知県', '中部', 23),
    ('24', '三重県', '近畿', 24),
    ('25', '滋賀県', '近畿', 25),
    ('26', '京都府', '近畿', 26),
    ('27', '大阪府', '近畿', 27),
    ('28', '兵庫県', '近畿', 28),
    ('29', '奈良県', '近畿', 29),
    ('30', '和歌山県', '近畿', 30),
    ('31', '鳥取県', '中国', 31),
    ('32', '島根県', '中国', 32),
    ('33', '岡山県', '中国', 33),
    ('34', '広島県', '中国', 34),
    ('35', '山口県', '中国', 35),
    ('36', '徳島県', '四国', 36),
    ('37', '香川県', '四国', 37),
    ('38', '愛媛県', '四国', 38),
    ('39', '高知県', '四国', 39),
    ('40', '福岡県', '九州', 40),
    ('41', '佐賀県', '九州', 41),
    ('42', '長崎県', '九州', 42),
    ('43', '熊本県', '九州', 43),
    ('44', '大分県', '九州', 44),
    ('45', '宮崎県', '九州', 45),
    ('46', '鹿児島県', '九州', 46),
    ('47', '沖縄県', '九州', 47),
    ('00', 'リモート可', 'リモート', 0)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- 11. COMMENTS
-- ===========================================

COMMENT ON TABLE companies IS '企業アカウント情報';
COMMENT ON TABLE video_views IS '動画閲覧ログ（課金カウント用）';
COMMENT ON TABLE offers IS '企業から求職者へのオファー';
COMMENT ON TABLE sms_verifications IS 'SMS認証コード管理';
COMMENT ON TABLE job_categories IS '職種カテゴリマスター';
COMMENT ON TABLE locations IS '勤務地マスター';

COMMENT ON COLUMN profiles.phone_verified IS 'SMS認証済みフラグ';
COMMENT ON COLUMN profiles.job_category IS 'GPT判定された職種カテゴリ';
COMMENT ON COLUMN profiles.is_searchable IS '企業検索に表示するか';
COMMENT ON COLUMN companies.monthly_view_limit IS '月間動画閲覧上限';
COMMENT ON COLUMN companies.views_used_this_month IS '今月の閲覧数';
COMMENT ON COLUMN video_views.billing_period IS '課金対象期間（月初日）';
COMMENT ON COLUMN offers.accept_token IS 'オファー承認用トークン';
COMMENT ON COLUMN offers.reject_token IS 'オファー拒否用トークン';
