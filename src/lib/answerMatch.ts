// Lenient comparison of what the student said to the expected answers.

const NIQQUD = /[֑-ׇ]/g;

export function normalizeHe(s: string): string {
  return s
    .replace(NIQQUD, '')
    .replace(/[-־]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // punctuation, geresh/gershayim
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const words = (s: string) => normalizeHe(s).split(' ').filter(Boolean);

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Hebrew attaches prefixes (ו ה ב ל מ ש כ) to words, so "ובחמישי" should count for "חמישי".
const PREFIXES = /^[והבלמשכ]{1,2}/;

function wordMatches(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  if (heard.replace(PREFIXES, '') === expected.replace(PREFIXES, '')) return true;
  return expected.length >= 4 && editDistanceAtMostOne(expected, heard);
}

/** Share (0–1) of the expected answer's words that appear in what was heard. */
export function answerScore(heard: string, expected: string): number {
  const exp = words(expected);
  const got = words(heard);
  if (exp.length === 0) return 0;
  const found = exp.filter((w) => got.some((g) => wordMatches(w, g))).length;
  return found / exp.length;
}

export const ACCEPT_RATIO = 0.7;

export interface MatchVerdict {
  ok: boolean;
  heard: string;
  closest: string;
}

/** Accepts if ~70% of the words of any expected answer were heard (checks every recognition alternative). */
export function checkSpoken(alternatives: string[], expectedAnswers: string[]): MatchVerdict {
  let best = { score: -1, heard: alternatives[0] ?? '', closest: expectedAnswers[0] };
  for (const heard of alternatives) {
    for (const expected of expectedAnswers) {
      const score = answerScore(heard, expected);
      if (score > best.score) best = { score, heard, closest: expected };
    }
  }
  const needed = Math.max(1, Math.round(words(best.closest).length * ACCEPT_RATIO));
  const ok = best.score * words(best.closest).length >= needed;
  // A far-off attempt gets the main answer as the model, not whichever variant shares a stray word.
  const closest = best.score >= 0.5 ? best.closest : expectedAnswers[0];
  return { ok, heard: best.heard, closest };
}
