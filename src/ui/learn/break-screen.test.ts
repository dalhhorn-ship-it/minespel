import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChoiceItem, Lesson, PunctuateItem, TypeItem } from '../../content/format';
import { startSession, type SessionEffect, type SessionState } from '../../learning/break-session';
import type { EconomyRecord } from '../../storage/schema';
import { answerText, createBreakScreen, exampleSteps, MSG_RETRY, type BreakScreen } from './break-screen';

let pid = 1;
let clock = 0;
function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
/** One tap. The tap clock moves on so the double tap guard never blocks a new button. */
function tap(target: Element | null | undefined) {
  if (!target) throw new Error('nothing to tap');
  const id = pid++;
  target.dispatchEvent(ptr('pointerdown', id));
  target.dispatchEvent(ptr('pointerup', id));
}
const tapNow = () => (clock += 1000);

const choice = (id: string, answer = 1): ChoiceItem => ({
  type: 'choice', id, level: 'M6', skill: 'hoofdletter', prompt: 'Welke is goed?', options: ['fout', 'goed', 'ook fout'], answer, explain: 'Het goede woord is goed.',
});
const rekenen: TypeItem = { type: 'type', id: 'tafels:7x8', level: 'E6', skill: 'tafel-7', prompt: 'Hoeveel is 7 x 8?', answer: ['56'], explain: '7 x 8 is 56.' };
const punct: PunctuateItem = { type: 'punctuate', id: 'p1', level: 'M6', skill: 'komma', prompt: 'Zet de komma.', mark: ',', words: ['Ik', 'eet', 'drink', 'slaap'], answer: [1, 2] , explain: 'Komma in een rij.' };

const economy: EconomyRecord = { points: 18, practiceToday: 0, practiceDay: '2026-10-17' } as unknown as EconomyRecord;
const lesson: Lesson = { pages: [{ title: 'Les titel', text: 'tekst', examples: [], skill: 'hoofdletter' }] };

interface Rig { screen: BreakScreen; steps: Array<{ state: SessionState; effects: SessionEffect[] }>; text(): string }
function rig(entries: SessionState['entries'], extra: Partial<Parameters<typeof createBreakScreen>[0]> = {}, config: { lessonFirst?: boolean; mode?: 'break' | 'preview' | 'practice'; eco?: EconomyRecord } = {}): Rig {
  const { state } = startSession({ mode: config.mode ?? 'break', entries, economy: config.eco ?? economy, day: '2026-10-17', at: 0, lessonFirst: config.lessonFirst });
  const steps: Rig['steps'] = [];
  const screen = createBreakScreen({ state, lessonOf: () => lesson, onStep: (s, e) => steps.push({ state: s, effects: e }), now: () => 5, tapNow, ...extra });
  document.body.append(screen.element);
  return { screen, steps, text: () => screen.element.textContent ?? '' };
}
const e = (item: SessionState['entries'][number]['item'], numeric = false) => ({ item, box: 0, numeric });
const option = (r: Rig, i: number) => r.screen.element.querySelectorAll('.q-option')[i];

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('break screen', () => {
  it('shows one dot per question and no countdown (AC28)', () => {
    const r = rig([e(choice('a')), e(choice('b')), e(choice('c')), e(choice('d')), e(choice('f'))]);
    expect(r.screen.element.querySelectorAll('.break-dot').length).toBe(5);
    expect(r.screen.element.querySelectorAll('.break-dot.now').length).toBe(1);
    expect(r.text()).not.toMatch(/\d:\d\d/);
    expect(r.screen.element.querySelector('.juf')).not.toBeNull();
  });

  it('right on the first try: green check, +2 punten, Verder moves on and fills a dot (AC29)', () => {
    const r = rig([e(choice('a')), e(choice('b'))]);
    tap(option(r, 1));
    expect(r.screen.element.querySelector('.mark-right')).not.toBeNull();
    expect(r.text()).toContain('+2 punten');
    expect(r.steps.at(-1)?.effects.some((x) => x.type === 'points' && x.applied === 2)).toBe(true);
    tap(r.screen.element.querySelector('.break-button'));
    expect(r.screen.getState().index).toBe(1);
    expect(r.screen.element.querySelectorAll('.break-dot.done').length).toBe(1);
  });

  it('wrong first try: Net niet text, answer not shown, input cleared (AC30)', () => {
    const n = rig([e(rekenen, true)]);
    expect(n.screen.element.querySelector('.number-view')).not.toBeNull();
    const c = rig([e(choice('a'))]);
    tap(option(c, 0));
    expect(c.text()).toContain(MSG_RETRY);
    expect(c.screen.getState().try).toBe(2);
    expect(c.screen.element.querySelectorAll('.q-option').length).toBe(3);
    expect(c.screen.element.querySelector('.q-picked')).toBeNull();
    expect(c.text()).not.toContain('Zo zit het');
  });

  it('right on the retry: Goed zo! +1 punt (AC145)', () => {
    const r = rig([e(choice('a'))]);
    tap(option(r, 0));
    tap(option(r, 1));
    expect(r.text()).toContain('Goed zo! +1 punt');
  });

  it('wrong twice: teach moment with answer, explain, lesson page and -1 punt; Ik snap het moves on (AC146)', () => {
    const r = rig([e(choice('a')), e(choice('b'))]);
    tap(option(r, 0));
    tap(option(r, 2));
    const t = r.text();
    for (const s of ['Zo zit het:', 'goed', 'Het goede woord is goed.', 'Les titel', '-1 punt', 'Ik snap het']) expect(t).toContain(s);
    tap(r.screen.element.querySelector('.teach-done'));
    expect(r.screen.getState().index).toBe(1);
    expect(r.screen.getState().phase).toBe('question');
  });

  it('teach moment of a Rekenen item shows the worked example steps', () => {
    const r = rig([e(rekenen, true), e(choice('b'))]);
    const typeIn = (s: string) => {
      for (const ch of s) {
        const key = [...r.screen.element.querySelectorAll('button')].find((b) => b.textContent === ch);
        tap(key);
      }
      tap([...r.screen.element.querySelectorAll('button')].find((b) => b.textContent === 'Klaar'));
    };
    typeIn('55');
    expect(r.text()).toContain(MSG_RETRY);
    typeIn('54');
    const steps = [...r.screen.element.querySelectorAll('.teach-steps li')].map((li) => li.textContent ?? '');
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.at(-1)).toContain('= 56');
    expect(r.text()).toContain('56');
    expect(r.text()).toContain('Zo reken je het uit');
  });

  it('a double tap on an answer or on Verder acts once (AC117)', () => {
    const r = rig([e(choice('a')), e(choice('b')), e(choice('c'))]);
    const stale = option(r, 1);
    tap(stale);
    tap(stale);
    expect(r.steps.filter((s) => s.effects.some((x) => x.type === 'answer')).length).toBe(1);
    const verder = r.screen.element.querySelector('.break-button');
    tap(verder);
    tap(verder);
    expect(r.screen.getState().index).toBe(1);
  });

  it('plays a chime for right and hmm for wrong, never a sound for the malus', () => {
    const play = vi.fn();
    const r = rig([e(choice('a')), e(choice('b'))], { sound: { play } });
    tap(option(r, 0));
    expect(play).toHaveBeenLastCalledWith('hmm');
    tap(option(r, 2));
    expect(play).toHaveBeenCalledTimes(1);
    tap(r.screen.element.querySelector('.teach-done'));
    tap(option(r, 1));
    expect(play).toHaveBeenLastCalledWith('chime');
  });

  it('shows the lesson first and then the questions', () => {
    const r = rig([e(choice('a'))], { lesson }, { lessonFirst: true });
    expect(r.text()).toContain('Les titel');
    tap(r.screen.element.querySelector('.lesson-next'));
    expect(r.screen.getState().phase).toBe('question');
    expect(r.screen.element.querySelector('.q-choice')).not.toBeNull();
  });

  it('full break to the summary and back to the world (AC34)', () => {
    const r = rig([e(choice('a')), e(choice('b'))]);
    tap(option(r, 1));
    tap(r.screen.element.querySelector('.break-button'));
    tap(option(r, 0));
    tap(option(r, 1));
    tap(r.screen.element.querySelector('.break-button'));
    expect(r.text()).toContain('2 van de 2 goed!');
    expect(r.text()).toContain('Je hebt nu 21 punten');
    expect(r.text()).toContain('Je kunt een ei kopen in de Dinowinkel!');
    tap(r.screen.element.querySelector('.break-summary .break-button'));
    expect(r.steps.at(-1)?.effects).toEqual([{ type: 'end', reason: 'complete', at: 5 }]);
    expect(r.screen.getState().phase).toBe('done');
  });

  it('zero right shows the kind message and no plus points (AC116)', () => {
    const r = rig([e(choice('a'))]);
    tap(option(r, 0));
    tap(option(r, 2));
    tap(r.screen.element.querySelector('.teach-done'));
    expect(r.text()).toContain('Dit was lastig. Volgende keer gaat het vast beter!');
    expect(r.text()).not.toContain('Verdiend');
    expect(r.text()).not.toContain('van de');
    expect(r.text()).not.toContain('Dinowinkel');
  });

  it('an empty break shows the friendly message and ends after 10 seconds (AC39)', () => {
    vi.useFakeTimers();
    let t = 0;
    const r = rig([], { now: () => t });
    expect(r.text()).toContain('Er staan geen vragen aan');
    t = 10_000;
    vi.advanceTimersByTime(10_000);
    expect(r.screen.getState().phase).toBe('done');
    expect(r.steps.at(-1)?.effects[0]).toMatchObject({ type: 'end', reason: 'empty' });
  });

  it('parentEnd ends the break and reports unanswered questions', () => {
    const r = rig([e(choice('a')), e(choice('b'))]);
    r.screen.parentEnd();
    expect(r.steps.at(-1)?.effects.map((x) => x.type)).toEqual(['unanswered', 'unanswered', 'end']);
  });

  it('resumes a saved state on the same question and try (AC37)', () => {
    const r = rig([e(choice('a')), e(choice('b'))]);
    tap(option(r, 0));
    const saved = JSON.parse(JSON.stringify(r.screen.getState())) as SessionState;
    r.screen.destroy();
    const again = createBreakScreen({ state: saved, onStep: () => {}, tapNow });
    expect(again.element.textContent).toContain(MSG_RETRY);
  });

  it('preview shows no points', () => {
    const r = rig([e(choice('a'))], {}, { mode: 'preview' });
    tap(option(r, 1));
    expect(r.text()).not.toContain('punt');
    tap(r.screen.element.querySelector('.break-button'));
    expect(r.text()).toContain('1 van de 1 goed!');
    expect(r.text()).not.toContain('punten');
  });

  it('destroy removes the screen and stops the timer', () => {
    vi.useFakeTimers();
    const r = rig([]);
    r.screen.destroy();
    vi.advanceTimersByTime(20_000);
    expect(r.steps.length).toBe(0);
    expect(r.screen.element.isConnected).toBe(false);
  });

  it('handles a punctuate question', () => {
    const r = rig([e(punct)]);
    expect(r.screen.element.querySelector('.q-line')).not.toBeNull();
  });
});

describe('answerText and exampleSteps', () => {
  it('gives the right answer as text for each type', () => {
    expect(answerText(choice('a'))).toBe('goed');
    expect(answerText(rekenen)).toBe('56');
    expect(answerText(punct)).toBe('Ik eet, drink, slaap');
    expect(answerText({ type: 'find-error', id: 'f', level: 'M6', skill: 's', prompt: 'p', explain: 'x', words: ['ik', 'bin'], answer: -1, correction: null })).toBe('Geen fout');
    expect(answerText({ type: 'find-error', id: 'f', level: 'M6', skill: 's', prompt: 'p', explain: 'x', words: ['ik', 'bint'], answer: 1, correction: 'bent' })).toBe('bent');
  });
  it('joins the text and the sum of each step', () => {
    expect(exampleSteps({ answer: '3', steps: [{ text: 'Tel.', sum: '1 + 2 = 3' }] })).toEqual(['Tel. 1 + 2 = 3']);
  });
});
