// Pause menu (T44, AC23, AC106, AC144): points total, Terug naar de wereld,
// Ik zit vast (calls game.teleportHome()), Dinowinkel, Lesboek, Extra oefenen, and Ouders.

import '../styles/pause-menu.css';
import { el } from './dom';
import { onTap } from './tap';

export interface PauseMenuOptions {
  /** null while the points are still being read: a placeholder shows (AC163). */
  points: number | null;
  onResume: () => void;
  onTeleportHome: () => void;
  onShop: () => void;
  onLesboek: () => void;
  onPractice: () => void;
  onParent?: () => void;
  now?: () => number;
}

export interface PauseMenu {
  readonly element: HTMLElement;
  setPoints(points: number | null): void;
  destroy(): void;
}

function pointsLabel(points: number | null): string {
  if (points === null) return '\u{2026} punten';
  return `${points} ${points === 1 ? 'punt' : 'punten'}`;
}

export function createPauseMenu(options: PauseMenuOptions): PauseMenu {
  const cleanups: Array<() => void> = [];

  const pointsBadge = el('div', {
    class: 'pause-points',
    text: `\u{2B50} ${pointsLabel(options.points)}`,
    attrs: { 'data-testid': 'pause-points' },
  });

  const header = el('div', { class: 'pause-header' }, [
    el('h2', { class: 'pause-title', text: 'Pauze' }),
    pointsBadge,
  ]);

  const makeBtn = (label: string, extraClass: string, handler: () => void) => {
    const b = el('button', {
      class: `pause-btn ${extraClass}`.trim(),
      text: label,
      attrs: { type: 'button' },
    });
    cleanups.push(onTap(b, handler, { now: options.now }));
    return b;
  };

  const resumeBtn = makeBtn('Terug naar de wereld', 'pause-btn-primary', options.onResume);
  const stuckBtn = makeBtn('Ik zit vast', '', options.onTeleportHome);
  const shopBtn = makeBtn('Dinowinkel', '', options.onShop);
  const lesboekBtn = makeBtn('Lesboek', '', options.onLesboek);
  const practiceBtn = makeBtn('Extra oefenen', '', options.onPractice);

  const buttons: HTMLElement[] = [resumeBtn, stuckBtn, shopBtn, lesboekBtn, practiceBtn];
  if (options.onParent) {
    buttons.push(makeBtn('Ouders', 'pause-btn-parent', options.onParent));
  }

  const actions = el('div', { class: 'pause-actions' }, buttons);
  const card = el('div', { class: 'pause-card scrollable', attrs: { role: 'dialog', 'aria-label': 'Pauze' } }, [
    header,
    actions,
    el('p', { class: 'pause-version', text: `Versie ${__APP_VERSION__}`, attrs: { 'data-testid': 'pause-version' } }),
  ]);
  const root = el('div', { class: 'pause-backdrop' }, [card]);

  return {
    element: root,
    setPoints(points) {
      pointsBadge.textContent = `\u{2B50} ${pointsLabel(points)}`;
    },
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
