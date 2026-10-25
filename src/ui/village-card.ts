// The villager question card (v11 Dorp, AC183 to AC185, AC189). A kid-overlay screen, so the play timer stops.
// It reuses the question views of a break (choice, find-error, punctuate, type, number pad) but is not the break
// screen: no dots, no lesson, no points, no plus or minus numbers. All text is plain text (textContent only).
import '../styles/mc-menu.css';
import '../styles/village.css';
import type { Response } from '../learning/answer-check';
import type { VillageCardState } from '../learning/village-question';
import { blockColor } from '../render/effects';
import type { VillagerLook } from '../villagers/villager';
import { blockInfo } from '../world/blocks';
import { el } from './dom';
import { createQuestionHost, formatRightAnswer } from './learn/question-host';
import { onTap } from './tap';

export const RETRY_TEXT = 'Net niet. Probeer het nog een keer.';
export const RESPECT_TEXT = 'Respect bruuuuu!';
export const DANCE_TEXT = 'Kijk, een dansje!';
export const WRONG_TWICE_HEAD = 'Zo zit het:';
export const WRONG_TWICE_LINE = 'Volgende keer lukt het vast!';
export const ALREADY_TEXT = 'Die had je al!';

export type VillageCardAction =
  | { type: 'answer'; response: Response }
  | { type: 'verder' }
  | { type: 'laatMaar' }
  | { type: 'hotbar' };

export interface VillageCardOptions {
  state: VillageCardState;
  look: VillagerLook;
  onAction: (action: VillageCardAction) => void;
  now?: () => number;
  doc?: Document;
}

export interface VillageCard {
  readonly element: HTMLElement;
  render(state: VillageCardState): void;
  /** The phase on screen, for the e2e hook. */
  phase(): string;
  destroy(): void;
}

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** The villager's face: skin, eyes, hat or hair in its own colour, and a bit of shirt. Pure CSS, no image. */
function createFace(look: VillagerLook, doc?: Document): HTMLElement {
  const face = el(
    'div',
    { class: `village-face village-hat-${look.style}`, attrs: { 'aria-hidden': 'true', 'data-testid': 'village-face' } },
    [
      el('span', { class: 'village-hat' }, [], doc),
      el('span', { class: 'village-head' }, [
        el('span', { class: 'village-eye village-eye-left' }, [], doc),
        el('span', { class: 'village-eye village-eye-right' }, [], doc),
        el('span', { class: 'village-mouth' }, [], doc),
      ], doc),
      el('span', { class: 'village-shirt' }, [], doc),
    ],
    doc,
  );
  face.style.setProperty('--v-shirt', hex(look.shirt));
  face.style.setProperty('--v-skin', hex(look.skin));
  face.style.setProperty('--v-hat', hex(look.hat));
  return face;
}

export function createVillageCard(options: VillageCardOptions): VillageCard {
  const doc = options.doc;
  const face = createFace(options.look, doc);
  const say = el('p', { class: 'village-say', attrs: { 'data-testid': 'village-say' } }, [], doc);
  const header = el('header', { class: 'village-header' }, [face, el('div', { class: 'village-speech' }, [say], doc)], doc);
  const body = el('div', { class: 'village-body' }, [], doc);
  const footer = el('footer', { class: 'village-footer' }, [], doc);
  const card = el('div', { class: 'village-card', attrs: { role: 'dialog', 'aria-label': 'Vraag van een dorpeling' } }, [header, body, footer], doc);
  const root = el('div', { class: 'village-backdrop scrollable', attrs: { 'data-testid': 'village-card' } }, [card], doc);
  let cleanups: Array<() => void> = [];
  let currentPhase = '';

  function clear() {
    for (const off of cleanups) off();
    cleanups = [];
    body.replaceChildren();
    footer.replaceChildren();
  }

  function button(text: string, testid: string, action: VillageCardAction, primary = true): HTMLElement {
    const b = el(
      'button',
      { class: `village-btn${primary ? ' village-btn-primary' : ''}`, text, attrs: { type: 'button', 'data-testid': testid } },
      [],
      doc,
    );
    // The reducer ignores a second tap too, so a double tap acts once on both sides.
    cleanups.push(onTap(b, () => options.onAction(action), { now: options.now }));
    return b;
  }

  function render(state: VillageCardState) {
    clear();
    currentPhase = state.phase === 'question' && state.try === 2 ? 'retry' : state.phase;
    root.dataset.phase = currentPhase;
    const entry = state.question.entry;

    if (state.phase === 'question') {
      if (state.try === 2) {
        say.textContent = RETRY_TEXT;
        body.append(
          el('div', { class: 'village-banner village-banner-wrong', attrs: { role: 'status' } }, [
            el('span', { text: '✗', attrs: { 'aria-hidden': 'true' } }, [], doc),
            el('span', { text: RETRY_TEXT }, [], doc),
          ], doc),
        );
      } else {
        say.textContent = 'Weet jij dit nog?';
      }
      const host = createQuestionHost({
        item: entry.item,
        numeric: entry.numeric,
        onAnswer: (response) => options.onAction({ type: 'answer', response }),
        doc,
      });
      body.append(host.element);
      cleanups.push(() => host.destroy());
      footer.append(button('Laat maar', 'village-laat-maar', { type: 'laatMaar' }, false));
      return;
    }

    if (state.phase === 'right') {
      face.classList.toggle('village-face-dance', state.celebration === 'dance');
      // The cheer is said once, in the speech line. The green banner says something else.
      say.textContent = state.celebration === 'respect' ? RESPECT_TEXT : DANCE_TEXT;
      const kids: Node[] = [
        el('div', { class: 'village-banner village-banner-right', attrs: { role: 'status' } }, [
          el('span', { text: '✓', attrs: { 'aria-hidden': 'true' } }, [], doc),
          el('span', { text: 'Goed zo!' }, [], doc),
        ], doc),
      ];
      if (state.alreadyFound) {
        kids.push(el('p', { class: 'village-reward-text', text: ALREADY_TEXT, attrs: { 'data-testid': 'village-already' } }, [], doc));
        footer.append(button('Verder', 'village-verder', { type: 'verder' }));
      } else {
        const name = blockInfo(state.gives).name;
        const swatch = el('span', { class: 'village-swatch', attrs: { 'aria-hidden': 'true' } }, [], doc);
        swatch.style.background = blockColor(state.gives);
        kids.push(
          el('div', { class: 'village-reward' }, [
            swatch,
            el('p', { class: 'village-reward-text', text: `Je hebt ${name} gevonden!`, attrs: { 'data-testid': 'village-found' } }, [], doc),
          ], doc),
        );
        footer.append(
          button('In mijn hotbar', 'village-hotbar', { type: 'hotbar' }),
          button('Verder', 'village-verder', { type: 'verder' }, false),
        );
      }
      body.append(el('div', { class: 'village-feedback' }, kids, doc));
      return;
    }

    if (state.phase === 'wrong') {
      say.textContent = WRONG_TWICE_LINE;
      const kids: Node[] = [
        el('p', { class: 'village-zo', text: WRONG_TWICE_HEAD }, [], doc),
        el('p', { class: 'village-answer', text: formatRightAnswer(entry.item), attrs: { 'data-testid': 'village-answer' } }, [], doc),
      ];
      if (entry.item.explain) {
        kids.push(el('p', { class: 'village-explain', text: entry.item.explain, attrs: { 'data-testid': 'village-explain' } }, [], doc));
      }
      body.append(el('div', { class: 'village-feedback' }, kids, doc));
      footer.append(button('Verder', 'village-verder', { type: 'verder' }));
    }
  }

  render(options.state);

  return {
    element: root,
    render,
    phase: () => currentPhase,
    destroy() {
      clear();
      root.remove();
    },
  };
}
