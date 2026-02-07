import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHistory,
  getAllHistory,
  searchHistory,
  deleteHistory,
  deleteAllHistory,
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
} from './database';

beforeEach(() => {
  deleteAllHistory();
});

describe('createHistory', () => {
  it('履歴を作成してIDと全フィールドが返る', () => {
    const item = createHistory({
      original_text: 'Hello',
      translated_text: 'こんにちは',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(item.id).toBeGreaterThan(0);
    expect(item.original_text).toBe('Hello');
    expect(item.translated_text).toBe('こんにちは');
    expect(item.source_lang).toBe('en');
    expect(item.target_lang).toBe('ja');
    expect(item.created_at).toBeDefined();
  });
});

describe('getAllHistory', () => {
  it('履歴が空の場合は空配列を返す', () => {
    expect(getAllHistory()).toEqual([]);
  });

  it('新しい履歴が先に返る（IDの降順）', () => {
    const first = createHistory({
      original_text: 'first',
      translated_text: '最初',
      source_lang: 'en',
      target_lang: 'ja',
    });
    const second = createHistory({
      original_text: 'second',
      translated_text: '二番目',
      source_lang: 'en',
      target_lang: 'ja',
    });

    const all = getAllHistory();
    expect(all).toHaveLength(2);
    // 同一秒内でもIDが大きい方が後に作成されたもの
    expect(all[0].id).toBeGreaterThan(all[1].id);
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
  });
});

describe('searchHistory', () => {
  beforeEach(() => {
    createHistory({
      original_text: 'Hello World',
      translated_text: 'こんにちは世界',
      source_lang: 'en',
      target_lang: 'ja',
    });
    createHistory({
      original_text: 'Good morning',
      translated_text: 'おはようございます',
      source_lang: 'en',
      target_lang: 'ja',
    });
  });

  it('original_textの一致で検索できる', () => {
    const results = searchHistory('Hello');
    expect(results).toHaveLength(1);
    expect(results[0].original_text).toBe('Hello World');
  });

  it('translated_textの一致で検索できる', () => {
    const results = searchHistory('おはよう');
    expect(results).toHaveLength(1);
    expect(results[0].translated_text).toBe('おはようございます');
  });

  it('不一致の場合は空配列を返す', () => {
    const results = searchHistory('xxxxxx');
    expect(results).toEqual([]);
  });

  it('LIKEで大文字小文字を区別しない', () => {
    const results = searchHistory('hello');
    expect(results).toHaveLength(1);
  });
});

describe('deleteHistory', () => {
  it('存在するIDを削除するとtrueを返す', () => {
    const item = createHistory({
      original_text: 'test',
      translated_text: 'テスト',
      source_lang: 'en',
      target_lang: 'ja',
    });
    expect(deleteHistory(item.id)).toBe(true);
    expect(getAllHistory()).toHaveLength(0);
  });

  it('存在しないIDを削除するとfalseを返す', () => {
    expect(deleteHistory(999999)).toBe(false);
  });
});

describe('deleteAllHistory', () => {
  it('全ての履歴を削除する', () => {
    createHistory({
      original_text: 'a',
      translated_text: 'b',
      source_lang: 'en',
      target_lang: 'ja',
    });
    createHistory({
      original_text: 'c',
      translated_text: 'd',
      source_lang: 'en',
      target_lang: 'ja',
    });
    deleteAllHistory();
    expect(getAllHistory()).toHaveLength(0);
  });
});

describe('settings CRUD', () => {
  beforeEach(() => {
    deleteSetting('test_key');
    deleteSetting('key1');
    deleteSetting('key2');
  });

  it('未設定のキーはnullを返す', () => {
    expect(getSetting('nonexistent')).toBeNull();
  });

  it('設定を保存して取得できる', () => {
    setSetting('test_key', 'test_value');
    expect(getSetting('test_key')).toBe('test_value');
  });

  it('既存キーを上書きできる', () => {
    setSetting('test_key', 'value1');
    setSetting('test_key', 'value2');
    expect(getSetting('test_key')).toBe('value2');
  });

  it('getAllSettingsで全設定を取得できる', () => {
    setSetting('key1', 'val1');
    setSetting('key2', 'val2');
    const all = getAllSettings();
    expect(all['key1']).toBe('val1');
    expect(all['key2']).toBe('val2');
  });

  it('deleteSettingで設定を削除できる', () => {
    setSetting('test_key', 'value');
    expect(deleteSetting('test_key')).toBe(true);
    expect(getSetting('test_key')).toBeNull();
  });

  it('存在しないキーの削除はfalseを返す', () => {
    expect(deleteSetting('nonexistent')).toBe(false);
  });
});
