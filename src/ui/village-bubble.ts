// The speech bubble of a villager (v11 Dorp, AC181, AC182): one DOM button on the world screen.
// "Hoi! Wil je een vraag?" opens the question card. With no seen item it is a plain "Hoi!" that cannot be tapped.
// Text is set with textContent only. The bubble is an ignore zone, so a tap on it never looks or taps the world,
// and it takes no pointer capture, so a finger on the move stick keeps walking.
import '../styles/village.css';
import type { PointerRouter } from '../input/pointer-router';
import { el } from './dom';
import { HUD_TAP_MOVE_LIMIT, onTap } from './tap';

export const ASK_TEXT = 'Hoi! Wil je een vraag?';
export const HELLO_TEXT = 'Hoi!';

export interface VillageBubbleOptions {
  router?: Pick<PointerRouter, 'addIgnoreZone'>;
  /** The kid tapped a bubble that has a question. */
  onTap: () => void;
  now?: () => number;
  doc?: Document;
}

export interface VillageBubbleState {
  visible: boolean;
  text: string;
  /** Id of the villager who owns the bubble, or null when hidden. */
  villager: string | null;
  /** True when a tap opens a question. */
  canAsk: boolean;
}

export interface VillageBubble {
  readonly element: HTMLElement;
  /** Shows the bubble for a villager. `canAsk` false is the plain "Hoi!". */
  show(villagerId: string, canAsk: boolean): void;
  hide(): void;
  state(): VillageBubbleState;
  destroy(): void;
}

export function createVillageBubble(options: VillageBubbleOptions): VillageBubble {
  const element = el(
    'button',
    { class: 'village-bubble', attrs: { type: 'button', 'data-testid': 'village-bubble' } },
    [],
    options.doc,
  );
  element.hidden = true;
  let villager: string | null = null;
  let canAsk = false;

  const removeZone = options.router?.addIgnoreZone(element);
  const offTap = onTap(
    element,
    () => {
      if (element.hidden || !canAsk) return;
      options.onTap();
    },
    { now: options.now, moveLimit: HUD_TAP_MOVE_LIMIT },
  );

  return {
    element,
    show(villagerId, ask) {
      villager = villagerId;
      canAsk = ask;
      element.textContent = ask ? ASK_TEXT : HELLO_TEXT;
      element.classList.toggle('village-bubble-quiet', !ask);
      element.setAttribute('aria-disabled', ask ? 'false' : 'true');
      element.hidden = false;
    },
    hide() {
      villager = null;
      canAsk = false;
      element.hidden = true;
    },
    state: () => ({
      visible: !element.hidden,
      text: element.hidden ? '' : (element.textContent ?? ''),
      villager,
      canAsk,
    }),
    destroy() {
      offTap();
      removeZone?.();
      element.remove();
    },
  };
}
