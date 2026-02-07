import { describe, it, expect } from 'vitest';
import { TranslationRequestSchema, HistoryCreateSchema } from './schemas';

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
