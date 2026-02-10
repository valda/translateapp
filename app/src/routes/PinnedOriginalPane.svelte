<script lang="ts">
  import type { DiffSegment } from '$lib/diff-utils';

  let {
    pinnedText,
    diffSegments,
    onClear,
  }: {
    pinnedText: string;
    diffSegments: DiffSegment[] | null;
    onClear: () => void;
  } = $props();
</script>

<div class="mb-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
  <div class="mb-2 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-ink-muted text-xs font-semibold tracking-wide uppercase">ピン留め原文</span>
      <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        再翻訳チェック中
      </span>
    </div>
    <button
      onclick={onClear}
      class="text-ink-muted hover:text-danger rounded p-0.5 transition-colors"
      aria-label="ピン留め解除"
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
  </div>

  <div class="font-body text-ink text-sm leading-relaxed whitespace-pre-wrap">
    {#if diffSegments}
      {#each diffSegments as segment, i (i)}
        {#if segment.type === 'removed'}
          <span class="rounded-sm bg-red-100 text-red-800 line-through">{segment.text}</span>
        {:else if segment.type === 'added'}
          <span class="rounded-sm bg-green-100 text-green-800">{segment.text}</span>
        {:else}
          {segment.text}
        {/if}
      {/each}
    {:else}
      {pinnedText}
    {/if}
  </div>
</div>
