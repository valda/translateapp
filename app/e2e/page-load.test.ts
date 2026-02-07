import { test, expect } from '@playwright/test';

test.describe('メインページ表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正常にロードされる', async ({ page }) => {
    await expect(page).toHaveTitle(/.*/);
  });

  test('h1要素が存在する', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('select要素が2つ存在する', async ({ page }) => {
    const selects = page.locator('select');
    await expect(selects).toHaveCount(2);
  });

  test('翻訳ボタンが表示される', async ({ page }) => {
    const button = page.locator('button.translate-btn');
    await expect(button).toBeVisible();
  });

  test('履歴セクションが存在する', async ({ page }) => {
    await expect(page.locator('.history-panel')).toBeVisible();
  });
});
