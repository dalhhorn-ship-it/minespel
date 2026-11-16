// The mole slot (v16, moved here in v22, decision 144). It holds the moles of the world as a list of at most 4, the
// rumble before the first one, the wake rule and the warnings. `monster-system.ts` keeps the bubble and Klodder and
// calls the slot; the slot never knows about them except through the `bubbleOut` gate.
// V22a moved today's code in with a list of at most 1 and no new rule. V22c fills the stays, the pen, away and back
// and the save; V22d the knights' side (`sendAway` comes from the Moed bar there).
import type { Aim } from '../world/build';
import type { DinoState, Point } from '../dinos/dino-ai';
import { pickActor } from '../game/actor-hit';
import type { Rng } from '../core/rng';
import type { SoundName } from '../audio/sound';
import type { SavedMole } from '../storage/schema';
import type { SpeechKind } from '../ui/speech';
import type { ActorView } from '../render/renderer';
import type { World } from '../world/world';
import { createMole, createRumble, moleBox, stepMole } from './mole';
import { LINE_RUMBLE } from './mole-lines';
import { freeMoleChasers, moleMoedFraction, stepMoleMoed } from './mole-moed';
import { createMoleWarnings, type MoleWarnings } from './mole-warnings';
import { announceMole, finishRumble } from './mole-wake';
import {
  BUBBLE_TAP_REACH, LEAVE_MS, RUMBLE_MS,
  type MoleListEntry, type MoleState, type MoleStateView, type MonsterContext,
} from './monster-types';
import { addTarget, type TargetList } from './targets';

/** The list holds at most 3 caught and 1 free or away (AC298). V22a lets one mole be out at a time, as in 0.12.0. */
export const MAX_MOLES = 4;
/** The y levels that wake the mole: 1 to 4, under the stripes at 5. */
export const WAKE_MIN_Y = 1;
export const WAKE_MAX_Y = 4;
/** An away mole sent off by a test or the bar without a time stays away this long, in loop ms (AC330 gives 60 to 90 s). */
export const AWAY_MIN_MS = 60_000;
export const AWAY_MAX_MS = 90_000;

/** A seeded away time, 60 000 to 90 000 loop ms (AC330). The Moed bar (V22d) and `sendAway` both use it. */
export function awayTime(rng: Rng): number {
  return AWAY_MIN_MS + Math.floor(rng.next() * (AWAY_MAX_MS - AWAY_MIN_MS + 1));
}

const EPS = 1e-3;
function overlap(a: readonly number[], b: readonly number[]): boolean {
  return (a[0] as number) < (b[3] as number) - EPS && (a[3] as number) > (b[0] as number) + EPS &&
    (a[1] as number) < (b[4] as number) - EPS && (a[4] as number) > (b[1] as number) + EPS &&
    (a[2] as number) < (b[5] as number) - EPS && (a[5] as number) > (b[2] as number) + EPS;
}

export interface MoleSlotOptions {
  world: World;
  /** The seeded rng of the monster system (a getter: `setSeed` replaces it). */
  rng(): Rng;
  /** The context of one step, built by the monster system. */
  context(dt: number): MonsterContext;
  /** Loop ms since the monster system was built. */
  loopMs(): number;
  /** The kid's feet. */
  kid(): Point;
  /** The live dinos and chickens. */
  animals(): readonly DinoState[];
  say?(text: string, ms?: number, kind?: SpeechKind): void;
  play?(name: SoundName): void;
  shake?(ms: number): void;
  /** The Waarschuwsteen card. */
  showMoleCard?(): void;
  /** The tap card of V22c ("Zzz... de Monstermol slaapt in zijn hok."). V22a never calls it. */
  showMoleTapCard?(mole: { id: number; caught: boolean }): void;
}

export interface MoleSlot {
  /** Loads the saved moles at boot. V22c fills it; V22a keeps nothing (0.12.0 saved no moles). */
  load(saved: readonly SavedMole[]): void;
  /** The Monstermol switch. Off: a rumble ends, a mole sinks, the warnings forget their gap. */
  applySwitch(on: boolean): void;
  /** The kid mined a block (warnings, the rumble, the wake rule). `gate.bubbleOut`: a bubble or Klodder is out. */
  onMined(x: number, y: number, z: number, block: number, gate: { bubbleOut: boolean }): void;
  /** A column changed (a tap, a build, a tool). V22c rechecks the pens near it. */
  onBlockChanged(x: number, z: number): void;
  /** Play time just counted, in ms (the toast gap of the warnings). */
  onPlayElapsed(ms: number): void;
  /** One step of loop time. `ctx.dt` is in seconds. */
  step(ctx: MonsterContext, gate: { bubbleOut: boolean }): void;
  /** True while the rumble runs: no bubble shows then (AC297). */
  isRumbling(): boolean;
  /** True while at least one mole is in the world (out or sinking). */
  hasOut(): boolean;
  /** Adds the views of the moles that are in the world. */
  pushViews(out: ActorView[]): void;
  /** Where the Moed bar goes: over the first mole a knight pokes (feet point and fraction), or null. */
  moedTarget(): { x: number; y: number; z: number; fraction: number } | null;
  /** A tap with this aim. True when it hit a mole (he does nothing and nothing behind him is mined). */
  handleTap(aim: Aim): boolean;
  /** A tap on mole number `index` of the list (also the e2e hook `tapMole`). True when that mole is in the world. */
  tapMole(index: number): boolean;
  isOccupied(box: readonly number[]): boolean;
  /** Adds the moles the pill and the near sounds point at (kind `mole`; V22c adds `mole-caught`). */
  collectTargets(list: TargetList): void;
  /**
   * Sends a mole away: he sinks and leaves the world for `ms` loop ms (default `awayTime`). The slot turns any mole
   * that sinks with `dove` set into an away mole, so a Moed bar that sets `mole.dove` and `mole.awayMs` and returns
   * true from `stepMoleMoed` (V22d) does the same without calling this.
   */
  sendAway(mole: MoleState, ms?: number): void;
  /** The free mole in the world, or null. */
  freeMole(): MoleState | null;
  view(): MoleStateView;
  /** Wereld opnieuw beginnen, switch off, dispose: no mole, no rumble. */
  reset(): void;
}

export function createMoleSlot(options: MoleSlotOptions): MoleSlot {
  const moles: MoleState[] = [];
  let moleOn = false;
  let nextId = 1;
  const began: MoleStateView['began'] = { rumble: null, out: null, leaving: null };
  const warnings: MoleWarnings = createMoleWarnings({
    say: (text, ms) => options.say?.(text, ms),
    showCard: () => options.showMoleCard?.(),
  });

  const drop = (m: MoleState): void => {
    const i = moles.indexOf(m);
    if (i >= 0) moles.splice(i, 1);
    if (moles.length === 0) began.rumble = began.out = began.leaving = null;
  };
  const dropAll = (): void => {
    moles.length = 0;
    began.rumble = began.out = began.leaving = null;
  };
  const inWorld = (m: MoleState): boolean => m.phase === 'out' || m.phase === 'leaving';

  /** The kid dug below the stripes: a rumble when nothing else is out (AC245). */
  function startRumble(x: number, y: number, z: number): void {
    if (moles.length > 0) return;
    const m = createRumble({ x, z }, y);
    m.id = nextId++;
    moles.push(m);
    began.rumble = options.loopMs();
    began.out = began.leaving = null;
    options.say?.(LINE_RUMBLE, 3000);
    options.play?.('rommel');
    options.shake?.(800);
  }

  /** The rumble is over: pick a spot or give up (AC245, AC246). */
  function wakeMole(m: MoleState, ctx: MonsterContext, gate: { bubbleOut: boolean }): void {
    if (gate.bubbleOut) {
      // A bubble or Klodder came meanwhile: no mole.
      drop(m);
      return;
    }
    const spot = finishRumble(ctx, m.digColumn);
    if (!spot) {
      drop(m);
      return;
    }
    const mole = createMole(spot, m.digColumn);
    mole.id = m.id;
    moles[moles.indexOf(m)] = mole;
    began.out = options.loopMs();
    announceMole(mole, ctx);
  }

  function beginLeaving(m: MoleState): void {
    m.phase = 'leaving';
    m.phaseMs = 0;
    m.pokers = 0;
    m.path = null;
    m.pose = 'sink';
    began.leaving = options.loopMs();
    options.play?.('plop');
  }

  /** The come back of an away mole. V22c fills it (a soft rumble, a spot near the unguarded animal, the lines); V22a lets him go for good. */
  function comeBack(m: MoleState): void {
    drop(m);
  }

  function stepMoleAt(m: MoleState, ctx: MonsterContext, gate: { bubbleOut: boolean }): void {
    const ms = ctx.dt * 1000;
    if (m.phase === 'rumble') {
      m.phaseMs += ms;
      if (m.phaseMs >= RUMBLE_MS) wakeMole(m, ctx, gate);
      return;
    }
    if (m.phase === 'out') {
      m.phaseMs += ms;
      m.outMs += ms;
      if (stepMoleMoed(m, ctx)) beginLeaving(m);
      else {
        stepMole(m, ctx);
        if ((m.phase as string) === 'leaving') beginLeaving(m);
      }
      return;
    }
    if (m.phase === 'leaving') {
      m.phaseMs += ms;
      stepMole(m, ctx);
      if (m.phaseMs >= LEAVE_MS) {
        if (m.dove) {
          m.phase = 'away';
          m.phaseMs = 0;
          m.pose = undefined;
        } else drop(m);
      }
      return;
    }
    if (m.phase === 'away') {
      m.awayMs -= ms;
      if (m.awayMs <= 0) comeBack(m);
    }
  }

  const slot: MoleSlot = {
    load() {
      // V22c: build the saved moles. Nothing was saved before 0.13.0.
    },
    applySwitch(on) {
      moleOn = on;
      if (on) return;
      for (const m of [...moles]) {
        if (m.phase === 'rumble' || m.phase === 'away') drop(m);
        else if (m.phase === 'out') beginLeaving(m);
      }
      warnings.reset();
    },
    onMined(x, y, z, block, gate) {
      if (!moleOn) return;
      warnings.onMined(y, block);
      if (y >= WAKE_MIN_Y && y <= WAKE_MAX_Y && !gate.bubbleOut) startRumble(x, y, z);
    },
    onBlockChanged() {
      // V22c: a column inside a pen's reach plus 1 marks the mole dirty.
    },
    onPlayElapsed(ms) {
      if (moleOn) warnings.onPlayElapsed(ms);
    },
    step(ctx, gate) {
      for (const m of [...moles]) stepMoleAt(m, ctx, gate);
    },
    isRumbling: () => moles.some((m) => m.phase === 'rumble'),
    hasOut: () => moles.some((m) => m.phase === 'out'),
    pushViews(out) {
      for (const m of moles) {
        if (inWorld(m)) out.push({ id: `mole-${m.id}`, model: 'mole', x: m.x, y: m.y, z: m.z, heading: m.heading, pose: m.pose });
      }
    },
    moedTarget() {
      const m = moles.find((x) => x.phase === 'out' && x.pokers > 0);
      return m ? { x: m.x, y: m.y, z: m.z, fraction: moleMoedFraction(m) } : null;
    },
    handleTap(aim) {
      const boxes = moles.filter((m) => m.phase === 'out').map((m) => ({ id: String(m.id), box: moleBox(m) }));
      if (boxes.length === 0) return false;
      const id = pickActor(aim, boxes, BUBBLE_TAP_REACH, options.world);
      if (!id) return false;
      const index = moles.findIndex((m) => String(m.id) === id);
      slot.tapMole(index);
      return true;
    },
    tapMole(index) {
      const m = moles[index];
      // V22c: a caught mole shows the Zzz card, a free one says the help line at most once per 5 s.
      return m !== undefined && m.phase === 'out';
    },
    isOccupied(box) {
      return moles.some((m) => inWorld(m) && overlap(box, moleBox(m)));
    },
    collectTargets(list) {
      for (const m of moles) if (m.phase === 'out') addTarget(list, `mole-${m.id}`, 'mole', m.x, m.y, m.z);
    },
    sendAway(mole, ms) {
      if (mole.phase !== 'out') return;
      const wait = ms !== undefined && Number.isFinite(ms) && ms >= 0
        ? ms
        : awayTime(options.rng());
      mole.dove = { x: mole.x, z: mole.z };
      mole.awayMs = wait;
      mole.pokers = 0;
      freeMoleChasers(options.context(0));
      beginLeaving(mole);
    },
    freeMole: () => moles.find((m) => m.phase === 'out') ?? null,
    view() {
      const m = moles.find((x) => x.phase !== 'rumble') ?? moles[0];
      const list: MoleListEntry[] = [];
      for (const x of moles) {
        if (x.phase === 'rumble') continue;
        list.push({
          id: x.id, x: x.x, y: x.y, z: x.z,
          state: x.caught ? 'caught' : x.phase === 'away' || x.dove ? 'away' : 'free',
          awayMsLeft: x.phase === 'away' ? Math.max(0, x.awayMs) : 0,
        });
      }
      return {
        phase: m?.phase ?? 'none',
        x: m?.x ?? 0, y: m?.y ?? 0, z: m?.z ?? 0, heading: m?.heading ?? 0,
        target: m?.target ?? null, noPathMs: m?.noPathMs ?? 0, outMs: m?.outMs ?? 0,
        moed: m?.moed ?? 0, pokers: m?.pokers ?? 0,
        loopMs: options.loopMs(), began: { ...began }, moles: list,
      };
    },
    reset() {
      dropAll();
      nextId = 1;
      warnings.reset();
    },
  };
  return slot;
}
