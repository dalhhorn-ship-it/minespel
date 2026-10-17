// Extra oefenen flow stub for M2 (T44; full implementation in M3 T46).

import { el } from '../ui/dom';
import { onTap } from '../ui/tap';
import type { ScreenManager } from './screens';

export interface PracticeFlowOptions {
  screens: ScreenManager;
  onStartBreakRound?: () => Promise<void>;
  now?: () => number;
}

export interface PracticeFlow {
  open(): void;
  destroy(): void;
}

export function createPracticeFlow(options: PracticeFlowOptions): PracticeFlow {
  let cleanup: (() => void) | null = null;

  function clear() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  }

  return {
    open() {
      clear();
      if (options.onStartBreakRound) {
        void options.onStartBreakRound();
        return;
      }
      const closeBtn = el('button', {
        class: 'pause-btn pause-btn-primary',
        text: 'Terug naar de wereld',
        attrs: { type: 'button' },
      });
      const off = onTap(closeBtn, () => {
        clear();
        options.screens.showWorld();
      }, { now: options.now });
      cleanup = off;

      const card = el('div', { class: 'pause-card', attrs: { 'aria-label': 'Extra oefenen' } }, [
        el('h2', { class: 'pause-title', text: 'Extra oefenen' }),
        el('p', { text: 'Kies een onderwerp om extra punten te verdienen.' }),
        closeBtn,
      ]);
      const backdrop = el('div', { class: 'pause-backdrop' }, [card]);
      options.screens.showKidOverlay(backdrop);
    },
    destroy() {
      clear();
    },
  };
}
