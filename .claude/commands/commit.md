---
description: "Pre-commitチェック実行後にコミット"
---

# Commit Command

以下の手順を順番に実行してください。

## Step 1: Pre-commit チェック

`app/` ディレクトリで以下の3つのチェックを順番に実行する。

```bash
cd app && bun run lint
```
```bash
cd app && bun run format:check
```
```bash
cd app && bun run test
```

**いずれかが失敗した場合**: コミットを中断し、失敗内容をユーザーに報告して指示を仰ぐ。自動修正は行わない。

## Step 2: 変更内容の確認

すべてのチェックが通過したら、以下を並列で実行する:

- `git status`（変更ファイルの一覧）
- `git diff --staged` と `git diff`（ステージ済み・未ステージの差分）
- `git log --oneline -5`（直近のコミットメッセージスタイル確認）

## Step 3: ステージングとコミット

1. 変更内容を分析し、Conventional Commits 形式（日本語）でコミットメッセージを作成する
   - subject は50文字以内
   - body は80桁折り返し
2. 関連ファイルを `git add` で個別にステージング
   - `.env`, credentials, secrets 等の機密ファイルは絶対にステージングしない
   - 意図しないファイルが含まれていないか確認する
3. コミットを実行する（`Co-Authored-By` 行を付与）

```bash
git commit -m "$(cat <<'EOF'
<type>: <subject>

<body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
