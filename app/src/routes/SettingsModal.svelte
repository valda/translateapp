<script lang="ts">
  import { onMount } from 'svelte';
  import type { SettingsResponse, DetectResponse, ModelsResponse, ProviderType } from '$lib/types';
  import { connectionStatusColor, connectionStatusLabel } from '$lib/connection-status';

  let {
    connectionOk = $bindable(),
    onClose,
  }: {
    connectionOk: boolean | null;
    onClose: () => void;
  } = $props();

  // プロバイダー選択
  let settingsProvider = $state<ProviderType>('ollama');
  let settingsProviderSource = $state<'env' | 'db' | 'default'>('default');

  // Ollama設定
  let settingsUrl = $state('');
  let settingsModel = $state('');
  let settingsUrlSource = $state<'env' | 'db' | 'default'>('default');
  let settingsModelSource = $state<'env' | 'db' | 'default'>('default');
  let availableModels = $state<string[]>([]);

  // OpenAI互換設定
  let openaiCompatUrl = $state('');
  let openaiCompatModel = $state('');
  let openaiCompatUrlSource = $state<'env' | 'db' | 'default'>('default');
  let openaiCompatModelSource = $state<'env' | 'db' | 'default'>('default');
  let openaiCompatModels = $state<string[]>([]);

  let isDetecting = $state(false);
  let isSaving = $state(false);
  let isTesting = $state(false);
  let settingsMessage = $state('');
  let settingsMessageType = $state<'success' | 'error' | ''>('');
  let templateCopied = $state(false);

  const jinjaTemplate = `{%- set lang_names = {
  'ja': 'Japanese', 'en': 'English',
  'zh-Hans': 'Chinese Simplified', 'ko': 'Korean',
  'fr': 'French', 'de': 'German',
  'es': 'Spanish', 'pt': 'Portuguese'
} -%}
{%- set ns = namespace(referenceText='') -%}
{%- for message in messages -%}
{%- if message['role'] == 'system' -%}
{%- set ns.referenceText = message['content'] -%}
{%- endif -%}
{%- endfor -%}
{%- for message in messages -%}
{%- if message['role'] == 'user' -%}
{%- set parts = message['content'].split(': ', 1) -%}
{%- set lang_pair = parts[0].split(' to ') -%}
{%- set src = lang_pair[0] -%}
{%- set tgt = lang_pair[1] -%}
{%- set src_name = lang_names[src] if src in lang_names else src -%}
{%- set tgt_name = lang_names[tgt] if tgt in lang_names else tgt -%}
{%- set text_part = parts[1] if parts | length > 1 else '' -%}
<start_of_turn>user
You are a professional {{ src_name }} ({{ src }}) to {{ tgt_name }} ({{ tgt }}) translator.
Your goal is to accurately convey the meaning and nuances of the original {{ src_name }} text while adhering to {{ tgt_name }} grammar, vocabulary, and cultural sensitivities.
Produce only the {{ tgt_name }} translation, without any additional explanations or commentary.
Please translate the following {{ src_name }} text into {{ tgt_name }}:
{% if ns.referenceText %}{{ ns.referenceText }}
{% endif %}{{ text_part }}<end_of_turn>
<start_of_turn>model
{%- endif -%}
{%- endfor -%}`;

  async function copyTemplate() {
    await navigator.clipboard.writeText(jinjaTemplate);
    templateCopied = true;
    setTimeout(() => (templateCopied = false), 2000);
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const data: SettingsResponse = await response.json();
      settingsProvider = data.settings.translate_provider;
      settingsProviderSource = data.settings.translate_provider_source;
      settingsUrl = data.settings.ollama_base_url;
      settingsModel = data.settings.ollama_model;
      settingsUrlSource = data.settings.ollama_base_url_source;
      settingsModelSource = data.settings.ollama_model_source;
      openaiCompatUrl = data.settings.openai_compat_base_url;
      openaiCompatModel = data.settings.openai_compat_model;
      openaiCompatUrlSource = data.settings.openai_compat_base_url_source;
      openaiCompatModelSource = data.settings.openai_compat_model_source;
      connectionOk = data.connection_ok;
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      connectionOk = false;
    }
  }

  function setModelsForProvider(p: ProviderType, models: string[]) {
    if (p === 'openai_compat') {
      openaiCompatModels = models;
    } else {
      availableModels = models;
    }
  }

  async function loadModels(url?: string, provider?: ProviderType) {
    const p = provider ?? settingsProvider;
    try {
      const query = url ? `?url=${encodeURIComponent(url)}&provider=${p}` : `?provider=${p}`;
      const response = await fetch(`/api/settings/models${query}`);
      const data: ModelsResponse = await response.json();
      setModelsForProvider(p, data.success ? data.models : []);
    } catch {
      setModelsForProvider(p, []);
    }
  }

  async function detectServer() {
    isDetecting = true;
    settingsMessage = '';
    try {
      const response = await fetch(`/api/settings/detect?provider=${settingsProvider}`, {
        method: 'POST',
      });
      const data: DetectResponse = await response.json();

      if (data.success && data.url) {
        if (settingsProvider === 'openai_compat') {
          openaiCompatUrl = data.url;
          openaiCompatUrlSource = 'db';
        } else {
          settingsUrl = data.url;
          settingsUrlSource = 'db';
        }
        settingsMessage = data.message;
        settingsMessageType = 'success';
        connectionOk = true;
        await loadModels(undefined, settingsProvider);
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
    const testUrl = settingsProvider === 'openai_compat' ? openaiCompatUrl : settingsUrl;
    try {
      const query = `?url=${encodeURIComponent(testUrl)}&provider=${settingsProvider}`;
      const response = await fetch(`/api/settings/models${query}`);
      const data: ModelsResponse = await response.json();
      if (data.success) {
        connectionOk = true;
        setModelsForProvider(settingsProvider, data.models);
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
      if (settingsProviderSource !== 'env') {
        body.translate_provider = settingsProvider;
      }
      if (settingsUrlSource !== 'env') {
        body.ollama_base_url = settingsUrl;
      }
      if (settingsModelSource !== 'env') {
        body.ollama_model = settingsModel;
      }
      if (openaiCompatUrlSource !== 'env') {
        body.openai_compat_base_url = openaiCompatUrl;
      }
      if (openaiCompatModelSource !== 'env') {
        body.openai_compat_model = openaiCompatModel;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data: SettingsResponse = await response.json();
        connectionOk = data.connection_ok;
        settingsProviderSource = data.settings.translate_provider_source;
        settingsUrlSource = data.settings.ollama_base_url_source;
        settingsModelSource = data.settings.ollama_model_source;
        openaiCompatUrlSource = data.settings.openai_compat_base_url_source;
        openaiCompatModelSource = data.settings.openai_compat_model_source;
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
    loadModels(undefined, 'ollama');
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

    <!-- プロバイダー選択 -->
    <div class="mb-5">
      <label class="text-ink-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
        翻訳プロバイダー
        {#if settingsProviderSource === 'env'}
          <span
            class="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-stone-600 normal-case"
          >
            環境変数で固定
          </span>
        {/if}
      </label>
      <select
        bind:value={settingsProvider}
        disabled={settingsProviderSource === 'env'}
        class="text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
        data-testid="provider-select"
      >
        <option value="ollama">Ollama</option>
        <option value="openai_compat">LM Studio(OpenAI互換)</option>
      </select>
    </div>

    {#if settingsProvider === 'ollama'}
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
            onclick={detectServer}
            disabled={isDetecting || settingsUrlSource === 'env'}
            class="bg-washi-warm text-ink-light shrink-0 rounded-lg border border-stone-200 px-3 py-2.5 text-xs font-medium transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="detect-btn"
          >
            {isDetecting ? '検出中...' : '自動検出'}
          </button>
        </div>
      </div>

      <!-- Ollama Model -->
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
    {:else}
      <!-- OpenAI互換 URL -->
      <div class="mb-5">
        <label class="text-ink-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
          OpenAI互換 URL
          {#if openaiCompatUrlSource === 'env'}
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
            bind:value={openaiCompatUrl}
            disabled={openaiCompatUrlSource === 'env'}
            placeholder="http://localhost:1234"
            class="text-ink focus:border-accent focus:ring-accent/20 flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
          />
          <button
            onclick={detectServer}
            disabled={isDetecting || openaiCompatUrlSource === 'env'}
            class="bg-washi-warm text-ink-light shrink-0 rounded-lg border border-stone-200 px-3 py-2.5 text-xs font-medium transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="detect-openai-btn"
          >
            {isDetecting ? '検出中...' : '自動検出'}
          </button>
        </div>
      </div>

      <!-- OpenAI互換 Model -->
      <div class="mb-5">
        <label class="text-ink-muted mb-1.5 block text-xs font-semibold tracking-wide uppercase">
          モデル
          {#if openaiCompatModelSource === 'env'}
            <span
              class="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-stone-600 normal-case"
            >
              環境変数で固定
            </span>
          {/if}
        </label>
        {#if openaiCompatModels.length > 0 && openaiCompatModelSource !== 'env'}
          <select
            bind:value={openaiCompatModel}
            class="text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none"
          >
            {#each openaiCompatModels as model (model)}
              <option value={model}>{model}</option>
            {/each}
            {#if openaiCompatModel && !openaiCompatModels.includes(openaiCompatModel)}
              <option value={openaiCompatModel}>{openaiCompatModel} (未取得)</option>
            {/if}
          </select>
        {:else}
          <input
            type="text"
            bind:value={openaiCompatModel}
            disabled={openaiCompatModelSource === 'env'}
            placeholder="モデル名"
            class="text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
          />
        {/if}
      </div>

      <!-- サーバー設定ガイド -->
      <details class="mb-5">
        <summary class="text-ink-muted cursor-pointer text-xs font-medium hover:text-stone-700">
          サーバー設定ガイド（LM Studio + TranslateGemma）
        </summary>
        <div class="mt-2 space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
          <div>
            <p class="text-ink-muted mb-1 font-semibold">1. チャットテンプレート（Jinja）</p>
            <p class="text-ink-muted mb-1">
              LM Studio のモデル設定で以下の Jinja テンプレートを設定してください：
            </p>
            <div class="relative">
              <button
                onclick={copyTemplate}
                class="absolute top-1.5 right-1.5 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
              >
                {templateCopied ? 'Copied!' : 'Copy'}
              </button>
              <pre
                class="overflow-x-auto rounded border border-stone-200 bg-white p-2 pr-16 text-[10px] leading-relaxed text-stone-600">{jinjaTemplate}</pre>
            </div>
          </div>
          <div>
            <p class="text-ink-muted mb-1 font-semibold">2. 追加停止トークン</p>
            <p class="text-ink-muted">
              以下を追加停止トークンとして設定：
              <code class="rounded bg-white px-1 py-0.5 text-stone-600">&lt;end_of_turn&gt;</code>、
              <code class="rounded bg-white px-1 py-0.5 text-stone-600">&lt;eos&gt;</code>
            </p>
          </div>
        </div>
      </details>
    {/if}

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
        disabled={isSaving}
        class="bg-accent hover:bg-accent-hover focus:ring-accent/30 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        {isSaving ? '保存中...' : '保存'}
      </button>
    </div>
  </div>
</div>
