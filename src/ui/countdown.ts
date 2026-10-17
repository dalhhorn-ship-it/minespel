// HUD countdown view: "Leerpauze over 5:00" and the 30 second warning pulse (T41, AC21, AC25).

import '../styles/countdown.css';
import { isWarning, playTimerLabel } from '../core/timers';
import { el } from './dom';

export interface CountdownViewOptions {
  initialMs?: number;
  warningEnabled?: boolean;
}

export interface CountdownView {
  readonly root: HTMLElement;
  update(remainingMs: number): void;
  setWarningEnabled(enabled: boolean): void;
  getText(): string;
  isWarningActive(): boolean;
}

export function createCountdownView(options: CountdownViewOptions = {}): CountdownView {
  let warningEnabled = options.warningEnabled ?? true;
  let lastMs = options.initialMs ?? 5 * 60_000;

  const iconEl = el('span', {
    class: 'countdown-pill-icon',
    text: '\u{23F3}',
    attrs: { 'aria-hidden': 'true' },
  });
  const textEl = el('span', {
    class: 'countdown-pill-text',
    text: playTimerLabel(lastMs),
  });
  const root = el(
    'div',
    {
      class: 'countdown-pill',
      attrs: {
        'data-testid': 'hud-countdown',
        'aria-live': 'off',
      },
    },
    [iconEl, textEl],
  );

  function render() {
    textEl.textContent = playTimerLabel(lastMs);
    const warn = warningEnabled && isWarning(lastMs);
    root.classList.toggle('countdown-warning', warn);
  }

  render();

  return {
    root,
    update(remainingMs) {
      lastMs = Math.max(0, remainingMs);
      render();
    },
    setWarningEnabled(enabled) {
      warningEnabled = enabled;
      render();
    },
    getText: () => textEl.textContent ?? '',
    isWarningActive: () => root.classList.contains('countdown-warning'),
  };
}
