import { test, expect } from '@playwright/test';

test.describe('設定モーダル プロバイダー選択', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('設定ボタンクリックでモーダルが開く', async ({ page }) => {
    await page.click('button[aria-label="設定"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('プロバイダー選択selectが表示される', async ({ page }) => {
    await page.click('button[aria-label="設定"]');
    await expect(page.locator('[data-testid="provider-select"]')).toBeVisible();
  });

  test('Ollama選択時にOllama URL・モデルフィールドが表示される', async ({ page }) => {
    await page.click('button[aria-label="設定"]');
    await page.locator('[data-testid="provider-select"]').selectOption('ollama');
    await expect(page.getByText('Ollama URL')).toBeVisible();
    await expect(page.locator('[data-testid="detect-btn"]')).toBeVisible();
  });

  test('OpenAI互換選択時にOpenAI互換 URL・モデルフィールドが表示される', async ({ page }) => {
    await page.click('button[aria-label="設定"]');
    await page.locator('[data-testid="provider-select"]').selectOption('openai_compat');
    await expect(page.getByText('OpenAI互換 URL')).toBeVisible();
  });

  test('プロバイダー切り替えでフィールドが切り替わる', async ({ page }) => {
    await page.click('button[aria-label="設定"]');

    // Ollamaに切り替え
    await page.locator('[data-testid="provider-select"]').selectOption('ollama');
    await expect(page.getByText('Ollama URL')).toBeVisible();
    await expect(page.locator('[data-testid="detect-btn"]')).toBeVisible();

    // OpenAI互換に切り替え
    await page.locator('[data-testid="provider-select"]').selectOption('openai_compat');
    await expect(page.getByText('OpenAI互換 URL')).toBeVisible();
    await expect(page.locator('[data-testid="detect-openai-btn"]')).toBeVisible();
    // Ollama固有フィールドが非表示になること
    await expect(page.locator('[data-testid="detect-btn"]')).not.toBeVisible();
  });

  test('自動検出ボタンが両プロバイダーで表示される', async ({ page }) => {
    await page.click('button[aria-label="設定"]');

    await page.locator('[data-testid="provider-select"]').selectOption('ollama');
    await expect(page.locator('[data-testid="detect-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="detect-openai-btn"]')).not.toBeVisible();

    await page.locator('[data-testid="provider-select"]').selectOption('openai_compat');
    await expect(page.locator('[data-testid="detect-openai-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="detect-btn"]')).not.toBeVisible();
  });
});
