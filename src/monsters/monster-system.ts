// The monster system (v18, decision 135): the state machine idle, bubble, Klodder. It owns the bubble clock, shows
// and removes the bubble, answers taps, tells the renderer, and hands Klodder to klodder.ts, tease.ts and moed.ts
// (stubs until V18b, V18c and V18d). Nothing here is saved except the clock and the hint flag, through `persist`.
// With the bubble switch off nothing in here does anything. Every live clock runs on the game loop `dt`.
import { registerHook } from '../dev/e2e-hooks';
import { createRng, type Rng } from '../core/rng';
import type { SoundName } from '../audio/sound';
import { pickActor, screenPointOf } from '../game/actor-hit';
import { aimFromScreen } from '../game/build-controller';
import type { CreatureSystem } from '../game/game';
import type { DinoState, Point } from '../dinos/dino-ai';
import type { KnightSystem } from '../knights/knight-system';
import type { ActorView, GameRenderer } from '../render/renderer';
import type { MonstersRecord } from '../storage/schema';
import type { CreatureSwitches } from '../storage/monsters-store';
import type { Box } from '../world/build';
import { CHUNK_SIZE } from '../world/terrain';
import type { World } from '../world/world';
import { bubbleBox, bubbleGrow, createBubble, findBubbleSpot, stepBubble, BUBBLE_BASE_SIZE } from './bubble';
import { createBubbleClock, type BubbleClock } from './bubble-clock';
import { createKlodder, klodderBox, stepKlodder } from './klodder';
import { cellBox } from './nibble';
import { RESTORE_RETRY_MS } from './restore';
import { moedFraction } from './moed';
import { stepMoed } from './moed';
import {
  BUBBLE_TAP_REACH, CLOCK_POINTS, KLODDER_BOX, MONSTER_PRIORITY, type BubbleState, type KlodderState, type MonsterContext,
  type MonsterPhase, type MonsterStateView,
} from './monster-types';
import { stepTease, teaseNow } from './tease';

export { MONSTER_PRIORITY };

export interface MonsterSystemOptions {
  world: World;
  player: { player: Point; yaw: number; pose(): { x: number; y: number; z: number; yaw: number; pitch: number } };
  renderer?: Pick<GameRenderer, 'syncActors' | 'blockChanged'>;
  /** The knight system: the clock rule reads how many knights there are and the points (`setPoints`). */
  knights: Pick<KnightSystem, 'knights' | 'points'>;
  viewport: () => { width: number; height: number };
  /** Play time until the next break (`timerDriver.remainingPlayMs`). */
  remainingPlayMs: () => number;
  /** Saves a change of the `monsters` record (one transaction, see `updateMonsters`). */
  persist?: (change: (record: MonstersRecord) => MonstersRecord) => void;
  /** True when a box touches a dino, egg, chicken, villager or knight. Boot passes the game's own checks. */
  occupied?: (box: Box) => boolean;
  /** The live dinos and chickens (`world.dinoStore.dinos()`): the ones Klodder teases. */
  animals?: () => readonly DinoState[];
  /** Draws the Moed bar over Klodder while a knight pokes him. */
  moedBar?: { update(at: { x: number; y: number } | null, fraction: number): void };
  say?: (text: string, ms?: number) => void;
  sound?: { play(name: SoundName): void };
  rng?: Rng;
}

export interface MonsterSystem extends CreatureSystem {
  /** Loads the saved clock and hint flag at boot. */
  load(record: MonstersRecord): void;
  /** The switches from settings. The bubble switch going off sends a bubble or Klodder away and brings every block back. */
  applySwitches(switches: CreatureSwitches): void;
  /** Play time the timer driver just counted, in ms. Moves the bubble clock when its rules say so. */
  onPlayElapsed(ms: number): void;
  /** A learning break finished (boot wires it next to `resetPlayTimer`). */
  onBreakFinished(): void;
  state(): MonsterStateView;
  bubbleClockMs(): number;
  setBubbleClockMs(ms: number): void;
  /** Hooks and tests: show a bubble now (needs a valid spot and nothing out). */
  spawnBubble(): boolean;
  /** Klodder out now, without the bubble. */
  spawnKlodder(): boolean;
  teaseNow(): boolean;
  /** A cell changed under the overlay (hide or unhide): the renderer redraws it once per chunk per frame. */
  touchCell(x: number, z: number): void;
  setSeed(seed: number): void;
}

const EPS = 1e-3;
function overlap(a: Box, b: Box): boolean {
  return a[0] < b[3] - EPS && a[3] > b[0] + EPS && a[1] < b[4] - EPS && a[4] > b[1] + EPS && a[2] < b[5] - EPS && a[5] > b[2] + EPS;
}

export function createMonsterSystem(options: MonsterSystemOptions): MonsterSystem {
  const { world } = options;
  let rng = options.rng ?? createRng(Date.now() >>> 0);
  let bubbleOn = false;
  let phase: MonsterPhase = 'idle';
  let bubble: BubbleState | null = null;
  let klodder: KlodderState | null = null;
  let hint = false;
  let drawn = 0;
  let strayMs = 0;
  const touched = new Map<string, { x: number; z: number }>();

  const clock: BubbleClock = createBubbleClock({
    save: (ms) => options.persist?.((m) => ({ ...m, bubbleClockMs: ms })),
  });

  const kidPoint = (): Point => {
    const p = options.player.player;
    return { x: p.x, y: p.y, z: p.z };
  };
  const eye = () => {
    const p = options.player.pose();
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw };
  };
  const kidBox = (): Box => {
    const k = kidPoint();
    return [k.x - 0.3, k.y, k.z - 0.3, k.x + 0.3, k.y + 1.8, k.z + 0.3];
  };

  function touchCell(x: number, z: number): void {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const edge = (x % CHUNK_SIZE === 0 ? 1 : 0) | (x % CHUNK_SIZE === CHUNK_SIZE - 1 ? 2 : 0) |
      (z % CHUNK_SIZE === 0 ? 4 : 0) | (z % CHUNK_SIZE === CHUNK_SIZE - 1 ? 8 : 0);
    const key = `${cx},${cz},${edge}`;
    if (!touched.has(key)) touched.set(key, { x, z });
  }
  function flushTouched(): void {
    if (touched.size === 0) return;
    for (const c of touched.values()) options.renderer?.blockChanged(c.x, c.z);
    touched.clear();
  }

  function context(dt: number): MonsterContext {
    return {
      world, rng, dt, kid: kidPoint(), kidBox: kidBox(),
      occupied: (box) => options.occupied?.(box) ?? false,
      knights: () => options.knights.knights(),
      animals: () => options.animals?.() ?? [],
      touch: touchCell,
      say: (text, ms) => options.say?.(text, ms),
      play: (name) => options.sound?.play(name),
      markHintShown: () => {
        if (hint) return;
        hint = true;
        options.persist?.((m) => ({ ...m, hintShown: true }));
      },
      hintShown: () => hint,
    };
  }

  /**
   * Puts hidden cells back by the safe rule: never into a cell the kid, an animal, a villager or a knight stands in
   * (decision 135, AC217). Such a cell stays hidden and comes back when it is free (`step` asks again).
   */
  function restoreFree(): void {
    const kid = kidBox();
    for (const c of world.hiddenCells()) {
      const box = cellBox(c.x, c.y, c.z);
      if (overlap(box, kid) || (options.occupied?.(box) ?? false)) continue;
      world.unhide(c.x, c.y, c.z);
      touchCell(c.x, c.z);
    }
  }

  function groundBelow(p: Point): Point {
    let y = Math.min(Math.floor(p.y), 62);
    while (y > 0 && world.get(Math.floor(p.x), y, Math.floor(p.z)) === 0) y--;
    return { x: p.x, y: y + 1, z: p.z };
  }

  function clear(): void {
    bubble = null;
    klodder = null;
    phase = 'idle';
    restoreFree();
    flushTouched();
    sync();
  }

  function sync(): void {
    const views: ActorView[] = [];
    if (bubble) {
      views.push({ id: 'bubble', model: 'bubble', x: bubble.x, y: bubble.y, z: bubble.z, heading: 0, scale: bubble.scale * bubbleGrow(bubble) });
    }
    if (klodder) {
      views.push({ id: 'klodder', model: 'klodder', x: klodder.x, y: klodder.y, z: klodder.z, heading: klodder.heading, pose: klodder.pose });
    }
    drawMoed();
    if (views.length === 0 && drawn === 0) return;
    drawn = views.length;
    options.renderer?.syncActors?.('monsters', views);
  }

  function drawMoed(): void {
    const bar = options.moedBar;
    if (!bar) return;
    if (!klodder || klodder.pokers <= 0 || klodder.leaving) {
      bar.update(null, 0);
      return;
    }
    const { width, height } = options.viewport();
    const at = screenPointOf(options.player.pose(), width, height, { x: klodder.x, y: klodder.y + KLODDER_BOX.height + 0.4, z: klodder.z });
    bar.update(at, moedFraction(klodder));
  }

  function showBubble(): boolean {
    if (phase !== 'idle') return false;
    const e = eye();
    const spot = findBubbleSpot(world, e);
    if (!spot) return false;
    bubble = createBubble(spot, e, options.viewport().height);
    phase = 'bubble';
    clock.shown();
    options.sound?.play('bubbel');
    sync();
    return true;
  }

  function showKlodder(at: Point): boolean {
    if (phase === 'klodder') return false;
    bubble = null;
    klodder = createKlodder(groundBelow(at));
    phase = 'klodder';
    options.sound?.play('plop');
    sync();
    return true;
  }

  const canRun = (): boolean =>
    bubbleOn && phase === 'idle' && (options.knights.knights().length > 0 || options.knights.points() >= CLOCK_POINTS);

  const system: MonsterSystem = {
    load(record) {
      clock.set(record.bubbleClockMs, false);
      hint = record.hintShown === true;
    },
    applySwitches(sw) {
      const was = bubbleOn;
      bubbleOn = sw.bubble;
      if (was && !bubbleOn && phase !== 'idle') clear();
    },
    onPlayElapsed(ms) {
      if (!(ms > 0)) return;
      if (!clock.advance(ms, { canRun: canRun(), remainingPlayMs: options.remainingPlayMs() })) return;
      if (!showBubble()) clock.noSpot();
    },
    onBreakFinished() {
      clock.breakFinished();
    },
    state() {
      return {
        phase,
        bubble: bubble
          ? { x: bubble.x, y: bubble.y, z: bubble.z, stage: bubble.stage, ageMs: bubble.ageMs, scale: bubble.scale, spot: { ...bubble.spot } }
          : null,
        klodder: klodder
          ? {
            x: klodder.x, y: klodder.y, z: klodder.z, ageMs: klodder.ageMs, nibbled: klodder.nibbled,
            moed: klodder.moed, pokers: klodder.pokers, tired: klodder.tired,
          }
          : null,
        hiddenCount: world.hiddenCount(),
        bubbleClockMs: clock.ms(),
        hintShown: hint,
      };
    },
    bubbleClockMs: () => clock.ms(),
    setBubbleClockMs: (ms) => clock.set(ms),
    spawnBubble: showBubble,
    spawnKlodder() {
      if (phase !== 'idle') return false;
      const k = kidPoint();
      const a = options.player.yaw;
      return showKlodder({ x: k.x + Math.sin(a) * 4, y: k.y + 1, z: k.z + Math.cos(a) * 4 });
    },
    teaseNow: () => phase === 'klodder' && teaseNow(context(0)),
    touchCell,
    setSeed(seed) {
      rng = createRng(seed);
    },
    step(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      if (bubble) {
        if (stepBubble(bubble, dt * 1000, eye(), options.viewport().height) === 'gone') {
          bubble = null;
          phase = 'idle';
        }
      } else if (klodder) {
        const ctx = context(dt);
        stepTease(ctx, dt);
        if (stepMoed(klodder, ctx)) klodder.leaving = true;
        if (stepKlodder(klodder, ctx) === 'left') {
          klodder = null;
          phase = 'idle';
          restoreFree();
        }
      }
      if (!klodder && world.hiddenCount() > 0) {
        // Blocks left over after a switch went off or a cell was blocked: ask again every 500 ms (AC217).
        strayMs += dt * 1000;
        if (strayMs >= RESTORE_RETRY_MS) {
          strayMs = 0;
          restoreFree();
        }
      }
      flushTouched();
      sync();
    },
    handleTap(x, y) {
      if (phase === 'idle') return false;
      const { width, height } = options.viewport();
      const aim = aimFromScreen(options.player.pose(), width, height, x, y);
      if (bubble && bubble.stage !== 'out') {
        const id = pickActor(aim, [{ id: 'bubble', box: bubbleBox(bubble) }], BUBBLE_TAP_REACH);
        if (id) return showKlodder({ x: bubble.x, y: bubble.spot.y, z: bubble.z });
      } else if (klodder) {
        // A tap on Klodder does nothing, and never mines or builds behind him.
        const id = pickActor(aim, [{ id: 'klodder', box: klodderBox(klodder) }], BUBBLE_TAP_REACH, world);
        if (id) return true;
      }
      return false;
    },
    isOccupied(box) {
      return klodder !== null && overlap(box, klodderBox(klodder));
    },
    onWorldReset() {
      // `world.reset()` already cleared the overlay; the bubble clock stays as it is (it was set to 0 when shown).
      bubble = null;
      klodder = null;
      phase = 'idle';
      flushTouched();
      sync();
    },
    dispose() {
      clear();
    },
  };

  if (__E2E__) {
    registerHook('monsterState', () => system.state());
    registerHook('bubbleClockMs', () => system.bubbleClockMs());
    registerHook('setBubbleClockMs', (ms: number) => system.setBubbleClockMs(ms));
    registerHook('spawnBubble', () => system.spawnBubble());
    registerHook('spawnKlodder', () => system.spawnKlodder());
    registerHook('teaseNow', () => system.teaseNow());
    registerHook('bubbleScreenPoint', () => {
      if (!bubble) return null;
      const { width, height } = options.viewport();
      return screenPointOf(options.player.pose(), width, height, { x: bubble.x, y: bubble.y, z: bubble.z });
    });
    registerHook('bubbleScreenWidth', () => {
      if (!bubble) return null;
      const { width, height } = options.viewport();
      const pose = options.player.pose();
      const h = (bubble.scale * BUBBLE_BASE_SIZE) / 2;
      // Screen width of the box edge to edge, sideways to the view.
      const a = screenPointOf(pose, width, height, { x: bubble.x - Math.cos(pose.yaw) * h, y: bubble.y, z: bubble.z + Math.sin(pose.yaw) * h });
      const b = screenPointOf(pose, width, height, { x: bubble.x + Math.cos(pose.yaw) * h, y: bubble.y, z: bubble.z - Math.sin(pose.yaw) * h });
      return a && b ? Math.abs(b.x - a.x) : null;
    });
  }

  return system;
}
