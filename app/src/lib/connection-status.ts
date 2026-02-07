export function connectionStatusColor(ok: boolean | null): string {
  if (ok === true) return 'bg-green-500';
  if (ok === false) return 'bg-red-500';
  return 'bg-stone-300';
}

export function connectionStatusTitle(ok: boolean | null): string {
  if (ok === true) return 'Ollama接続中';
  if (ok === false) return 'Ollama未接続';
  return '確認中...';
}

export function connectionStatusLabel(ok: boolean | null): string {
  if (ok === true) return '接続中';
  if (ok === false) return '未接続';
  return '確認中...';
}
