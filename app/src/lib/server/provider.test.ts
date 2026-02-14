import { describe, it, expect, beforeEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { getProviderType, getProviderSource, getProvider } from './provider';

beforeEach(() => {
  // テストごとにenv値をリセット
  (env as Record<string, string | undefined>).TRANSLATE_PROVIDER = undefined;
});

describe('getProviderType', () => {
  it('デフォルトではollamaを返す', () => {
    expect(getProviderType()).toBe('ollama');
  });

  it('環境変数TRANSLATE_PROVIDERが優先される', () => {
    (env as Record<string, string | undefined>).TRANSLATE_PROVIDER = 'openai_compat';
    expect(getProviderType()).toBe('openai_compat');
  });

  it('無効な環境変数値は無視されデフォルトになる', () => {
    (env as Record<string, string | undefined>).TRANSLATE_PROVIDER = 'invalid';
    expect(getProviderType()).toBe('ollama');
  });
});

describe('getProviderSource', () => {
  it('デフォルトではdefaultを返す', () => {
    expect(getProviderSource()).toBe('default');
  });

  it('環境変数設定時はenvを返す', () => {
    (env as Record<string, string | undefined>).TRANSLATE_PROVIDER = 'ollama';
    expect(getProviderSource()).toBe('env');
  });
});

describe('getProvider', () => {
  it('ollamaタイプでOllamaProviderを返す', () => {
    const provider = getProvider('ollama');
    expect(provider.name).toBe('ollama');
  });

  it('openai_compatタイプでOpenAiCompatProviderを返す', () => {
    const provider = getProvider('openai_compat');
    expect(provider.name).toBe('openai_compat');
  });

  it('引数なしでデフォルトプロバイダーを返す', () => {
    const provider = getProvider();
    expect(provider.name).toBe('ollama');
  });
});
