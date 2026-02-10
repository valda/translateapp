<script lang="ts">
  import { onMount } from 'svelte';
  import type { HistoryItem, SettingsResponse } from '$lib/types';
  import { LANGUAGES } from '$lib/constants';
  import { connectionStatusColor, connectionStatusTitle } from '$lib/connection-status';
  import { computeDiff, type DiffSegment } from '$lib/diff-utils';
  import SettingsModal from './SettingsModal.svelte';
  import PinnedOriginalPane from './PinnedOriginalPane.svelte';

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

  // 再翻訳モード
  let pinnedOriginalText = $state<string | null>(null);
  let pinnedOriginalLang = $state<string | null>(null);
  let diffSegments = $state<DiffSegment[] | null>(null);
  let isRetranslationMode = $derived(pinnedOriginalText !== null);

  // コピー状態
  let copied = $state(false);

  // textarea DOM参照
  let sourceTextarea = $state<HTMLTextAreaElement>();
  let resultTextarea = $state<HTMLTextAreaElement>();

  function autoResize(el: HTMLTextAreaElement | undefined) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  async function copyTranslation() {
    await navigator.clipboard.writeText(translatedText);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

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
          ...(isRetranslationMode && pinnedOriginalText
            ? { reference_text: pinnedOriginalText }
            : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        translatedText = data.translated_text;
        // 再翻訳モード時はdiff計算
        if (isRetranslationMode && pinnedOriginalText && pinnedOriginalLang) {
          diffSegments = computeDiff(pinnedOriginalText, translatedText, pinnedOriginalLang);
        }
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

  // ピン留めして再翻訳モードに入る
  function pinAndRetranslate() {
    pinnedOriginalText = originalText;
    pinnedOriginalLang = sourceLang;
    diffSegments = null;
    swapLanguages();
  }

  // 再翻訳モードを解除
  function clearRetranslation() {
    pinnedOriginalText = null;
    pinnedOriginalLang = null;
    diffSegments = null;
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
    clearRetranslation();
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

  // 再翻訳モード中にテキスト編集されたらdiffをリセット
  $effect(() => {
    if (isRetranslationMode) {
      void originalText;
      diffSegments = null;
    }
  });

  // originalText変更時に原文textareaをリサイズ（履歴復元対応）
  $effect(() => {
    void originalText;
    requestAnimationFrame(() => autoResize(sourceTextarea));
  });

  // translatedText変更時に訳文textareaをリサイズ
  $effect(() => {
    void translatedText;
    requestAnimationFrame(() => autoResize(resultTextarea));
  });

  // 初期化
  onMount(() => {
    loadHistory();
    checkConnection();
  });
</script>

<main class="mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
        disabled={isRetranslationMode}
        class="bg-washi-warm text-ink-light focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        {#each LANGUAGES as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>

      <button
        data-testid="swap-btn"
        onclick={swapLanguages}
        disabled={isRetranslationMode}
        class="bg-washi-warm text-ink-muted hover:text-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 text-lg transition-all hover:border-stone-300 hover:bg-stone-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="言語を入れ替え"
      >
        ⇄
      </button>

      <select
        bind:value={targetLang}
        disabled={isRetranslationMode}
        class="bg-washi-warm text-ink-light focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100"
      >
        {#each LANGUAGES as lang (lang.code)}
          <option value={lang.code}>{lang.name}</option>
        {/each}
      </select>
    </div>

    <!-- Pinned original pane -->
    {#if isRetranslationMode && pinnedOriginalText && pinnedOriginalLang}
      <PinnedOriginalPane
        pinnedText={pinnedOriginalText}
        {diffSegments}
        onClear={clearRetranslation}
      />
    {/if}

    <!-- Text areas -->
    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="text-ink-muted text-xs font-semibold tracking-wide uppercase"
            >{isRetranslationMode ? '訳文（編集可能）' : '原文'}</label
          >
          <div class="flex items-center gap-1">
            {#if translatedText && !isRetranslationMode}
              <button
                onclick={pinAndRetranslate}
                class="text-ink-muted hover:text-accent rounded p-0.5 transition-colors"
                aria-label="ピン留めして再翻訳"
                title="原文をピン留めして再翻訳チェック"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    d="M12.0001 20v-4M7.00012 4h9.99998M9.00012 5v5c0 .5523-.46939 1.0045-.94861 1.279-1.43433.8217-2.60135 3.245-2.25635 4.3653.07806.2535.35396.3557.61917.3557H17.5859c.2652 0 .5411-.1022.6192-.3557.3449-1.1204-.8221-3.5436-2.2564-4.3653-.4792-.2745-.9486-.7267-.9486-1.279V5c0-.55228-.4477-1-1-1h-4c-.55226 0-.99998.44772-.99998 1Z"
                  />
                </svg>
              </button>
            {/if}
            {#if originalText}
              <button
                onclick={() => (originalText = '')}
                class="text-ink-muted hover:text-danger rounded p-0.5 transition-colors"
                aria-label="クリア"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
        </div>
        <textarea
          bind:this={sourceTextarea}
          bind:value={originalText}
          oninput={() => autoResize(sourceTextarea)}
          placeholder="翻訳するテキストを入力してください"
          rows="4"
          class="font-body text-ink focus:border-accent focus:ring-accent/20 max-h-[100dvh] resize-none overflow-hidden rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="text-ink-muted text-xs font-semibold tracking-wide uppercase"
            >{isRetranslationMode ? '元言語への再翻訳文' : '訳文'}</label
          >
          <div class="flex items-center gap-1">
            {#if translatedText}
              <button
                onclick={copyTranslation}
                class="text-ink-muted hover:text-accent flex items-center gap-1 rounded p-0.5 text-xs transition-colors"
                aria-label="コピー"
              >
                {#if copied}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-green-600">コピー済</span>
                {:else}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                {/if}
              </button>
            {/if}
          </div>
        </div>
        <textarea
          bind:this={resultTextarea}
          bind:value={translatedText}
          placeholder="翻訳結果がここに表示されます"
          rows="4"
          readonly
          class="font-body text-ink focus:border-accent focus:ring-accent/20 max-h-[100dvh] resize-none overflow-hidden rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none"
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
