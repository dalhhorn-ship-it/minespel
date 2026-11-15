// The knight flow: what the kid sees and hears when a knight does something. V17a is a stub seam:
// the two speech lines work, the menu does nothing yet. V17d opens the knight menu here.
import { say } from '../ui/speech';
import type { KnightEvent, KnightState } from '../knights/knight-types';

export const LINE_ARRIVED = 'Ridder tot je dienst!';
export const LINE_SALUTE = 'Hallo!';

export interface KnightFlow {
  /** A knight arrived (just bought) or saluted. */
  onEvent(event: KnightEvent, knight: KnightState): void;
  /** The kid tapped a knight. V17d opens the menu; the stub does nothing. */
  openMenu(knight: KnightState): void;
}

export interface KnightFlowDeps {
  say?: (text: string) => void;
}

export function createKnightFlow(deps: KnightFlowDeps = {}): KnightFlow {
  const speak = deps.say ?? ((text: string) => say(text));
  return {
    onEvent(event) {
      speak(event === 'arrived' ? LINE_ARRIVED : LINE_SALUTE);
    },
    openMenu() {},
  };
}
