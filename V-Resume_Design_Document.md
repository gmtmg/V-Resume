# V-Resume サービス詳細設計書 (Phase 1: MVP)

## 1. サービス概要

アバターと加工音声を用いた「プライバシー特化型」のスカウト登録サービス。ユーザーは素顔や生声を出すことなく、AI面接を通じて自身のスキルや人柄を企業にアピールできる。

### 1.1. コンセプト
- **Privacy-First**: 素顔・生声を一切サーバーに送信しない
- **手軽さ**: 5つの質問に各60秒で回答するだけ
- **AI活用**: 音声認識と要約生成で採用担当者の負担軽減

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

### 2.2. フォルダ構成

```
/src
├── app/                    # Next.js App Router
│   ├── page.tsx           # ランディング/登録ページ
│   ├── system-check/      # カメラ・マイク確認
│   ├── interview/         # 面接録画
│   ├── complete/          # 完了ページ
│   └── api/               # API Routes
│       ├── transcribe/    # Whisper文字起こし
│       └── summarize/     # GPT-4o mini要約
├── components/
│   ├── avatar/            # アバター描画
│   ├── chat/              # チャットUI (将来用)
│   └── recording/         # 録画セッション
├── hooks/                  # カスタムフック
│   ├── useMediaPipe.ts    # 顔認識
│   ├── useRecorder.ts     # 録画管理
│   └── useProfileStorage.ts
├── lib/
│   ├── audio/             # 音声処理
│   │   ├── PitchShifter.ts
│   │   └── CompositeRecorder.ts
│   ├── avatar/            # VRMアバター
│   │   └── VRMAvatar.ts
│   └── supabase/          # DB連携
└── types/                  # 型定義
    ├── profile.ts
    └── interview.ts
```

---

## 3. デザインシステム

### 3.1. カラーパレット

```css
/* Primary Colors (Sky Blue) */
primary-50:  #f0f9ff   /* 背景・ハイライト */
primary-100: #e0f2fe   /* カード背景 */
primary-200: #bae6fd   /* ボーダー・アクセント */
primary-300: #7dd3fc   /* ホバー状態 */
primary-400: #38bdf8   /* フォーカスリング */
primary-500: #0ea5e9   /* メインアクション */
primary-600: #0284c7   /* ホバー時 */
primary-700: #0369a1   /* アクティブ */
primary-800: #075985   /* 強調テキスト */
primary-900: #0c4a6e   /* 濃いテキスト */

/* Avatar Background */
avatar-bg: #f1f5f9     /* ライトグレー */

/* Semantic Colors */
success: green-500     /* 完了・成功 */
error: red-500/rose-500 /* エラー・録画中 */
warning: amber-500     /* 警告・顔未検出 */
```

### 3.2. UIコンポーネント

#### フォーム要素
```css
.form-input {
  /* 入力フィールド */
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid gray-200;
  focus: ring-2 ring-primary-400;
}

.form-label {
  /* ラベル */
  font-size: 0.875rem;
  font-weight: 500;
  color: gray-700;
}
```

#### ボタン
```css
.btn-primary {
  /* プライマリボタン */
  background: primary-500;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;  /* カード内 */
  border-radius: 9999px;   /* アクション */
  font-weight: 500;
}

.btn-secondary {
  /* セカンダリボタン */
  background: white;
  border: 1px solid gray-200;
  color: gray-700;
}
```

#### カード
```css
.card {
  background: white;
  border-radius: 1rem;
  border: 1px solid gray-100;
  box-shadow: sm;
  padding: 1.5rem;
}
```

### 3.3. レイアウトパターン

- **最大幅**: `max-w-lg` (登録), `max-w-2xl` (システムチェック), `max-w-4xl` (面接)
- **アスペクト比**: `aspect-video` (16:9) - ビデオ/アバター表示
- **グリッド**: 統計表示に `grid-cols-2`
- **スペーシング**: `space-y-6`, `space-y-8` が基本

### 3.4. アニメーション

```css
/* ローディングスピナー */
border-4 border-primary-500 border-t-transparent rounded-full animate-spin

/* 録画インジケーター */
animate-pulse (赤い点滅)

/* カウントダウン */
text-8xl animate-pulse

/* Confetti (完了時) */
animate-bounce with random delays
```

---

## 4. 画面遷移とUI詳細

### 4.1. Landing Page (`/`)

**目的**: ユーザー登録とサービス紹介

**レイアウト**:
```
┌─────────────────────────────────────┐
│ Header: V-Resume ロゴ + タグライン    │
├─────────────────────────────────────┤
│  背景装飾 (グラデーション円形ブラー)     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ アイコン (ビデオカメラ)        │   │
│  │ "アバター面接で              │   │
│  │  あなたをアピール"           │   │
│  │ サブテキスト                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────── Card ─────────────┐      │
│  │ 氏名 *        [入力]      │      │
│  │ メール *      [入力]      │      │
│  │ 電話番号 *    [入力]      │      │
│  │                          │      │
│  │ [  次へ進む  ]           │      │
│  └──────────────────────────┘      │
│                                     │
│  🛡️ プライバシーノート              │
└─────────────────────────────────────┘
```

**バリデーション**:
- 氏名: 必須、2文字以上
- メール: 必須、`@`を含む
- 電話: 必須、10桁以上（数字のみカウント）

**データ保存**:
- `localStorage['v-resume-profile']` にJSON形式で保存

---

### 4.2. System Check (`/system-check`)

**目的**: カメラ・マイク権限の取得とシステム互換性確認

**レイアウト**:
```
┌─────────────────────────────────────┐
│ Header: V-Resume / システムチェック   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │      ビデオプレビュー         │   │
│  │      (ミラー表示)            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────── チェックリスト ─────────┐  │
│  │ ブラウザ互換性    [✓] / [✗]   │  │
│  │ カメラ           [✓] / [✗]   │  │
│  │ マイク           [✓] / [✗]   │  │
│  │ 顔認識           [✓] / [✗]   │  │
│  └──────────────────────────────┘  │
│                                     │
│  (エラー時: 詳細説明 + 解決策)        │
│                                     │
│  [カメラ・マイクを許可する]          │
│  または                             │
│  [面接を開始する] (全て✓の場合)       │
└─────────────────────────────────────┘
```

**チェック項目**:
1. **ブラウザ互換性**: getUserMedia, MediaRecorder, AudioContext, captureStream
2. **HTTPS/セキュアコンテキスト**: モバイルで必須
3. **カメラ/マイク権限**: getUserMedia呼び出し
4. **顔認識**: MediaPipe初期化確認

**エラーハンドリング**:
- `NotAllowedError`: iOS/Android別の権限設定手順を表示
- `NotFoundError`: デバイス未接続
- `OverconstrainedError`: 最小制約でリトライ
- `NotReadableError`: 他アプリ使用中

---

### 4.3. Interview Page (`/interview`)

**目的**: 5つの質問への回答録画

**レイアウト**:
```
┌─────────────────────────────────────┐
│ Header: V-Resume / 質問 X/5         │
├─────────────────────────────────────┤
│ [==========>----------] 進捗バー     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────── 質問カード ──────────┐    │
│  │ (1) 自己紹介                 │    │
│  │ まずは簡単に自己紹介を...     │    │
│  └──────────────────────────────┘   │
│                                     │
│  ┌─────── アバター表示 ─────────┐   │
│  │                             │   │
│  │   [3D VRMアバター]          │   │
│  │   (顔トラッキング連動)       │   │
│  │                             │   │
│  │   [REC 0:35 / 1:00] (録画時) │   │
│  │   ⚠️顔を中央に... (未検出時)  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [========>   ] 残り時間バー         │
│                                     │
│  [▶ 自己紹介を開始]                  │
│  または                             │
│  [■ 自己紹介を終了] (録画中)         │
│  または                             │
│  [撮り直す] [次の質問へ] (レビュー時)  │
│                                     │
│  📝 アバター映像のみ保存されます       │
└─────────────────────────────────────┘
```

**セッション状態**:
1. `loading`: アバター・MediaPipe初期化中
2. `preview`: 準備完了、開始待ち
3. `countdown`: 3-2-1カウントダウン
4. `recording`: 録画中（最大60秒）
5. `review`: 録画確認、撮り直し/次へ選択

**録画フロー**:
1. Canvas (アバター映像) + 加工音声 (0.75倍ピッチ) を合成
2. MediaRecorder で WebM/MP4 形式で保存
3. 5問完了後、Whisper APIで文字起こし
4. 完了ページへ遷移

---

### 4.4. Complete Page (`/complete`)

**目的**: 登録完了通知と結果表示

**レイアウト**:
```
┌─────────────────────────────────────┐
│  🎉 Confetti (3秒間)                │
│                                     │
│      ✓ 大きなチェックアイコン         │
│                                     │
│      登録が完了しました!              │
│      企業からのスカウトをお待ちください │
│                                     │
│  ┌─────── 録画内容 ──────────────┐  │
│  │ [5] 回答数  [3:45] 総録画時間  │  │
│  │                               │  │
│  │ ✓ 自己紹介          45秒      │  │
│  │ ✓ 成功体験          52秒      │  │
│  │ ✓ 強みと活かし方     38秒      │  │
│  │ ✓ 希望条件          41秒      │  │
│  │ ✓ 企業へのメッセージ  49秒      │  │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─────── 文字起こし結果 ─────────┐  │
│  │ 自己紹介:                      │  │
│  │ 「山田と申します。これまで...」  │  │
│  │ (各質問の回答テキスト)          │  │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─────── AI要約・評価 ──────────┐  │
│  │ [要約を生成] ボタン            │  │
│  │ または                        │  │
│  │ 生成された要約文 (300-400字)   │  │
│  └───────────────────────────────┘ │
│                                     │
│  🔒 プライバシーノート               │
│  (素顔・生声は保存されていません)     │
│                                     │
│  [トップページへ戻る]                │
└─────────────────────────────────────┘
```

---

## 5. コンポーネント設計

### 5.1. AvatarRenderer

**責務**: 顔トラッキングとVRMアバターの連動描画

**Props**:
```typescript
interface AvatarRendererProps {
  vrmPath?: string;                           // VRMモデルパス
  videoRef: RefObject<HTMLVideoElement>;      // カメラ入力
  canvasRef: RefObject<HTMLCanvasElement>;    // 描画先
  onReady?: () => void;                       // 初期化完了
  onFaceDetected?: () => void;                // 顔検出
  onFaceLost?: () => void;                    // 顔ロスト
}
```

**内部状態**:
- `isAvatarLoading`: VRMモデル読み込み中
- `isMediaPipeLoading`: MediaPipe初期化中
- `isFaceDetected`: 顔検出状態

**オーバーレイ表示**:
- Loading: スピナー + 「アバターを読み込み中...」
- Error: 警告アイコン + エラーメッセージ
- Face Lost: 目のアイコン + 「顔を中央に配置してください」

---

### 5.2. InterviewSession

**責務**: 1つの質問に対する録画セッション管理

**Props**:
```typescript
interface InterviewSessionProps {
  question: InterviewQuestion;
  onComplete: (recording: InterviewRecording) => void;
}
```

**セッション状態マシン**:
```
loading → preview → countdown → recording → review
                ↑                            │
                └────────── (retry) ─────────┘
```

**機能**:
- カウントダウン (3-2-1)
- 録画タイマー表示
- 自動停止 (60秒)
- レビュー再生
- 撮り直し機能

---

## 6. API設計

### 6.1. POST `/api/transcribe`

**目的**: 音声から日本語テキストへの変換

**Request**:
```
Content-Type: multipart/form-data

audio: File (WebM/MP4)
questionId: string
```

**Response**:
```json
{
  "questionId": 1,
  "transcript": "自己紹介のテキスト内容..."
}
```

**実装詳細**:
- OpenAI Whisper API (`whisper-1`)
- 言語: 日本語 (`ja`)
- レスポンス形式: テキスト

---

### 6.2. POST `/api/summarize`

**目的**: 面接回答の要約・評価生成

**Request**:
```json
{
  "transcripts": [
    {
      "questionId": 1,
      "question": "自己紹介",
      "answer": "回答テキスト..."
    }
  ]
}
```

**Response**:
```json
{
  "summary": "この候補者は...（300-400字の要約）"
}
```

**実装詳細**:
- OpenAI GPT-4o mini
- システムプロンプトで氏名を除外するよう指示
- 採用担当者向けの客観的評価

---

## 7. データ構造

### 7.1. TypeScript型定義

```typescript
// プロファイル
interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
}

// 面接質問
interface InterviewQuestion {
  id: number;
  title: string;
  question: string;
  maxDuration: number;  // 秒
}

// 録画データ
interface InterviewRecording {
  questionId: number;
  blob: Blob;
  duration: number;
  uploadedUrl?: string;
}
```

### 7.2. 面接質問リスト

| ID | タイトル | 質問文 | 最大時間 |
|----|---------|--------|---------|
| 1 | 自己紹介 | まずは簡単に自己紹介をお願いします。お名前と、これまでのキャリアについて教えてください。 | 60秒 |
| 2 | 成功体験・プロジェクト | 過去の成功体験や、特に注力されたプロジェクトについて教えてください。 | 60秒 |
| 3 | 強みと活かし方 | ご自身の強みと、それを仕事にどう活かしているかを教えてください。 | 60秒 |
| 4 | 希望条件・環境 | 希望する勤務条件や、働きたい環境について教えてください。 | 60秒 |
| 5 | 企業へのメッセージ | 最後に、企業の採用担当者に向けてメッセージをお願いします。 | 60秒 |

### 7.3. Supabaseテーブル

**`profiles` テーブル (Private)**
```sql
id: UUID (Primary Key)
full_name: string
email: string
phone: string
created_at: timestamp
```

**`interviews` テーブル (Public/Scoutable)**
```sql
id: UUID
profile_id: UUID (Foreign Key)
video_url: string (Supabase Storage URL)
summary_text: text (AI generated)
status: enum ('pending', 'approved', 'private')
created_at: timestamp
```

---

## 8. プライバシー・セキュリティ設計

### 8.1. Privacy-First アーキテクチャ

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

### 8.2. 音声プライバシー

```
[マイク入力]
     │
     ▼
[PitchShifter] ←── ピッチ0.75倍に変換
     │
     ▼
[加工済み音声] → 録画・サーバー送信
```

### 8.3. 実装ポイント

1. **Canvas Only Recording**: `canvas.captureStream()` でアバター映像のみ取得
2. **Audio Processing**: Web Audio API でリアルタイム変換後に合成
3. **No Raw Storage**: 生の映像・音声はメモリ上でのみ処理
4. **Client-side Processing**: 顔認識はすべてブラウザ内で完結

---

## 9. モバイル対応

### 9.1. iOS Safari

- `playsinline` 属性必須
- `webkit-playsinline` 属性追加
- シンプルなConstraintsから開始 (`facingMode: 'user'`)
- OverconstrainedError時のフォールバック

### 9.2. Android Chrome

- アプリ権限とサイト権限の両方が必要
- 権限拒否時の詳細な手順表示
- 最小Constraints でのリトライ機能

### 9.3. 共通対応

- HTTPS必須 (getUserMedia要件)
- デバイス別エラーメッセージ
- 解像度の段階的フォールバック

---

## 10. 今後の拡張予定 (Phase 2以降)

### 10.1. チャット形式プロファイル入力
- LINEライクなUI
- 1問ずつAIが質問
- 既存の `chat/` コンポーネントを活用

### 10.2. アバターカスタマイズ
- 複数VRMモデル選択
- 背景色・スタイル変更
- アクセサリ追加

### 10.3. 企業向けダッシュボード
- 候補者一覧表示
- フィルタリング・検索
- スカウトメッセージ送信

### 10.4. リアルタイム面接
- WebRTC対応
- ライブアバター対話
- 録画機能との統合

---

## 11. 開発環境セットアップ

### 11.1. 必要な環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_key
```

### 11.2. コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# Lint
npm run lint
```

### 11.3. 依存パッケージ (主要)

```json
{
  "next": "14.2.21",
  "react": "18.3.1",
  "three": "0.170.0",
  "@pixiv/three-vrm": "3.3.2",
  "@mediapipe/tasks-vision": "0.10.18",
  "openai": "4.77.0",
  "@supabase/supabase-js": "2.47.10",
  "tailwindcss": "3.4.17"
}
```

---

*Last Updated: 2025-02*
