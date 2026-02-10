import { describe, it, expect } from 'vitest';
import { TranslationRequestSchema, HistoryCreateSchema, SettingsUpdateSchema } from './schemas';

describe('TranslationRequestSchema', () => {
  it('正常な値をパースできる', () => {
    const result = TranslationRequestSchema.safeParse({
      text: 'Hello',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(true);
  });

  it('空のtextを拒否する', () => {
    const result = TranslationRequestSchema.safeParse({
      text: '',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(false);
  });

  it('textフィールドが欠落していると拒否する', () => {
    const result = TranslationRequestSchema.safeParse({
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(false);
  });

  it('source_langフィールドが欠落していると拒否する', () => {
    const result = TranslationRequestSchema.safeParse({
      text: 'Hello',
      target_lang: 'ja',
    });
    expect(result.success).toBe(false);
  });

  it('target_langフィールドが欠落していると拒否する', () => {
    const result = TranslationRequestSchema.safeParse({
      text: 'Hello',
      source_lang: 'en',
    });
    expect(result.success).toBe(false);
  });

  it('reference_textなしで後方互換パース成功', () => {
    const result = TranslationRequestSchema.safeParse({
      text: 'Hello',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference_text).toBeUndefined();
    }
  });

  it('reference_textありでパース成功・値取得', () => {
    const result = TranslationRequestSchema.safeParse({
      text: 'Hello',
      source_lang: 'en',
      target_lang: 'ja',
      reference_text: 'こんにちは',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reference_text).toBe('こんにちは');
    }
  });
});

describe('HistoryCreateSchema', () => {
  it('正常な値をパースできる', () => {
    const result = HistoryCreateSchema.safeParse({
      original_text: 'Hello',
      translated_text: 'こんにちは',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(true);
  });

  it('空のoriginal_textを拒否する', () => {
    const result = HistoryCreateSchema.safeParse({
      original_text: '',
      translated_text: 'こんにちは',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(false);
  });

  it('空のtranslated_textを拒否する', () => {
    const result = HistoryCreateSchema.safeParse({
      original_text: 'Hello',
      translated_text: '',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(result.success).toBe(false);
  });
});

describe('SettingsUpdateSchema', () => {
  it('正常なURLとモデル名をパースできる', () => {
    const result = SettingsUpdateSchema.safeParse({
      ollama_base_url: 'http://localhost:11434',
      ollama_model: 'translategemma:12b',
    });
    expect(result.success).toBe(true);
  });

  it('URLのみの部分更新を許可する', () => {
    const result = SettingsUpdateSchema.safeParse({
      ollama_base_url: 'http://192.168.1.1:11434',
    });
    expect(result.success).toBe(true);
  });

  it('モデル名のみの部分更新を許可する', () => {
    const result = SettingsUpdateSchema.safeParse({
      ollama_model: 'gemma2:2b',
    });
    expect(result.success).toBe(true);
  });

  it('空オブジェクトを許可する', () => {
    const result = SettingsUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('不正なURLを拒否する', () => {
    const result = SettingsUpdateSchema.safeParse({
      ollama_base_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('空文字のモデル名を拒否する', () => {
    const result = SettingsUpdateSchema.safeParse({
      ollama_model: '',
    });
    expect(result.success).toBe(false);
  });
});
