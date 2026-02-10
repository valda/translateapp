import { diffChars, diffWords } from 'diff';

export interface DiffSegment {
  text: string;
  type: 'equal' | 'added' | 'removed';
}

export interface DiffHunk {
  index: number;
  removed: DiffSegment[];
  added: DiffSegment[];
}

export type DiffElement = { kind: 'equal'; text: string } | { kind: 'hunk'; hunk: DiffHunk };

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

export function groupIntoElements(segments: DiffSegment[]): DiffElement[] {
  const elements: DiffElement[] = [];
  let hunkIndex = 0;
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    if (seg.type === 'equal') {
      elements.push({ kind: 'equal', text: seg.text });
      i++;
      continue;
    }

    // Collect consecutive removed segments
    const removed: DiffSegment[] = [];
    while (i < segments.length && segments[i].type === 'removed') {
      removed.push(segments[i]);
      i++;
    }

    // Collect consecutive added segments
    const added: DiffSegment[] = [];
    while (i < segments.length && segments[i].type === 'added') {
      added.push(segments[i]);
      i++;
    }

    if (removed.length > 0 || added.length > 0) {
      elements.push({ kind: 'hunk', hunk: { index: hunkIndex++, removed, added } });
    }
  }

  return elements;
}

export function rebuildText(elements: DiffElement[], revertedHunks: ReadonlySet<number>): string {
  let result = '';

  for (const el of elements) {
    if (el.kind === 'equal') {
      result += el.text;
    } else {
      const reverted = revertedHunks.has(el.hunk.index);
      if (reverted) {
        result += el.hunk.removed.map((s) => s.text).join('');
      } else {
        result += el.hunk.added.map((s) => s.text).join('');
      }
    }
  }

  return result;
}
