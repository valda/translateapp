import { test, expect } from '@playwright/test';

test.describe('翻訳UIインタラクション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('言語選択・テキスト入力・言語入れ替えが動作する', async ({ page }) => {
    // 言語セレクトの初期値を確認
    const sourceSelect = page.locator('select').first();
    const targetSelect = page.locator('select').last();
    await expect(sourceSelect).toHaveValue('ja');
    await expect(targetSelect).toHaveValue('en');

    // テキストエリアへの入力が反映されることを確認
    const textarea = page.locator('textarea').first();
    await textarea.fill('こんにちは');
    await expect(textarea).toHaveValue('こんにちは');

    // 言語入れ替えボタンでソース・ターゲットが入れ替わることを確認
    const swapBtn = page.locator('[data-testid="swap-btn"]');
    await swapBtn.click();
    await expect(sourceSelect).toHaveValue('en');
    await expect(targetSelect).toHaveValue('ja');
  });
});
