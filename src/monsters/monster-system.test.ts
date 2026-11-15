import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import type { MonstersRecord } from '../storage/schema';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createMonsterSystem } from './monster-system';
import { BUBBLE_EVERY_MS, KLODDER_TIRED_MS } from './monster-types';

function setup(opts: { knights?: number; points?: number; remaining?: number } = {}) {
  const world = new World();
  const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
  const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
  const state = { knights: opts.knights ?? 0, points: opts.points ?? 0, remaining: opts.remaining ?? 240_000 };
  const syncActors = vi.fn();
  const blockChanged = vi.fn();
  let saved: MonstersRecord = { knights: [], bubbleClockMs: 0, hintShown: false };
  const persist = vi.fn((change: (m: MonstersRecord) => MonstersRecord) => { saved = change(saved); });
  const play = vi.fn();
  const system = createMonsterSystem({
    world, player,
    renderer: { syncActors, blockChanged },
    knights: { knights: () => new Array(state.knights).fill({}) as never, points: () => state.points },
    viewport: () => ({ width: 1024, height: 768 }),
    remainingPlayMs: () => state.remaining,
    persist, sound: { play }, rng: createRng(1),
  });
  system.applySwitches({ knights: true, bubble: true });
  const play10 = (ms: number) => { for (let t = 0; t < ms; t += 1000) system.onPlayElapsed(1000); };
  const loop = (ms: number) => { for (let t = 0; t < ms; t += 100) system.step(0.1); };
  return { system, world, state, syncActors, blockChanged, persist, saved: () => saved, play10, loop, play };
}

describe('monster system (v18)', () => {
  it('AC211: a bubble comes after 10 minutes with a knight, and the clock is 0 and saved', () => {
    const s = setup({ knights: 1 });
    s.play10(BUBBLE_EVERY_MS - 1000);
    expect(s.system.state().phase).toBe('idle');
    s.play10(1000);
    expect(s.system.state().phase).toBe('bubble');
    expect(s.system.bubbleClockMs()).toBe(0);
    expect(s.saved().bubbleClockMs).toBe(0);
    expect(s.syncActors).toHaveBeenCalledWith('monsters', [expect.objectContaining({ id: 'bubble', model: 'bubble' })]);
  });
  it('AC211: no knight and 29 points, nothing moves; at 30 points it runs on', () => {
    const s = setup({ points: 29 });
    s.play10(BUBBLE_EVERY_MS * 2);
    expect(s.system.bubbleClockMs()).toBe(0);
    expect(s.system.state().phase).toBe('idle');
    s.state.points = 30;
    s.play10(5000);
    expect(s.system.bubbleClockMs()).toBe(5000);
  });
  it('AC211: bubble switch off, the game behaves as before', () => {
    const s = setup({ knights: 1 });
    s.system.applySwitches({ knights: true, bubble: false });
    s.play10(BUBBLE_EVERY_MS * 2);
    expect(s.system.bubbleClockMs()).toBe(0);
    expect(s.system.state().phase).toBe('idle');
    s.system.step(0.1);
    expect(s.syncActors).not.toHaveBeenCalled();
    expect(s.system.handleTap?.(500, 400)).toBe(false);
  });
  it('AC211: with a bubble out the clock does not move', () => {
    const s = setup({ knights: 1 });
    expect(s.system.spawnBubble()).toBe(true);
    s.play10(30_000);
    expect(s.system.bubbleClockMs()).toBe(0);
    expect(s.system.spawnBubble()).toBe(false);
  });
  it('AC212: a break due in under 60 s holds the bubble until 30 s after the break', () => {
    const s = setup({ knights: 1, remaining: 30_000 });
    s.system.setBubbleClockMs(BUBBLE_EVERY_MS - 1000);
    s.play10(2000);
    s.play10(60_000);
    expect(s.system.state().phase).toBe('idle');
    s.system.onBreakFinished();
    s.state.remaining = 240_000;
    s.play10(29_000);
    expect(s.system.state().phase).toBe('idle');
    s.play10(1000);
    expect(s.system.state().phase).toBe('bubble');
  });
  it('AC213: the bubble floats in, a tap on it opens Klodder, he tires after 5 minutes and leaves', () => {
    const s = setup({ knights: 1 });
    s.system.spawnBubble();
    s.loop(1000);
    expect(s.system.state().bubble?.stage).toBe('in');
    s.loop(3000);
    expect(s.system.state().bubble?.stage).toBe('drift');
    // Tap in the middle of the screen: the bubble stands in front of the kid.
    expect(s.system.handleTap?.(512, 384)).toBe(true);
    expect(s.system.state().phase).toBe('klodder');
    expect(s.system.state().bubble).toBeNull();
    s.loop(KLODDER_TIRED_MS + 1000);
    expect(s.system.state().phase).toBe('idle');
    expect(s.system.state().hiddenCount).toBe(0);
  });
  it('AC213: the bubble floats away after 60 s and nothing is saved but the clock', () => {
    const s = setup({ knights: 1 });
    s.system.spawnBubble();
    s.loop(63_000);
    expect(s.system.state().phase).toBe('idle');
    expect(s.saved().hintShown).toBe(false);
  });
  it('AC218: the switch going off brings every hidden block back and removes Klodder', () => {
    const s = setup({ knights: 1 });
    s.system.spawnKlodder();
    s.world.hide(40, 10, 40);
    s.system.applySwitches({ knights: true, bubble: false });
    expect(s.system.state().phase).toBe('idle');
    expect(s.world.hiddenCount()).toBe(0);
    expect(s.blockChanged).toHaveBeenCalled();
  });
  it('AC218: a world reset removes the monsters and no pause step (dt 0) moves them', () => {
    const s = setup({ knights: 1 });
    s.system.spawnBubble();
    s.system.step(0);
    expect(s.system.state().bubble?.ageMs).toBe(0);
    s.system.onWorldReset?.({ x: 0, y: 0, z: 0 });
    expect(s.system.state().phase).toBe('idle');
  });
  it('AC211: touched cells reach the renderer once per chunk per step', () => {
    const s = setup({ knights: 1 });
    s.system.touchCell(5, 5);
    s.system.touchCell(6, 6);
    s.system.touchCell(7, 7);
    s.system.step(0.1);
    expect(s.blockChanged).toHaveBeenCalledTimes(1);
  });
});
