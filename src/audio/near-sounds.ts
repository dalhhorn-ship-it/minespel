// The near sounds (v24, decision 144): every 100 ms of loop time it fills the target list (monsters plus the bar),
// takes the closeness of each, gives the 2 closest sources the 2 voices of `sound.nearVoices()` and plays each kind on
// its own beat. It is silent in every pause state, before the first tap, with Geluidseffecten uit and with Volume 0.
// It is a creature with no tap (priority 30). V22a holds the shell and the hook `nearSounds`; V24b fills the mixer.
import { registerHook } from '../dev/e2e-hooks';
import type { CreatureSystem } from '../game/game';
import { targetAngle, type LookPose } from '../monsters/target-angle';
import { clearTargets, createTargetList, type Target, type TargetKind, type TargetList } from '../monsters/targets';
import { BAR_TUNE, closeness, gainOf, NEAR_KINDS, panOf, pickVoices } from './near-mix';
import type { NearVoice, Sound } from './sound';

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

const KIND_LIST = Object.keys(NEAR_KINDS) as TargetKind[];

export function createNearSounds(deps: NearSoundsDeps): NearSounds {
  const view: NearSoundsView = { running: true, sources: [] };
  const list = createTargetList();
  const pool: NearSourceView[] = [];
  for (let i = 0; i < list.items.length; i++) pool.push({ id: '', kind: 'bubble', distance: 0, closeness: 0, gain: 0, pan: 0, playing: false });
  const levels: number[] = pool.map(() => 0);
  const heldIdx: [number, number] = [-1, -1];
  const picked: [number, number] = [-1, -1];
  /** The source id each voice holds. */
  const heldId: [string | null, string | null] = [null, null];
  /** Loop ms of the next beat of each kind (0: due at once, when a voice takes it). */
  const nextAt: Record<string, number> = {};
  let tuneAt = 0;
  let clock = 0;
  let acc = NEAR_EVERY_MS;
  for (const k of KIND_LIST) nextAt[k] = 0;

  function freshBeats(): void {
    for (const k of KIND_LIST) nextAt[k] = 0;
    tuneAt = 0;
  }

  function playBeat(voice: NearVoice, kind: TargetKind): void {
    if (kind === 'bar') {
      if (tuneAt === 0) tuneAt = clock + BAR_TUNE.everyMs;
      if (clock >= tuneAt) {
        tuneAt = clock + BAR_TUNE.everyMs;
        nextAt.bar = clock + NEAR_KINDS.bar.everyMs;
        voice.play(BAR_TUNE.name);
        return;
      }
    }
    voice.play(NEAR_KINDS[kind].name);
    nextAt[kind] = clock + NEAR_KINDS[kind].everyMs;
  }

  function kindOnVoice(kind: TargetKind): boolean {
    for (let h = 0; h < 2; h++) {
      const i = picked[h] as number;
      if (i >= 0 && (pool[i] as NearSourceView).kind === kind) return true;
    }
    return false;
  }

  function mix(): void {
    const voices = deps.sound.nearVoices();
    const volume = deps.sound.getVolume();
    const audible = voices !== null && deps.sound.isEnabled() && volume > 0;
    clearTargets(list);
    deps.collectMonsters(list);
    deps.collectBar(list);
    const pose = deps.pose();
    view.sources.length = 0;
    for (let i = 0; i < list.count; i++) {
      const t = list.items[i] as Target;
      const v = pool[i] as NearSourceView;
      const dx = t.x - pose.x;
      const dy = t.y - pose.y;
      const dz = t.z - pose.z;
      v.id = t.id;
      v.kind = t.kind;
      v.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      v.closeness = closeness(t.kind, v.distance);
      v.pan = panOf(targetAngle(pose, t));
      v.gain = 0;
      v.playing = false;
      levels[i] = audible ? v.closeness : 0;
      view.sources.push(v);
    }
    if (!voices || !audible) {
      if (voices) for (const vo of voices) vo.silence();
      heldId[0] = null;
      heldId[1] = null;
      freshBeats();
      return;
    }
    for (let h = 0; h < 2; h++) {
      heldIdx[h] = -1;
      const id = heldId[h] as string | null;
      if (id !== null) for (let i = 0; i < list.count; i++) if ((pool[i] as NearSourceView).id === id) heldIdx[h] = i;
    }
    pickVoices(levels, list.count, heldIdx, picked);
    for (let h = 0; h < 2; h++) {
      const voice = voices[h] as NearVoice;
      const i = picked[h] as number;
      if (i < 0) {
        if (heldId[h] !== null) voice.silence();
        heldId[h] = null;
        continue;
      }
      const src = pool[i] as NearSourceView;
      const isNew = heldId[h] !== src.id;
      heldId[h] = src.id;
      src.playing = true;
      src.gain = gainOf(NEAR_KINDS[src.kind].name, src.closeness, volume);
      voice.set(src.closeness, src.pan);
      if (isNew || clock >= (nextAt[src.kind] as number)) playBeat(voice, src.kind);
    }
    // A kind with no voice starts its beat again the moment it gets one.
    for (const k of KIND_LIST) if (!kindOnVoice(k)) nextAt[k] = 0;
    if (!kindOnVoice('bar')) tuneAt = 0;
  }

  const nearSounds: NearSounds = {
    step(dt) {
      if (!view.running || !(dt > 0) || !Number.isFinite(dt)) return;
      clock += dt * 1000;
      acc += dt * 1000;
      if (acc < NEAR_EVERY_MS) return;
      acc = acc % NEAR_EVERY_MS;
      mix();
    },
    setRunning(on) {
      view.running = on;
      if (!on) nearSounds.silence();
      else acc = NEAR_EVERY_MS;
    },
    silence() {
      const voices = deps.sound.nearVoices();
      if (voices) for (const v of voices) v.silence();
      view.sources.length = 0;
      heldId[0] = null;
      heldId[1] = null;
      freshBeats();
    },
    view: () => view,
  };

  if (__E2E__) registerHook('nearSounds', () => ({ running: view.running, sources: view.sources.map((s) => ({ ...s })) }));
  return nearSounds;
}
