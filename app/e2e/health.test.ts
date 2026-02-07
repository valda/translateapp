import { test, expect } from '@playwright/test';

test('GET /api/health が status ok を返す', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);

  const body = await response.json();
  expect(body.status).toBe('ok');
});
