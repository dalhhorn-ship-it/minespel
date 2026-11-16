// The pill flow (v22, decision 144): every 100 ms of loop time it asks the monsters for the clock and the targets,
// computes the state with `computeBubbleHud` into one reused object and calls the view only when something changed
// (the angle by more than 1 degree). It hides on `onRunningChange(false)`. It is a creature with no tap (priority 30).
// V22a holds the shell and the hook `bubbleHud`; V22b fills the logic and its tests, V22e the view.
import { registerHook } from '../dev/e2e-hooks';
import type { CreatureSystem } from '../game/game';
import { computeBubbleHud, createBubbleHudState, type BubbleHudState } from '../monsters/bubble-hud';
import type { ClockView } from '../monsters/monster-types';
import type { LookPose } from '../monsters/target-angle';
import { clearTargets, createTargetList, type TargetList } from '../monsters/targets';
import type { BubblePillView } from '../ui/bubble-pill';

/** Loop ms between two computes: at least 5 updates a second (AC304). */
export const HUD_EVERY_MS = 100;

export interface BubbleHudFlowDeps {
  monsters: { clockView(): ClockView; collectTargets(list: TargetList): void };
  view: BubblePillView;
  pose(): LookPose & { y: number };
  /** The Zwarte bubbel and Monstermol switches now. */
  switches(): { bubble: boolean; mole: boolean };
}

export interface BubbleHudFlow extends CreatureSystem {
  /** False: the pill hides and nothing is computed. True: the next step computes at once. */
  setRunning(on: boolean): void;
  /** The one reused state object. */
  state(): Readonly<BubbleHudState>;
}

export function createBubbleHudFlow(deps: BubbleHudFlowDeps): BubbleHudFlow {
  const state = createBubbleHudState();
  const targets = createTargetList();
  const last = createBubbleHudState();
  let sinceMs = HUD_EVERY_MS;
  let running = true;
  let drawn = false;

  const changed = (): boolean =>
    state.shown !== last.shown || state.kind !== last.kind || state.text !== last.text ||
    Math.abs(state.angle - last.angle) > 1 || state.distance !== last.distance || state.vertical !== last.vertical;

  function refresh(): void {
    clearTargets(targets);
    deps.monsters.collectTargets(targets);
    const sw = deps.switches();
    computeBubbleHud({ clock: deps.monsters.clockView(), targets, pose: deps.pose(), bubbleOn: sw.bubble, moleOn: sw.mole }, state);
    if (!changed()) return;
    Object.assign(last, state);
    if (state.shown || drawn) {
      deps.view.update(state);
      drawn = state.shown;
    }
  }

  const flow: BubbleHudFlow = {
    step(dt) {
      if (!running || !(dt > 0) || !Number.isFinite(dt)) return;
      sinceMs += dt * 1000;
      if (sinceMs < HUD_EVERY_MS) return;
      sinceMs = 0;
      refresh();
    },
    setRunning(on) {
      if (on === running) return;
      running = on;
      if (!on) {
        deps.view.hide();
        drawn = false;
        last.shown = false;
        last.text = '';
      } else sinceMs = HUD_EVERY_MS;
    },
    state: () => state,
  };

  if (__E2E__) registerHook('bubbleHud', () => ({ ...state }));
  return flow;
}
