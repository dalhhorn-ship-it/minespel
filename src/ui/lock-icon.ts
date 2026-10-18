// Parental controls entry: a small grey lock, shown only on the world HUD (decision 53, PRD 4.12).
// Registers with PointerRouter.addIgnoreZone when mounted in the 3D world HUD so a touch never moves the camera.

import '../styles/parent.css';
import type { PointerRouter } from '../input/pointer-router';
import { el } from './dom';
import { onTap } from './tap';

export interface LockIconOptions {
  onOpenParent: () => void;
  router?: PointerRouter;
  now?: () => number;
}

export interface LockIcon {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createLockIcon(options: LockIconOptions): LockIcon {
  const cleanups: Array<() => void> = [];

  const btn = el(
    'button',
    {
      class: 'lock-icon-btn',
      attrs: {
        type: 'button',
        'aria-label': 'Ouders',
        'data-testid': 'parent-controls-btn',
      },
    },
    [el('span', { text: '\u{1F512}', attrs: { 'aria-hidden': 'true' } })],
  );

  cleanups.push(onTap(btn, options.onOpenParent, { now: options.now }));
  if (options.router) {
    cleanups.push(options.router.addIgnoreZone(btn));
  }

  return {
    element: btn,
    destroy() {
      for (const c of cleanups) c();
      btn.remove();
    },
  };
}
