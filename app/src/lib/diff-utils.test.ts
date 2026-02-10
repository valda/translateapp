import { describe, it, expect } from 'vitest';
import {
  isNonSpaceSegmented,
  computeDiff,
  groupIntoElements,
  rebuildText,
  type DiffSegment,
} from './diff-utils';

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

describe('groupIntoElements', () => {
  it('全equalならhunkなし', () => {
    const segments: DiffSegment[] = [{ text: 'hello world', type: 'equal' }];
    const elements = groupIntoElements(segments);
    expect(elements).toEqual([{ kind: 'equal', text: 'hello world' }]);
  });

  it('removed+addedの連続は1つのhunkになる', () => {
    const segments: DiffSegment[] = [
      { text: 'The ', type: 'equal' },
      { text: 'cat', type: 'removed' },
      { text: 'dog', type: 'added' },
      { text: ' sat', type: 'equal' },
    ];
    const elements = groupIntoElements(segments);
    expect(elements).toHaveLength(3);
    expect(elements[0]).toEqual({ kind: 'equal', text: 'The ' });
    expect(elements[1]).toEqual({
      kind: 'hunk',
      hunk: {
        index: 0,
        removed: [{ text: 'cat', type: 'removed' }],
        added: [{ text: 'dog', type: 'added' }],
      },
    });
    expect(elements[2]).toEqual({ kind: 'equal', text: ' sat' });
  });

  it('standalone removedはadded空のhunkになる', () => {
    const segments: DiffSegment[] = [
      { text: 'hello ', type: 'equal' },
      { text: 'world', type: 'removed' },
    ];
    const elements = groupIntoElements(segments);
    expect(elements).toHaveLength(2);
    const hunk = elements[1];
    expect(hunk).toEqual({
      kind: 'hunk',
      hunk: { index: 0, removed: [{ text: 'world', type: 'removed' }], added: [] },
    });
  });

  it('standalone addedはremoved空のhunkになる', () => {
    const segments: DiffSegment[] = [
      { text: 'hello', type: 'equal' },
      { text: ' world', type: 'added' },
    ];
    const elements = groupIntoElements(segments);
    expect(elements).toHaveLength(2);
    const hunk = elements[1];
    expect(hunk).toEqual({
      kind: 'hunk',
      hunk: { index: 0, removed: [], added: [{ text: ' world', type: 'added' }] },
    });
  });

  it('equal挟みで複数hunkに正しいindexが振られる', () => {
    const segments: DiffSegment[] = [
      { text: 'A', type: 'removed' },
      { text: 'B', type: 'added' },
      { text: ' mid ', type: 'equal' },
      { text: 'C', type: 'removed' },
      { text: 'D', type: 'added' },
    ];
    const elements = groupIntoElements(segments);
    expect(elements).toHaveLength(3);
    expect(elements[0]).toMatchObject({ kind: 'hunk', hunk: { index: 0 } });
    expect(elements[2]).toMatchObject({ kind: 'hunk', hunk: { index: 1 } });
  });

  it('連続する複数removed+複数addedは1つのhunkにまとまる', () => {
    const segments: DiffSegment[] = [
      { text: '猫', type: 'removed' },
      { text: 'が', type: 'removed' },
      { text: '犬', type: 'added' },
      { text: 'が', type: 'added' },
    ];
    const elements = groupIntoElements(segments);
    expect(elements).toHaveLength(1);
    const hunk = elements[0];
    expect(hunk).toEqual({
      kind: 'hunk',
      hunk: {
        index: 0,
        removed: [
          { text: '猫', type: 'removed' },
          { text: 'が', type: 'removed' },
        ],
        added: [
          { text: '犬', type: 'added' },
          { text: 'が', type: 'added' },
        ],
      },
    });
  });

  it('空配列は空結果', () => {
    expect(groupIntoElements([])).toEqual([]);
  });
});

describe('rebuildText', () => {
  it('revertなしならaddedテキストが採用される', () => {
    const segments: DiffSegment[] = [
      { text: 'The ', type: 'equal' },
      { text: 'cat', type: 'removed' },
      { text: 'dog', type: 'added' },
      { text: ' sat', type: 'equal' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set())).toBe('The dog sat');
  });

  it('hunkをrevertするとremovedテキストが採用される', () => {
    const segments: DiffSegment[] = [
      { text: 'The ', type: 'equal' },
      { text: 'cat', type: 'removed' },
      { text: 'dog', type: 'added' },
      { text: ' sat', type: 'equal' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set([0]))).toBe('The cat sat');
  });

  it('standalone removedをrevertすると削除テキストが復元される', () => {
    const segments: DiffSegment[] = [
      { text: 'hello ', type: 'equal' },
      { text: 'world', type: 'removed' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set())).toBe('hello ');
    expect(rebuildText(elements, new Set([0]))).toBe('hello world');
  });

  it('standalone addedをrevertすると追加テキストが除去される', () => {
    const segments: DiffSegment[] = [
      { text: 'hello', type: 'equal' },
      { text: ' world', type: 'added' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set())).toBe('hello world');
    expect(rebuildText(elements, new Set([0]))).toBe('hello');
  });

  it('選択的revert（一部のみ）', () => {
    const segments: DiffSegment[] = [
      { text: 'A', type: 'removed' },
      { text: 'B', type: 'added' },
      { text: ' ', type: 'equal' },
      { text: 'C', type: 'removed' },
      { text: 'D', type: 'added' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set([0]))).toBe('A D');
    expect(rebuildText(elements, new Set([1]))).toBe('B C');
  });

  it('全hunkをrevertすると原文と完全一致する', () => {
    const original = '猫が座った。犬は走った。';
    const retranslated = '犬が座った。猫は走った。';
    const segments = computeDiff(original, retranslated, 'ja');
    const elements = groupIntoElements(segments);
    const allHunkIndices = new Set<number>();
    for (const el of elements) {
      if (el.kind === 'hunk') allHunkIndices.add(el.hunk.index);
    }
    expect(rebuildText(elements, allHunkIndices)).toBe(original);
  });

  it('全hunkをrevertすると原文と完全一致する（英語）', () => {
    const original = 'The cat sat on the mat.';
    const retranslated = 'A dog sat on a rug.';
    const segments = computeDiff(original, retranslated, 'en');
    const elements = groupIntoElements(segments);
    const allHunkIndices = new Set<number>();
    for (const el of elements) {
      if (el.kind === 'hunk') allHunkIndices.add(el.hunk.index);
    }
    expect(rebuildText(elements, allHunkIndices)).toBe(original);
  });

  it('CJK複数セグメントhunkのrevert', () => {
    const segments: DiffSegment[] = [
      { text: '猫', type: 'removed' },
      { text: 'が', type: 'removed' },
      { text: '犬', type: 'added' },
      { text: 'が', type: 'added' },
      { text: '走った', type: 'equal' },
    ];
    const elements = groupIntoElements(segments);
    expect(rebuildText(elements, new Set([0]))).toBe('猫が走った');
    expect(rebuildText(elements, new Set())).toBe('犬が走った');
  });

  it('空elementsは空文字列', () => {
    expect(rebuildText([], new Set())).toBe('');
  });
});
