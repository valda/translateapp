<script lang="ts">
  import { onMount } from 'svelte';
  import type { SettingsResponse, DetectResponse, ModelsResponse } from '$lib/types';
  import { connectionStatusColor, connectionStatusLabel } from '$lib/connection-status';

  let {
    connectionOk = $bindable(),
    onClose,
  }: {
    connectionOk: boolean | null;
    onClose: () => void;
  } = $props();

  let settingsUrl = $state('');
  let settingsModel = $state('');
  let settingsUrlSource = $state<'env' | 'db' | 'default'>('default');
  let settingsModelSource = $state<'env' | 'db' | 'default'>('default');
  let availableModels = $state<string[]>([]);
  let isDetecting = $state(false);
  let isSaving = $state(false);
  let isTesting = $state(false);
  let settingsMessage = $state('');
  let settingsMessageType = $state<'success' | 'error' | ''>('');

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const data: SettingsResponse = await response.json();
      settingsUrl = data.settings.ollama_base_url;
      settingsModel = data.settings.ollama_model;
      settingsUrlSource = data.settings.ollama_base_url_source;
      settingsModelSource = data.settings.ollama_model_source;
      connectionOk = data.connection_ok;
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      connectionOk = false;
    }
  }

  async function loadModels(url?: string) {
    try {
      const query = url ? `?url=${encodeURIComponent(url)}` : '';
      const response = await fetch(`/api/settings/models${query}`);
      const data: ModelsResponse = await response.json();
      if (data.success) {
        availableModels = data.models;
      } else {
        availableModels = [];
      }
    } catch {
      availableModels = [];
    }
  }

  async function detectOllama() {
    isDetecting = true;
    settingsMessage = '';
    try {
      const response = await fetch('/api/settings/detect', { method: 'POST' });
      const data: DetectResponse = await response.json();

      if (data.success && data.url) {
        settingsUrl = data.url;
        settingsUrlSource = 'db';
        settingsMessage = data.message;
        settingsMessageType = 'success';
        connectionOk = true;
        await loadModels();
      } else {
        settingsMessage = data.message;
        settingsMessageType = 'error';
      }
    } catch (error) {
      settingsMessage = `検出エラー: ${error}`;
      settingsMessageType = 'error';
    } finally {
      isDetecting = false;
    }
  }

  async function testConnection() {
    isTesting = true;
    settingsMessage = '';
    try {
      const query = `?url=${encodeURIComponent(settingsUrl)}`;
      const response = await fetch(`/api/settings/models${query}`);
      const data: ModelsResponse = await response.json();
      if (data.success) {
        connectionOk = true;
        availableModels = data.models;
        settingsMessage = '接続に成功しました';
        settingsMessageType = 'success';
      } else {
        connectionOk = false;
        settingsMessage = `接続に失敗: ${data.error_message}`;
        settingsMessageType = 'error';
      }
    } catch (error) {
      connectionOk = false;
      settingsMessage = `接続エラー: ${error}`;
      settingsMessageType = 'error';
    } finally {
      isTesting = false;
    }
  }

  async function saveSettings() {
    isSaving = true;
    settingsMessage = '';
    try {
      const body: Record<string, string> = {};
      if (settingsUrlSource !== 'env') {
        body.ollama_base_url = settingsUrl;
      }
      if (settingsModelSource !== 'env') {
        body.ollama_model = settingsModel;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data: SettingsResponse = await response.json();
        connectionOk = data.connection_ok;
        settingsUrlSource = data.settings.ollama_base_url_source;
        settingsModelSource = data.settings.ollama_model_source;
        settingsMessage = '設定を保存しました';
        settingsMessageType = 'success';
      } else {
        const err = await response.json();
        settingsMessage = `保存に失敗: ${err.error}`;
        settingsMessageType = 'error';
      }
    } catch (error) {
      settingsMessage = `保存エラー: ${error}`;
      settingsMessageType = 'error';
    } finally {
      isSaving = false;
    }
  }

  onMount(() => {
    loadSettings();
    loadModels();
  });
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onclick={(e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }}
  onkeydown={(e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }}
  role="dialog"
  aria-modal="true"
  aria-label="設定"
>
  <div
    class="bg-washi mx-4 w-full max-w-lg rounded-2xl border border-stone-200 p-6 shadow-xl sm:p-8"
  >
    <div class="mb-6 flex items-center justify-between">
      <h2 class="font-display text-ink text-xl font-semibold">設定</h2>
      <button
        onclick={onClose}
        class="text-ink-muted hover:text-ink rounded-lg p-1 transition-colors hover:bg-stone-100"
        aria-label="閉じる"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Ollama URL -->
    <div class="mb-5">
      <label class="text-ink-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
        Ollama URL
        {#if settingsUrlSource === 'env'}
          <span
            class="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-stone-600 normal-case"
          >
            環境変数で固定
          </span>
        {/if}
      </label>
      <div class="flex gap-2">
        <input
          type="url"
          bind:value={settingsUrl}
          disabled={settingsUrlSource === 'env'}
          placeholder="http://127.0.0.1:11434"
          class="text-ink focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
        />
        <button
          onclick={detectOllama}
          disabled={isDetecting || settingsUrlSource === 'env'}
          class="bg-washi-warm text-ink-light shrink-0 rounded-lg border border-stone-200 px-3 py-2.5 text-xs font-medium transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDetecting ? '検出中...' : '自動検出'}
        </button>
      </div>
    </div>

    <!-- Model -->
    <div class="mb-5">
      <label class="text-ink-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
        モデル
        {#if settingsModelSource === 'env'}
          <span
            class="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-stone-600 normal-case"
          >
            環境変数で固定
          </span>
        {/if}
      </label>
      {#if availableModels.length > 0 && settingsModelSource !== 'env'}
        <select
          bind:value={settingsModel}
          class="text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none"
        >
          {#each availableModels as model (model)}
            <option value={model}>{model}</option>
          {/each}
          {#if !availableModels.includes(settingsModel)}
            <option value={settingsModel}>{settingsModel} (未取得)</option>
          {/if}
        </select>
      {:else}
        <input
          type="text"
          bind:value={settingsModel}
          disabled={settingsModelSource === 'env'}
          placeholder="translategemma:12b"
          class="text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
        />
      {/if}
    </div>

    <!-- 接続ステータス -->
    <div class="mb-5 flex items-center gap-2">
      <span class="inline-block h-2.5 w-2.5 rounded-full {connectionStatusColor(connectionOk)}"
      ></span>
      <span class="text-ink-muted text-sm">
        {connectionStatusLabel(connectionOk)}
      </span>
    </div>

    <!-- メッセージ -->
    {#if settingsMessage}
      <div
        class="mb-5 rounded-lg border px-4 py-3 text-sm {settingsMessageType === 'success'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'bg-danger-light text-danger border-red-200'}"
      >
        {settingsMessage}
      </div>
    {/if}

    <!-- ボタン -->
    <div class="flex gap-3">
      <button
        onclick={testConnection}
        disabled={isTesting}
        class="bg-washi-warm text-ink-light flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isTesting ? 'テスト中...' : '接続テスト'}
      </button>
      <button
        onclick={saveSettings}
        disabled={isSaving || (settingsUrlSource === 'env' && settingsModelSource === 'env')}
        class="bg-accent hover:bg-accent-hover focus:ring-accent/30 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        {isSaving ? '保存中...' : '保存'}
      </button>
    </div>
  </div>
</div>
