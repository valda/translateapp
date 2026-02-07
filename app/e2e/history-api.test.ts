import { test, expect } from '@playwright/test';

const historyData = {
  original_text: 'E2E test text',
  translated_text: 'E2Eテストテキスト',
  source_lang: 'en',
  target_lang: 'ja',
};

test.describe('履歴API CRUD', () => {
  test('POST /api/history で履歴を作成できる', async ({ request }) => {
    const response = await request.post('/api/history', { data: historyData });
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.original_text).toBe(historyData.original_text);
  });

  test('GET /api/history で作成した項目が含まれる', async ({ request }) => {
    // 事前にデータを作成
    const createRes = await request.post('/api/history', { data: historyData });
    const created = await createRes.json();

    const response = await request.get('/api/history');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((item: { id: number }) => item.id === created.id)).toBe(true);
  });

  test('GET /api/history?search= で検索結果を返す', async ({ request }) => {
    await request.post('/api/history', { data: historyData });

    const response = await request.get('/api/history?search=E2E');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].original_text).toContain('E2E');
  });

  test('DELETE /api/history/:id で削除できる', async ({ request }) => {
    const createRes = await request.post('/api/history', { data: historyData });
    const created = await createRes.json();

    const response = await request.delete(`/api/history/${created.id}`);
    expect(response.ok()).toBe(true);
  });

  test('DELETE /api/history/999999 は404を返す', async ({ request }) => {
    const response = await request.delete('/api/history/999999');
    expect(response.status()).toBe(404);
  });

  test('DELETE /api/history/abc は400を返す', async ({ request }) => {
    const response = await request.delete('/api/history/abc');
    expect(response.status()).toBe(400);
  });

  test('POST /api/translate に空textで400を返す', async ({ request }) => {
    const response = await request.post('/api/translate', {
      data: { text: '', source_lang: 'en', target_lang: 'ja' },
    });
    expect(response.status()).toBe(400);
  });
});
