<script lang="ts">
  import type { DiffElement } from '$lib/diff-utils';

  let {
    pinnedText,
    diffElements,
    revertedHunks,
    hunkCount,
    onToggleHunk,
    onRevertAll,
    onResetAll,
    onClear,
  }: {
    pinnedText: string;
    diffElements: DiffElement[] | null;
    revertedHunks: Set<number>;
    hunkCount: number;
    onToggleHunk: (hunkIndex: number) => void;
    onRevertAll: () => void;
    onResetAll: () => void;
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
    <div class="flex items-center gap-1.5">
      {#if hunkCount > 0}
        <button
          onclick={onRevertAll}
          class="rounded px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          title="全ての差分を原文に戻す"
        >
          すべてrevert
        </button>
        <button
          onclick={onResetAll}
          class="rounded px-2 py-0.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
          title="全てのrevertを解除する"
        >
          すべてリセット
        </button>
      {/if}
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
  </div>

  <div class="font-body text-ink text-sm leading-relaxed whitespace-pre-wrap">
    {#if diffElements}
      {#each diffElements as el, i (i)}
        {#if el.kind === 'equal'}
          {el.text}
        {:else}
          {@const reverted = revertedHunks.has(el.hunk.index)}
          <span
            role="button"
            tabindex="0"
            class="cursor-pointer rounded-sm transition-colors hover:bg-amber-100/60"
            title={reverted ? 'クリックで再翻訳結果に戻す' : 'クリックで原文に戻す'}
            onclick={() => onToggleHunk(el.hunk.index)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleHunk(el.hunk.index);
              }
            }}
          >
            {#if reverted}
              {#each el.hunk.removed as seg, si (si)}<span
                  class="rounded-sm bg-blue-100 text-blue-800">{seg.text}</span
                >{/each}{#each el.hunk.added as seg, si (si)}<span
                  class="rounded-sm bg-stone-100 text-stone-400 line-through">{seg.text}</span
                >{/each}
            {:else}
              {#each el.hunk.removed as seg, si (si)}<span
                  class="rounded-sm bg-red-100 text-red-800 line-through">{seg.text}</span
                >{/each}{#each el.hunk.added as seg, si (si)}<span
                  class="rounded-sm bg-green-100 text-green-800">{seg.text}</span
                >{/each}
            {/if}
          </span>
        {/if}
      {/each}
    {:else}
      {pinnedText}
    {/if}
  </div>
</div>
