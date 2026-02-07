# TranslateGemma ローカル翻訳アプリケーション

TranslateGemmaを利用したローカル翻訳Webアプリケーション。外部APIに依存せず、すべてローカルで動作します。

## 技術スタック

- **SvelteKit** (Svelte 5 runes) — フロントエンド + BFF（API Routes）
- **SQLite** (`better-sqlite3`) — 翻訳履歴の永続化
- **Ollama** + TranslateGemma:12b — ローカル翻訳エンジン
- **Bun** — パッケージマネージャー / ランタイム
- **Vitest** + **Playwright** — テストフレームワーク

## 前提条件

- Bun 1.2以上
- Ollama（インストール済み・起動済み）
- TranslateGemmaモデル（`ollama pull translategemma:12b`）

## セットアップ & 起動

```bash
cd app
bun install
cp .env.example .env  # 初回のみ
bun run dev
```

または起動スクリプトを使用:

```bash
./start.sh
```

ブラウザで http://localhost:5173 にアクセスしてください。

## テスト

```bash
cd app
bun run test          # Vitest ユニットテスト
bun run test:e2e      # Playwright E2Eテスト
bun run test:all      # 全テスト実行
```

## 環境変数

`app/.env` で設定:

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | OllamaサーバーのURL |
| `OLLAMA_MODEL` | `translategemma:12b` | 使用するモデル名 |
| `DB_PATH` | `./data/translation_history.db` | SQLiteデータベースのパス |

## WSL2環境での使用

WSL2からWindows側のOllamaを使用する場合:

```bash
# ゲートウェイIP（= WindowsホストIP）を確認
ip route show default | awk '{print $3}'

# app/.env の OLLAMA_BASE_URL を設定
# 例: OLLAMA_BASE_URL=http://172.x.x.1:11434
```

Windows側で環境変数 `OLLAMA_HOST=0.0.0.0` を設定してOllamaを再起動してください。

## プロジェクト構成

```
translateapp/
├── app/                   # SvelteKit アプリケーション（BFF統合）
│   ├── src/
│   │   ├── routes/        # ページ + APIエンドポイント
│   │   └── lib/
│   │       ├── server/    # サーバー側ロジック（Ollama, DB, バリデーション）
│   │       └── types.ts   # 共有型定義
│   ├── e2e/               # Playwright E2Eテスト
│   ├── data/              # SQLiteデータベース格納先
│   └── package.json
├── start.sh               # 起動スクリプト (Linux/WSL2)
├── start.bat              # 起動スクリプト (Windows)
├── CLAUDE.md              # Claude Code向けガイド
└── README.md              # このファイル
```

## 機能

- 8言語間の翻訳（日本語、英語、中国語簡体字、韓国語、フランス語、ドイツ語、スペイン語、ポルトガル語）
- 言語ペアの入れ替え（スワップ）
- 翻訳履歴の自動保存
- 履歴の検索機能
- 履歴からの復元機能
- 履歴の削除機能（個別・全削除）

## トラブルシューティング

### Ollamaに接続できない

1. Ollamaが起動しているか確認: `ollama list`
2. TranslateGemmaモデルがインストールされているか確認
3. `.env` の `OLLAMA_BASE_URL` が正しいか確認
4. エラーメッセージに表示される接続先URLを確認
