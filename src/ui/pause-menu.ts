// Pause menu (T44): points total and the entries. It is a 'kid-overlay' screen, so the play timer
// stops while it is open (AC23). "Ik zit vast" sends the player home, the world stays as it is (AC106).
import '../styles/pause-menu.css';
import type { Screens } from '../app/screens';
import { el } from './dom';
import { onTap } from './tap';

export interface PauseMenuOptions {
  screens: Screens;
  /** Current points. Read again every time the menu opens. */
  getPoints: () => Promise<number>;
  /** Stops the world while the menu is open. */
  pauseWorld: () => void;
  /** Starts the world again when the menu is closed. */
  resumeWorld: () => void;
  /** Puts the player at the start spot. */
  teleportHome: () => void;
  openShop: () => void;
  openLesboek: () => void;
  openPractice: () => void;
}

export interface PauseMenu {
  /** Opens the menu. Does nothing when it is open or another screen (a break) is open. */
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

/** Formats the points line, for example "Je hebt 12 punten". */
export function pointsText(points: number): string {
  const n = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  return `Je hebt ${n} ${n === 1 ? 'punt' : 'punten'}`;
}

export function createPauseMenu(options: PauseMenuOptions): PauseMenu {
  let closeScreen: (() => void) | null = null;
  let cleanups: Array<() => void> = [];
  let unsubscribe: (() => void) | null = null;
  let readId = 0;

  /** Reads the points and shows them. A late answer never overwrites a newer one. */
  function refreshPoints(line: HTMLElement) {
    const id = ++readId;
    void options.getPoints().then(
      (p) => { if (id === readId) line.textContent = pointsText(p); },
      () => { /* keep what is shown */ },
    );
  }

  function stopWatching() {
    unsubscribe?.();
    unsubscribe = null;
    readId++; // answers still on their way are dropped
  }

  function close() {
    if (!closeScreen) return;
    const c = closeScreen;
    closeScreen = null;
    stopWatching();
    for (const f of cleanups) f();
    cleanups = [];
    c();
    options.resumeWorld();
  }

  function open() {
    if (closeScreen || options.screens.depth() > 0) return;
    options.pauseWorld();
    const points = el('p', { class: 'pause-points', text: pointsText(0), attrs: { 'data-pause': 'points' } });
    const button = (text: string, id: string, handler: () => void, main = false) => {
      const b = el('button', { class: main ? 'pause-btn pause-btn-main' : 'pause-btn', text, attrs: { type: 'button', 'data-pause': id } });
      cleanups.push(onTap(b, handler));
      return b;
    };
    const panel = el('div', { class: 'pause-panel' }, [
      el('h2', { class: 'pause-title', text: 'Pauze' }),
      points,
      button('Terug naar de wereld', 'back', close, true),
      button('Ik zit vast', 'stuck', () => {
        options.teleportHome();
        close();
      }),
      button('Dinowinkel', 'shop', () => options.openShop()),
      button('Lesboek', 'lesboek', () => options.openLesboek()),
      button('Extra oefenen', 'practice', () => options.openPractice()),
    ]);
    const node = el('div', { class: 'pause-menu', attrs: { role: 'dialog', 'aria-label': 'Pauze', 'data-screen-id': 'pause' } }, [panel]);
    closeScreen = options.screens.open('kid-overlay', node);
    refreshPoints(points);
    // A screen (shop, practice) opened on top may change the points. Read again when the menu is on top again.
    let sawChild = false;
    unsubscribe = options.screens.subscribe(() => {
      if (!closeScreen) return;
      if (options.screens.depth() > 1) sawChild = true;
      else if (sawChild) {
        sawChild = false;
        refreshPoints(points);
      }
    });
  }

  return {
    open,
    close,
    isOpen: () => closeScreen !== null,
    destroy() {
      if (!closeScreen) return;
      const c = closeScreen;
      closeScreen = null;
      stopWatching();
      for (const f of cleanups) f();
      cleanups = [];
      c();
    },
  };
}

export interface PauseSetupOptions extends PauseMenuOptions {
  hud: { setPauseHandler(handler: () => void): void };
}

/** Creates the menu and makes the Pauze button open it. main.ts calls this once. */
export function setupPauseMenu(options: PauseSetupOptions): PauseMenu {
  const menu = createPauseMenu(options);
  options.hud.setPauseHandler(() => menu.open());
  return menu;
}
