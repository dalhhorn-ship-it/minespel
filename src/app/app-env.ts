// The one object the app flows share (decision 45, 46). It is made once in main.ts. Storage joins when the
// save has opened, and the break and timer handles join when the play timer starts, so screens that open
// before that still get a safe answer (no storage, not saving, no break running).
import { systemClock, type Clock } from '../core/clock';
import type { Sound } from '../audio/sound';
import type { AudioUnlock } from '../platform/audio-unlock';
import type { DinoStore } from '../dinos/dino-store';
import type { Records } from '../storage/records';
import type { SaveQueue } from '../storage/save-queue';
import type { BreakFlow } from './break-flow';
import type { TimerDriver } from './timer-driver';

/** What the parent area needs from the break flow. */
export type BreakHandle = Pick<BreakFlow, 'start' | 'parentEnd' | 'isActive'>;
/** What the parent area needs from the play timer. */
export type TimerHandle = Pick<TimerDriver, 'applySettings'>;

export interface AppEnv {
  /** Null without working storage. */
  readonly db: IDBDatabase | null;
  readonly records: Records | null;
  readonly queue: SaveQueue | null;
  /** The only Sound of the app. One AudioContext for game, timer and breaks. */
  readonly sound: Sound;
  readonly audio: AudioUnlock;
  readonly clock: Clock;
  /** The game's dino store. */
  readonly dinos: DinoStore;
  /**
   * True only when the boot loaded the saved world and dinos and saving runs. When false (no storage,
   * a broken save or a boot timeout) nothing may write the dino store to disk, or it would replace the kid's dinos.
   */
  readonly saving: boolean;
  readonly breaks: BreakHandle;
  readonly timer: TimerHandle;
}

export interface AppEnvParts {
  sound: Sound;
  audio: AudioUnlock;
  dinos: DinoStore;
  clock?: Clock;
}

export interface AppEnvHost {
  env: AppEnv;
  /** The save opened. Call from the boot. This does not turn saving on. */
  setStorage(storage: { db: IDBDatabase; records: Records; queue: SaveQueue }): void;
  /** The result of `bootSave`. Only `'saving'` turns `env.saving` on, so a timeout leaves it off even if storage opens later. */
  finishBoot(result: 'saving' | 'not-saving'): void;
  bindBreaks(flow: BreakHandle): void;
  bindTimer(timer: TimerHandle): void;
}

export function createAppEnv(parts: AppEnvParts): AppEnvHost {
  let db: IDBDatabase | null = null;
  let records: Records | null = null;
  let queue: SaveQueue | null = null;
  let saving = false;
  let breakFlow: BreakHandle | null = null;
  let timer: TimerHandle | null = null;
  const env: AppEnv = {
    get db() { return db; },
    get records() { return records; },
    get queue() { return queue; },
    get saving() { return saving; },
    sound: parts.sound,
    audio: parts.audio,
    clock: parts.clock ?? systemClock,
    dinos: parts.dinos,
    breaks: {
      start: () => breakFlow?.start(),
      parentEnd: () => breakFlow?.parentEnd(),
      isActive: () => breakFlow?.isActive() ?? false,
    },
    timer: { applySettings: (s) => timer?.applySettings(s) },
  };
  return {
    env,
    setStorage(s) {
      db = s.db;
      records = s.records;
      queue = s.queue;
    },
    finishBoot(result) {
      saving = result === 'saving' && db !== null;
    },
    bindBreaks(flow) { breakFlow = flow; },
    bindTimer(t) { timer = t; },
  };
}
