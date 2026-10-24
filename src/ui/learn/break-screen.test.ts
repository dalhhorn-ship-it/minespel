// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { ChoiceItem, Lesson } from '../../content/format';
import { itemFromId } from '../../content/rekenen/generator';
import { reduce, startSession, type SessionEntry } from '../../learning/break-session';
import { defaultKv } from '../../storage/schema';
import { createBreakScreen } from './break-screen';

function tap(el: Element) {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
}

const sampleLesson: Lesson = {
  pages: [
    {
      title: 'Regel 1',
      text: 'Stam + t in de tegenwoordige tijd.',
      examples: [{ good: 'hij loopt', bad: 'hij loop', why: 'hij krijgt stam + t' }],
      skill: 'stam-t',
    },
  ],
};

const choiceItem1: ChoiceItem = {
  id: 'q1',
  type: 'choice',
  level: 'M6',
  skill: 'stam-t',
  prompt: 'Kies de goede vorm.',
  sentence: 'Hij ___ naar school.',
  options: ['loopt', 'loop'],
  answer: 0,
  explain: 'Hij loopt is met stam + t.',
};

const rekenenItem = itemFromId('tafels:7x8', 'E6')!;

describe('break-screen (T36)', () => {
  it('shows progress dots without a countdown, handles first-try right (+2), retry right (+1), teach moment (-1 on Normaal) and summary (AC28, AC29, AC30, AC34, AC145, AC146)', () => {
    const entries: SessionEntry[] = [
      { item: choiceItem1, box: 0 },
      { item: { ...choiceItem1, id: 'q2' }, box: 0 },
      { item: rekenenItem, box: 0, numeric: true },
    ];
    let now = 1000;
    let { state } = startSession({
      mode: 'break',
      entries,
      economy: { ...defaultKv('economy'), points: 18 },
      day: '2026-10-17',
      lessonFirst: true,
      at: now,
    });

    const sounds: string[] = [];
    const screen = createBreakScreen({
      state,
      lesson: sampleLesson,
      lessonForItem: () => sampleLesson,
      canAffordEgg: (pts) => pts >= 20,
      sound: { play: (s) => sounds.push(s) },
      now: () => (now += 500),
      onAction: (action) => {
        if (action.type === 'lessonDone') {
          state = reduce(state, { type: 'lessonDone', at: now }).state;
        } else if (action.type === 'answer') {
          state = reduce(state, { type: 'answer', response: action.response, q: action.q, at: now }).state;
        } else if (action.type === 'next') {
          state = reduce(state, { type: 'next', q: action.q, at: now }).state;
        } else if (action.type === 'understood') {
          state = reduce(state, { type: 'understood', q: action.q, at: now }).state;
        } else if (action.type === 'finish') {
          state = reduce(state, { type: 'finish', at: now }).state;
        }
        screen.render(state);
      },
    });
    document.body.append(screen.element);

    // AC28: 3 progress dots, no countdown.
    expect(screen.element.querySelectorAll('.break-dot')).toHaveLength(3);
    expect(screen.element.textContent).not.toContain('Leerpauze over');

    // Lesson phase first -> tap "Ik snap het!"
    expect(screen.element.textContent).toContain('Regel 1');
    tap(screen.element.querySelector('.lesson-next')!);

    // Question 1: right on the first try -> green check, "+2 punten", chime (AC29).
    const q1Options = screen.element.querySelectorAll('.q-option');
    tap(q1Options[0]!);
    expect(screen.element.textContent).toContain('✓');
    expect(screen.element.textContent).toContain('+2 punten');
    expect(sounds).toContain('chime');
    tap(screen.element.querySelector('.break-next-btn')!);

    // Question 2: wrong on the first try -> "Net niet. Probeer het nog een keer.", right answer NOT shown (AC30).
    let q2Options = screen.element.querySelectorAll('.q-option');
    tap(q2Options[1]!);
    expect(screen.element.textContent).toContain('Net niet. Probeer het nog een keer.');
    expect(screen.element.textContent).not.toContain('Hij loopt is met stam + t.');

    // Question 2 retry: right -> "Goed zo! +1 punt" (AC145).
    q2Options = screen.element.querySelectorAll('.q-option');
    tap(q2Options[0]!);
    expect(screen.element.textContent).toContain('Goed zo! +1 punt');
    tap(screen.element.querySelector('.break-next-btn')!);

    // Question 3 (Rekenen 7 x 8 = 56): wrong twice -> teach moment with worked example and "-1 punt" on Normaal (AC146, AC173).
    const tapDigit = (d: string) => {
      const btn = [...screen.element.querySelectorAll('.kb-char')].find((b) => b.textContent === d)!;
      tap(btn);
    };
    const tapDone = () => tap(screen.element.querySelector('.kb-done')!);
    tapDigit('1');
    tapDigit('2');
    tapDone();
    expect(screen.element.textContent).toContain('Net niet. Probeer het nog een keer.');
    // Input is cleared on retry (AC30).
    expect(screen.element.querySelector('.type-text')?.textContent).toBe('');
    tapDigit('9');
    tapDigit('9');
    tapDone();

    // Teach moment shows "Zo zit het:", the right answer "56", worked example steps, and no minus (AC146).
    expect(screen.element.textContent).toContain('Zo zit het:');
    expect(screen.element.textContent).toContain('56');
    expect(screen.element.textContent).toContain('Stap voor stap:');
    expect(screen.element.querySelector('.teach-minus')?.textContent).toBe('-1 punt');
    tap(screen.element.querySelector('.teach-done')!);

    // Summary screen: 2 van de 3 goed, +2 +1 -1 = +2 punten verdiend, new total 20, egg hint shown (AC34, AC176).
    expect(screen.element.textContent).toContain('2 van de 3 goed!');
    expect(screen.element.textContent).toContain('+2 punten verdiend');
    expect(screen.element.textContent).toContain('Totaal: 20 punten');
    expect(screen.element.textContent).toContain('Je kunt een ei kopen in de Dinowinkel!');

    tap(screen.element.querySelector('.summary-done-btn')!);
    expect(state.phase).toBe('done');
    screen.destroy();
  });

  it('AC173: the minus shows by the Punten setting and never in a phase where nothing was taken', () => {
    type Mode = 'makkelijk' | 'normaal' | 'moeilijk';
    const wrong = { type: 'choice', index: 1 } as const;
    const play = (mode: Mode, points: number) => {
      let now = 1000;
      let { state } = startSession({
        mode: 'break',
        pointsMode: mode,
        entries: [{ item: choiceItem1, box: 0 }],
        economy: { ...defaultKv('economy'), points },
        day: '2026-10-17',
        at: now,
      });
      const screen = createBreakScreen({ state, lessonForItem: () => sampleLesson, onAction: () => {} });
      const step = (e: Parameters<typeof reduce>[1]) => {
        state = reduce(state, e).state;
        screen.render(state);
      };
      step({ type: 'answer', response: wrong, at: (now += 500) });
      const retryMinus = screen.element.querySelector('.break-banner-wrong .points-minus')?.textContent ?? null;
      step({ type: 'answer', response: wrong, at: (now += 500) });
      const teachMinus = screen.element.querySelector('.teach-minus')?.textContent ?? null;
      screen.destroy();
      return { retryMinus, teachMinus, total: state.economy.points };
    };
    expect(play('makkelijk', 10)).toEqual({ retryMinus: null, teachMinus: null, total: 10 });
    expect(play('normaal', 10)).toEqual({ retryMinus: null, teachMinus: '-1 punt', total: 9 });
    expect(play('moeilijk', 10)).toEqual({ retryMinus: '-1 punt', teachMinus: '-1 punt', total: 8 });
  });

  it('AC174: nothing is taken at 0 points, so no minus shows; Moeilijk at 1 point shows it only once', () => {
    const wrong = { type: 'choice', index: 1 } as const;
    const run2 = (mode: 'normaal' | 'moeilijk', points: number) => {
      let { state } = startSession({
        mode: 'break',
        pointsMode: mode,
        entries: [{ item: choiceItem1, box: 0 }],
        economy: { ...defaultKv('economy'), points },
        day: '2026-10-17',
        at: 1000,
      });
      const screen = createBreakScreen({ state, onAction: () => {} });
      state = reduce(state, { type: 'answer', response: wrong, at: 1500 }).state;
      screen.render(state);
      const retry = screen.element.textContent ?? '';
      state = reduce(state, { type: 'answer', response: wrong, at: 1600 }).state;
      screen.render(state);
      const teach = screen.element.textContent ?? '';
      screen.destroy();
      return { retry, teach };
    };
    const zero = run2('normaal', 0);
    expect(zero.retry).not.toMatch(/-\d/);
    expect(zero.teach).not.toMatch(/-\d/);
    const one = run2('moeilijk', 1);
    expect(one.retry).toContain('-1 punt');
    expect(one.teach).not.toMatch(/-\d/);
  });

  it('AC176: a minus sum shows in soft orange and the hard summary still shows it', () => {
    let { state } = startSession({
      mode: 'break',
      pointsMode: 'moeilijk',
      entries: [{ item: choiceItem1, box: 0 }],
      economy: { ...defaultKv('economy'), points: 10 },
      day: '2026-10-17',
      at: 1000,
    });
    const wrong = { type: 'choice', index: 1 } as const;
    state = reduce(state, { type: 'answer', response: wrong, at: 1500 }).state;
    state = reduce(state, { type: 'answer', response: wrong, at: 1600 }).state;
    state = reduce(state, { type: 'understood', at: 1700 }).state;
    const screen = createBreakScreen({ state, onAction: () => {} });
    const line = screen.element.querySelector('.summary-points');
    expect(line?.textContent).toBe('-2 punten');
    expect(line?.classList.contains('points-minus')).toBe(true);
    expect(screen.element.textContent).toContain('Totaal: 8 punten');
    screen.destroy();
  });

  it('shows the kind message with no plus points when 0 questions are right (AC116)', () => {
    let now = 1000;
    let { state } = startSession({
      mode: 'break',
      entries: [{ item: choiceItem1, box: 0 }],
      pointsMode: 'makkelijk',
      economy: { ...defaultKv('economy'), points: 5 },
      day: '2026-10-17',
      at: now,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 1 }, at: (now += 500) }).state;
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 1 }, at: (now += 500) }).state;
    state = reduce(state, { type: 'understood', at: (now += 500) }).state;

    const screen = createBreakScreen({
      state,
      onAction: () => {},
    });
    expect(screen.element.textContent).toContain(
      'Dit was lastig. Volgende keer gaat het vast beter!',
    );
    expect(screen.element.textContent).not.toContain('+');
    expect(screen.element.textContent).toContain('Totaal: 5 punten');
    screen.destroy();
  });

  it('has no Stoppen in a real learning break, and a 56px Stoppen only when asked for (decisions 51, 53)', () => {
    const entries: SessionEntry[] = [{ item: choiceItem1, box: 0 }];
    const { state } = startSession({
      mode: 'break',
      entries,
      economy: defaultKv('economy'),
      day: '2026-10-17',
      lessonFirst: false,
      at: 1000,
    });
    const plain = createBreakScreen({ state, onAction: () => undefined });
    expect(plain.element.querySelector('.break-stop-btn')).toBeNull();
    expect(plain.element.textContent).not.toContain('Stoppen');
    expect(plain.element.textContent).not.toContain('Ouders');
    expect(plain.element.querySelector('.lock-icon-btn')).toBeNull();
    plain.destroy();

    let stopped = 0;
    const withStop = createBreakScreen({ state, onAction: () => undefined, onStop: () => stopped++ });
    const btn = withStop.element.querySelector<HTMLButtonElement>('.break-stop-btn');
    expect(btn?.textContent).toBe('Stoppen');
    expect(btn?.closest('.break-header')).not.toBeNull();
    tap(btn!);
    expect(stopped).toBe(1);
    withStop.destroy();
  });
});

describe('honest points banner (v10, AC29, AC175)', () => {
  function feedbackText(over: Record<string, unknown>, practiceDay: number): string {
    let { state } = startSession({
      mode: 'break',
      early: true,
      entries: [{ item: choiceItem1, box: 0 }, { item: { ...choiceItem1, id: 'q2' }, box: 0 }],
      economy: { points: 10, practicePointsToday: practiceDay, practiceDay: '2026-10-17' },
      day: '2026-10-17',
      at: 1000,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    state = { ...state, ...over };
    const screen = createBreakScreen({ state, onAction: () => {} });
    return screen.element.querySelector('.break-banner-right')!.textContent ?? '';
  }

  it('AC175: 50 points earned today still show "+2 punten"', () => {
    expect(feedbackText({}, 50)).toContain('Goed! +2 punten');
    expect(feedbackText({}, 0)).toContain('Goed! +2 punten');
  });

  it('AC29: an old saved session without lastApplied shows the old text', () => {
    expect(feedbackText({ lastApplied: undefined }, 0)).toContain('Goed! +2 punten');
  });

  it('AC175: "Genoeg geoefend" never shows, also with an old saved message', () => {
    let { state } = startSession({
      mode: 'break',
      early: true,
      entries: [{ item: choiceItem1, box: 0 }],
      economy: { points: 10, practicePointsToday: 10, practiceDay: '2026-10-17' },
      day: '2026-10-17',
      at: 1000,
    });
    state = { ...state, message: 'Genoeg geoefend voor vandaag', capCut: true } as typeof state;
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    state = reduce(state, { type: 'next', at: 1600 }).state;
    const screen = createBreakScreen({ state, onAction: () => {} });
    expect(screen.element.textContent).not.toContain('Genoeg geoefend');
    screen.destroy();
  });
});

describe('summary points (v10, AC35, AC175)', () => {
  function allFirst(early: boolean, used: number, n = 5) {
    let { state } = startSession({
      mode: 'break',
      early,
      entries: Array.from({ length: n }, (_, i) => ({ item: { ...choiceItem1, id: `q${i}` }, box: 0 })),
      economy: { points: 10, practicePointsToday: used, practiceDay: '2026-10-17' },
      day: '2026-10-17',
      at: 1000,
    });
    for (let i = 0; i < n; i++) {
      state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 + i * 10 }).state;
      state = reduce(state, { type: 'next', at: 1505 + i * 10 }).state;
    }
    return state;
  }
  const text = (s: ReturnType<typeof allFirst>) =>
    createBreakScreen({ state: s, onAction: () => {} }).element.textContent ?? '';

  it('AC35 and AC175: a Nu oefenen break gets the +3 bonus however much was earned today', () => {
    const s = allFirst(true, 50);
    expect(s.summary).toMatchObject({ bonus: 3, earned: 13 });
    expect(text(s)).toContain('+13 punten verdiend (inclusief +3 bonus!)');
    expect(text(s)).not.toContain('Genoeg geoefend');
  });

  it('AC29: an old saved session without lastApplied survives a JSON round trip and shows the old text', () => {
    let { state } = startSession({
      mode: 'break',
      entries: [{ item: choiceItem1, box: 0 }, { item: { ...choiceItem1, id: 'q2' }, box: 0 }],
      economy: { points: 10, practicePointsToday: 0, practiceDay: '2026-10-17' },
      day: '2026-10-17',
      at: 1000,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    const old = { ...state } as Record<string, unknown>;
    delete old.lastApplied;
    delete old.pointsMode;
    const loaded = JSON.parse(JSON.stringify(old)) as typeof state;
    expect(loaded.lastApplied).toBeUndefined();
    const screen = createBreakScreen({ state: loaded, onAction: () => {} });
    expect(screen.element.querySelector('.break-banner-right')?.textContent).toContain('Goed! +2 punten');
  });
});
