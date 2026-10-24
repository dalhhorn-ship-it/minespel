// The villager question (v11 Dorp, PRD 12, AC181 to AC189). Glues the bubble, the card, the pure question logic and
// the saved `village` record. It is not a break: it never calls the break flow, writes no break record, no session
// and no ledger row, and never touches points. The card is a `kid-overlay` screen, so the play timer stops by itself.
// The cooldown counts the play time that the timer driver takes off the countdown: it follows the countdown
// going down, so time in a menu, a break, the parent area or the background never counts (AC186).
import type { Sound } from '../audio/sound';
import type { Catalog } from '../content/catalog';
import { effectiveDay, systemClock, today, type Clock } from '../core/clock';
import { createRng, type Rng } from '../core/rng';
import { registerHook } from '../dev/e2e-hooks';
import type { Game } from '../game/game';
import type { Item } from '../content/format';
import type { Response } from '../learning/answer-check';
import { saveProgressWithCap } from '../learning/generated-items';
import { applyFirstTry } from '../learning/srs';
import {
  COOLDOWN_MS,
  pickVillageQuestion,
  QUIET_BEFORE_BREAK_MS,
  reduceVillage,
  startVillageCard,
  type VillageCardState,
  type VillageEffect,
  type VillageEvent,
  type VillageQuestion,
} from '../learning/village-question';
import type { LogStore } from '../storage/log-store';
import type { ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import type { VillageRecord } from '../storage/schema';
import { createVillageCard, type VillageCard, type VillageCardAction } from '../ui/village-card';
import { RARE_BLOCKS } from '../world/blocks';
import type { ScreenManager } from './screens';
import type { TimerDriver } from './timer-driver';

/** The bubble shows within this many blocks of a villager and hides farther than HIDE_DISTANCE. */
export const SHOW_DISTANCE = 3;
export const HIDE_DISTANCE = 6;
/** The saved cooldown is refreshed each time it crosses one of these steps. */
const SAVE_STEP_MS = 15_000;

export interface VillageFlowOptions {
  game: Pick<Game, 'player' | 'villagerSystem' | 'villageBubble' | 'setFoundBlocks' | 'giveToHotbar' | 'isRunning'>;
  screens: Pick<ScreenManager, 'current' | 'showKidOverlay' | 'showWorld' | 'subscribe'>;
  timerDriver: Pick<TimerDriver, 'remainingPlayMs'>;
  records: Records;
  progressStore: ProgressStore;
  logStore: LogStore;
  getCatalog: () => Catalog;
  sound?: Pick<Sound, 'play'>;
  clock?: Clock;
  rng?: Rng;
  now?: () => number;
  /** Milliseconds between looks at the villagers. 0 means no timer (unit tests call `tick`). */
  intervalMs?: number;
}

export interface VillageFlow {
  /** Loads the saved record and starts looking. Call it once the app is ready (AC182). */
  start(): Promise<void>;
  /** One look at the player, the villagers and the play timer. */
  tick(): void;
  /** The kid tapped the bubble (Game calls this). */
  onBubbleTapped(): void;
  isCardOpen(): boolean;
  state(): VillageRecord;
  /** Waits for the question that is being picked and for the saves on their way. */
  flush(): Promise<void>;
  destroy(): void;
}

function formatGiven(item: Item, response: Response): string {
  switch (response.type) {
    case 'choice':
      return item.type === 'choice' ? (item.options[response.index] ?? String(response.index)) : String(response.index);
    case 'find-error':
      if (response.index === -1) return 'geen fout';
      return item.type === 'find-error' ? (item.words[response.index] ?? String(response.index)) : String(response.index);
    case 'type':
      return response.text;
    case 'punctuate':
      return response.gaps.join(',');
  }
}

function sanitize(raw: VillageRecord): VillageRecord {
  const found = [...new Set((Array.isArray(raw.found) ? raw.found : []).filter((b) => RARE_BLOCKS.includes(b)))].sort((a, b) => a - b);
  const cd = typeof raw.cooldownMs === 'number' && Number.isFinite(raw.cooldownMs) ? raw.cooldownMs : 0;
  return {
    found,
    cooldownMs: Math.min(COOLDOWN_MS, Math.max(0, cd)),
    lastVillager: typeof raw.lastVillager === 'string' ? raw.lastVillager : null,
  };
}

interface Prepared {
  token: number;
  loading: boolean;
  /** Set once loaded. Null question means: nothing seen, only "Hoi!". */
  done: boolean;
  question: VillageQuestion | null;
  day: string;
}

interface OpenCard {
  card: VillageCard;
  state: VillageCardState;
  villagerId: string;
  sessionId: string;
  shownAt: number;
  day: string;
}

export function createVillageFlow(options: VillageFlowOptions): VillageFlow {
  const clock = options.clock ?? systemClock;
  const rng = options.rng ?? createRng(0x646f7270);
  const now = options.now ?? (() => clock.now());
  const { game, screens } = options;

  let village: VillageRecord = { found: [], cooldownMs: 0, lastVillager: null };
  let started = false;
  let lastRemaining: number | null = null;
  let lastSavedStep = Infinity;
  let chain: Promise<unknown> = Promise.resolve();
  let prep: Prepared | null = null;
  let tokenCounter = 0;
  let open: OpenCard | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let prepWork: Promise<void> = Promise.resolve();

  function enqueue(fn: () => Promise<unknown>) {
    chain = chain.then(fn).catch(() => {
      /* a failed save must never stop the game */
    });
  }

  function saveVillage() {
    const copy: VillageRecord = { found: [...village.found], cooldownMs: village.cooldownMs, lastVillager: village.lastVillager };
    enqueue(() => options.records.put('village', copy));
  }

  function dropPrepared() {
    prep = null;
  }

  function hideBubble() {
    if (game.villageBubble.state().visible) game.villageBubble.hide();
  }

  function distanceTo(villagerId: string): number | null {
    const v = game.villagerSystem.villagers().find((x) => x.id === villagerId);
    if (!v) return null;
    const p = game.player.player;
    return Math.abs(p.y - v.y) > 3 ? Infinity : Math.hypot(p.x - v.x, p.z - v.z);
  }

  function startPrepare() {
    if (prep) return;
    const mine: Prepared = { token: ++tokenCounter, loading: true, done: false, question: null, day: '' };
    prep = mine;
    prepWork = (async () => {
      try {
        const [switches, rotation, settings, progress] = await Promise.all([
          options.records.get('switches'),
          options.records.get('rotation'),
          options.records.get('settings'),
          options.progressStore.list(),
        ]);
        const lastSeenDay = (settings as { lastSeenDay?: string }).lastSeenDay ?? null;
        const day = effectiveDay(today(clock), lastSeenDay);
        const question = pickVillageQuestion({
          catalog: options.getCatalog(),
          switches,
          rotation,
          progress,
          today: day,
          lastSeenDay: day,
          rng,
        });
        if (prep !== mine) return;
        mine.question = question;
        mine.day = day;
      } catch {
        if (prep !== mine) return;
        mine.question = null;
      }
      mine.loading = false;
      mine.done = true;
      tick();
    })();
  }

  function tick() {
    if (!started) return;
    const remaining = options.timerDriver.remainingPlayMs();
    // The cooldown follows the countdown going down: only play time counts (AC186).
    if (lastRemaining !== null && remaining < lastRemaining && village.cooldownMs > 0) {
      village.cooldownMs = Math.max(0, village.cooldownMs - (lastRemaining - remaining));
      const step = Math.floor(village.cooldownMs / SAVE_STEP_MS);
      if (step < lastSavedStep) {
        lastSavedStep = step;
        saveVillage();
      }
    }
    lastRemaining = remaining;

    const eligible =
      !open &&
      screens.current() === 'world' &&
      game.isRunning() &&
      village.cooldownMs <= 0 &&
      remaining > QUIET_BEFORE_BREAK_MS;
    if (!eligible) {
      hideBubble();
      dropPrepared();
      return;
    }

    const bubble = game.villageBubble.state();
    if (bubble.visible && bubble.villager) {
      const d = distanceTo(bubble.villager);
      if (d === null || d > HIDE_DISTANCE) {
        hideBubble();
        dropPrepared();
        return;
      }
    }

    const near = game.villagerSystem.nearest(game.player.player, SHOW_DISTANCE);
    if (!near || near.id === village.lastVillager) {
      // Someone else may still own a visible bubble within 6 blocks. Nobody asks right now otherwise.
      if (!bubble.visible) dropPrepared();
      return;
    }
    if (bubble.visible && bubble.villager === near.id) return;
    if (!prep) {
      startPrepare();
      return;
    }
    if (prep.done) game.villageBubble.show(near.id, prep.question !== null);
  }

  // ---- the card ----

  function closeCard() {
    const o = open;
    if (!o) return;
    open = null;
    o.card.destroy();
    screens.showWorld();
  }

  function runEffects(o: OpenCard, effects: readonly VillageEffect[]) {
    const q = o.state.question;
    const item = q.entry.item;
    for (const ef of effects) {
      switch (ef.type) {
        case 'answer':
          options.sound?.play(ef.correct ? 'chime' : 'hmm');
          enqueue(() =>
            options.logStore.appendAnswer({
              ts: ef.at,
              day: o.day,
              context: 'dorp',
              sessionId: o.sessionId,
              moduleId: q.moduleId,
              topic: q.topic,
              skill: item.skill,
              level: item.level,
              itemId: item.id,
              try: ef.try,
              correct: ef.correct,
              given: formatGiven(item, ef.response),
              ms: Math.max(0, ef.ms),
            }),
          );
          break;
        case 'box': {
          const next = applyFirstTry(q.entry.box, ef.firstTryRight, o.day);
          enqueue(() =>
            saveProgressWithCap(options.progressStore, {
              moduleId: q.moduleId,
              itemId: item.id,
              topic: q.topic,
              skill: item.skill,
              level: item.level,
              box: next.box,
              due: next.due,
              firstTryRight: ef.firstTryRight,
              at: now(),
            }),
          );
          break;
        }
        case 'found':
          if (!village.found.includes(ef.block)) {
            village.found = [...village.found, ef.block].sort((a, b) => a - b);
            game.setFoundBlocks(village.found);
            saveVillage();
          }
          break;
        case 'dance':
          game.villagerSystem.dance(o.villagerId);
          break;
        case 'hotbar':
          game.giveToHotbar(ef.block);
          break;
      }
    }
  }

  function dispatch(event: VillageEvent) {
    const o = open;
    if (!o) return;
    const res = reduceVillage(o.state, event);
    if (res.state === o.state && res.effects.length === 0) return;
    o.state = res.state;
    runEffects(o, res.effects);
    if (res.state.phase === 'closed') closeCard();
    else o.card.render(res.state);
  }

  function handleAction(action: VillageCardAction) {
    const o = open;
    if (!o) return;
    switch (action.type) {
      case 'answer':
        dispatch({ type: 'answer', response: action.response, ms: now() - o.shownAt, at: now(), roll: rng.next() });
        break;
      case 'verder':
      case 'laatMaar':
      case 'hotbar':
        dispatch({ type: action.type });
        break;
    }
  }

  function openCard(villagerId: string, question: VillageQuestion, day: string) {
    const v = game.villagerSystem.villagers().find((x) => x.id === villagerId);
    if (!v) return;
    // The cooldown starts and is saved the moment the card opens (AC186).
    village.cooldownMs = COOLDOWN_MS;
    village.lastVillager = villagerId;
    lastSavedStep = Math.floor(COOLDOWN_MS / SAVE_STEP_MS);
    saveVillage();
    hideBubble();
    dropPrepared();
    const state = startVillageCard(question, v.gives, village.found);
    const card = createVillageCard({ state, look: v.look, onAction: handleAction, now: options.now });
    const at = now();
    open = { card, state, villagerId, sessionId: `dorp-${at}-${Math.floor(rng.next() * 1_000_000)}`, shownAt: at, day };
    screens.showKidOverlay(card.element);
  }

  const offScreen = screens.subscribe((kind) => {
    // Something else took the screen (never expected): the card is gone, nothing is given.
    if (open && kind !== 'kid-overlay') {
      const o = open;
      open = null;
      o.card.destroy();
    }
  });

  if (__E2E__) {
    registerHook('villageState', () => ({ found: [...village.found], cooldownMs: village.cooldownMs, lastVillager: village.lastVillager }));
    registerHook('setVillageState', (s: Partial<VillageRecord>) => {
      village = sanitize({ ...village, ...s });
      game.setFoundBlocks(village.found);
      lastSavedStep = Infinity;
      saveVillage();
    });
    registerHook('villageBubble', () => game.villageBubble.state());
    registerHook('villageCard', () => ({ open: open !== null, phase: open ? open.card.phase() : null }));
    registerHook('tickVillage', () => tick());
  }

  return {
    async start() {
      if (started) return;
      try {
        village = sanitize(await options.records.get('village'));
      } catch {
        village = sanitize({ found: [], cooldownMs: 0, lastVillager: null });
      }
      game.setFoundBlocks(village.found);
      lastRemaining = options.timerDriver.remainingPlayMs();
      started = true;
      const ms = options.intervalMs ?? 250;
      if (ms > 0) timer = setInterval(tick, ms);
    },
    tick,
    onBubbleTapped() {
      // One tap opens one card: `open` is set before anything else can run.
      if (open || !started) return;
      const b = game.villageBubble.state();
      if (!b.visible || !b.canAsk || !b.villager || !prep?.question) return;
      openCard(b.villager, prep.question, prep.day);
    },
    isCardOpen: () => open !== null,
    state: () => ({ found: [...village.found], cooldownMs: village.cooldownMs, lastVillager: village.lastVillager }),
    flush: async () => {
      await prepWork;
      await chain;
    },
    destroy() {
      if (timer !== null) clearInterval(timer);
      offScreen();
      closeCard();
    },
  };
}
