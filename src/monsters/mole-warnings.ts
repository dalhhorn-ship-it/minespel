// The two warnings before the mole (v16, AC244): a toast at y 6 or 7, at most once per 60 000 ms of play time, and
// the card on every Waarschuwsteen. Only the toast gap counts play time (`onPlayElapsed`); the rule is pure, so it is
// unit tested with fake time. The monster system calls it only with the Monstermol switch on.
import { WAARSCHUWSTEEN } from '../world/blocks';
import { TOAST_GAP_MS } from './monster-types';

export const WARN_TEXT = 'Pas op! Diep onder de grond woont de Monstermol.';
/** The two y levels just above the stripes (the stripes are at y 5). */
export const WARN_Y = [6, 7] as const;

export interface MoleWarnings {
  /** A block at height `y` was mined. */
  onMined(y: number, block: number): void;
  /** Play time just counted, in ms. */
  onPlayElapsed(ms: number): void;
  /** Forgets the gap, so the next toast shows at once (a world reset). */
  reset(): void;
}

export function createMoleWarnings(options: { say: (text: string, ms?: number) => void; showCard: () => void; gapMs?: number }): MoleWarnings {
  const gap = options.gapMs ?? TOAST_GAP_MS;
  /** Play ms since the last toast; starts full so the first one shows. */
  let since = gap;
  return {
    onMined(y, block) {
      if (block === WAARSCHUWSTEEN) options.showCard();
      if ((y === WARN_Y[0] || y === WARN_Y[1]) && since >= gap) {
        since = 0;
        options.say(WARN_TEXT, 4000);
      }
    },
    onPlayElapsed(ms) {
      if (ms > 0) since += ms;
    },
    reset() {
      since = gap;
    },
  };
}
