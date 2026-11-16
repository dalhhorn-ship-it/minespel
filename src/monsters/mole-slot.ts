// The mole slot (v16, moved here in v22, decision 144). It holds the moles of the world as a list of at most 4, the
// rumble before the first one, the wake rule and the warnings. `monster-system.ts` keeps the bubble and Klodder and
// calls the slot; the slot never knows about them except through the `bubbleOut` gate.
// V22a moved today's code in with a list of at most 1 and no new rule. V22c (this file) fills what the mole does after
// he is up: he stays (mole.ts), the pen check every 2 s and at once on a block change near it (mole-reach.ts), the sleep
// pose with Zzz and the "Gevangen!" sign, the tap cards, away and back, the next mole rule and the save (mole-save.ts).
// V22d is the knights' side (`sendAway` comes from the Moed bar there).
import type { Aim } from '../world/build';
import type { DinoState, Point } from '../dinos/dino-ai';
import type { ActorLabels } from '../ui/actor-labels';
import { pickActor } from '../game/actor-hit';
import type { Rng } from '../core/rng';
import type { SoundName } from '../audio/sound';
import type { SavedMole } from '../storage/schema';
import type { SpeechKind } from '../ui/speech';
import type { ActorView } from '../render/renderer';
import type { World } from '../world/world';
import { awayFromGuards, createMole, createRumble, moleBox, stepMole } from './mole';
import { LINE_HELP, LINE_RUMBLE } from './mole-lines';
import { freeMoleChasers, moleMoedFraction, stepMoleMoed } from './mole-moed';
import { checkReach, nearReach, type ReachBox } from './mole-reach';
import { DEFAULT_AWAY_MS, sameMoles, toSavedMole } from './mole-save';
import { createMoleWarnings, type MoleWarnings } from './mole-warnings';
import { announceMole, finishRumble, findMoleSpawn, isMoleTarget } from './mole-wake';
import {
  BUBBLE_TAP_REACH, LEAVE_MS, MOLE_BOX, RUMBLE_MS,
  type MoleListEntry, type MoleState, type MoleStateView, type MonsterContext,
} from './monster-types';
import { addTarget, type TargetList } from './targets';

/** The list holds at most 3 caught and 1 free or away (AC297, AC298). */
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

/** Most caught moles in the world (AC297). */
export const MAX_CAUGHT = 3;
/** The pen check runs this often, and at once on a block change near the pen (AC296). */
export const PEN_EVERY_MS = 2000;
/** The three "no new mole" lines show at most once per this many loop ms (AC297). */
export const LINE_GAP_MS = 10_000;
/** The help toast on a tap on a free mole shows at most once per this many loop ms (AC298). */
export const TAP_HELP_GAP_MS = 5000;
/** A mole that cannot come back (no spot fits) tries again after this many loop ms (AC330). */
export const BACK_RETRY_MS = 5000;
/** The free mole's spot and an away mole's time are saved about this often while they change (AC299, AC335). */
export const SAVE_EVERY_MS = 1000;
/** An away time within this of the saved one is not written again. */
const AWAY_SAVE_STEP_MS = 2500;
/** Tries at a come back spot that is not on the Lavakip-bar and, with every animal guarded, away from the guards. */
const BACK_TRIES = 12;

// The lines of the slot (V22c). Plain Dutch, silly and never a threat; the mole's own lines of the walk are in mole.ts.
export const LINE_CAUGHT = 'Goed gedaan! De Monstermol is gevangen.';
export const LINE_FREED = 'Hihi, ik ben vrij!';
export const LINE_ALREADY = 'Er loopt al een Monstermol rond.';
export const LINE_FULL = 'Er slapen al 3 Monstermollen. Meer passen er niet.';
export const LINE_SLEEPS_ON = 'De Monstermol slaapt nog even door.';
export const LINE_BACK = 'Hihi! De Monstermol is terug.';
export const LABEL_ZZZ = 'Zzz';
export const LABEL_SIGN = 'Gevangen!';

/** A loaded mole has long been up: no rise pose. */
const RISE_DONE_MS = 5000;

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
  /** Saves the moles (V22c): called when the list changes. The monster system writes it as `moles` of the monsters record. */
  save?(moles: SavedMole[]): void;
  /** The screen point of a world point for the labels, or null when it is hidden for now (the monster system gives `labelPoint`). */
  project?(p: { x: number; y: number; z: number }): { x: number; y: number } | null;
}

export interface MoleSlot {
  /** Loads the saved moles at boot (AC299, AC335): caught ones at their spots, the free one, an away one with his time left. */
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
  /** True when a finger landing with this aim is a tap on a mole: it goes to the look owner in either half. */
  wantsTap(aim: Aim): boolean;
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
  /**
   * The app goes away (a teardown): forget the moles in memory and save NOTHING, so the saved list stays as it was.
   * Only the parent switch, a new world (`reset`) and Alles wissen end a saved mole.
   */
  dispose(): void;
}

export function createMoleSlot(options: MoleSlotOptions): MoleSlot {
  const moles: MoleState[] = [];
  let moleOn = false;
  let nextId = 1;
  const began: MoleStateView['began'] = { rumble: null, out: null, leaving: null };
  const warnings: MoleWarnings = createMoleWarnings({
    say: (text, ms, kind) => options.say?.(text, ms, kind),
    showCard: () => options.showMoleCard?.(),
  });
  /** The feet level where each mole dove under (his y sinks while he leaves). */
  const groundY = new WeakMap<MoleState, number>();
  /** Loop ms since each mole's last pen check. */
  const penClock = new WeakMap<MoleState, number>();
  /** Moles loaded from the save that have not been stepped yet: a switch that is off at boot drops them with no sinking. */
  const loaded = new WeakSet<MoleState>();
  let labels: ActorLabels | undefined;
  let lastLineAt = -Infinity;
  let lastTapHelpAt = -Infinity;
  let lastSaved: SavedMole[] = [];
  let saveDue = false;
  let saveClock = 0;

  const say = (text: string, ms = 3000): void => options.say?.(text, ms, 'mole');
  const zzzKey = (m: MoleState): string => `mole-${m.id}-zzz`;
  const signKey = (m: MoleState): string => `mole-${m.id}-sign`;
  const hideLabels = (m: MoleState): void => {
    labels?.hide(zzzKey(m));
    labels?.hide(signKey(m));
  };

  const drop = (m: MoleState): void => {
    const i = moles.indexOf(m);
    if (i >= 0) moles.splice(i, 1);
    hideLabels(m);
    saveDue = true;
    if (moles.length === 0) began.rumble = began.out = began.leaving = null;
  };
  const dropAll = (): void => {
    for (const m of moles) hideLabels(m);
    moles.length = 0;
    began.rumble = began.out = began.leaving = null;
  };
  const inWorld = (m: MoleState): boolean => m.phase === 'out' || m.phase === 'leaving';
  /** The free mole: anything not caught (a rumble, out, sinking or away counts, AC297). */
  const hasFree = (): boolean => moles.some((m) => !m.caught);
  const caughtCount = (): number => moles.reduce((n, m) => n + (m.caught ? 1 : 0), 0);

  // ---- the save (AC299, AC335) ----
  function savedList(): SavedMole[] {
    const out: SavedMole[] = [];
    if (!moleOn) return out;
    for (const m of moles) {
      const row = toSavedMole(m, groundY.get(m) ?? m.y);
      if (row) out.push(row);
    }
    return out;
  }
  function flushSave(force: boolean): void {
    if (!options.save) return;
    if (!force && !saveDue && saveClock < SAVE_EVERY_MS) return;
    saveClock = 0;
    saveDue = false;
    const list = savedList();
    if (sameMoles(list, lastSaved, AWAY_SAVE_STEP_MS)) return;
    lastSaved = list;
    options.save(list);
  }

  /** A line of the next mole rule: one gap of 10 s for the three of them (AC297). */
  function gapLine(text: string): void {
    const now = options.loopMs();
    if (now - lastLineAt < LINE_GAP_MS) return;
    lastLineAt = now;
    say(text, 3500);
  }

  const scratch: ReachBox = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  /** True when a mole put at this spot would be inside a pen of the ground itself (a nook he must not be put in). */
  const enclosed = (p: Point): boolean => checkReach(options.world, { x: Math.floor(p.x), y: Math.round(p.y), z: Math.floor(p.z) }, scratch);

  /** The kid dug below the stripes: the next mole rule (AC245, AC297). */
  function wake(x: number, y: number, z: number, gate: { bubbleOut: boolean }): void {
    if (hasFree()) return gapLine(LINE_ALREADY);
    if (caughtCount() >= MAX_CAUGHT) return gapLine(LINE_FULL);
    if (gate.bubbleOut) return gapLine(LINE_SLEEPS_ON);
    const m = createRumble({ x, z }, y);
    m.id = nextId++;
    moles.push(m);
    began.rumble = options.loopMs();
    began.out = began.leaving = null;
    options.say?.(LINE_RUMBLE, 2500, 'mole');
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
    let spot = finishRumble(ctx, m.digColumn);
    // Not in a nook of the ground that would catch him at once: ask for another spot a few times.
    for (let i = 0; spot && i < BACK_TRIES && enclosed(spot); i++) spot = findMoleSpawn(ctx.world, ctx.kid, m.digColumn, ctx.animals?.() ?? [], ctx.rng) ?? spot;
    if (!spot) {
      drop(m);
      return;
    }
    const mole = createMole(spot, m.digColumn);
    mole.id = m.id;
    moles[moles.indexOf(m)] = mole;
    began.out = options.loopMs();
    saveDue = true;
    announceMole(mole, ctx);
  }

  function beginLeaving(m: MoleState): void {
    if (m.dove) groundY.set(m, m.y);
    m.phase = 'leaving';
    m.phaseMs = 0;
    m.pokers = 0;
    m.path = null;
    m.pose = 'sink';
    hideLabels(m);
    began.leaving = options.loopMs();
    options.play?.('plop');
    saveDue = true;
  }

  /**
   * The come back of an away mole (AC330): a soft rumble, a ground spot by the rules of AC246 within 16 of the unguarded
   * animal nearest to where he dove (with every animal guarded: of the nearest one, away from the guards when it can be;
   * with none: 4 to 6 from where he dove), the two lines. When no spot fits he stays away and asks again in 5 s.
   */
  function comeBack(m: MoleState, ctx: MonsterContext): void {
    const dove = m.dove ?? { x: m.x, z: m.z };
    const targets = (ctx.animals?.() ?? []).filter(isMoleTarget);
    const unguarded = targets.filter((a) => ctx.isGuarded?.(a) !== true);
    const pool = unguarded.length > 0 ? unguarded : targets;
    let near: DinoState | null = null;
    let best = Infinity;
    for (const a of pool) {
      const d = Math.hypot(a.x - dove.x, a.z - dove.z);
      if (d < best) {
        best = d;
        near = a;
      }
    }
    const dig = { x: Math.floor(dove.x), z: Math.floor(dove.z) };
    const pick = (strict: boolean): Point | null => {
      for (let i = 0; i < BACK_TRIES; i++) {
        const s = findMoleSpawn(ctx.world, ctx.kid, dig, near ? [near] : [], ctx.rng);
        if (!s) return null;
        if (ctx.keepOut?.(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z))) continue;
        if (strict && !awayFromGuards(ctx, s.x, s.z)) continue;
        if (enclosed(s)) continue;
        return s;
      }
      return null;
    };
    const everyGuarded = targets.length > 0 && unguarded.length === 0;
    const spot = (everyGuarded ? pick(true) : null) ?? pick(false);
    if (!spot) {
      m.awayMs = BACK_RETRY_MS;
      return;
    }
    const mole = createMole(spot, dig);
    mole.id = m.id;
    moles[moles.indexOf(m)] = mole;
    began.out = options.loopMs();
    saveDue = true;
    options.play?.('rommel');
    say(LINE_BACK, 3000);
    say(LINE_HELP, 4000);
  }

  function becomeCaught(m: MoleState, ctx: MonsterContext): void {
    m.caught = true;
    m.path = null;
    m.target = null;
    m.pokers = 0;
    m.moed = 0;
    m.pose = 'sleep';
    freeMoleChasers(ctx);
    say(LINE_CAUGHT, 3500);
    options.play?.('chime');
    ctx.labels?.show(zzzKey(m), LABEL_ZZZ, 'zzz');
    ctx.labels?.show(signKey(m), LABEL_SIGN, 'sign');
    saveDue = true;
  }

  function becomeFree(m: MoleState): void {
    m.caught = false;
    m.pose = 'walk';
    m.searchMs = 0;
    m.noPathMs = 0;
    hideLabels(m);
    say(LINE_FREED, 3000);
    saveDue = true;
  }

  /** The pen check: every 2 s, and at once when a block changed near the pen (AC296). */
  function penCheck(m: MoleState, ctx: MonsterContext, ms: number): void {
    const clock = (penClock.get(m) ?? PEN_EVERY_MS) + ms;
    if (clock < PEN_EVERY_MS && !m.dirty) {
      penClock.set(m, clock);
      return;
    }
    penClock.set(m, 0);
    m.dirty = false;
    const box: ReachBox = m.reach ?? (m.reach = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
    const caught = checkReach(options.world, { x: Math.floor(m.x), y: Math.round(m.y), z: Math.floor(m.z) }, box);
    if (caught && !m.caught) becomeCaught(m, ctx);
    else if (!caught && m.caught) becomeFree(m);
  }

  function stepMoleAt(m: MoleState, ctx: MonsterContext, gate: { bubbleOut: boolean }): void {
    const ms = ctx.dt * 1000;
    loaded.delete(m);
    if (m.phase === 'rumble') {
      m.phaseMs += ms;
      if (m.phaseMs >= RUMBLE_MS) wakeMole(m, ctx, gate);
      return;
    }
    if (m.phase === 'out') {
      m.phaseMs += ms;
      m.outMs += ms;
      // A full Moed bar (V22d) sets `dove` and `awayMs`: he sinks and goes away, never removed.
      if (stepMoleMoed(m, ctx)) {
        beginLeaving(m);
        return;
      }
      if (m.caught) m.pose = 'sleep';
      else stepMole(m, ctx);
      penCheck(m, ctx, ms);
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
          m.y = groundY.get(m) ?? m.y + MOLE_BOX.height;
          saveDue = true;
        } else drop(m);
      }
      return;
    }
    if (m.phase === 'away') {
      m.awayMs -= ms;
      if (m.awayMs <= 0) comeBack(m, ctx);
    }
  }

  const slot: MoleSlot = {
    load(saved) {
      dropAll();
      nextId = 1;
      for (const s of saved.slice(0, MAX_MOLES)) {
        const m = createMole({ x: s.x, y: s.y, z: s.z }, { x: Math.floor(s.x), z: Math.floor(s.z) });
        m.id = nextId++;
        m.phaseMs = RISE_DONE_MS;
        if (s.state === 'away') {
          m.phase = 'away';
          m.dove = { x: s.x, z: s.z };
          m.awayMs = typeof s.awayMs === 'number' && Number.isFinite(s.awayMs) ? s.awayMs : DEFAULT_AWAY_MS;
          m.pose = undefined;
          groundY.set(m, s.y);
        } else if (s.state === 'caught') {
          m.caught = true;
          m.pose = 'sleep';
          // The first pen check comes after a full gap, so a world that is still loading cannot free him.
          penClock.set(m, 0);
        } else m.pose = 'walk';
        if (m.phase === 'out') began.out = options.loopMs();
        loaded.add(m);
        moles.push(m);
      }
      lastSaved = saved.slice(0, MAX_MOLES).map((r) => ({ ...r }));
      saveDue = false;
    },
    applySwitch(on) {
      moleOn = on;
      if (on) return;
      for (const m of [...moles]) {
        if (m.phase === 'rumble' || m.phase === 'away' || m.dove || m.caught || loaded.has(m)) drop(m);
        else if (m.phase === 'out') beginLeaving(m);
      }
      warnings.reset();
      flushSave(true);
    },
    onMined(x, y, z, block, gate) {
      if (!moleOn) return;
      warnings.onMined(y, block);
      if (y >= WAKE_MIN_Y && y <= WAKE_MAX_Y) wake(x, y, z, gate);
    },
    onBlockChanged(x, z) {
      for (const m of moles) if (m.phase === 'out' && m.reach && nearReach(m.reach, x, z)) m.dirty = true;
    },
    onPlayElapsed(ms) {
      if (moleOn) warnings.onPlayElapsed(ms);
    },
    step(ctx, gate) {
      labels = ctx.labels;
      for (const m of [...moles]) stepMoleAt(m, ctx, gate);
      if (labels && options.project) {
        for (const m of moles) {
          if (!m.caught || m.phase !== 'out') continue;
          // A mole loaded from the save has no labels yet.
          if (!labels.has(zzzKey(m))) labels.show(zzzKey(m), LABEL_ZZZ, 'zzz');
          if (!labels.has(signKey(m))) labels.show(signKey(m), LABEL_SIGN, 'sign');
          labels.place(zzzKey(m), options.project({ x: m.x, y: m.y + MOLE_BOX.height + 0.45, z: m.z }));
          labels.place(signKey(m), options.project({ x: m.x, y: m.y + MOLE_BOX.height + 1.0, z: m.z }));
        }
      }
      saveClock += ctx.dt * 1000;
      flushSave(false);
    },
    isRumbling: () => moles.some((m) => m.phase === 'rumble'),
    hasOut: () => moles.some((m) => m.phase === 'out'),
    pushViews(out) {
      for (const m of moles) {
        if (inWorld(m)) out.push({ id: `mole-${m.id}`, model: 'mole', x: m.x, y: m.y, z: m.z, heading: m.heading, pose: m.pose });
      }
    },
    moedTarget() {
      const m = moles.find((x) => x.phase === 'out' && !x.caught && x.pokers > 0);
      return m ? { x: m.x, y: m.y, z: m.z, fraction: moleMoedFraction(m) } : null;
    },
    wantsTap(aim) {
      const boxes = moles.filter((m) => m.phase === 'out').map((m) => ({ id: String(m.id), box: moleBox(m) }));
      return boxes.length > 0 && pickActor(aim, boxes, BUBBLE_TAP_REACH, options.world) !== null;
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
      if (m === undefined || m.phase !== 'out') return false;
      if (m.caught) {
        options.showMoleTapCard?.({ id: m.id, caught: true });
        return true;
      }
      const now = options.loopMs();
      if (now - lastTapHelpAt >= TAP_HELP_GAP_MS) {
        lastTapHelpAt = now;
        say(LINE_HELP, 4000);
      }
      return true;
    },
    isOccupied(box) {
      return moles.some((m) => inWorld(m) && overlap(box, moleBox(m)));
    },
    collectTargets(list) {
      for (const m of moles) if (m.phase === 'out') addTarget(list, `mole-${m.id}`, m.caught ? 'mole-caught' : 'mole', m.x, m.y, m.z);
    },
    sendAway(mole, ms) {
      if (mole.phase !== 'out' || mole.caught) return;
      const wait = ms !== undefined && Number.isFinite(ms) && ms >= 0
        ? ms
        : awayTime(options.rng());
      mole.dove = { x: mole.x, z: mole.z };
      mole.awayMs = wait;
      mole.pokers = 0;
      freeMoleChasers(options.context(0));
      beginLeaving(mole);
    },
    freeMole: () => moles.find((m) => m.phase === 'out' && !m.caught) ?? null,
    view() {
      const m = moles.find((x) => !x.caught) ?? moles[0];
      const list: MoleListEntry[] = [];
      for (const x of moles) {
        if (x.phase === 'rumble') continue;
        const away = x.phase === 'away' || x.dove !== null;
        list.push({
          id: x.id, x: x.x, y: away ? groundY.get(x) ?? x.y : x.y, z: x.z,
          state: x.caught ? 'caught' : away ? 'away' : 'free',
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
      flushSave(true);
    },
    dispose() {
      dropAll();
      nextId = 1;
      warnings.reset();
    },
  };
  return slot;
}
