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
  it('shows progress dots without a countdown, handles first-try right (+2), retry right (+1), teach moment (0) and summary (AC28, AC29, AC30, AC34, AC145, AC146)', () => {
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

    // Question 3 (Rekenen 7 x 8 = 56): wrong twice -> teach moment with worked example and no minus (AC146).
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
    expect(screen.element.textContent).not.toContain('-1 punt');
    tap(screen.element.querySelector('.teach-done')!);

    // Summary screen: 2 van de 3 goed, +3 punten verdiend, new total 21, egg hint shown (AC34).
    expect(screen.element.textContent).toContain('2 van de 3 goed!');
    expect(screen.element.textContent).toContain('+3 punten verdiend');
    expect(screen.element.textContent).toContain('Totaal: 21 punten');
    expect(screen.element.textContent).toContain('Je kunt een ei kopen in de Dinowinkel!');

    tap(screen.element.querySelector('.summary-done-btn')!);
    expect(state.phase).toBe('done');
    screen.destroy();
  });

  it('AC170: no minus number on screen in any phase of a timed break, an early break or Extra oefenen', () => {
    const configs = [
      { mode: 'break' as const },
      { mode: 'break' as const, early: true },
      { mode: 'practice' as const },
    ];
    for (const c of configs) {
      let now = 1000;
      let { state } = startSession({
        ...c,
        entries: [
          { item: choiceItem1, box: 0 },
          { item: { ...choiceItem1, id: 'q2' }, box: 0 },
        ],
        economy: { ...defaultKv('economy'), points: 5 },
        day: '2026-10-17',
        lessonFirst: true,
        at: now,
      });
      const screen = createBreakScreen({ state, lesson: sampleLesson, lessonForItem: () => sampleLesson, onAction: () => {} });
      const texts: string[] = [];
      const step = (e: Parameters<typeof reduce>[1]) => {
        state = reduce(state, e).state;
        screen.render(state);
        texts.push(`${state.phase}: ${screen.element.textContent ?? ''}`);
      };
      texts.push(`${state.phase}: ${screen.element.textContent ?? ''}`);
      const wrong = { type: 'choice', index: 1 } as const;
      const right = { type: 'choice', index: 0 } as const;
      step({ type: 'lessonDone', at: (now += 500) });
      step({ type: 'answer', response: wrong, at: (now += 500) }); // retry
      step({ type: 'answer', response: wrong, at: (now += 500) }); // teach moment
      step({ type: 'understood', at: (now += 500) });
      step({ type: 'answer', response: right, at: (now += 500) });
      step({ type: 'next', at: (now += 500) });
      expect(state.phase).toBe('summary');
      expect(texts.some((t) => t.startsWith('teach'))).toBe(true);
      expect(texts.some((t) => t.startsWith('summary'))).toBe(true);
      for (const t of texts) expect(t).not.toMatch(/-\d/);
      screen.destroy();
    }
  });

  it('shows the kind message with no plus points when 0 questions are right (AC116)', () => {
    let now = 1000;
    let { state } = startSession({
      mode: 'break',
      entries: [{ item: choiceItem1, box: 0 }],
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

describe('honest points banner (v9, AC166, AC167)', () => {
  const eco = (used: number) => ({ points: 10, practicePointsToday: used, practiceDay: '2026-10-17' });
  function feedbackText(over: Record<string, unknown>, used: number, early = true): string {
    let { state } = startSession({
      mode: 'break',
      early,
      entries: [{ item: choiceItem1, box: 0 }, { item: { ...choiceItem1, id: 'q2' }, box: 0 }],
      economy: eco(used),
      day: '2026-10-17',
      at: 1000,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    state = { ...state, ...over };
    const screen = createBreakScreen({ state, onAction: () => {} });
    return screen.element.querySelector('.break-banner-right')!.textContent ?? '';
  }

  it('AC166: shows the points that really counted', () => {
    expect(feedbackText({}, 0)).toContain('Goed! +2 punten');
    expect(feedbackText({}, 9)).toContain('Goed! +1 punt');
  });

  it('AC167: shows no number when the day cap gave nothing', () => {
    const t = feedbackText({}, 10);
    expect(t).toContain('Goed!');
    expect(t).not.toContain('+');
  });

  it('AC166: an old saved session without lastApplied shows the old text', () => {
    expect(feedbackText({ lastApplied: undefined }, 0)).toContain('Goed! +2 punten');
  });

  it('AC167: the summary note shows only when the cap really cut points', () => {
    const summaryText = (used: number) => {
      let { state } = startSession({
        mode: 'break',
        early: true,
        entries: [{ item: choiceItem1, box: 0 }],
        economy: eco(used),
        day: '2026-10-17',
        at: 1000,
      });
      // wrong, then right on the retry: +1 and no bonus
      state = reduce(state, { type: 'answer', response: { type: 'choice', index: 1 }, at: 1500 }).state;
      state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1550 }).state;
      state = reduce(state, { type: 'next', at: 1600 }).state;
      return createBreakScreen({ state, onAction: () => {} }).element.textContent ?? '';
    };
    expect(summaryText(9)).not.toContain('Genoeg geoefend');
    expect(summaryText(10)).toContain('Genoeg geoefend voor vandaag');
  });
});

describe('honest points extra cases (v9, AC166, AC168)', () => {
  const eco = (used: number) => ({ points: 10, practicePointsToday: used, practiceDay: '2026-10-17' });
  const entries2 = () => [
    { item: choiceItem1, box: 0 },
    { item: { ...choiceItem1, id: 'q2' }, box: 0 },
  ];
  function allFirst(early: boolean, used: number, n = 2) {
    let { state } = startSession({
      mode: 'break',
      early,
      entries: Array.from({ length: n }, (_, i) => ({ item: { ...choiceItem1, id: `q${i}` }, box: 0 })),
      economy: eco(used),
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

  it('AC166: a bonus that only partly fits shows the applied part, none when there is no room', () => {
    expect(text(allFirst(true, 4))).toContain('(inclusief +2 bonus!)');
    expect(text(allFirst(true, 5))).toContain('(inclusief +1 bonus!)');
    expect(text(allFirst(true, 6))).not.toContain('bonus');
  });

  it('AC168: a timed break at the practice day limit still gives +2, +1 and the +3 bonus, capCut stays false', () => {
    const s = allFirst(false, 10);
    expect(s.capCut).toBe(false);
    expect(s.summary?.bonus).toBe(3);
    expect(s.summary?.earned).toBe(7);
    expect(text(s)).toContain('(inclusief +3 bonus!)');
    expect(text(s)).not.toContain('Genoeg geoefend');
    let { state } = startSession({
      mode: 'break',
      entries: entries2(),
      economy: eco(10),
      day: '2026-10-17',
      at: 1000,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    expect(state.lastApplied).toBe(2);
    expect(state.capCut).toBe(false);
    const banner = createBreakScreen({ state, onAction: () => {} }).element.querySelector('.break-banner-right');
    expect(banner?.textContent).toContain('Goed! +2 punten');
  });

  it('AC166: an old saved session without lastApplied and capCut survives a JSON round trip and shows the old text', () => {
    let { state } = startSession({
      mode: 'break',
      entries: entries2(),
      economy: eco(0),
      day: '2026-10-17',
      at: 1000,
    });
    state = reduce(state, { type: 'answer', response: { type: 'choice', index: 0 }, at: 1500 }).state;
    const old = { ...state } as Record<string, unknown>;
    delete old.lastApplied;
    delete old.capCut;
    const loaded = JSON.parse(JSON.stringify(old)) as typeof state;
    expect(loaded.lastApplied).toBeUndefined();
    const screen = createBreakScreen({ state: loaded, onAction: () => {} });
    expect(screen.element.querySelector('.break-banner-right')?.textContent).toContain('Goed! +2 punten');
  });
});
