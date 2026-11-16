// The knight menu when the kid taps a knight (AC203): Volg mij, Blijf hier, Pas op de dieren, Jaag monsters weg (v22), and a way back.
import '../styles/knight-menu.css';
import type { KnightMode } from '../knights/knight-types';
import type { LavakipMenuOption } from '../lavakip/lavakip-types';
import { el } from './dom';
import { onTap } from './tap';

export const MODE_LABELS: Record<KnightMode, string> = {
  follow: 'Volg mij',
  stay: 'Blijf hier',
  guard: 'Pas op de dieren',
  chase: 'Jaag monsters weg',
};

const MODE_STATUS: Record<KnightMode, string> = {
  follow: 'Ik loop met je mee!',
  stay: 'Ik blijf hier staan.',
  guard: 'Ik hou de wacht bij deze plek.',
  chase: 'Ik jaag monsters weg!',
};

export interface KnightMenuOptions {
  mode: KnightMode;
  onModeChange: (mode: KnightMode) => void;
  onClose: () => void;
  /** The Uitrusten button (v19): shown only when this is given. */
  onGear?: () => void;
  /** "Lavakip geven" (v23, V23c draws the button): null or missing means no entry. */
  lavakip?: LavakipMenuOption | null;
  /** The guard report line, asked again whenever the mode is guard. */
  report?: () => string;
  now?: () => number;
}

export interface KnightMenu {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createKnightMenu(options: KnightMenuOptions): KnightMenu {
  const cleanups: Array<() => void> = [];
  let mode = options.mode;
  const host = el('div', { class: 'knight-menu-host' });

  function render() {
    while (cleanups.length > 0) cleanups.pop()?.();
    host.replaceChildren();
    const status = el('p', {
      class: 'knight-menu-status',
      text: mode === 'guard' && options.report ? options.report() : MODE_STATUS[mode],
    });
    const buttons = (['follow', 'stay', 'guard', 'chase'] as const).map((m) => {
      const btn = el('button', {
        class: 'knight-menu-btn',
        text: MODE_LABELS[m],
        attrs: { type: 'button', 'aria-pressed': String(mode === m), 'data-mode': m },
      });
      cleanups.push(
        onTap(
          btn,
          () => {
            mode = m;
            options.onModeChange(m);
            render();
          },
          { now: options.now },
        ),
      );
      return btn;
    });
    const gearBtn = options.onGear
      ? el('button', {
          class: 'knight-menu-btn knight-menu-btn-gear',
          text: 'Uitrusten',
          attrs: { type: 'button', 'data-action': 'gear' },
        })
      : null;
    if (gearBtn) cleanups.push(onTap(gearBtn, () => options.onGear?.(), { now: options.now }));
    const closeBtn = el('button', {
      class: 'knight-menu-btn knight-menu-btn-close',
      text: 'Sluiten',
      attrs: { type: 'button', 'data-action': 'close' },
    });
    cleanups.push(onTap(closeBtn, () => options.onClose(), { now: options.now }));
    const card = el(
      'div',
      { class: 'knight-menu-card', attrs: { role: 'dialog', 'aria-label': 'Ridder menu' } },
      [
        el('h2', { class: 'knight-menu-title', text: 'Ridder' }),
        status,
        el('div', { class: 'knight-menu-grid' }, gearBtn ? [...buttons, gearBtn] : buttons),
        closeBtn,
      ],
    );
    host.append(el('div', { class: 'knight-menu-backdrop' }, [card]));
  }

  render();
  return {
    element: host,
    destroy() {
      while (cleanups.length > 0) cleanups.pop()?.();
      host.remove();
    },
  };
}
