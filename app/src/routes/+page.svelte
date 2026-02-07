<script lang="ts">
  import { onMount } from 'svelte';
  import type { HistoryItem } from '$lib/types';

  // 言語定義
  const languages = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: '英語' },
    { code: 'zh-Hans', name: '中国語（簡体字）' },
    { code: 'ko', name: '韓国語' },
    { code: 'fr', name: 'フランス語' },
    { code: 'de', name: 'ドイツ語' },
    { code: 'es', name: 'スペイン語' },
    { code: 'pt', name: 'ポルトガル語' },
  ];

  // 状態管理（Svelte 5 runes）
  let originalText = $state('');
  let translatedText = $state('');
  let sourceLang = $state('ja');
  let targetLang = $state('en');
  let isTranslating = $state(false);
  let errorMessage = $state('');
  let history = $state<HistoryItem[]>([]);
  let searchKeyword = $state('');

  // 翻訳を実行
  async function translate() {
    if (!originalText.trim()) {
      errorMessage = '翻訳するテキストを入力してください';
      return;
    }

    isTranslating = true;
    errorMessage = '';
    translatedText = '';

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      });

      const data = await response.json();

      if (data.success) {
        translatedText = data.translated_text;
        // 履歴に保存
        await saveHistory(originalText, translatedText, sourceLang, targetLang);
        await loadHistory();
      } else {
        errorMessage = data.error_message || '翻訳に失敗しました';
      }
    } catch (error) {
      errorMessage = `エラー: ${error}`;
    } finally {
      isTranslating = false;
    }
  }

  // 言語を入れ替え
  function swapLanguages() {
    [sourceLang, targetLang] = [targetLang, sourceLang];
    [originalText, translatedText] = [translatedText, originalText];
  }

  // 履歴を保存
  async function saveHistory(original: string, translated: string, source: string, target: string) {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_text: original,
          translated_text: translated,
          source_lang: source,
          target_lang: target,
        }),
      });
    } catch (error) {
      console.error('履歴の保存に失敗:', error);
    }
  }

  // 履歴を読み込み
  async function loadHistory() {
    try {
      const url = searchKeyword
        ? `/api/history?search=${encodeURIComponent(searchKeyword)}`
        : '/api/history';

      const response = await fetch(url);
      history = await response.json();
    } catch (error) {
      console.error('履歴の読み込みに失敗:', error);
    }
  }

  // 履歴項目をクリック
  function restoreFromHistory(item: HistoryItem) {
    originalText = item.original_text;
    translatedText = item.translated_text;
    sourceLang = item.source_lang;
    targetLang = item.target_lang;
  }

  // 履歴を削除
  async function deleteHistoryItem(id: number) {
    try {
      await fetch(`/api/history/${id}`, {
        method: 'DELETE',
      });
      await loadHistory();
    } catch (error) {
      console.error('履歴の削除に失敗:', error);
    }
  }

  // 全履歴を削除
  async function clearAllHistory() {
    if (!confirm('全ての履歴を削除しますか？')) return;

    try {
      await fetch('/api/history', {
        method: 'DELETE',
      });
      await loadHistory();
    } catch (error) {
      console.error('履歴の削除に失敗:', error);
    }
  }

  // 初期化
  onMount(() => {
    loadHistory();
  });
</script>

<main>
  <h1>TranslateGemma ローカル翻訳</h1>

  <div class="translation-panel">
    <!-- 言語選択 -->
    <div class="language-select">
      <select bind:value={sourceLang}>
        {#each languages as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>

      <button onclick={swapLanguages} class="swap-btn">⇄</button>

      <select bind:value={targetLang}>
        {#each languages as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>
    </div>

    <!-- テキストエリア -->
    <div class="text-areas">
      <div class="text-area-wrapper">
        <label>原文</label>
        <textarea
          bind:value={originalText}
          placeholder="翻訳するテキストを入力してください"
          rows="8"
        ></textarea>
      </div>

      <div class="text-area-wrapper">
        <label>訳文</label>
        <textarea
          bind:value={translatedText}
          placeholder="翻訳結果がここに表示されます"
          rows="8"
          readonly
        ></textarea>
      </div>
    </div>

    <!-- 翻訳ボタン -->
    <button onclick={translate} class="translate-btn" disabled={isTranslating}>
      {isTranslating ? '翻訳中...' : '翻訳'}
    </button>

    <!-- エラーメッセージ -->
    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}
  </div>

  <!-- 履歴 -->
  <div class="history-panel">
    <h2>翻訳履歴</h2>

    <div class="history-controls">
      <input
        type="text"
        bind:value={searchKeyword}
        oninput={loadHistory}
        placeholder="履歴を検索..."
      />
      <button onclick={clearAllHistory}>全て削除</button>
    </div>

    <div class="history-list">
      {#each history as item (item.id)}
        <div
          class="history-item"
          onclick={() => restoreFromHistory(item)}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') restoreFromHistory(item);
          }}
          role="button"
          tabindex="0"
        >
          <div class="history-content">
            <div class="history-text">
              <strong>{item.source_lang} → {item.target_lang}</strong>
              <p>{item.original_text}</p>
              <p class="translated">{item.translated_text}</p>
            </div>
            <div class="history-meta">
              <span>{new Date(item.created_at).toLocaleString('ja-JP')}</span>
              <button
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  deleteHistoryItem(item.id);
                }}
                class="delete-btn"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 20px;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
      'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    background: #f5f5f5;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    color: #333;
  }

  .translation-panel {
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;
  }

  .language-select {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    align-items: center;
  }

  select {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .swap-btn {
    padding: 8px 16px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  .swap-btn:hover {
    background: #e0e0e0;
  }

  .text-areas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .text-area-wrapper {
    display: flex;
    flex-direction: column;
  }

  label {
    margin-bottom: 4px;
    font-weight: bold;
    color: #555;
  }

  textarea {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    resize: vertical;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #4caf50;
  }

  .translate-btn {
    width: 100%;
    padding: 12px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
  }

  .translate-btn:hover:not(:disabled) {
    background: #45a049;
  }

  .translate-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error {
    margin-top: 12px;
    padding: 12px;
    background: #ffebee;
    color: #c62828;
    border-radius: 4px;
  }

  .history-panel {
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .history-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .history-controls input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .history-controls button {
    padding: 8px 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .history-controls button:hover {
    background: #d32f2f;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .history-item {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .history-item:hover {
    background: #f5f5f5;
  }

  .history-content {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }

  .history-text {
    flex: 1;
  }

  .history-text p {
    margin: 4px 0;
  }

  .history-text .translated {
    color: #666;
  }

  .history-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }

  .history-meta span {
    font-size: 12px;
    color: #999;
  }

  .delete-btn {
    padding: 4px 12px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .delete-btn:hover {
    background: #d32f2f;
  }
</style>
