---
description: Svelte/SvelteKitファイル（*.svelte, *.svelte.ts）の作成・編集時に適用
globs: ["*.svelte", "*.svelte.ts"]
---

# Svelte 5 開発ルール

## 必須ルール

- **Svelte 5 準拠のコードを書く**
  - runes API 使用: `$state()`, `$props()`, `$derived()`, `$effect()`
  - callback props パターン（`createEventDispatcher` 使用禁止）
  - `import { run } from 'svelte/legacy'` 使用禁止
- **Context7 を利用して最新のリファレンスを参照する**

## Svelte 5 Testing Patterns

- **Event handling**: `@testing-library/svelte` の `events` オプション使用
- **DOM assertions**: `@testing-library/jest-dom` のマッチャー使用

## 状態管理のベストプラクティス

- **独立状態**: 計算値に依存しない独立した `$state()` を使用
- **単純計算**: `$derived()` は単純な計算のみに使用
- **複雑ロジック**: 複雑な状態管理は関数で処理し、結果のみを状態に保存
