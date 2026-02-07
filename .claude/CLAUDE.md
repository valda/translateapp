# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A local translation web application using TranslateGemma (via Ollama). The app provides translation between 8 major languages with history management and settings management, running entirely locally without external API dependencies.

## Technology Stack

- **Frontend + BFF**: SvelteKit (adapter-node) with `+server.ts` API routes, Bun, **Svelte 5 runes**
- **Database**: SQLite via `better-sqlite3`（履歴 + 設定の永続化）
- **Translation Engine**: Ollama with TranslateGemma (4b / 12b)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Environment**: Windows / WSL2 (Linux)

## Prerequisites

- Bun 1.2 or later
- Ollama must be installed and running
- TranslateGemma model: `ollama pull translategemma:12b` or `ollama pull translategemma:4b`

## Communication Guidelines

- **応答は日本語で行う**: All responses should be in Japanese when working in this repository

## Settings Management

Ollama接続先URLとモデル名はWeb UIの設定画面（歯車アイコン）から変更可能。設定はSQLiteの `settings` テーブルに保存され、サーバー再起動なしで反映される。

### 設定の優先順位

```
環境変数 ($env/dynamic/private) > SQLite保存値 > ハードコードデフォルト
```

- 環境変数が設定されている場合はUIでロック表示（変更不可）
- DB_PATHはDB自体のパスなのでUI設定対象外（環境変数 or デフォルト値のみ）
- WSL2環境では設定画面の「自動検出」ボタンでWindowsホストのOllamaを検出可能

### 環境変数（オプション）

`app/.env` で設定を固定したい場合のみ使用。通常はWeb UIからの設定で十分。

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | OllamaサーバーのURL（設定するとUI変更不可） |
| `OLLAMA_MODEL` | `translategemma:12b` | 使用するモデル名（設定するとUI変更不可） |
| `DB_PATH` | `./data/translation_history.db` | SQLiteデータベースのパス |

コード内では `$env/dynamic/private` を使用（ランタイム読み込み）。

## Development Commands

### 起動スクリプト（推奨）

```bash
# 起動（初回はbun installも自動実行）
./start.sh
```

### 手動セットアップ

```bash
cd app
bun install
bun run dev           # Development server
bun run build         # Production build
```

### テスト

```bash
cd app
bun run test          # Vitest ユニットテスト
bun run test:e2e      # Playwright E2Eテスト
bun run test:all      # 全テスト実行
```

## Directory Structure

```
translateapp/
├── app/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte            # メインUI（Svelte 5 runes）
│   │   │   ├── +layout.ts              # SPA設定
│   │   │   └── api/
│   │   │       ├── health/+server.ts    # ヘルスチェック
│   │   │       ├── translate/+server.ts # 翻訳API
│   │   │       ├── history/
│   │   │       │   ├── +server.ts       # 履歴CRUD
│   │   │       │   └── [id]/+server.ts  # 個別削除
│   │   │       └── settings/
│   │   │           ├── +server.ts       # 設定取得・保存 (GET/PUT)
│   │   │           ├── detect/+server.ts # Ollama自動検出 (POST)
│   │   │           └── models/+server.ts # モデル一覧取得 (GET)
│   │   └── lib/
│   │       ├── server/
│   │       │   ├── constants.ts         # 言語マップ
│   │       │   ├── schemas.ts           # Zodバリデーション
│   │       │   ├── ollama.ts            # Ollamaクライアント（設定優先順位付き）
│   │       │   ├── database.ts          # SQLiteデータ層（history + settings）
│   │       │   └── detect.ts            # Ollamaヒューリスティック検出
│   │       └── types.ts                 # 共有型定義
│   ├── e2e/                             # Playwright E2Eテスト
│   ├── data/                            # SQLiteデータベース
│   └── package.json
├── start.sh                             # 起動スクリプト (Linux/WSL2)
├── start.bat                            # 起動スクリプト (Windows)
├── CLAUDE.md
└── README.md
```

## Architecture

### BFF Design (SvelteKit +server.ts)

- **API Routes**: `src/routes/api/` 配下の `+server.ts` で REST API を提供
- **Ollama Integration**: サーバーサイドで Ollama API を呼び出し（フロントエンドは直接呼ばない）
- **Database**: `better-sqlite3` による同期 SQLite 操作（WAL モード）
- **Settings**: `ollama.ts` の `getBaseUrl()` / `getModel()` が env → DB → デフォルトの優先順位で解決
- **Error Handling**: Ollama 接続エラー時は接続先 URL をエラーメッセージに含める

### Frontend Design

- **SPA**: SvelteKit in single-page application mode (`ssr = false`)
- **API Communication**: 相対パス fetch（`/api/translate`, `/api/history`, `/api/settings` 等）
- **Reactivity**: Svelte 5 runes（`$state()` でリアクティブ状態管理、`onclick` 等のイベント属性構文）
- **Settings Modal**: 歯車アイコンからモーダル表示、接続ステータスドット（緑/赤）をヘッダーに常時表示
- **UI Language**: Japanese

### Supported Languages

Priority order: Japanese (ja), English (en), Chinese Simplified (zh-Hans), Korean (ko), French (fr), German (de), Spanish (es), Portuguese (pt)

## Critical: TranslateGemma Prompt Format

TranslateGemma requires this exact prompt structure:

```
You are a professional {SOURCE_LANG} ({SOURCE_CODE}) to {TARGET_LANG} ({TARGET_CODE}) translator.
Your goal is to accurately convey the meaning and nuances of the original {SOURCE_LANG} text while adhering to {TARGET_LANG} grammar, vocabulary, and cultural sensitivities.
Produce only the {TARGET_LANG} translation, without any additional explanations or commentary.
Please translate the following {SOURCE_LANG} text into {TARGET_LANG}:
{TEXT}
```

Where:
- `{SOURCE_LANG}` and `{TARGET_LANG}` are full language names (e.g., "Japanese", "English")
- `{SOURCE_CODE}` and `{TARGET_CODE}` are language codes (e.g., "ja", "en")
- `{TEXT}` is the text to translate

## Pre-commit Rules

コミット前に以下を `app/` ディレクトリで実行し、全てパスすることを確認すること:

```bash
cd app
bun run lint          # ESLint チェック（エラー0であること）
bun run format:check  # Prettier フォーマットチェック（差分なしであること）
bun run test          # Vitest ユニットテスト（全通過であること）
```

lint やフォーマットのエラーがある場合は `bun run lint:fix` と `bun run format` で自動修正してからコミットする。

## Key Features

1. **Translation**: Text input → language pair selection → translate button → display result
2. **Language Swap**: Button to swap source/target languages
3. **Translation History**: Auto-save on translate, searchable table view, click to restore, delete individual/all
4. **Loading States**: Show progress during translation (important for long texts)
5. **Settings Management**: Web UIから Ollama URL・モデルを変更、自動検出、接続テスト、環境変数ロック表示
