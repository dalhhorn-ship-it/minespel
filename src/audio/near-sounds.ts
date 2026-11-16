// The near sounds (v24, decision 144): every 100 ms of loop time it fills the target list (monsters plus the bar),
// takes the closeness of each, gives the 2 closest sources the 2 voices of `sound.nearVoices()` and plays each kind on
// its own beat. It is silent in every pause state, before the first tap, with Geluidseffecten uit and with Volume 0.
// It is a creature with no tap (priority 30). V22a holds the shell and the hook `nearSounds`; V24b fills the mixer.
import { registerHook } from '../dev/e2e-hooks';
import type { CreatureSystem } from '../game/game';
import type { LookPose } from '../monsters/target-angle';
import type { TargetKind, TargetList } from '../monsters/targets';
import type { Sound } from './sound';

/** Loop ms between two mixes. */
export const NEAR_EVERY_MS = 100;

/** One source as `nearSounds()` shows it to tests. */
export interface NearSourceView {
  id: string;
  kind: TargetKind;
  /** Straight distance in blocks from the feet. */
  distance: number;
  /** 0 to 1 (`closeness`). */
  closeness: number;
  /** The gain the voice has now: the recipe peak times closeness times Volume (0 with sound off or Volume 0). */
  gain: number;
  /** -0.5 to 0.5, half the sine of the arrow angle. */
  pan: number;
  /** A voice holds this source now. */
  playing: boolean;
}

export interface NearSoundsView {
  /** False in every pause state. */
  running: boolean;
  sources: NearSourceView[];
}

export interface NearSoundsDeps {
  sound: Pick<Sound, 'nearVoices' | 'isEnabled' | 'getVolume'>;
  /** Fills the list with the bubble, Klodder and the moles. */
  collectMonsters(list: TargetList): void;
  /** Adds the bar. */
  collectBar(list: TargetList): void;
  pose(): LookPose & { y: number };
}

export interface NearSounds extends CreatureSystem {
  /** False: both voices are silenced at once. */
  setRunning(on: boolean): void;
  /** Silences both voices (a pause, the switch, a source gone). */
  silence(): void;
  view(): NearSoundsView;
}

export function createNearSounds(deps: NearSoundsDeps): NearSounds {
  const view: NearSoundsView = { running: true, sources: [] };
  const nearSounds: NearSounds = {
    step() {
      // V24b: every NEAR_EVERY_MS, collect, mix, set the voices and play the beats.
    },
    setRunning(on) {
      view.running = on;
      if (!on) nearSounds.silence();
    },
    silence() {
      const voices = deps.sound.nearVoices();
      if (voices) for (const v of voices) v.silence();
      view.sources.length = 0;
    },
    view: () => view,
  };

  if (__E2E__) registerHook('nearSounds', () => ({ running: view.running, sources: view.sources.map((s) => ({ ...s })) }));
  return nearSounds;
}
