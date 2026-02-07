import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { HistoryCreateSchema } from '$lib/server/schemas';
import {
  createHistory,
  getAllHistory,
  searchHistory,
  deleteAllHistory,
} from '$lib/server/database';

export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('search');

  if (search) {
    return json(searchHistory(search));
  }
  return json(getAllHistory());
};

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  const parsed = HistoryCreateSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const item = createHistory(parsed.data);
  return json(item);
};

export const DELETE: RequestHandler = async () => {
  deleteAllHistory();
  return json({ message: '全ての履歴を削除しました' });
};
