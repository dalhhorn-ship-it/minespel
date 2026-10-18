// Parental controls button ("Ouders" with lock icon, T48b, AC127).
// Registers with PointerRouter.addIgnoreZone when mounted in the 3D world HUD so a touch never moves the camera.

import '../styles/parent.css';
import type { PointerRouter } from '../input/pointer-router';
import { el } from './dom';
import { onTap } from './tap';

export interface LockIconOptions {
  onOpenParent: () => void;
  router?: PointerRouter;
  floating?: boolean;
  now?: () => number;
}

export interface LockIcon {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createLockIcon(options: LockIconOptions): LockIcon {
  const cleanups: Array<() => void> = [];
  const cls = ['lock-icon-btn', options.floating ? 'lock-icon-btn-floating' : '']
    .filter(Boolean)
    .join(' ');

  const btn = el(
    'button',
    {
      class: cls,
      attrs: {
        type: 'button',
        'aria-label': 'Ouders',
        'data-testid': 'parent-controls-btn',
      },
    },
    [
      el('span', { text: '\u{1F512}', attrs: { 'aria-hidden': 'true' } }),
      el('span', { text: 'Ouders' }),
    ],
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
