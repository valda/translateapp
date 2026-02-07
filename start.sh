#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

echo "TranslateGemma を起動します..."

# .envが存在しなければ.env.exampleからコピー
if [ ! -f "$APP_DIR/.env" ]; then
    echo ".env ファイルを作成しています..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

# node_modulesが存在しなければインストール
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "依存パッケージをインストールしています..."
    (cd "$APP_DIR" && bun install)
fi

# WSL2環境ではブラウザ起動コマンドを設定
if grep -qi microsoft /proc/version 2>/dev/null; then
    if command -v wslview &>/dev/null; then
        export BROWSER=wslview
    fi
fi

cd "$APP_DIR"
bun run dev -- --open
