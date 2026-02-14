import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildMessages', () => {
  it('referenceText なしの場合 user メッセージのみ返す', async () => {
    const { buildMessages } = await import('./openai-compat');

    const messages = buildMessages('Hello', 'en', 'ja');
    expect(messages).toEqual([{ role: 'user', content: 'en to ja: Hello' }]);
  });

  it('referenceText ありの場合 system + user メッセージを返す', async () => {
    const { buildMessages } = await import('./openai-compat');

    const messages = buildMessages('Hello', 'en', 'ja', '以前の翻訳');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('以前の翻訳');
    expect(messages[0].content).toContain('Japanese');
    expect(messages[1]).toEqual({ role: 'user', content: 'en to ja: Hello' });
  });

  it('未知の言語コードはそのまま使用する', async () => {
    const { buildMessages } = await import('./openai-compat');

    const messages = buildMessages('text', 'xx', 'yy', 'ref');
    expect(messages[0].content).toContain('yy');
  });
});

describe('OpenAiCompatProvider.translateText', () => {
  it('正しいURL・メソッド・bodyで /v1/chat/completions を呼ぶ', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'こんにちは' } }],
        }),
    });

    await provider.translateText('Hello', 'en', 'ja');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:1234/v1/chat/completions');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.stream).toBe(false);
    expect(body.temperature).toBe(0.1);
    expect(body.messages).toBeInstanceOf(Array);
    expect(body.messages[body.messages.length - 1]).toEqual({
      role: 'user',
      content: 'en to ja: Hello',
    });
    expect(body.prompt).toBeUndefined();
    expect(body.max_tokens).toBe(2048);
  });

  it('choices[0].message.contentをtrimして返す', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '  こんにちは  \n' } }],
        }),
    });

    const result = await provider.translateText('Hello', 'en', 'ja');
    expect(result.translatedText).toBe('こんにちは');
  });

  it('非okレスポンスでエラーをthrowする', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(provider.translateText('Hello', 'en', 'ja')).rejects.toThrow(
      'OpenAI互換 API error (500)',
    );
  });

  it('AbortErrorで日本語タイムアウトメッセージを返す', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(provider.translateText('Hello', 'en', 'ja')).rejects.toThrow(
      '翻訳がタイムアウトしました',
    );
  });

  it('TypeErrorで接続先URLを含むエラーメッセージを返す', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    const typeError = new TypeError('fetch failed');
    mockFetch.mockRejectedValueOnce(typeError);

    await expect(provider.translateText('Hello', 'en', 'ja')).rejects.toThrow(
      'OpenAI互換サーバーに接続できません',
    );
  });

  it('promptフィールドにメッセージ情報が含まれる', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'こんにちは' } }],
        }),
    });

    const result = await provider.translateText('Hello', 'en', 'ja');
    expect(result.prompt).toContain('Hello');
    expect(result.prompt).toContain('en to ja');
  });

  it('referenceText がある場合 system メッセージを含む', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: 'こんにちは' } }],
        }),
    });

    await provider.translateText('Hello', 'en', 'ja', 'こんにちは');

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: expect.stringContaining('こんにちは'),
    });
    expect(body.messages[1]).toEqual({
      role: 'user',
      content: 'en to ja: Hello',
    });
  });
});

describe('OpenAiCompatProvider.listModels', () => {
  it('/v1/modelsのdata[].idをパースする', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 'model-a' }, { id: 'model-b' }],
      }),
    });

    const result = await provider.listModels('http://localhost:1234');
    expect(result.ok).toBe(true);
    expect(result.models).toEqual(['model-a', 'model-b']);
  });

  it('接続エラー時にok:falseを返す', async () => {
    const { OpenAiCompatProvider } = await import('./openai-compat');
    const provider = new OpenAiCompatProvider();

    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const result = await provider.listModels('http://localhost:1234');
    expect(result.ok).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toBeDefined();
  });
});
