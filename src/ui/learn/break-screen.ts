// Break screen (T36): renders a SessionState from break-session.ts, sends events back.
// No storage, no timers of its own. Progress dots at the top, Dino Juf in the header,
// and the current phase (lesson, question with retry banner, right feedback, teach moment, summary, empty).

import '../../styles/mc-menu.css';
import '../../styles/break.css';
import type { Sound } from '../../audio/sound';
import type { Item, Lesson } from '../../content/format';
import { workedExampleOf } from '../../content/rekenen/generator';
import type { Response } from '../../learning/answer-check';
import { currentEntry, type SessionState } from '../../learning/break-session';
import { el } from '../dom';
import { onTap } from '../tap';
import { createDinoJuf } from './dino-juf';
import { createLessonView } from './lesson-view';
import { createQuestionHost, formatRightAnswer } from './question-host';
import { applyMcBackground } from './mc-background';
import { createSummaryView } from './summary';
import { createTeachMoment, pickLessonPage, type Teaching } from './teach-moment';

export type BreakScreenAction =
  | { type: 'lessonDone' }
  | { type: 'answer'; response: Response; q: number }
  | { type: 'next'; q: number }
  | { type: 'understood'; q: number }
  | { type: 'finish' };

export interface BreakScreenOptions {
  /** Initial session state. Call `render(state)` whenever it changes. */
  state: SessionState;
  /** Topic lesson for the initial `lesson` phase, if any. */
  lesson?: Lesson;
  /** Resolves the topic lesson for an item (used by the teach moment for Taal and own items). */
  lessonForItem?: (item: Item) => Lesson | undefined;
  /** True when the kid can afford at least one egg in the Dinowinkel and is under the 12 cap. */
  canAffordEgg?: (pointsTotal: number) => boolean;
  sound?: Pick<Sound, 'play'>;
  finishLabel?: string;
  /** Extra oefenen only (decision 51): shows a "Stoppen" button top right. Real learning breaks never pass this. */
  onStop?: () => void;
  onAction: (action: BreakScreenAction) => void;
  now?: () => number;
}

export interface BreakScreen {
  readonly element: HTMLElement;
  render(state: SessionState): void;
  destroy(): void;
}

function buildTeaching(
  item: Item,
  numeric: boolean | undefined,
  lessonForItem?: (item: Item) => Lesson | undefined,
): Teaching | undefined {
  if (numeric) {
    const worked = workedExampleOf(item.id, item.level);
    if (worked) {
      return {
        kind: 'example',
        example: {
          title: 'Stap voor stap:',
          steps: worked.steps.map((s) => `${s.text} (${s.sum})`),
        },
      };
    }
  }
  const lesson = lessonForItem?.(item);
  if (lesson) {
    const page = pickLessonPage(lesson, item.skill);
    if (page) return { kind: 'page', page };
  }
  return undefined;
}

/** Banner text for a right answer, with the points that really counted (AC166, AC167). */
export function rightBannerText(outcome: unknown, lastApplied: number | undefined): string {
  const retry = outcome === 'retry';
  const head = retry ? 'Goed zo!' : 'Goed!';
  if (lastApplied === undefined) return retry ? 'Goed zo! +1 punt' : 'Goed! +2 punten';
  if (lastApplied <= 0) return head;
  return `${head} +${lastApplied} ${lastApplied === 1 ? 'punt' : 'punten'}`;
}

/** The day cap note: only when the cap really cut points. Older saves without capCut keep the message. */
function capNote(state: SessionState): string | null {
  return (state.capCut ?? true) ? state.message : null;
}

export function createBreakScreen(options: BreakScreenOptions): BreakScreen {
  const root = el('div', { class: 'break-screen', attrs: { role: 'main', 'aria-label': 'Leerpauze' } });
  root.classList.add('scrollable');
  applyMcBackground(root);
  const juf = createDinoJuf('Tijd voor een leerpauze!');
  const dotsWrap = el('div', { class: 'break-dots', attrs: { 'aria-label': 'Voortgang' } });
  const stopBtn = options.onStop
    ? el('button', {
        class: 'break-stop-btn',
        text: 'Stoppen',
        attrs: { type: 'button', 'data-testid': 'practice-stop' },
      })
    : null;
  const stopOff =
    stopBtn && options.onStop
      ? onTap(stopBtn, () => options.onStop?.(), { now: options.now })
      : null;
  const header = el('header', { class: 'break-header' }, [
    juf.element,
    dotsWrap,
    ...(stopBtn ? [stopBtn] : []),
  ]);
  const body = el('div', { class: 'break-body' });
  root.append(header, body);

  let childCleanup: (() => void) | null = null;
  let lastSoundKey = '';

  function clearChild() {
    if (childCleanup) {
      childCleanup();
      childCleanup = null;
    }
    body.replaceChildren();
  }

  function renderDots(state: SessionState) {
    dotsWrap.replaceChildren(
      ...state.entries.map((_, i) => {
        const done = state.results[i] !== null;
        const current =
          !done &&
          (state.phase === 'question' || state.phase === 'feedback' || state.phase === 'teach') &&
          i === state.index;
        const cls = [
          'break-dot',
          done ? 'break-dot-done' : '',
          current ? 'break-dot-current' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return el('span', { class: cls });
      }),
    );
  }

  function playOnce(key: string, name: 'chime' | 'hmm' | 'fanfare') {
    if (lastSoundKey === key) return;
    lastSoundKey = key;
    options.sound?.play(name);
  }

  function render(state: SessionState) {
    clearChild();
    renderDots(state);
    // The summary has its own finish button, so Stoppen is only for the steps before it.
    if (stopBtn) stopBtn.hidden = state.phase === 'summary';

    if (state.phase === 'empty') {
      juf.say('Even geen vragen.');
      body.append(
        el('div', { class: 'break-empty' }, [
          el('p', {
            class: 'break-empty-text',
            text: 'Er staan geen vragen aan. Vraag papa of mama om vragen te kiezen.',
          }),
        ]),
      );
      return;
    }

    if (state.phase === 'lesson') {
      juf.say('Lees eerst even deze korte uitleg.');
      const lesson = options.lesson ?? { pages: [] };
      const view = createLessonView({
        lesson,
        onDone: () => options.onAction({ type: 'lessonDone' }),
        now: options.now,
      });
      body.append(view.element);
      childCleanup = () => view.destroy();
      return;
    }

    if (state.phase === 'question') {
      const entry = currentEntry(state);
      if (!entry) return;

      if (state.try === 2) {
        // AC30: soft orange cross and retry message, no right answer shown, input cleared.
        playOnce(`q-${state.index}-retry`, 'hmm');
        juf.say('Net niet. Probeer het nog een keer.');
        body.append(
          el('div', { class: 'break-banner break-banner-wrong', attrs: { role: 'status' } }, [
            el('span', { class: 'break-banner-icon', text: '✗', attrs: { 'aria-hidden': 'true' } }),
            el('span', { text: 'Net niet. Probeer het nog een keer.' }),
          ]),
        );
      } else {
        juf.say(`Vraag ${state.index + 1} van ${state.entries.length}`);
      }

      const note = capNote(state);
      if (note) {
        body.append(el('p', { class: 'break-cap-note', text: note }));
      }

      const qIndex = state.index;
      const host = createQuestionHost({
        item: entry.item,
        numeric: entry.numeric,
        onAnswer: (response) => options.onAction({ type: 'answer', response, q: qIndex }),
      });
      body.append(host.element);
      childCleanup = () => host.destroy();
      return;
    }

    if (state.phase === 'feedback') {
      const entry = currentEntry(state);
      const outcome = state.results[state.index];
      playOnce(`q-${state.index}-feedback`, 'chime');

      // AC29 (+2 punten on first try) and AC145 ("Goed zo! +1 punt" on retry).
      const feedbackText = rightBannerText(outcome, state.lastApplied);
      juf.say(feedbackText);

      const banner = el(
        'div',
        { class: 'break-banner break-banner-right', attrs: { role: 'status' } },
        [
          el('span', { class: 'break-banner-icon', text: '✓', attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: feedbackText }),
        ],
      );

      const cardChildren: Node[] = [banner];
      if (entry?.item.type === 'find-error' && entry.item.correction) {
        cardChildren.push(
          el('p', {
            class: 'break-correction',
            text: `Goede schrijfwijze: ${entry.item.correction}`,
          }),
        );
      }
      if (entry?.item.explain) {
        cardChildren.push(el('p', { class: 'break-explain', text: entry.item.explain }));
      }
      const feedbackNote = capNote(state);
      if (feedbackNote) {
        cardChildren.push(el('p', { class: 'break-cap-note', text: feedbackNote }));
      }

      const qIndex = state.index;
      const nextBtn = el('button', {
        class: 'break-next-btn',
        text: 'Verder',
        attrs: { type: 'button' },
      });
      cardChildren.push(nextBtn);
      body.append(el('div', { class: 'break-feedback-card' }, cardChildren));

      let acted = false;
      const off = onTap(
        nextBtn,
        () => {
          if (acted) return;
          acted = true;
          options.onAction({ type: 'next', q: qIndex });
        },
        { now: options.now },
      );
      childCleanup = off;
      return;
    }

    if (state.phase === 'teach') {
      const entry = currentEntry(state);
      if (!entry) return;
      playOnce(`q-${state.index}-teach`, 'hmm');
      juf.say('Kijk even mee, zo zit het.');

      const qIndex = state.index;
      const teach = createTeachMoment({
        answer: formatRightAnswer(entry.item),
        explain: entry.item.explain,
        teaching: buildTeaching(entry.item, entry.numeric, options.lessonForItem),
        onDone: () => options.onAction({ type: 'understood', q: qIndex }),
        now: options.now,
      });
      body.append(teach.element);
      childCleanup = () => teach.destroy();
      return;
    }

    if (state.phase === 'summary' && state.summary) {
      playOnce('summary', state.summary.hard ? 'hmm' : 'fanfare');
      juf.say(state.summary.hard ? 'Goed geprobeerd!' : 'Knap gedaan!');
      const summaryView = createSummaryView({
        summary: state.summary,
        canAffordEgg: options.canAffordEgg?.(state.summary.pointsTotal) ?? false,
        capMessage: capNote(state),
        buttonLabel: options.finishLabel,
        onFinish: () => options.onAction({ type: 'finish' }),
        now: options.now,
      });
      body.append(summaryView.element);
      childCleanup = () => summaryView.destroy();
    }
  }

  render(options.state);

  return {
    element: root,
    render,
    destroy() {
      stopOff?.();
      clearChild();
      root.remove();
    },
  };
}
