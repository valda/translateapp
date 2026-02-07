import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteHistory } from '$lib/server/database';

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id);

  if (isNaN(id)) {
    return json({ message: '無効なIDです' }, { status: 400 });
  }

  const deleted = deleteHistory(id);
  if (!deleted) {
    return json({ message: '履歴が見つかりません' }, { status: 404 });
  }

  return json({ message: '履歴を削除しました' });
};
