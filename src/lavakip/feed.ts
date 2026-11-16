// Giving a lavakip to a dino, golden dino, chicken or knight (v23, decision 144). It is only for fun: no stat, no
// reward, nothing saved per animal, no rng. The one lavakip is the only thing used. The snack itself is `snack.ts`;
// this file starts it, shows the words and hearts as world labels and plays `hap`.
import { registerHook } from '../dev/e2e-hooks';
import type { Sound } from '../audio/sound';
import type { DinoState } from '../dinos/dino-ai';
import type { ActorLabels } from '../ui/actor-labels';
import type { LavakipEconomy } from './lavakip-economy';
import type { FeedStateView, FeedTarget, LavakipMenuOption } from './lavakip-types';
import { startSnack } from './snack';

export const FEED_TEXT = 'Lavakip geven';
export const SNACK_LINE = 'Hap! Lekker pittig!';
const HEARTS = '\u{2764}\u{FE0F} \u{2764}\u{FE0F} \u{2764}\u{FE0F}';
/** A small orange puff: a circle, not a flame. */
const PUFF = '\u{1F7E0}';
/** Reduced motion shows the hearts still for this long. */
const STILL_HEARTS_MS = 1000;
const PUFF_MS = 1200;
/** Blocks above the feet where the words float, and how far the hearts rise over the snack. */
const LABEL_HEIGHT = 1.6;
const RISE = 1.2;

export interface Feeder {
  /** The "Lavakip geven" entry for this animal or knight, or null: no bar, none carried, or not a target. */
  menuOption(target: FeedTarget): LavakipMenuOption | null;
  /** Gives one lavakip: one carried lavakip less, a snack for the target. False when none is carried or he already snacks. */
  feed(target: FeedTarget): Promise<boolean>;
  state(): FeedStateView;
  /** Once a frame with loop seconds: moves the hearts and words with the snacking bodies and clears them at the end. */
  step(dt: number): void;
}

export interface FeederDeps {
  economy: Pick<LavakipEconomy, 'state' | 'useOne'>;
  /** The live body of a dino, chicken or knight by id, or null when he is gone. Boot passes the stores. */
  body?: (target: FeedTarget) => (DinoState & { snack?: DinoState['snack'] }) | null;
  labels?: Pick<ActorLabels, 'show' | 'hide' | 'place'>;
  sound?: Pick<Sound, 'play'>;
  /** The screen point of a world point for the labels (`labelPoint`), or null when it is hidden. */
  project?: (p: { x: number; y: number; z: number }) => { x: number; y: number } | null;
  reducedMotion?: boolean;
}

interface Running {
  target: FeedTarget;
  key: string;
}

export function createFeeder(deps: FeederDeps): Feeder {
  const running: Running[] = [];
  const point = { x: 0, y: 0, z: 0 };
  let fed = 0;

  const keyOf = (t: FeedTarget): string => `snack-${t.kind}-${t.id}`;

  function clear(r: Running): void {
    deps.labels?.hide(`${r.key}-words`);
    deps.labels?.hide(`${r.key}-hearts`);
    deps.labels?.hide(`${r.key}-puff`);
  }

  const feeder: Feeder = {
    menuOption(target) {
      const rec = deps.economy.state();
      if (!rec.bought || rec.carried < 1) return null;
      if (deps.body && !deps.body(target)) return null;
      return { text: FEED_TEXT, give: () => void feeder.feed(target).catch(() => undefined) };
    },

    async feed(target) {
      const rec = deps.economy.state();
      if (!rec.bought || rec.carried < 1) return false;
      const body = deps.body?.(target);
      if (!body || body.snack) return false;
      if (!(await deps.economy.useOne())) return false;
      // The body may have gone or begun a snack while the lavakip was written: it is used, so the snack still shows when it can.
      const live = deps.body?.(target);
      if (!live || !startSnack(live, deps.reducedMotion === true)) return true;
      const r: Running = { target: { kind: target.kind, id: target.id }, key: keyOf(target) };
      running.push(r);
      fed += 1;
      deps.sound?.play('hap');
      const still = deps.reducedMotion === true;
      deps.labels?.show(`${r.key}-words`, SNACK_LINE, 'snack', 3000);
      deps.labels?.show(`${r.key}-hearts`, HEARTS, 'snack', still ? STILL_HEARTS_MS : 3000);
      if (!still) deps.labels?.show(`${r.key}-puff`, PUFF, 'snack', PUFF_MS);
      return true;
    },

    state() {
      const snacking: FeedStateView['snacking'] = [];
      for (const r of running) {
        const b = deps.body?.(r.target);
        if (b?.snack) snacking.push({ kind: r.target.kind, id: r.target.id, msLeft: Math.max(0, b.snack.ms) });
      }
      return { snacking, fed };
    },

    step() {
      for (let i = running.length - 1; i >= 0; i--) {
        const r = running[i]!;
        const b = deps.body?.(r.target);
        if (!b?.snack) {
          clear(r);
          running.splice(i, 1);
          continue;
        }
        if (!deps.labels || !deps.project) continue;
        const t = Math.min(1, Math.max(0, 1 - b.snack.ms / 3000));
        point.x = b.x;
        point.z = b.z;
        point.y = (b.snack.baseY ?? b.y) + LABEL_HEIGHT;
        deps.labels.place(`${r.key}-words`, deps.project(point));
        point.y += deps.reducedMotion ? 0.3 : 0.3 + RISE * t;
        deps.labels.place(`${r.key}-hearts`, deps.project(point));
        point.y = (b.snack.baseY ?? b.y) + 0.8 + (deps.reducedMotion ? 0 : RISE * t);
        deps.labels.place(`${r.key}-puff`, deps.project(point));
      }
    },
  };

  if (__E2E__) {
    registerHook('feedLavakip', (kind: FeedTarget['kind'], id: string) => feeder.feed({ kind, id }));
    registerHook('feedState', () => feeder.state());
  }
  return feeder;
}
