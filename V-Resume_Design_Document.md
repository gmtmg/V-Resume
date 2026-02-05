# V-Resume サービス詳細設計書 (Phase 1: MVP)

## 1. サービス概要
アバターと加工音声を用いた「プライバシー特化型」のスカウト登録サービス。ユーザーは素顔や生声を出すことなく、AI面接を通じて自身のスキルや人柄を企業にアピールできる。

## 2. システムアーキテクチャ
- **Frontend:** Next.js (App Router), Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage)
- **AI/Real-time Engine:**
    - Face Tracking: MediaPipe Face Landmarker
    - 3D Rendering: Three.js, @pixiv/three-vrm
    - Audio Processing: Web Audio API (Pitch Shifter)
- **LLM Integration:** OpenAI API (GPT-4o mini) for summary generation

## 3. 主要機能と画面遷移

### 3.1. [Landing & Profile Entry] (チャット形式UI)
- **UI:** LINEのようなチャット形式の入力。
- **項目:** 氏名、連絡先、希望職種、簡単な経歴等。
- **特性:** ユーザー体験を向上させるため、1問ずつAIが問いかけ、ユーザーが回答する。
- **データ:** 入力内容は `profiles` テーブル（非公開）に保存。

### 3.2. [System Check] (カメラ・マイク確認)
- **機能:** ブラウザの権限許可、フェイストラッキングの正常動作確認。
- **仕様:** - 顔が認識されている間：アバターが表情に連動。
    - 顔がロストした時：アバターは「真顔・直立」で固定され、「顔を中央に配置してください」と警告を表示。

### 3.3. [Interview Recording] (アバター面接)
- **構成:** 5つの質問に対して、各最大60秒の録画。
- **録画エンジン (Privacy-First):**
    - **映像:** 素顔映像は一切保存・送信せず、アバターが描画された Canvas のみを `captureStream()` で取得。
    - **音声:** マイク入力を Web Audio API でリアルタイム加工（ピッチ変更）した後に合成。
- **背景:** 全ユーザー共通の無機質なグレー背景。
- **質問リスト:**
    1. 自己紹介
    2. 過去の成功体験・注力プロジェクト
    3. 自分の強みと仕事への活かし方
    4. 希望する勤務条件・環境
    5. 企業へのメッセージ

### 3.4. [Submission & Thank You]
- **処理:** 録画データ（WebM/MP4）を Supabase Storage へアップロード。
- **要約機能:** 音声データをテキスト化（Whisper等）し、GPT-4o mini で要約文を自動生成。

## 4. データ構造 (Supabase)

### 4.1. `profiles` テーブル (Private)
- `id`: UUID (Primary Key)
- `full_name`: string
- `email`: string
- `phone`: string
- `created_at`: timestamp

### 4.2. `interviews` テーブル (Public/Scoutable)
- `id`: UUID
- `profile_id`: UUID (Foreign Key)
- `video_url`: string (Supabase Storage URL)
- `summary_text`: text (AI generated)
- `status`: enum ('pending', 'approved', 'private')
- `created_at`: timestamp

## 5. 技術的制約・セキュリティ
1. **Client-side Obfuscation:** ユーザーの「生の顔映像」および「生声」は、ブラウザから外部に送信される前に、必ずアバター/加工音声に変換・合成されなければならない。
2. **Recording:** `MediaRecorder` を使用し、Canvasストリームと加工済みオーディオストリームを結合して保存する。
3. **Latency:** フェイストラッキングの負荷を抑えるため、Mediapipeの処理は Web Worker 等の利用を検討する。
