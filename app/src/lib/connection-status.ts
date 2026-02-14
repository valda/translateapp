import type { ProviderType } from '$lib/types';

const PROVIDER_DISPLAY_NAMES: Record<ProviderType, string> = {
  ollama: 'Ollama',
  openai_compat: 'OpenAI互換',
};

export function connectionStatusColor(ok: boolean | null): string {
  if (ok === true) return 'bg-green-500';
  if (ok === false) return 'bg-red-500';
  return 'bg-stone-300';
}

export function connectionStatusTitle(
  ok: boolean | null,
  provider: ProviderType = 'ollama',
): string {
  const name = PROVIDER_DISPLAY_NAMES[provider];
  if (ok === true) return `${name} 接続中`;
  if (ok === false) return `${name} 未接続`;
  return '確認中...';
}

export function connectionStatusLabel(ok: boolean | null): string {
  if (ok === true) return '接続中';
  if (ok === false) return '未接続';
  return '確認中...';
}
