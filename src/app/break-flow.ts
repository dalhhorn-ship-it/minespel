// Break flow STUB (T41). The real break (questions, rotation, logs) comes with T43.
// The stub only opens a screen the kid cannot close, so the timer driver can be built and tested now.
import '../styles/countdown.css';
import type { Screens } from './screens';
import { el } from '../ui/dom';

export interface BreakFlowOptions {
  screens: Screens;
  /** Stops the world while the break is open. */
  pauseWorld: () => void;
  /** Starts the world again after the break. */
  resumeWorld: () => void;
  /** Gives the kid a full play timer again. */
  restartTimer: () => void;
}

export interface BreakFlow {
  /** Opens the break. Safe to call twice. */
  start(): void;
  isActive(): boolean;
  /** Ends the break: closes the screen, restarts the world and gives a full timer. */
  end(): void;
}

export function createBreakFlow(options: BreakFlowOptions): BreakFlow {
  let close: (() => void) | null = null;
  return {
    start() {
      if (close) return;
      options.pauseWorld();
      const node = el('div', { class: 'break-stub', attrs: { 'data-screen-id': 'break', role: 'dialog' } }, [
        el('div', { text: 'Leerpauze' }),
      ]);
      close = options.screens.open('learn', node);
    },
    isActive: () => close !== null,
    end() {
      if (!close) return;
      close();
      close = null;
      options.restartTimer();
      options.resumeWorld();
    },
  };
}
