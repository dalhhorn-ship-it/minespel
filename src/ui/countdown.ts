// HUD countdown view: "Leerpauze over 5:00", 30-second warning pulse, and "Nu oefenen" override button (T41, AC21, AC25).

import '../styles/countdown.css';
import { isWarning, playTimerLabel } from '../core/timers';
import { el } from './dom';
import { onTap } from './tap';

export interface CountdownViewOptions {
  initialMs?: number;
  warningEnabled?: boolean;
  /** Optional callback to override the countdown and immediately start exercises/classes to earn coins. */
  onStartNow?: () => void;
  now?: () => number;
}

export interface CountdownView {
  readonly root: HTMLElement;
  update(remainingMs: number): void;
  setWarningEnabled(enabled: boolean): void;
  setOnStartNow(handler: (() => void) | null): void;
  getText(): string;
  isWarningActive(): boolean;
  destroy(): void;
}

export function createCountdownView(options: CountdownViewOptions = {}): CountdownView {
  let warningEnabled = options.warningEnabled ?? true;
  let lastMs = options.initialMs ?? 5 * 60_000;
  let startNowHandler: (() => void) | null = options.onStartNow ?? null;

  const iconEl = el('span', {
    class: 'countdown-pill-icon',
    text: '\u{23F3}',
    attrs: { 'aria-hidden': 'true' },
  });
  const textEl = el('span', {
    class: 'countdown-pill-text',
    text: playTimerLabel(lastMs),
  });
  const startNowBtn = el('button', {
    class: 'countdown-now-btn',
    text: 'Nu oefenen \u{1FA99}',
    attrs: {
      type: 'button',
      'aria-label': 'Nu oefenen voor munten',
      'data-testid': 'countdown-start-now',
    },
  });
  startNowBtn.hidden = !startNowHandler;

  const offTap = onTap(
    startNowBtn,
    () => {
      startNowHandler?.();
    },
    { now: options.now },
  );

  const root = el(
    'div',
    {
      class: 'countdown-pill',
      attrs: {
        'data-testid': 'hud-countdown',
        'aria-live': 'off',
      },
    },
    [iconEl, textEl, startNowBtn],
  );

  function render() {
    textEl.textContent = playTimerLabel(lastMs);
    const warn = warningEnabled && isWarning(lastMs);
    root.classList.toggle('countdown-warning', warn);
    startNowBtn.hidden = !startNowHandler;
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
    setOnStartNow(handler) {
      startNowHandler = handler;
      render();
    },
    getText: () => textEl.textContent ?? '',
    isWarningActive: () => root.classList.contains('countdown-warning'),
    destroy() {
      offTap();
    },
  };
}
