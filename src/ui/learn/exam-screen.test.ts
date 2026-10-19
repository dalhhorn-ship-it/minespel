// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChoiceItem, PunctuateItem, TypeItem } from '../../content/format';
import type { Response } from '../../learning/answer-check';
import { createExamScreen, formatClock, type ExamView } from './exam-screen';

// Vitest turns css imports into empty modules, so read the file with Node (no @types/node in this project).
const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');
const examCss = nodeFs.readFileSync('src/styles/exam.css', 'utf8');

let t = 0;
const now = () => t;
function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
function tap(target: Element) {
  t += 1000;
  target.dispatchEvent(ptr('pointerdown', 1));
  target.dispatchEvent(ptr('pointerup', 1));
}
const q = (root: Element, id: string) => root.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const lock = (root: Element) => q(root, 'parent-controls-btn');

const choice: ChoiceItem = { id: 'c1', type: 'choice', level: 'M6', skill: 's', prompt: 'Kies', explain: 'x', options: ['a', 'b'], answer: 0 };
const typeItem: TypeItem = { id: 't1', type: 'type', level: 'M6', skill: 's', prompt: 'Typ', explain: 'x', answer: ['hond'] };
const punct: PunctuateItem = {
  id: 'p1', type: 'punctuate', level: 'M6', skill: 's', prompt: 'Zet de komma', explain: 'x', mark: ',',
  words: ['Ik', 'ren', 'en', 'jij'], answer: [2],
};

const pages = [1, 2, 3, 4].map((n) => ({
  prompt: `Vraag tekst ${n}`, given: n === 4 ? null : `fout ${n}`, right: `goed ${n}`, explain: `uitleg ${n}`,
}));

function setup(view: ExamView) {
  const calls = { begin: 0, lock: 0, leave: 0, review: 0, answers: [] as Array<[Response, number]> };
  const screen = createExamScreen({
    view,
    now,
    onBegin: () => calls.begin++,
    onLock: () => calls.lock++,
    onLeave: () => calls.leave++,
    onReviewOpen: () => calls.review++,
    onAnswer: (r, i) => calls.answers.push([r, i]),
  });
  document.body.append(screen.element);
  return { screen, calls };
}
const question = (item: ChoiceItem | TypeItem | PunctuateItem = choice): ExamView => ({
  phase: 'question', index: 6, count: 30, item, msLeft: 125_000,
});
const end = (over: Partial<Extract<ExamView, { phase: 'end' }>> = {}): ExamView => ({
  phase: 'end', score: 26, total: 30, passed: true, reviewPages: pages, ...over,
});

beforeEach(() => {
  t = 0;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('exam start screen', () => {
  it('shows the count and minutes and Begin, with no lock (AC156)', () => {
    const { screen, calls } = setup({ phase: 'start', count: 30, minutes: 30 });
    expect(screen.element.textContent).toContain('Examen: 30 vragen, 30 minuten');
    expect(lock(screen.element)).toBeNull();
    tap(q(screen.element, 'exam-begin')!);
    expect(calls.begin).toBe(1);
  });
  it('leaves out the minutes without a time limit', () => {
    const { screen } = setup({ phase: 'start', count: 22, minutes: null });
    expect(screen.element.textContent).toContain('Examen: 22 vragen');
    expect(screen.element.textContent).not.toContain('minuten');
  });
});

describe('exam question screen', () => {
  it('shows Vraag 7 van 30 and the time left', () => {
    const { screen } = setup(question());
    expect(q(screen.element, 'exam-number')!.textContent).toBe('Vraag 7 van 30');
    expect(q(screen.element, 'exam-clock')!.textContent).toContain('2:05');
    screen.setTimeLeft(59_100);
    expect(q(screen.element, 'exam-clock')!.textContent).toContain('1:00');
    screen.setTimeLeft(null);
    expect(q(screen.element, 'exam-clock')!.hidden).toBe(true);
  });

  it('setTimeLeft does not re-render the question or lose a typed answer', () => {
    const { screen } = setup(question(typeItem));
    const field = screen.element.querySelector('.type-field')!;
    const key = [...screen.element.querySelectorAll('button')].find((b) => b.textContent === 'h')!;
    tap(key);
    screen.setTimeLeft(1000);
    expect(screen.element.querySelector('.type-field')).toBe(field);
    expect(screen.getDraft()).toEqual({ type: 'type', text: 'h' });
  });

  it('gives no feedback, no retry and has no back button (AC65 view part)', () => {
    const { screen, calls } = setup(question());
    const options = [...screen.element.querySelectorAll('.q-option')];
    tap(options[1]!); // a wrong answer
    expect(calls.answers).toEqual([[{ type: 'choice', index: 1 }, 6]]);
    expect(screen.element.querySelector('.break-banner, .break-feedback-card, .break-explain, .teach-moment')).toBeNull();
    expect(screen.element.textContent).not.toMatch(/Net niet|Goed!|Probeer/);
    const labels = [...screen.element.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).not.toContain('Terug');
    expect(screen.element.querySelector('[aria-label*="Terug" i]')).toBeNull();
  });

  it('shows the lock: 44 x 44 class, test id, tap calls onLock (AC155)', () => {
    const { screen, calls } = setup(question());
    const l = lock(screen.element)!;
    expect(l).not.toBeNull();
    expect(l.classList.contains('lock-icon-btn')).toBe(true);
    expect(l.classList.contains('exam-lock')).toBe(true);
    tap(l);
    expect(calls.lock).toBe(1);
  });

  it('the lock is in the exam.css rule for top right inside the safe area (AC155)', () => {
    expect(examCss).toMatch(/\.exam-lock\s*\{[^}]*safe-area-inset-top[^}]*safe-area-inset-right/s);
  });

  it('removes the lock when the screen moves on (AC156)', () => {
    const { screen } = setup(question());
    screen.render(end());
    expect(lock(screen.element)).toBeNull();
    screen.render({ phase: 'start', count: 3, minutes: 5 });
    expect(lock(screen.element)).toBeNull();
  });

  it('getDraft is null when nothing is entered, marked gaps when marked', () => {
    const { screen } = setup(question(punct));
    expect(screen.getDraft()).toBeNull();
    const gaps = [...screen.element.querySelectorAll('.q-gap')];
    tap(gaps[2]!);
    tap(gaps[0]!);
    expect(screen.getDraft()).toEqual({ type: 'punctuate', gaps: [0, 2] });
  });

  it('getDraft is null on a choice question and off the question screen', () => {
    const { screen } = setup(question());
    expect(screen.getDraft()).toBeNull();
    screen.render(end());
    expect(screen.getDraft()).toBeNull();
  });
});

describe('exam end screen and review', () => {
  it('passed: Geslaagd, score, review button, leave button, no lock (AC68, AC156)', () => {
    const { screen, calls } = setup(end());
    expect(q(screen.element, 'exam-result')!.textContent).toBe('Geslaagd!');
    expect(q(screen.element, 'exam-score')!.textContent).toContain('26 van 30');
    expect(lock(screen.element)).toBeNull();
    tap(q(screen.element, 'exam-leave')!);
    expect(calls.leave).toBe(1);
  });

  it('failed: kind message about the pauses (AC68)', () => {
    const { screen } = setup(end({ passed: false, score: 10 }));
    expect(q(screen.element, 'exam-result')!.textContent).toBe('Goed geoefend!');
    expect(screen.element.textContent).toContain('De vragen die nog lastig zijn komen terug in je pauzes.');
  });

  it('no mistakes: Alles goed! and no review button (AC153)', () => {
    const { screen } = setup(end({ score: 30, reviewPages: [] }));
    expect(screen.element.textContent).toContain('Alles goed!');
    expect(q(screen.element, 'exam-review-open')).toBeNull();
  });

  it('4 mistakes give 4 pages, Volgende x3 then Klaar back to the end screen (AC153)', () => {
    const { screen, calls } = setup(end());
    tap(q(screen.element, 'exam-review-open')!);
    expect(calls.review).toBe(1);
    expect(lock(screen.element)).toBeNull();
    for (let n = 1; n <= 4; n++) {
      const text = screen.element.textContent!;
      expect(text).toContain(`Fout ${n} van 4`);
      expect(text).toContain(`Vraag tekst ${n}`);
      expect(text).toContain(n === 4 ? 'niet beantwoord' : `Jouw antwoord: fout ${n}`);
      expect(text).toContain(`Goed antwoord: goed ${n}`);
      expect(text).toContain(`uitleg ${n}`);
      if (n < 4) {
        expect(q(screen.element, 'exam-review-done')).toBeNull();
        tap(q(screen.element, 'exam-review-next')!);
      }
    }
    expect(q(screen.element, 'exam-review-next')).toBeNull();
    tap(q(screen.element, 'exam-review-done')!);
    expect(q(screen.element, 'exam-result')).not.toBeNull();
    expect(q(screen.element, 'exam-review-open')).not.toBeNull();
  });

  it('sets item text as plain text, never as HTML (AC88)', () => {
    const { screen } = setup(end({ reviewPages: [{ prompt: '<img src=x>', given: '<b>x</b>', right: '<i>y</i>', explain: '<u>z</u>' }] }));
    tap(q(screen.element, 'exam-review-open')!);
    expect(screen.element.querySelector('img, b, i, u')).toBeNull();
    expect(screen.element.textContent).toContain('<img src=x>');
  });
});

describe('formatClock', () => {
  it('formats m:ss and rounds up', () => {
    expect(formatClock(1_800_000)).toBe('30:00');
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});
