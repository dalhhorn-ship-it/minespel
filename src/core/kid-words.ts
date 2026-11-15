// Banned words for every kid, knight, monster and parent string of 0.7.0 (PRD section 12, AC228).
// Whole words only, any case: "Au!" fails, "auto" passes.

export const BANNED_WORDS: readonly string[] = [
  'bang',
  'eng',
  'dood',
  'doodgaan',
  'pijn',
  'bloed',
  'boos',
  'gemeen',
  'huilen',
  'verdrietig',
  'au',
  'vechten',
  'aanvallen',
  'vermoorden',
  'opeten',
  'kapot',
];

const LETTER = /[\p{L}\p{N}]/u;

/** The banned words found in a text, as whole words, in any case. Empty when the text is clean. */
export function findBannedWords(text: string): string[] {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && LETTER.test(w));
  const found = new Set<string>();
  for (const w of words) if (BANNED_WORDS.includes(w)) found.add(w);
  return [...found];
}

export function hasBannedWord(text: string): boolean {
  return findBannedWords(text).length > 0;
}
