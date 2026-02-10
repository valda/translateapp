import { diffChars, diffWords } from 'diff';

export interface DiffSegment {
  text: string;
  type: 'equal' | 'added' | 'removed';
}

const NON_SPACE_SEGMENTED_LANGS = new Set(['ja', 'zh-Hans']);

export function isNonSpaceSegmented(langCode: string): boolean {
  return NON_SPACE_SEGMENTED_LANGS.has(langCode);
}

export function computeDiff(
  original: string,
  retranslated: string,
  langCode: string,
): DiffSegment[] {
  const diffFn = isNonSpaceSegmented(langCode) ? diffChars : diffWords;
  const changes = diffFn(original, retranslated);

  return changes.map((change) => ({
    text: change.value,
    type: change.added ? 'added' : change.removed ? 'removed' : 'equal',
  }));
}
