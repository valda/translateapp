@echo off
chcp 65001 >nul
echo TranslateGemma を起動します...

cd /d "%~dp0app"

rem node_modulesが存在しなければインストール
if not exist "node_modules" (
    echo 依存パッケージをインストールしています...
    call bun install
)

bun run dev -- --open
