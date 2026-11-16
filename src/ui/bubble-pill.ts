// The lilac bubble pill (v22, decision 144, AC303): a round pill with the bubble picture under the learning break pill.
// V22a holds the view contract and a view that draws nothing, so the slot stays empty; V22e builds the nodes once and
// turns the arrow with one `transform` write.
import type { BubbleHudState } from '../monsters/bubble-hud';

export interface BubblePillView {
  /** Shows the state, or hides the pill when `state.shown` is false. Called only when something changed. */
  update(state: Readonly<BubbleHudState>): void;
  /** Hides the pill (every pause state). */
  hide(): void;
  destroy(): void;
}

/** The view for the HUD slot (`hud.bubbleSlot`). Draws nothing until V22e. */
export function createBubblePill(slot: HTMLElement): BubblePillView {
  void slot;
  return {
    update() {
      // V22e: build the nodes on the first shown state, then change text and arrow only.
    },
    hide() {
      // V22e.
    },
    destroy() {
      // V22e: remove the nodes.
    },
  };
}
