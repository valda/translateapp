import { describe, it, expect } from 'vitest';
import { isNonSpaceSegmented, computeDiff } from './diff-utils';

describe('isNonSpaceSegmented', () => {
  it('日本語はtrue', () => {
    expect(isNonSpaceSegmented('ja')).toBe(true);
  });

  it('中国語簡体字はtrue', () => {
    expect(isNonSpaceSegmented('zh-Hans')).toBe(true);
  });

  it('韓国語はfalse', () => {
    expect(isNonSpaceSegmented('ko')).toBe(false);
  });

  it('英語はfalse', () => {
    expect(isNonSpaceSegmented('en')).toBe(false);
  });

  it('フランス語はfalse', () => {
    expect(isNonSpaceSegmented('fr')).toBe(false);
  });

  it('ドイツ語はfalse', () => {
    expect(isNonSpaceSegmented('de')).toBe(false);
  });
});

describe('computeDiff', () => {
  it('同一テキストなら全てequalセグメント', () => {
    const result = computeDiff('Hello world', 'Hello world', 'en');
    expect(result).toEqual([{ text: 'Hello world', type: 'equal' }]);
  });

  it('英語テキストは単語レベルでdiffする', () => {
    const result = computeDiff('The cat sat', 'The dog sat', 'en');
    const types = result.map((s) => s.type);
    expect(types).toContain('removed');
    expect(types).toContain('added');
    const removed = result.find((s) => s.type === 'removed');
    const added = result.find((s) => s.type === 'added');
    expect(removed?.text).toContain('cat');
    expect(added?.text).toContain('dog');
  });

  it('日本語テキストは文字レベルでdiffする', () => {
    const result = computeDiff('猫が座った', '犬が座った', 'ja');
    const removed = result.find((s) => s.type === 'removed');
    const added = result.find((s) => s.type === 'added');
    expect(removed?.text).toBe('猫');
    expect(added?.text).toBe('犬');
  });

  it('韓国語テキストは単語レベルでdiffする', () => {
    const result = computeDiff('고양이가 앉았다', '개가 앉았다', 'ko');
    const types = result.map((s) => s.type);
    expect(types).toContain('removed');
    expect(types).toContain('added');
  });
});
