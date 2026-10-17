// Break screen (T36): renders a break-session and sends taps back as session events.
// It owns no storage and no points logic. Every state change is handed to `onStep(state, effects)`,
// and the caller (break-flow, T43) saves and logs. Input that does not fit the phase is ignored
// by the reducer, so a double tap can never skip a question (AC117).
// There is no break countdown on this screen (AC28). Dutch texts for kids of 8 to 10.
import '../../styles/break.css';
import { SHOP_KINDS } from '../../dinos/kinds';
import type { Item, Lesson } from '../../content/format';
import { workedExampleOf } from '../../content/rekenen/generator';
import type { WorkedExample } from '../../content/rekenen/worked-example';
import {
  currentEntry,
  reduce,
  type SessionEffect,
  type SessionEvent,
  type SessionState,
} from '../../learning/break-session';
import type { Sound } from '../../audio/sound';
import { el } from '../dom';
import { onTap } from '../tap';
import { createDinoJuf, type DinoJuf } from './dino-juf';
import { createQuestionHost } from './question-host';
import { createSummary, pointsText } from './summary';
import { createTeachMoment, pickLessonPage, type Teaching } from './teach-moment';
import { createLessonView } from './lesson-view';

export const MSG_RETRY = 'Net niet. Probeer het nog een keer.';
export const MSG_EMPTY = 'Er staan geen vragen aan. Vraag een grote om iets aan te zetten.';

/** Cheapest egg price, used when the caller does not pass its own `canBuyEgg`. */
const CHEAPEST_EGG = Math.min(...SHOP_KINDS.map((k) => k.price));

/** The right answer as text, for the teach moment. */
export function answerText(item: Item): string {
  switch (item.type) {
    case 'choice':
      return item.options[item.answer] ?? '';
    case 'find-error':
      return item.answer < 0 ? 'Geen fout' : (item.correction ?? item.words[item.answer] ?? '');
    case 'type':
      return item.answer[0] ?? '';
    case 'punctuate': {
      const gaps = new Set(item.answer);
      return item.words.map((w, i) => (gaps.has(i) ? w + item.mark : w)).join(' ');
    }
  }
}

/** Worked example steps as the strings the teach moment shows: the sentence, then the sum. */
export function exampleSteps(example: WorkedExample): string[] {
  return example.steps.map((s) => `${s.text} ${s.sum}`);
}

export interface BreakScreenOptions {
  /** From `startSession`, or a saved state when resuming (AC37). */
  state: SessionState;
  /** The lesson shown first when the session starts in the lesson phase. */
  lesson?: Lesson;
  /** The topic lesson of an item, for the teach moment of Taal and parent items. */
  lessonOf?: (item: Item) => Lesson | undefined;
  /** Worked example of a Rekenen item. Defaults to the built in generator. */
  workedExample?: (item: Item, level: string) => WorkedExample | null;
  /** Called after every state change with the new state and its effects. */
  onStep: (state: SessionState, effects: SessionEffect[]) => void;
  sound?: Pick<Sound, 'play'>;
  /** True when this point total pays for an egg the kid can buy. */
  canBuyEgg?: (points: number) => boolean;
  /** Clock in ms for event times, injectable for tests. */
  now?: () => number;
  /** Clock for the double tap guard, injectable for tests. */
  tapNow?: () => number;
}

export interface BreakScreen {
  element: HTMLElement;
  getState(): SessionState;
  /** Parent ended the break ("Pauze nu beeindigen", AC95). */
  parentEnd(): void;
  /** Let time pass (the empty break ends after 10 seconds). Scheduled by the screen itself too. */
  tick(): void;
  destroy(): void;
}

export function createBreakScreen(options: BreakScreenOptions): BreakScreen {
  const now = options.now ?? (() => Date.now());
  const tapNow = options.tapNow;
  const canBuyEgg = options.canBuyEgg ?? ((p: number) => p >= CHEAPEST_EGG);
  const exampleOf = options.workedExample ?? ((item: Item, level: string) => workedExampleOf(item.id, level));

  let state = options.state;
  let destroyed = false;
  let lastGain = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: Array<() => void> = [];

  const juf: DinoJuf = createDinoJuf();
  const dots = el('div', { class: 'break-dots', attrs: { role: 'img' } });
  const header = el('header', { class: 'break-header' }, [juf.element, dots]);
  const body = el('div', { class: 'break-body' });
  const root = el('main', { class: 'break-screen', attrs: { 'aria-label': 'Leerpauze' } }, [header, body]);

  function clearBody() {
    for (const c of cleanup) c();
    cleanup = [];
    body.replaceChildren();
  }

  function drawDots() {
    const total = state.entries.length;
    dots.hidden = total === 0;
    dots.setAttribute('aria-label', `Vraag ${Math.min(state.index + 1, total)} van ${total}`);
    dots.replaceChildren(
      ...state.entries.map((_, i) => {
        const done = state.results[i] !== null;
        const cls = done ? 'break-dot done' : i === state.index && state.phase !== 'summary' ? 'break-dot now' : 'break-dot';
        return el('span', { class: cls });
      }),
    );
  }

  function button(text: string, cls: string, handler: () => void): HTMLButtonElement {
    const b = el('button', { class: cls, text, attrs: { type: 'button' } });
    cleanup.push(onTap(b, handler, { now: tapNow }));
    return b;
  }

  function teachingFor(item: Item, numeric: boolean): Teaching | undefined {
    if (numeric) {
      const ex = exampleOf(item, item.level);
      if (ex) return { kind: 'example', example: { title: 'Zo reken je het uit', steps: exampleSteps(ex) } };
    }
    const lesson = options.lessonOf?.(item);
    const page = lesson ? pickLessonPage(lesson, item.skill) : undefined;
    return page ? { kind: 'page', page } : undefined;
  }

  function render() {
    clearBody();
    drawDots();
    const entry = currentEntry(state);
    const phase = state.phase;
    const idx = state.index;

    if (phase === 'lesson') {
      juf.setMood('happy');
      if (!options.lesson || options.lesson.pages.length === 0) {
        // Nothing to teach: go straight to the questions.
        queueMicrotask(() => send({ type: 'lessonDone', at: now() }));
        return;
      }
      const v = createLessonView({ lesson: options.lesson, onDone: () => send({ type: 'lessonDone', at: now() }), now: tapNow });
      cleanup.push(() => v.destroy());
      body.append(v.element);
    } else if (phase === 'question' && entry) {
      juf.setMood(state.try === 2 ? 'think' : 'happy');
      if (state.try === 2) {
        body.append(
          el('p', { class: 'break-retry', attrs: { role: 'status' } }, [el('span', { class: 'mark mark-wrong', text: '✗', attrs: { 'aria-hidden': 'true' } }), MSG_RETRY]),
        );
      }
      const host = createQuestionHost({
        item: entry.item,
        numeric: entry.numeric,
        onAnswer: (response) => send({ type: 'answer', at: now(), response, q: idx }),
      });
      cleanup.push(() => host.destroy());
      body.append(host.element);
    } else if (phase === 'feedback') {
      juf.setMood('cheer');
      const outcome = state.results[idx];
      const retry = outcome === 'retry';
      const gain = lastGain;
      let line: string;
      if (state.mode === 'preview' || gain <= 0) line = retry ? 'Goed zo!' : 'Goed!';
      else if (retry) line = `Goed zo! +${pointsText(gain)}`;
      else line = `+${pointsText(gain)}`;
      body.append(
        el('div', { class: 'break-feedback', attrs: { role: 'status' } }, [
          el('span', { class: 'mark mark-right', text: '✓', attrs: { 'aria-hidden': 'true' } }),
          el('p', { class: 'feedback-text', text: line }),
          ...(state.message ? [el('p', { class: 'summary-note', text: state.message })] : []),
        ]),
        button('Verder', 'break-button', () => send({ type: 'next', at: now(), q: idx })),
      );
    } else if (phase === 'teach' && entry) {
      juf.setMood('think');
      const tm = createTeachMoment({
        answer: answerText(entry.item),
        explain: entry.item.explain,
        teaching: teachingFor(entry.item, entry.numeric === true),
        onDone: () => send({ type: 'understood', at: now(), q: idx }),
        now: tapNow,
      });
      cleanup.push(() => tm.destroy());
      body.append(tm.element);
    } else if (phase === 'summary' && state.summary) {
      const s = state.summary;
      juf.setMood(s.hard ? 'think' : 'cheer');
      const v = createSummary({
        summary: s,
        showPoints: state.mode !== 'preview',
        canBuyEgg: state.mode === 'break' && canBuyEgg(s.pointsTotal),
        message: state.message,
        onDone: () => send({ type: 'finish', at: now() }),
        now: tapNow,
      });
      cleanup.push(() => v.destroy());
      body.append(v.element);
    } else if (phase === 'empty') {
      juf.setMood('happy');
      body.append(el('p', { class: 'break-empty', text: MSG_EMPTY, attrs: { role: 'status' } }));
    }
    schedule();
  }

  function schedule() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (destroyed || state.phase !== 'empty' || state.emptyUntil === null) return;
    timer = setTimeout(() => {
      timer = null;
      send({ type: 'tick', at: Math.max(now(), state.emptyUntil ?? 0) });
    }, Math.max(0, state.emptyUntil - now()));
  }

  function send(ev: SessionEvent) {
    if (destroyed) return;
    const before = state;
    const r = reduce(state, ev);
    if (r.state === before) return; // ignored input: nothing changes, nothing is saved
    state = r.state;
    const answerPoints = r.effects.find((e) => e.type === 'points' && e.reason === 'answer');
    lastGain = answerPoints && answerPoints.type === 'points' ? Math.max(0, answerPoints.applied) : 0;
    if (ev.type === 'answer') {
      if (state.phase === 'feedback') options.sound?.play('chime');
      else if (state.phase === 'question') options.sound?.play('hmm');
    }
    options.onStep(state, r.effects);
    if (destroyed) return;
    render();
  }

  // Resuming into feedback: the gain is not known any more, so show the usual one.
  if (state.phase === 'feedback' && state.mode !== 'preview') {
    lastGain = state.results[state.index] === 'retry' ? 1 : 2;
  }
  render();

  return {
    element: root,
    getState: () => state,
    parentEnd: () => send({ type: 'parentEnd', at: now() }),
    tick: () => send({ type: 'tick', at: now() }),
    destroy() {
      destroyed = true;
      if (timer !== null) clearTimeout(timer);
      clearBody();
      juf.element.remove();
      root.remove();
    },
  };
}
