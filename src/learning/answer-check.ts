// Answer checks for every item type. Pure.
// Taal typing is exact on spelling, capitals and punctuation. Only spaces are forgiven (AC56).
// Rekenen answers are numbers and are compared exactly as decimals (AC58).

import type { ChoiceItem, FindErrorItem, Item, PunctuateItem, TypeItem } from '../content/format';
import { numberMatches } from '../core/numbers';

/** What the kid gave, per item type. */
export type Response =
  | { type: 'choice'; index: number }
  /** index of the tapped word, or -1 for "Geen fout". */
  | { type: 'find-error'; index: number }
  | { type: 'type'; text: string }
  /** Marked gap numbers, in any order. */
  | { type: 'punctuate'; gaps: readonly number[] };

/** AC53: the tapped option is right only at index `answer`. */
export function checkChoice(item: ChoiceItem, index: number): boolean {
  return Number.isInteger(index) && index === item.answer;
}

/** AC54: the tapped word index, or -1 for "Geen fout". */
export function checkFindError(item: FindErrorItem, index: number): boolean {
  return Number.isInteger(index) && index === item.answer;
}

/** AC55: the set of marked gaps must equal `answer`. Order and duplicates do not matter. */
export function checkPunctuate(item: PunctuateItem, gaps: readonly number[]): boolean {
  const marked = new Set(gaps);
  const wanted = new Set(item.answer);
  if (marked.size !== wanted.size) return false;
  for (const g of wanted) if (!marked.has(g)) return false;
  return true;
}

/** Trim, collapse runs of white space (also no break and thin spaces) to one space, NFC. */
export function normalizeTyped(text: string): string {
  return text.normalize('NFC').replace(/[\s   ]+/g, ' ').trim();
}

/**
 * AC56: any accepted answer matches. Case, accents and punctuation must be exact.
 * With `numeric` (Rekenen) the text and answers are compared as decimal numbers (AC58).
 */
export function checkType(item: TypeItem, text: string, numeric = false): boolean {
  if (numeric) return item.answer.some((a) => numberMatches(text, a));
  const typed = normalizeTyped(text);
  if (typed === '') return false;
  return item.answer.some((a) => normalizeTyped(a) === typed);
}

/** Check any response against its item. A response of the wrong type is wrong, never an error. */
export function checkAnswer(item: Item, response: Response, numeric = false): boolean {
  if (response.type !== item.type) return false;
  switch (item.type) {
    case 'choice':
      return checkChoice(item, (response as { index: number }).index);
    case 'find-error':
      return checkFindError(item, (response as { index: number }).index);
    case 'type':
      return checkType(item, (response as { text: string }).text, numeric);
    case 'punctuate':
      return checkPunctuate(item, (response as { gaps: readonly number[] }).gaps);
  }
}
