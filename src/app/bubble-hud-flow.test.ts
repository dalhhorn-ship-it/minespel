import { describe, expect, it, vi } from 'vitest';
import { createBubbleHudFlow, HUD_EVERY_MS } from './bubble-hud-flow';
import type { ClockView } from '../monsters/monster-types';
import { addTarget, type TargetList } from '../monsters/targets';

function setup(over: { clock?: ClockView; mole?: { x: number; z: number } | null; bubbleOn?: boolean } = {}) {
  const clock = { runs: true, held: false, msLeft: 200_000, ...over.clock };
  let mole = over.mole ?? null;
  const pose = { x: 10, y: 20, z: 10, yaw: 0 };
  const view = { update: vi.fn(), hide: vi.fn(), destroy: vi.fn() };
  const flow = createBubbleHudFlow({
    monsters: {
      clockView: () => clock,
      collectTargets: (list: TargetList) => {
        if (mole) addTarget(list, 'mole-1', 'mole', mole.x, 20, mole.z);
      },
    },
    view,
    pose: () => pose,
    switches: () => ({ bubble: over.bubbleOn ?? true, mole: true }),
  });
  return { flow, view, clock, pose, setMole: (m: { x: number; z: number } | null) => (mole = m) };
}
const tick = (flow: { step(dt: number): void }, n: number, ms = HUD_EVERY_MS) => {
  for (let i = 0; i < n; i++) flow.step(ms / 1000);
};

describe('bubble hud flow', () => {
  it('AC304: updates at least 5 times a second', () => {
    expect(HUD_EVERY_MS).toBeLessThanOrEqual(200);
  });
  it('AC301: the first step computes at once and calls the view', () => {
    const { flow, view } = setup();
    flow.step(0.016);
    expect(flow.state()).toMatchObject({ shown: true, kind: 'clock', text: 'Bubbel over 3:20' });
    expect(view.update).toHaveBeenCalledTimes(1);
  });
  it('AC304: one state object is reused, and the view is called only when it changed', () => {
    const { flow, view, clock } = setup();
    const a = flow.state();
    tick(flow, 10);
    expect(flow.state()).toBe(a);
    expect(view.update).toHaveBeenCalledTimes(1);
    clock.msLeft = 199_000;
    tick(flow, 1);
    expect(view.update).toHaveBeenCalledTimes(2);
    expect(flow.state()).toBe(a);
  });
  it('AC304: between two computes nothing is computed', () => {
    const { flow, view, clock } = setup();
    flow.step(0.016);
    clock.msLeft = 100_000;
    flow.step(0.016);
    expect(view.update).toHaveBeenCalledTimes(1);
    tick(flow, 1);
    expect(view.update).toHaveBeenCalledTimes(2);
  });
  it('AC304: an angle change of 1 degree or less is no change, more is', () => {
    const { flow, view, pose } = setup({ mole: { x: 10, z: 20 } });
    tick(flow, 1);
    expect(view.update).toHaveBeenCalledTimes(1);
    pose.yaw = (0.5 * Math.PI) / 180;
    tick(flow, 1);
    expect(view.update).toHaveBeenCalledTimes(1);
    pose.yaw = (5 * Math.PI) / 180;
    tick(flow, 1);
    expect(view.update).toHaveBeenCalledTimes(2);
  });
  it('AC305: a mole sent off or caught goes back to the clock within a compute', () => {
    const { flow, setMole } = setup({ mole: { x: 10, z: 22 } });
    tick(flow, 1);
    expect(flow.state()).toMatchObject({ kind: 'mole', text: 'Mol: 12 blokken' });
    setMole(null);
    tick(flow, 1);
    expect(flow.state().kind).toBe('clock');
  });
  it('AC306: running false hides the pill and computes nothing, true computes at once', () => {
    const { flow, view, clock } = setup();
    tick(flow, 1);
    flow.setRunning(false);
    expect(view.hide).toHaveBeenCalledTimes(1);
    clock.msLeft = 100_000;
    tick(flow, 5);
    expect(view.update).toHaveBeenCalledTimes(1);
    flow.setRunning(true);
    flow.step(0.016);
    expect(view.update).toHaveBeenCalledTimes(2);
    expect(flow.state().text).toBe('Bubbel over 1:40');
  });
  it('AC302: a hidden state never calls the view', () => {
    const { flow, view } = setup({ bubbleOn: false });
    tick(flow, 5);
    expect(view.update).not.toHaveBeenCalled();
    expect(flow.state().shown).toBe(false);
  });
});
