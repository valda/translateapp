# TranslateGemma ローカル翻訳アプリケーション

TranslateGemmaを利用したローカル翻訳Webアプリケーション。外部APIに依存せず、すべてローカルで動作します。

## 技術スタック

- **SvelteKit** (Svelte 5 runes) — フロントエンド + BFF（API Routes）
- **SQLite** (`better-sqlite3`) — 翻訳履歴・設定の永続化
- **Ollama** + TranslateGemma:12b — ローカル翻訳エンジン
- **Bun** — パッケージマネージャー / ランタイム
- **Vitest** + **Playwright** — テストフレームワーク

## 前提条件

- Bun 1.2以上
- Ollama（インストール済み・起動済み）
- TranslateGemmaモデル（マシンスペックに応じて選択）
  - 軽量: `ollama pull translategemma:4b`
  - 高品質: `ollama pull translategemma:12b`

## セットアップ & 起動

```bash
./start.sh        # Linux / WSL2
start.bat          # Windows
```

依存パッケージのインストールも自動で行われます。ブラウザで http://localhost:5173 が開きます。

手動で起動する場合:

```bash
cd app
bun install
bun run dev
```

## テスト

```bash
cd app
bun run test          # Vitest ユニットテスト
bun run test:e2e      # Playwright E2Eテスト
bun run test:all      # 全テスト実行
```

## 設定

Ollama接続先URLとモデル名は、Web UIのヘッダーにある歯車アイコンから設定できます。設定はSQLiteに保存され、サーバー再起動なしで反映されます。

### 設定画面の機能

- **Ollama URL**: 接続先URLの入力・自動検出
- **モデル選択**: Ollamaから取得したモデル一覧のドロップダウン（取得できない場合はテキスト入力）
- **接続テスト**: 現在の設定での接続確認
- **自動検出**: ローカルおよびWSL2ホストのOllamaを自動検出

### 設定の優先順位

```
環境変数 (.env) > SQLite保存値 > デフォルト値
```

環境変数が設定されている場合はUIでロック表示となり変更できません。

### 環境変数（オプション）

`app/.env` で設定を固定したい場合のみ使用します。通常はWeb UIからの設定で十分です。

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | OllamaサーバーのURL（設定するとUI変更不可） |
| `OLLAMA_MODEL` | `translategemma:12b` | 使用するモデル名（設定するとUI変更不可） |
| `DB_PATH` | `./data/translation_history.db` | SQLiteデータベースのパス |

## WSL2環境での使用

WSL2からWindows側のOllamaを使用する場合、設定画面の「自動検出」ボタンでWindowsホストのOllamaを自動検出できます。

手動で設定する場合は、Windows側で環境変数 `OLLAMA_HOST=0.0.0.0` を設定してOllamaを再起動してください。

## プロジェクト構成

```
translateapp/
├── app/                # SvelteKit アプリケーション（BFF統合）
│   ├── src/
│   │   ├── routes/     #   ページ + API Routes (+server.ts)
│   │   └── lib/        #   共有ライブラリ（サーバー/クライアント）
│   └── e2e/            #   Playwright E2Eテスト
├── start.sh            # 起動スクリプト (Linux/WSL2)
└── start.bat           # 起動スクリプト (Windows)
```

## 機能

- 8言語間の翻訳（日本語、英語、中国語簡体字、韓国語、フランス語、ドイツ語、スペイン語、ポルトガル語）
- 言語ペアの入れ替え（スワップ）
- 翻訳履歴の自動保存
- 履歴の検索機能
- 履歴からの復元機能
- 履歴の削除機能（個別・全削除）
- Web UIからのOllama設定管理（URL・モデル変更、接続テスト、自動検出）

## トラブルシューティング

### Ollamaに接続できない

1. Ollamaが起動しているか確認: `ollama list`
2. TranslateGemmaモデルがインストールされているか確認
3. 設定画面の「接続テスト」ボタンで接続状態を確認
4. WSL2環境の場合は「自動検出」ボタンを試す
5. エラーメッセージに表示される接続先URLを確認
