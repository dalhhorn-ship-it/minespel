// The lilac bubble pill (v22, decision 144, AC303, AC306): a round pill with a picture, one line of Dutch text and, for
// a target, an arrow. All nodes are built once on the first shown state; later updates write text, the picture and one
// `transform` only when they changed. The turn is a CSS transition (none with reduced motion). It never pulses, never
// changes colour and makes no sound. The slot is an ignore zone, so a tap on the pill does nothing.
import '../styles/bubble-pill.css';
import type { BubbleHudKind, BubbleHudState } from '../monsters/bubble-hud';

export interface BubblePillView {
  /** Shows the state, or hides the pill when `state.shown` is false. Called only when something changed. */
  update(state: Readonly<BubbleHudState>): void;
  /** Hides the pill (every pause state). */
  hide(): void;
  destroy(): void;
}

const PICTURE: Readonly<Record<BubbleHudKind, string>> = {
  clock: '\u{1FAE7}',
  soon: '\u{1FAE7}',
  bubble: '\u{1FAE7}',
  klodder: '\u{1F47E}',
  mole: '\u{1F439}',
};

/** The view for the HUD slot (`hud.bubbleSlot`). */
export function createBubblePill(slot: HTMLElement): BubblePillView {
  let pill: HTMLElement | null = null;
  let picture: HTMLElement;
  let text: HTMLElement;
  let arrow: HTMLElement;
  let lastKind: BubbleHudKind | null = null;
  let lastText = '';
  let lastArrowShown = false;
  // The unwrapped angle, so the arrow turns the short way round and never spins.
  let turn = 0;
  let lastAngle = 0;
  let turnSet = false;

  function build(): void {
    const doc = slot.ownerDocument;
    pill = doc.createElement('div');
    pill.className = 'bubble-pill';
    pill.setAttribute('data-testid', 'bubble-pill');
    pill.hidden = true;
    picture = doc.createElement('span');
    picture.className = 'bubble-pill-picture';
    picture.setAttribute('aria-hidden', 'true');
    text = doc.createElement('span');
    text.className = 'bubble-pill-text';
    text.setAttribute('data-testid', 'bubble-pill-text');
    arrow = doc.createElement('span');
    arrow.className = 'bubble-pill-arrow';
    arrow.setAttribute('data-testid', 'bubble-pill-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '\u{2B06}';
    arrow.hidden = true;
    pill.append(picture, text, arrow);
    slot.append(pill);
  }

  return {
    update(state) {
      if (!state.shown) {
        this.hide();
        return;
      }
      if (!pill) build();
      if (pill!.hidden) pill!.hidden = false;
      if (state.kind !== lastKind) {
        picture.textContent = PICTURE[state.kind];
        lastKind = state.kind;
      }
      if (state.text !== lastText) {
        text.textContent = state.text;
        lastText = state.text;
      }
      const wantArrow = state.kind === 'bubble' || state.kind === 'klodder' || state.kind === 'mole';
      if (wantArrow !== lastArrowShown) {
        arrow.hidden = !wantArrow;
        lastArrowShown = wantArrow;
        turnSet = false; // a new arrow jumps to its angle
      }
      if (wantArrow) {
        const delta = ((((state.angle - lastAngle) % 360) + 540) % 360) - 180;
        turn = turnSet ? turn + delta : state.angle;
        lastAngle = state.angle;
        turnSet = true;
        arrow.style.transform = `rotate(${turn}deg)`;
      }
    },
    hide() {
      if (pill && !pill.hidden) pill.hidden = true;
      turnSet = false;
    },
    destroy() {
      pill?.remove();
      pill = null;
    },
  };
}
