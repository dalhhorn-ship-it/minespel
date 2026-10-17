// PIN vergeten: a fresh two step grown up question in Dutch words (AC75). Pure.
import { numberToDutch } from '../core/dutch-numbers';
import type { Rng } from '../core/rng';

export interface ResetQuestion {
  text: string;
  answer: number;
}

const TAIL = 'Schrijf het antwoord in cijfers.';

/** A new question each call. The answer is always a whole number above 0. */
export function makeResetQuestion(rng: Rng): ResetQuestion {
  const w = numberToDutch;
  switch (rng.int(0, 2)) {
    case 0: {
      const a = rng.int(3, 9);
      const b = rng.int(3, 9);
      const c = rng.int(5, a * b - 1);
      return { text: `Neem ${w(a)} keer ${w(b)} en trek daar ${w(c)} van af. ${TAIL}`, answer: a * b - c };
    }
    case 1: {
      const a = rng.int(3, 9);
      const b = rng.int(3, 9);
      const c = rng.int(11, 45);
      return { text: `Neem ${w(a)} keer ${w(b)} en tel daar ${w(c)} bij op. ${TAIL}`, answer: a * b + c };
    }
    default: {
      const a = rng.int(12, 40);
      const b = rng.int(12, 40);
      const c = rng.int(2, 5);
      return { text: `Tel ${w(a)} en ${w(b)} bij elkaar op en neem dat dan ${w(c)} keer. ${TAIL}`, answer: (a + b) * c };
    }
  }
}

/** True when the typed text is exactly the answer in digits. Spaces around it are fine. */
export function isRightAnswer(question: ResetQuestion, typed: string): boolean {
  const t = typed.trim();
  return /^\d{1,6}$/.test(t) && Number(t) === question.answer;
}
