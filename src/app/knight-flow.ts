// The knight flow: what the kid sees and hears when a knight does something.
// Two speech lines (arrived, salute) and the knight menu (V17d). The menu is a kid overlay, so the world and the
// play timer stop while it is open (AC224). A tap on a guard knight also says the guard report (AC206).
import type { Sound } from '../audio/sound';
import { guardReport, type GuardAnimal } from '../knights/guard-report';
import type { GearEconomy } from '../knights/gear-economy';
import type { KnightEvent, KnightMode, KnightState } from '../knights/knight-types';
import { say } from '../ui/speech';
import { createKnightMenu, type KnightMenu } from '../ui/knight-menu';
import type { ScreenManager } from './screens';

export const LINE_ARRIVED = 'Ridder tot je dienst!';
export const LINE_SALUTE = 'Hallo!';

export interface KnightFlow {
  /** A knight arrived (just bought) or saluted. */
  onEvent(event: KnightEvent, knight: KnightState): void;
  /** The kid tapped a knight: opens the menu. */
  openMenu(knight: KnightState): void;
}

export interface KnightFlowDeps {
  say?: (text: string) => void;
  screens?: Pick<ScreenManager, 'showKidOverlay' | 'showWorld'>;
  /** Changes the mode of a knight (the knight system's `setMode`). */
  setMode?: (id: string, mode: KnightMode) => void;
  /** Dinos and chickens in the world, for the guard report. */
  animals?: () => readonly GuardAnimal[];
  sound?: Pick<Sound, 'play'>;
  /** The gear economy (v19): V19c's Uitrusten screen reads `state()` and calls `wear(knightId, itemId | null, slot)`. */
  gear?: Pick<GearEconomy, 'state' | 'wear'>;
  /** The knights in the order of the knight list, for "Bij Ridder N" (his number is his place plus 1). */
  knightList?: () => readonly { id: string }[];
}

export function createKnightFlow(deps: KnightFlowDeps = {}): KnightFlow {
  const speak = deps.say ?? ((text: string) => say(text));
  let menu: KnightMenu | null = null;

  function closeMenu() {
    menu?.destroy();
    menu = null;
  }

  function report(k: KnightState): string {
    const spot = k.spot ?? { x: k.body.x, y: k.body.y, z: k.body.z };
    return guardReport(spot, deps.animals?.() ?? []);
  }

  return {
    onEvent(event) {
      if (event === 'arrived') deps.sound?.play('ridder');
      speak(event === 'arrived' ? LINE_ARRIVED : LINE_SALUTE);
    },
    openMenu(knight) {
      if (!deps.screens) return;
      const screens = deps.screens;
      closeMenu();
      if (knight.mode === 'guard') speak(report(knight));
      const mine = createKnightMenu({
        mode: knight.mode,
        report: () => report(knight),
        onModeChange: (mode) => {
          deps.setMode?.(knight.id, mode);
          deps.sound?.play('ridder');
        },
        onClose: () => {
          closeMenu();
          screens.showWorld();
        },
      });
      menu = mine;
      screens.showKidOverlay(mine.element);
    },
  };
}
