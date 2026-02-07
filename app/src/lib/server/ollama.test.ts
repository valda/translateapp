import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateText } from './ollama';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('translateText', () => {
  it('正しいURL・メソッド・bodyでOllama APIを呼ぶ', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'こんにちは' }),
    });

    await translateText('Hello', 'en', 'ja');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/generate');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('translategemma:12b');
    expect(body.stream).toBe(false);
    expect(body.prompt).toContain('English');
    expect(body.prompt).toContain('Japanese');
    expect(body.prompt).toContain('Hello');
  });

  it('レスポンスのtrimされた翻訳テキストを返す', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '  こんにちは  \n' }),
    });

    const result = await translateText('Hello', 'en', 'ja');
    expect(result).toBe('こんにちは');
  });

  it('非okレスポンスでエラーをthrowする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(translateText('Hello', 'en', 'ja')).rejects.toThrow('Ollama API error (500)');
  });

  it('AbortErrorで日本語タイムアウトメッセージを返す', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(translateText('Hello', 'en', 'ja')).rejects.toThrow('翻訳がタイムアウトしました');
  });

  it('TypeErrorで接続先URLを含むエラーメッセージを返す', async () => {
    const typeError = new TypeError('fetch failed');
    mockFetch.mockRejectedValueOnce(typeError);

    await expect(translateText('Hello', 'en', 'ja')).rejects.toThrow('http://localhost:11434');
  });

  it('zh-Hansなど特殊コードでプロンプトが正しい', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '你好' }),
    });

    await translateText('Hello', 'en', 'zh-Hans');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.prompt).toContain('Chinese Simplified');
    expect(body.prompt).toContain('zh-Hans');
  });
});
