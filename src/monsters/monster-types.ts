// Types and numbers of the monsters (v18 Zwarte bubbel, decision 135). No logic, so every monster file can import it.
import type { SoundName } from '../audio/sound';
import type { ActorLabels } from '../ui/actor-labels';
import type { SpeechKind } from '../ui/speech';
import type { Rng } from '../core/rng';
import type { DinoState, Point } from '../dinos/dino-ai';
import type { KnightState } from '../knights/knight-types';
import type { Box } from '../world/build';
import type { World } from '../world/world';

/** Play time between two bubbles: 10 minutes (AC211). */
export const BUBBLE_EVERY_MS = 600_000;
/** A bubble waits for a break when one is due in under this much play time (AC212). */
export const BREAK_NEAR_MS = 60_000;
/** Play time after that break before the bubble comes (AC212). */
export const AFTER_BREAK_MS = 30_000;
/** No valid spot: try again every 5 seconds of play time (AC213). */
export const SPOT_RETRY_MS = 5000;
/** Points that make the clock run without a knight (AC211). */
export const CLOCK_POINTS = 30;

/** The bubble floats in for at least 3 seconds (AC213), stays 60 s, floats away in 1.5 s. */
export const BUBBLE_FLOAT_IN_MS = 3500;
export const BUBBLE_STAY_MS = 60_000;
export const BUBBLE_FLOAT_OUT_MS = 1500;
/** Distance range in front of the kid, in blocks (AC213). */
export const BUBBLE_MIN_DISTANCE = 6;
export const BUBBLE_MAX_DISTANCE = 10;
/** Drift stays within this many blocks of the spot (AC213 allows 1). */
export const BUBBLE_DRIFT = 0.4;
/** The bubble is at least this many screen points wide, drawn and hit tested (AC213). */
export const BUBBLE_MIN_POINTS = 80;
/** Tap reach on the bubble, in blocks. */
export const BUBBLE_TAP_REACH = 12;

/** Klodder tires after 5 minutes (AC217). */
export const KLODDER_TIRED_MS = 300_000;
/** His body box: 0.8 wide, 1.2 high. */
export const KLODDER_BOX = { side: 0.8, height: 1.2 } as const;
/** Priority in `game.addCreatures`: monsters 10, knights 20. */
export const MONSTER_PRIORITY = 10;

export type MonsterPhase = 'idle' | 'bubble' | 'klodder';
export type BubbleStage = 'in' | 'drift' | 'out';

export interface BubbleState {
  /** The spot, where it comes to rest. */
  spot: Point;
  /** Where it is drawn now (spot plus float and drift). */
  x: number;
  y: number;
  z: number;
  stage: BubbleStage;
  /** Loop ms since the bubble started floating in. */
  ageMs: number;
  /** Loop ms since it started to float away. */
  outMs: number;
  /** Draw scale and tap size: wide enough for `BUBBLE_MIN_POINTS` at this distance. */
  scale: number;
}

/** Klodder, the black monster. V18b fills in nibbles, V18d the Moed bar. */
export interface KlodderState {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Loop ms since he jumped out. */
  ageMs: number;
  /** Cells he has nibbled so far (counts up to MAX_NIBBLES in V18b). */
  nibbled: number;
  /** Loop ms until he may nibble again (V18b). */
  nibbleWaitMs: number;
  /** Where he walks to, or null (V18b). */
  target: { x: number; y: number; z: number } | null;
  /** Moed bar 0 to MOED_FULL and the knights poking now (V18d). */
  moed: number;
  pokers: number;
  tired: boolean;
  /** Set once he is going away; the system removes him when `stepKlodder` says so. */
  leaving: boolean;
  /** Pose name for the renderer. */
  pose?: string;
}

/** What a monster part gets each step. */
export interface MonsterContext {
  world: World;
  rng: Rng;
  /** Loop seconds. */
  dt: number;
  kid: Point;
  /** The kid's box (0.6 wide, 1.8 high). */
  kidBox: Box;
  /** True when the box touches a dino, egg, chicken, villager or knight (not the kid, not Klodder). Inflate a box by 1 for "within 1 block". */
  occupied(box: Box): boolean;
  /** The knights now: id, box, mode and where they stand. V18d sets `chase`. */
  knights(): readonly KnightState[];
  /** Tells the renderer a cell changed (once per touched chunk per frame). */
  touch(x: number, z: number): void;
  /** `kind` is `mole` for the mole's own lines (v22): they use their own toast channel. */
  say(text: string, ms?: number, kind?: SpeechKind): void;
  play(name: SoundName): void;
  /** The live dinos and chickens Klodder may tease (boot passes `dinoStore.dinos()`). */
  animals?(): readonly DinoState[];
  /** Saves the hint flag (V18d). */
  markHintShown(): void;
  /** Hint flag as saved. */
  hintShown(): boolean;
  // The fields below are set by the monster system every step (v22, decision 144). They are optional in the type only so
  // that a hand built context in an older test still types; code that uses one reads it with `?.` and a default.
  /** World labels over animals and moles (Hihi!, Zzz, Gevangen!). */
  labels?: ActorLabels;
  /** True while at least one knight is in the world and on (a mole line that says "ridders" needs it). */
  hasKnightHelp?(): boolean;
  /** True for a cell no monster may take or stand on: the Lavakip-bar footprint and one block around it. */
  keepOut?(x: number, y: number, z: number): boolean;
  /** True when a guard knight watches this animal (the 4 nearest within 7 of his spot). Always false until V22d. */
  isGuarded?(animal: DinoState): boolean;
  /** Loop ms since the monster system was built (the clock of every mole timer). */
  loopMs?: number;
}

/** What `monsterState()` shows to tests. */
export interface MonsterStateView {
  phase: MonsterPhase;
  bubble: { x: number; y: number; z: number; stage: BubbleStage; ageMs: number; scale: number; spot: Point } | null;
  klodder: { x: number; y: number; z: number; ageMs: number; nibbled: number; moed: number; pokers: number; tired: boolean } | null;
  hiddenCount: number;
  bubbleClockMs: number;
  hintShown: boolean;
}

/** What `clockView()` shows the pill (V22b): does the clock run, is the bubble due but waiting, and the play ms left. */
export interface ClockView {
  /** The clock counts now (bubble switch on, a knight or 30 points, nothing out). */
  runs: boolean;
  /** The bubble is due and waits for a break, the 30 s after it, or a spot. */
  held: boolean;
  /** Play ms until the bubble is due: 0 when due, at most 600 000. */
  msLeft: number;
}

// ---- v16 Monstermol (decision 138). The mole is a second slot next to the bubble and Klodder slot. ----

/** `away` (v22): he dove under and is out of the world for his away time. */
export type MolePhase = 'none' | 'rumble' | 'out' | 'leaving' | 'away';

/** A block cell. */
export interface Cell {
  x: number;
  y: number;
  z: number;
}

/** The mole. `x`, `y`, `z` are the feet centre. Nothing of it is saved. */
export interface MoleState {
  /** Which mole, from 1: the key of his labels, his target id and his saved row. */
  id: number;
  /** True once a pen holds him: he sleeps in it (V22c). */
  caught: boolean;
  /** Where he came up: the free mole waddles within 6 of it (V22c). */
  home: { x: number; z: number };
  /** Where he went under when a knight chased him off, or null (V22c, V22d). */
  dove: { x: number; z: number } | null;
  /** Loop ms of away time left (V22c). 0 when he is not away. */
  awayMs: number;
  /** Loop ms until he may tease again, 15 000 after each tease (V22c). */
  teaseWaitMs: number;
  /** Loop ms until he may say "Hmpf! Ik kan er niet bij." again (V22c). */
  hmpfWaitMs: number;
  /** True once "Niemand om mee te spelen..." was said for this mole (V22c). */
  lonelySaid: boolean;
  /** The column box of the pen check, kept so a block change near it is seen at once (V22c), or null. */
  reach: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  /** A block changed inside `reach` plus 1: the next step checks the pen again (V22c). */
  dirty: boolean;
  /** Loop ms since his spot was saved while he moved (V22c). */
  saveMs: number;
  phase: MolePhase;
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Loop ms in the current phase (the system counts it in `rumble` and `leaving`). */
  phaseMs: number;
  /** Loop ms since he came up (stops counting in `leaving`). */
  outMs: number;
  /** Loop ms the search found no path to a target (V16b). */
  noPathMs: number;
  /** Loop ms with no target animal in the world (V16b). */
  lonelyMs: number;
  /** Loop ms until the next path search (V16b). */
  searchMs: number;
  /** Which animal he walks to, as a stable id (V16b), or null. */
  target: string | null;
  lastTeased: string | null;
  /** The cells he walks now, start to goal, or null (V16b). */
  path: Cell[] | null;
  /** Moed bar 0 to MOLE_MOED_FULL and the knights poking now (V16d). */
  moed: number;
  pokers: number;
  /** The column the kid dug in when the rumble began. */
  digColumn: { x: number; z: number };
  /** Pose name for the renderer: rise, walk, boe, sink. */
  pose?: string;
}

/** His body box: 0.8 wide, 0.9 high. */
export const MOLE_BOX = { side: 0.8, height: 0.9 } as const;
export const RUMBLE_MS = 3000;
/** Blocks per second. */
export const MOLE_SPEED = 1;
export const SEARCH_EVERY_MS = 2000;
export const FENCE_MS = 10_000;
export const LONELY_MS = 60_000;
export const MOLE_TIRED_MS = 600_000;
export const LEAVE_MS = 1500;
/** Play time between two "Pas op!" toasts. */
export const TOAST_GAP_MS = 60_000;
export const MOLE_MOED_FULL = 15;
export const SEARCH_SIDE = 49;
export const SEARCH_LAYERS = 17;

/** What `moleState()` shows to tests. The `began` times are the loop ms (since the system was built) each phase began. */
export interface MoleStateView {
  phase: MolePhase;
  x: number;
  y: number;
  z: number;
  heading: number;
  target: string | null;
  noPathMs: number;
  outMs: number;
  moed: number;
  pokers: number;
  /** Loop ms now. */
  loopMs: number;
  began: { rumble: number | null; out: number | null; leaving: number | null };
  /** Every mole in the world or away (v22), in the order he came. The fields above describe the free mole or the rumble. */
  moles: MoleListEntry[];
}

/** One row of `moleState().moles`. `awayMsLeft` is 0 unless he is away. */
export interface MoleListEntry {
  id: number;
  x: number;
  y: number;
  z: number;
  state: 'free' | 'away' | 'caught';
  awayMsLeft: number;
}
