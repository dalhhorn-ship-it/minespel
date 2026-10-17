// The countdown text in the HUD slot: "Leerpauze over 4:12". In the last 30 seconds it grows and pulses (AC25).
import '../styles/countdown.css';
import { isWarning, playTimerLabel } from '../core/timers';

export interface CountdownView {
  /** Shows the time. `warn` false means the warning setting is off: no growing and no pulse. */
  update(ms: number, warn: boolean): void;
  destroy(): void;
}

export function createCountdownView(slot: HTMLElement): CountdownView {
  const text = slot.ownerDocument.createElement('div');
  text.className = 'countdown';
  slot.append(text);
  let lastLabel = '';
  let lastWarn = false;
  return {
    update(ms, warn) {
      const label = playTimerLabel(ms);
      if (label !== lastLabel) {
        text.textContent = label;
        lastLabel = label;
      }
      const w = warn && isWarning(ms);
      if (w !== lastWarn) {
        text.classList.toggle('countdown-warning', w);
        lastWarn = w;
      }
    },
    destroy() {
      text.remove();
    },
  };
}
