<script lang="ts">
  import { onMount } from 'svelte';
  import type { HistoryItem, SettingsResponse } from '$lib/types';
  import { LANGUAGES } from '$lib/constants';
  import { connectionStatusColor, connectionStatusTitle } from '$lib/connection-status';
  import SettingsModal from './SettingsModal.svelte';

  // 状態管理（Svelte 5 runes）
  let originalText = $state('');
  let translatedText = $state('');
  let sourceLang = $state('ja');
  let targetLang = $state('en');
  let isTranslating = $state(false);
  let errorMessage = $state('');
  let history = $state<HistoryItem[]>([]);
  let searchKeyword = $state('');

  // 設定モーダル
  let showSettings = $state(false);
  let connectionOk = $state<boolean | null>(null);

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

  // 接続ステータス確認（ヘッダードット用）
  async function checkConnection() {
    try {
      const response = await fetch('/api/settings');
      const data: SettingsResponse = await response.json();
      connectionOk = data.connection_ok;
    } catch {
      connectionOk = false;
    }
  }

  // 初期化
  onMount(() => {
    loadHistory();
    checkConnection();
  });
</script>

<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Header -->
  <header class="mb-10 text-center">
    <div class="flex items-center justify-center gap-3">
      <h1 class="font-display text-ink text-3xl font-bold tracking-tight sm:text-4xl">
        TranslateGemma
      </h1>
      <div class="flex items-center gap-2">
        <!-- 接続ステータス -->
        <span
          class="inline-block h-2.5 w-2.5 rounded-full {connectionStatusColor(connectionOk)}"
          title={connectionStatusTitle(connectionOk)}
        ></span>
        <!-- 歯車アイコン -->
        <button
          onclick={() => (showSettings = true)}
          class="text-ink-muted hover:text-ink rounded-lg p-1.5 transition-colors hover:bg-stone-100"
          aria-label="設定"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>
    <p class="text-ink-muted mt-1 text-sm tracking-widest">ローカル翻訳</p>
  </header>

  <!-- Settings Modal -->
  {#if showSettings}
    <SettingsModal bind:connectionOk onClose={() => (showSettings = false)} />
  {/if}

  <!-- Translation Panel -->
  <section class="bg-washi mb-8 rounded-2xl border border-stone-200 p-6 shadow-sm sm:p-8">
    <!-- Language selectors -->
    <div class="mb-6 flex items-center gap-3">
      <select
        bind:value={sourceLang}
        class="bg-washi-warm text-ink-light focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
      >
        {#each LANGUAGES as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>

      <button
        data-testid="swap-btn"
        onclick={swapLanguages}
        class="bg-washi-warm text-ink-muted hover:text-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 text-lg transition-all hover:border-stone-300 hover:bg-stone-100 active:scale-95"
        aria-label="言語を入れ替え"
      >
        ⇄
      </button>

      <select
        bind:value={targetLang}
        class="bg-washi-warm text-ink-light focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none"
      >
        {#each LANGUAGES as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>
    </div>

    <!-- Text areas -->
    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <div class="flex flex-col gap-1.5">
        <label class="text-ink-muted text-xs font-semibold tracking-wide uppercase">原文</label>
        <textarea
          bind:value={originalText}
          placeholder="翻訳するテキストを入力してください"
          rows="8"
          class="font-body text-ink focus:border-accent focus:ring-accent/20 resize-y rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-ink-muted text-xs font-semibold tracking-wide uppercase">訳文</label>
        <textarea
          bind:value={translatedText}
          placeholder="翻訳結果がここに表示されます"
          rows="8"
          readonly
          class="font-body text-ink focus:border-accent focus:ring-accent/20 resize-y rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none"
        ></textarea>
      </div>
    </div>

    <!-- Translate button -->
    <button
      data-testid="translate-btn"
      onclick={translate}
      disabled={isTranslating}
      class="bg-accent hover:bg-accent-hover focus:ring-accent/30 w-full rounded-lg px-6 py-3 text-sm font-semibold tracking-wide text-white transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
    >
      {isTranslating ? '翻訳中...' : '翻訳する'}
    </button>

    <!-- Error message -->
    {#if errorMessage}
      <div
        class="bg-danger-light text-danger mt-4 rounded-lg border border-red-200 px-4 py-3 text-sm"
      >
        {errorMessage}
      </div>
    {/if}
  </section>

  <!-- History Panel -->
  <section
    data-testid="history-panel"
    class="bg-washi rounded-2xl border border-stone-200 p-6 shadow-sm sm:p-8"
  >
    <h2 class="font-display text-ink text-xl font-semibold">翻訳履歴</h2>

    <!-- Search & clear -->
    <div class="mt-4 mb-6 flex gap-3">
      <input
        type="text"
        bind:value={searchKeyword}
        oninput={loadHistory}
        placeholder="履歴を検索..."
        class="text-ink focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none"
      />
      <button
        onclick={clearAllHistory}
        class="text-danger hover:border-danger hover:bg-danger-light shrink-0 rounded-lg border border-stone-200 px-4 py-2.5 text-xs font-medium transition-colors"
      >
        全て削除
      </button>
    </div>

    <!-- History list -->
    <div class="flex flex-col gap-3">
      {#each history as item (item.id)}
        <div
          onclick={() => restoreFromHistory(item)}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') restoreFromHistory(item);
          }}
          role="button"
          tabindex="0"
          class="group focus:ring-accent/20 cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-300 hover:shadow-sm focus:ring-2 focus:outline-none"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <span
                class="text-ink-muted inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium"
              >
                {item.source_lang} → {item.target_lang}
              </span>
              <p class="text-ink mt-2 line-clamp-2 text-sm leading-relaxed">{item.original_text}</p>
              <p class="text-ink-muted mt-1 line-clamp-2 text-sm leading-relaxed">
                {item.translated_text}
              </p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2">
              <span class="text-xs text-stone-400">
                {new Date(item.created_at).toLocaleString('ja-JP')}
              </span>
              <button
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  deleteHistoryItem(item.id);
                }}
                class="hover:bg-danger-light hover:text-danger rounded-md px-2.5 py-1 text-xs text-stone-400 opacity-0 transition-all group-hover:opacity-100"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>
</main>
