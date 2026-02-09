# V-Resume サービス詳細設計書 (Phase 1 & 2)

## 1. サービス概要

アバターと加工音声を用いた「プライバシー特化型」のスカウト登録サービス。ユーザーは素顔や生声を出すことなく、AI面接を通じて自身のスキルや人柄を企業にアピールできる。

### 1.1. コンセプト
- **Privacy-First**: 素顔・生声を一切サーバーに送信しない
- **手軽さ**: 5つの質問に各60秒で回答するだけ
- **AI活用**: 音声認識と要約生成で採用担当者の負担軽減
- **マッチング**: 企業と求職者を動画でつなぐプラットフォーム

---

## 2. システムアーキテクチャ

### 2.1. 技術スタック

| レイヤー | 技術 |
|---------|------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 |
| **Backend/DB** | Supabase (PostgreSQL, Auth, Storage) |
| **Face Tracking** | MediaPipe Face Landmarker |
| **3D Rendering** | Three.js 0.170, @pixiv/three-vrm 3.3 |
| **Audio Processing** | Web Audio API (Pitch Shifter) |
| **AI/LLM** | OpenAI API (Whisper, GPT-4o mini) |
| **SMS認証** | Twilio |

### 2.2. フォルダ構成

```
/src
├── app/                        # Next.js App Router
│   ├── page.tsx               # ランディング/登録ページ
│   ├── verify-phone/          # SMS認証 (Phase 2)
│   ├── login/                 # 求職者ログイン (Phase 2)
│   ├── system-check/          # カメラ・マイク確認
│   ├── interview/             # 面接録画
│   ├── complete/              # 完了ページ
│   ├── profile/
│   │   └── setup/             # プロフィール設定 (Phase 2)
│   ├── mypage/                # 求職者マイページ (Phase 2)
│   ├── offer-response/
│   │   └── [id]/              # オファー応答 (Phase 2)
│   ├── admin/                 # 企業管理画面 (Phase 2)
│   │   ├── layout.tsx         # 管理画面レイアウト
│   │   ├── login/             # 企業ログイン
│   │   ├── register/          # 企業登録
│   │   ├── dashboard/         # ダッシュボード
│   │   ├── candidates/        # 求職者検索
│   │   │   └── [id]/          # 求職者詳細
│   │   ├── offers/            # オファー管理
│   │   └── usage/             # 利用状況
│   └── api/                   # API Routes
│       ├── transcribe/        # Whisper文字起こし
│       ├── summarize/         # GPT-4o mini要約
│       ├── auth/              # 認証 (Phase 2)
│       │   ├── send-sms/      # SMS送信
│       │   └── verify-sms/    # SMS認証
│       ├── profile/           # プロフィール (Phase 2)
│       │   └── detect-category/ # GPT職種判定
│       ├── offers/            # オファー (Phase 2)
│       │   └── [id]/
│       │       ├── respond/   # オファー応答
│       │       └── view/      # オファー閲覧
│       ├── master/            # マスターデータ (Phase 2)
│       │   ├── job-categories/
│       │   └── locations/
│       └── admin/             # 企業API (Phase 2)
│           ├── auth/
│           ├── candidates/
│           ├── offers/
│           └── usage/
├── components/
│   ├── avatar/                # アバター描画
│   ├── chat/                  # チャットUI (将来用)
│   └── recording/             # 録画セッション
├── hooks/                     # カスタムフック
│   ├── useMediaPipe.ts        # 顔認識
│   ├── useRecorder.ts         # 録画管理
│   └── useProfileStorage.ts
├── lib/
│   ├── audio/                 # 音声処理
│   │   ├── PitchShifter.ts
│   │   └── CompositeRecorder.ts
│   ├── avatar/                # VRMアバター
│   │   └── VRMAvatar.ts
│   ├── supabase/              # DB連携
│   │   ├── client.ts          # ブラウザ用
│   │   ├── server.ts          # SSR用
│   │   └── admin.ts           # Service Role用 (Phase 2)
│   └── twilio/                # SMS連携 (Phase 2)
│       └── index.ts
└── types/                     # 型定義
    ├── profile.ts
    ├── interview.ts
    ├── company.ts             # (Phase 2)
    ├── offer.ts               # (Phase 2)
    ├── master.ts              # (Phase 2)
    └── sms.ts                 # (Phase 2)
```

---

## 3. Phase 2: マッチングプラットフォーム

### 3.1. 求職者フロー

```
1. 氏名・電話番号入力 (/)
   ↓
2. SMS認証コード入力 (/verify-phone)
   ↓
3. システムチェック (/system-check)
   ↓
4. 動画撮影 (/interview)
   ↓
5. プロフィール設定 (/profile/setup)
   - 職種カテゴリ（GPT自動判定、変更可）
   - 勤務可能地
   - 勤務条件
   ↓
6. 完了 (/complete)
   ↓
7. マイページ (/mypage) ← SMSログインでアクセス
```

### 3.2. 企業フロー

```
1. 企業登録 (/admin/register)
   - メールアドレス入力
   - マジックリンク送信
   ↓
2. ダッシュボード (/admin/dashboard)
   ↓
3. 求職者検索 (/admin/candidates)
   - フィルター: 職種、勤務地、条件
   - 動画閲覧 → 閲覧カウント
   ↓
4. オファー送信 (/admin/candidates/[id])
   - 求職者にSMS通知
   ↓
5. 承認待ち (/admin/offers)
   - 承認されたら電話番号を取得
   - 求職者は検索から非表示に
```

---

## 4. データベーススキーマ

### 4.1. Phase 1 テーブル

**`profiles` テーブル (Private)**
```sql
id: UUID (Primary Key)
full_name: VARCHAR(100)
email: VARCHAR(255) UNIQUE
phone: VARCHAR(20)
desired_job_type: VARCHAR(200)
experience: TEXT
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
-- Phase 2 追加カラム
phone_verified: BOOLEAN DEFAULT FALSE
job_category: VARCHAR(100)
available_locations: TEXT[]
work_conditions: JSONB
is_searchable: BOOLEAN DEFAULT TRUE
auth_user_id: UUID
```

**`interviews` テーブル (Public/Scoutable)**
```sql
id: UUID (Primary Key)
profile_id: UUID (Foreign Key → profiles)
video_url: TEXT
summary_text: TEXT
status: ENUM ('pending', 'approved', 'private')
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

### 4.2. Phase 2 テーブル

**`companies` テーブル（企業）**
```sql
id: UUID (Primary Key)
name: VARCHAR(200)
email: VARCHAR(255) UNIQUE
auth_user_id: UUID
plan_type: VARCHAR(50) DEFAULT 'free'
monthly_view_limit: INTEGER DEFAULT 10
views_used_this_month: INTEGER DEFAULT 0
billing_reset_date: DATE
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

**`sms_verifications` テーブル（SMS認証）**
```sql
id: UUID (Primary Key)
phone: VARCHAR(20)
code: VARCHAR(6)
purpose: VARCHAR(50)  -- 'registration' or 'login'
is_used: BOOLEAN DEFAULT FALSE
attempts: INTEGER DEFAULT 0
expires_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ
```

**`video_views` テーブル（閲覧ログ）**
```sql
id: UUID (Primary Key)
company_id: UUID (Foreign Key → companies)
interview_id: UUID (Foreign Key → interviews)
profile_id: UUID (Foreign Key → profiles)
view_token: VARCHAR(100) UNIQUE
viewed_at: TIMESTAMPTZ
billing_period: DATE
UNIQUE(company_id, interview_id, billing_period)
```

**`offers` テーブル（オファー）**
```sql
id: UUID (Primary Key)
company_id: UUID (Foreign Key → companies)
profile_id: UUID (Foreign Key → profiles)
interview_id: UUID (Foreign Key → interviews)
message: TEXT
position_title: VARCHAR(200)
status: ENUM ('pending', 'viewed', 'accepted', 'rejected', 'expired')
accept_token: VARCHAR(100) UNIQUE
reject_token: VARCHAR(100) UNIQUE
sent_at: TIMESTAMPTZ
viewed_at: TIMESTAMPTZ
responded_at: TIMESTAMPTZ
expires_at: TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
```

**`job_categories` テーブル（職種マスター）**
```sql
id: UUID (Primary Key)
code: VARCHAR(50) UNIQUE
name: VARCHAR(100)
parent_code: VARCHAR(50)
sort_order: INTEGER
is_active: BOOLEAN DEFAULT TRUE
```

**`locations` テーブル（勤務地マスター）**
```sql
id: UUID (Primary Key)
code: VARCHAR(10) UNIQUE
name: VARCHAR(50)
region: VARCHAR(50)
sort_order: INTEGER
is_active: BOOLEAN DEFAULT TRUE
```

### 4.3. ER図

```
┌─────────────┐     ┌─────────────┐
│  profiles   │────▶│ interviews  │
│  (求職者)    │     │ (面接動画)   │
└─────────────┘     └─────────────┘
       │                   │
       │    ┌──────────────┘
       ▼    ▼
┌─────────────┐     ┌─────────────┐
│   offers    │◀────│  companies  │
│ (オファー)   │     │  (企業)     │
└─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       └───────────▶│ video_views │
                    │ (閲覧ログ)   │
                    └─────────────┘

┌─────────────────┐  ┌─────────────┐
│sms_verifications│  │job_categories│
│  (SMS認証)       │  │ (職種)       │
└─────────────────┘  └─────────────┘

┌─────────────┐
│  locations  │
│ (勤務地)    │
└─────────────┘
```

---

## 5. API設計

### 5.1. Phase 1 API

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/transcribe` | Whisper音声→テキスト変換 |
| POST | `/api/summarize` | GPT-4o mini 面接要約生成 |

### 5.2. Phase 2 API

#### 認証系
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/auth/send-sms` | Twilio経由でSMS送信 |
| POST | `/api/auth/verify-sms` | 認証コード確認 |

#### 求職者系
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET/POST | `/api/profile` | プロフィール取得・更新 |
| POST | `/api/profile/detect-category` | GPTで職種カテゴリ判定 |
| GET | `/api/offers` | 自分へのオファー一覧 |
| POST | `/api/offers/[id]/respond` | オファー承認/拒否 |
| POST | `/api/offers/[id]/view` | オファー閲覧マーク |

#### 企業系
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/admin/auth/register` | 企業登録 |
| POST | `/api/admin/auth/send-magic-link` | マジックリンク送信 |
| POST | `/api/admin/auth/verify` | 企業認証確認 |
| GET | `/api/admin/candidates` | 求職者一覧（フィルター付き） |
| POST | `/api/admin/candidates/[id]/view` | 動画閲覧記録 |
| GET/POST | `/api/admin/offers` | オファー一覧・送信 |
| GET | `/api/admin/usage` | 閲覧数・利用状況 |

#### マスターデータ
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/master/job-categories` | 職種一覧 |
| GET | `/api/master/locations` | 勤務地一覧 |

---

## 6. 認証設計

### 6.1. 求職者認証（SMS）

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ ユーザー │    │ Server  │    │ Twilio  │
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     │ 電話番号入力  │              │
     │─────────────▶│              │
     │              │ SMS送信依頼  │
     │              │─────────────▶│
     │              │   成功応答   │
     │              │◀─────────────│
     │              │              │
     │ 6桁コード入力 │     SMS      │
     │◀─────────────│◀─────────────│
     │─────────────▶│              │
     │              │ DB検証       │
     │  認証完了    │              │
     │◀─────────────│              │
```

**セキュリティ対策**:
- 認証コード: 6桁数字
- 有効期限: 10分
- 試行回数: 最大5回
- レート制限: 1時間に5通まで

### 6.2. 企業認証（マジックリンク）

Supabase Auth のメールOTP機能を使用。

---

## 7. 課金・閲覧制限

### 7.1. プラン

| プラン | 月額 | 動画閲覧数 |
|--------|------|-----------|
| Free | ¥0 | 10件/月 |
| Basic | ¥9,800 | 50件/月 |
| Premium | ¥29,800 | 200件/月 |

### 7.2. 閲覧カウントロジック

- 同一企業・同一面接は**月1回のみカウント**
- `video_views`テーブルの`billing_period`で管理
- 月初に`views_used_this_month`をリセット

```sql
-- 閲覧記録関数
CREATE FUNCTION record_video_view(
    p_company_id UUID,
    p_interview_id UUID,
    p_profile_id UUID
) RETURNS JSONB
```

---

## 8. デザインシステム

### 8.1. カラーパレット

```css
/* Primary Colors (Sky Blue) */
primary-50:  #f0f9ff
primary-500: #0ea5e9   /* メインアクション */
primary-600: #0284c7   /* ホバー時 */

/* Semantic Colors */
success: green-500     /* 完了・承認 */
error: red-500         /* エラー・録画中 */
warning: amber-500     /* 警告 */
```

### 8.2. 管理画面デザイン

- ナビゲーション: 上部固定バー
- サイドバー: なし（シンプル構成）
- カード: 白背景 + shadow-sm
- テーブル: ストライプなし、ホバーで背景色変更

---

## 9. 画面一覧

### 9.1. 求職者向け

| パス | 画面名 | 説明 |
|------|--------|------|
| `/` | トップ | 登録フォーム |
| `/verify-phone` | SMS認証 | 認証コード入力 |
| `/login` | ログイン | SMS認証でログイン |
| `/system-check` | システムチェック | カメラ・マイク確認 |
| `/interview` | 面接 | アバター録画 |
| `/profile/setup` | プロフィール設定 | 職種・勤務地選択 |
| `/complete` | 完了 | 結果表示 |
| `/mypage` | マイページ | オファー確認 |
| `/offer-response/[id]` | オファー応答 | 承認/辞退 |

### 9.2. 企業向け

| パス | 画面名 | 説明 |
|------|--------|------|
| `/admin/login` | ログイン | マジックリンク認証 |
| `/admin/register` | 登録 | 企業アカウント作成 |
| `/admin/dashboard` | ダッシュボード | 統計・概要 |
| `/admin/candidates` | 求職者検索 | フィルター・一覧 |
| `/admin/candidates/[id]` | 求職者詳細 | 動画閲覧・オファー送信 |
| `/admin/offers` | オファー管理 | 送信済みオファー一覧 |
| `/admin/usage` | 利用状況 | 閲覧数・プラン |

---

## 10. 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Twilio SMS (Phase 2)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# App Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 11. 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# Lint
npm run lint

# 開発サーバー再起動
pkill -f "next dev" && npm run dev
```

---

## 12. セキュリティ・プライバシー

### 12.1. Privacy-First アーキテクチャ

```
[ユーザーのカメラ]
       │
       ▼
[MediaPipe顔認識] ←── 生の映像はここで消費されるのみ
       │
       ▼ (ランドマークのみ)
[VRM Avatar描画] → [Canvas] → 録画される映像
       │
       ▼
[サーバー] ←── アバター映像のみ
```

### 12.2. データ保護

- 素顔・生声: サーバーに送信しない
- 電話番号: オファー承認後のみ企業に開示
- RLS: 自分のデータのみアクセス可能

---

## 13. 今後の拡張予定 (Phase 3以降)

- アバターカスタマイズ（複数VRMモデル選択）
- リアルタイム面接（WebRTC）
- 決済機能（Stripe連携）
- 分析ダッシュボード

---

*Last Updated: 2025-02*
