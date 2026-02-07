import { describe, it, expect } from 'vitest';
import { LANGUAGE_NAMES } from './constants';

describe('LANGUAGE_NAMES', () => {
  const expectedLanguages = [
    ['ja', 'Japanese'],
    ['en', 'English'],
    ['zh-Hans', 'Chinese Simplified'],
    ['ko', 'Korean'],
    ['fr', 'French'],
    ['de', 'German'],
    ['es', 'Spanish'],
    ['pt', 'Portuguese'],
  ] as const;

  it.each(expectedLanguages)('コード "%s" が "%s" にマッピングされる', (code, name) => {
    expect(LANGUAGE_NAMES[code]).toBe(name);
  });

  it('8言語すべて定義されている', () => {
    expect(Object.keys(LANGUAGE_NAMES)).toHaveLength(8);
  });

  it('未定義コードはundefinedを返す', () => {
    expect(LANGUAGE_NAMES['xx']).toBeUndefined();
  });
});
