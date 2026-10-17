// Portrait and too small window overlays. Reports the state to the timer driver (AC11, AC108).
import { el } from '../ui/dom';

export const MIN_WIDTH = 900; // points

export interface GuardState {
  portrait: boolean;
  tooSmall: boolean;
}

/**
 * Portrait wins: in portrait only "Draai je iPad" shows. Too small means landscape but under 900 points wide.
 * `angle` is the device orientation (window.orientation) when the browser has it. A narrow Split View window
 * on a landscape iPad can be taller than wide, so a device that says landscape (90 or -90) is never portrait.
 */
export function computeGuardState(width: number, height: number, angle?: number | null): GuardState {
  const deviceLandscape = typeof angle === 'number' && Math.abs(angle) === 90;
  const portrait = height > width && !deviceLandscape;
  return { portrait, tooSmall: !portrait && width < MIN_WIDTH };
}

function deviceAngle(win: Window): number | null {
  const a = (win as Window & { orientation?: unknown }).orientation;
  return typeof a === 'number' ? a : null;
}

export interface ScreenGuard {
  state(): GuardState;
  /** Calls the listener now and on every change. Returns an unsubscribe function. */
  subscribe(listener: (state: GuardState) => void): () => void;
  dispose(): void;
}

export function startScreenGuard(win: Window = window, doc: Document = document, host?: HTMLElement): ScreenGuard {
  const root = host ?? doc.getElementById('overlays') ?? doc.body;

  const portraitOverlay = el('div', { class: 'shell-overlay', attrs: { role: 'alert', 'data-overlay': 'portrait' } }, [
    el('div', { class: 'shell-icon', text: '\u{1F4F1}', attrs: { 'aria-hidden': 'true' } }),
    el('h1', { class: 'shell-title', text: 'Draai je iPad' }),
    el('p', { class: 'shell-text', text: 'Dino Blokwereld speel je met de iPad liggend.' }),
  ]);
  const smallOverlay = el('div', { class: 'shell-overlay', attrs: { role: 'alert', 'data-overlay': 'small' } }, [
    el('div', { class: 'shell-icon', text: '\u{2194}\u{FE0F}', attrs: { 'aria-hidden': 'true' } }),
    el('h1', { class: 'shell-title', text: 'Maak dit venster groter' }),
    el('p', { class: 'shell-text', text: 'Zo past Dino Blokwereld er niet in.' }),
  ]);
  portraitOverlay.hidden = true;
  smallOverlay.hidden = true;
  root.append(portraitOverlay, smallOverlay);

  const listeners = new Set<(s: GuardState) => void>();
  let current = computeGuardState(win.innerWidth, win.innerHeight, deviceAngle(win));

  const render = () => {
    portraitOverlay.hidden = !current.portrait;
    smallOverlay.hidden = !current.tooSmall;
  };
  const update = () => {
    const next = computeGuardState(win.innerWidth, win.innerHeight, deviceAngle(win));
    if (next.portrait === current.portrait && next.tooSmall === current.tooSmall) return;
    current = next;
    render();
    for (const l of [...listeners]) l(current);
  };
  render();

  win.addEventListener('resize', update);
  win.addEventListener('orientationchange', update);

  return {
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    dispose() {
      win.removeEventListener('resize', update);
      win.removeEventListener('orientationchange', update);
      portraitOverlay.remove();
      smallOverlay.remove();
      listeners.clear();
    },
  };
}
