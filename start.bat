@echo off
chcp 65001 >nul
echo TranslateGemma を起動します...

cd /d "%~dp0app"

rem .envが存在しなければ.env.exampleからコピー
if not exist ".env" (
    echo .env ファイルを作成しています...
    copy ".env.example" ".env" >nul
)

rem 旧.envからOllama設定を除去（Web UI設定管理に移行）
findstr /b "OLLAMA_BASE_URL= OLLAMA_MODEL=" ".env" >nul 2>&1
if not errorlevel 1 (
    echo Ollama設定をWeb UI管理に移行しています...
    findstr /v /b "OLLAMA_BASE_URL= OLLAMA_MODEL=" ".env" > ".env.tmp"
    move /y ".env.tmp" ".env" >nul
)

rem node_modulesが存在しなければインストール
if not exist "node_modules" (
    echo 依存パッケージをインストールしています...
    call bun install
)

bun run dev -- --open
