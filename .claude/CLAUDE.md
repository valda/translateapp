# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
cd app
bun install
bun run dev           # Development server
bun run build         # Production build
bun run test          # Vitest ユニットテスト
bun run test:e2e      # Playwright E2Eテスト
bun run test:all      # 全テスト実行
```

## Pre-commit Rules

コミット前に以下を `app/` ディレクトリで実行し、全てパスすることを確認すること:

```bash
cd app
bun run lint          # ESLint チェック（エラー0であること）
bun run format:check  # Prettier フォーマットチェック（差分なしであること）
bun run test          # Vitest ユニットテスト（全通過であること）
```

lint やフォーマットのエラーがある場合は `bun run lint:fix` と `bun run format` で自動修正してからコミットする。

## Architecture

### BFF Design (SvelteKit +server.ts)

- **API Routes**: `src/routes/api/` 配下の `+server.ts` で REST API を提供
- **Provider Abstraction**: `TranslationProvider` interface による翻訳プロバイダー抽象化（`src/lib/server/provider.ts`）
  - `OllamaProvider`: Ollama `/api/generate` エンドポイント（`ollama.ts`）
  - `OpenAiCompatProvider`: OpenAI互換 `/v1/chat/completions` エンドポイント（`openai-compat.ts`）
  - ファクトリ: `getProvider(type?)` でアクティブプロバイダーを取得
- **Database**: `better-sqlite3` による同期 SQLite 操作（WAL モード）
- **Settings**: 各プロバイダーの URL/モデルは独立した DB キーで保持。env → DB → デフォルトの優先順位で解決
- **Error Handling**: 接続エラー時は接続先 URL をエラーメッセージに含める

### Frontend Design

- **SPA**: SvelteKit in single-page application mode (`ssr = false`)
- **API Communication**: 相対パス fetch（`/api/translate`, `/api/history`, `/api/settings` 等）
- **Reactivity**: Svelte 5 runes（`$state()` でリアクティブ状態管理、`onclick` 等のイベント属性構文）
- **UI Language**: Japanese

### Re-translation Verification & Debug

- **diff-utils**: `src/lib/diff-utils.ts` — 言語認識型セグメンテーション（日本語→文字単位、英語→単語単位）によるインラインdiff生成
- **PinnedOriginalPane**: 再翻訳確認モードのdiff表示・hunkクリックrevert用コンポーネント
- **翻訳APIの拡張**: `POST /api/translate` に `reference_text` パラメータ（再翻訳時の参考テキスト）、レスポンスに `prompt`/`raw_response` フィールド（デバッグ用）

### Settings Priority

```
環境変数 ($env/dynamic/private) > SQLite保存値 > ハードコードデフォルト
```

- コード内では `$env/dynamic/private` を使用（ランタイム読み込み）
- 環境変数が設定されている場合はUIでロック表示（変更不可）

#### 環境変数一覧

| 環境変数 | 説明 | デフォルト |
|---------|------|----------|
| `TRANSLATE_PROVIDER` | アクティブプロバイダー (`ollama` / `openai_compat`) | `ollama` |
| `OLLAMA_BASE_URL` | Ollama サーバー URL | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Ollama モデル名 | `translategemma:12b` |
| `OPENAI_COMPAT_BASE_URL` | OpenAI互換サーバー URL | `http://localhost:1234` |
| `OPENAI_COMPAT_MODEL` | OpenAI互換モデル名 | (空文字) |

#### DB設定キー

`translate_provider`, `ollama_base_url`, `ollama_model`, `openai_compat_base_url`, `openai_compat_model`

## Critical: TranslateGemma Prompt Format

TranslateGemma requires this exact prompt structure:

```
You are a professional {SOURCE_LANG} ({SOURCE_CODE}) to {TARGET_LANG} ({TARGET_CODE}) translator.
Your goal is to accurately convey the meaning and nuances of the original {SOURCE_LANG} text while adhering to {TARGET_LANG} grammar, vocabulary, and cultural sensitivities.
Produce only the {TARGET_LANG} translation, without any additional explanations or commentary.
Please translate the following {SOURCE_LANG} text into {TARGET_LANG}:
{TEXT}
```

- `{SOURCE_LANG}` / `{TARGET_LANG}`: full language names (e.g., "Japanese", "English")
- `{SOURCE_CODE}` / `{TARGET_CODE}`: language codes (e.g., "ja", "en")

## Supported Languages

Priority order: Japanese (ja), English (en), Chinese Simplified (zh-Hans), Korean (ko), French (fr), German (de), Spanish (es), Portuguese (pt)
