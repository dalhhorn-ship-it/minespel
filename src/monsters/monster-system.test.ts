import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import type { MonstersRecord } from '../storage/schema';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createMonsterSystem } from './monster-system';
import { createDino } from '../dinos/dino-ai';
import type { Box } from '../world/build';
import { BUBBLE_EVERY_MS, KLODDER_TIRED_MS } from './monster-types';

function setup(opts: { knights?: number; points?: number; remaining?: number; animals?: ReturnType<typeof createDino>[]; knightList?: unknown[] } = {}) {
  const world = new World();
  const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
  const player = { player: kid, yaw: 0, pose: () => ({ x: kid.x, y: kid.y + 1.6, z: kid.z, yaw: 0, pitch: 0 }) };
  const state = { knights: opts.knights ?? 0, points: opts.points ?? 0, remaining: opts.remaining ?? 240_000 };
  const syncActors = vi.fn();
  const blockChanged = vi.fn();
  let saved: MonstersRecord = { knights: [], bubbleClockMs: 0, hintShown: false };
  const persist = vi.fn((change: (m: MonstersRecord) => MonstersRecord) => { saved = change(saved); });
  const play = vi.fn();
  const busy: { box: Box | null } = { box: null };
  const moedBar = { update: vi.fn() };
  const system = createMonsterSystem({
    world, player,
    renderer: { syncActors, blockChanged },
    knights: { knights: () => (opts.knightList ?? new Array(state.knights).fill({})) as never, points: () => state.points },
    viewport: () => ({ width: 1024, height: 768 }),
    remainingPlayMs: () => state.remaining,
    persist, sound: { play }, rng: createRng(1), moedBar,
    animals: () => opts.animals ?? [],
    occupied: (b) => busy.box !== null && b[0] < busy.box[3] && b[3] > busy.box[0] && b[1] < busy.box[4] && b[4] > busy.box[1] && b[2] < busy.box[5] && b[5] > busy.box[2],
  });
  system.applySwitches({ knights: true, bubble: true });
  const play10 = (ms: number) => { for (let t = 0; t < ms; t += 1000) system.onPlayElapsed(1000); };
  const loop = (ms: number) => { for (let t = 0; t < ms; t += 100) system.step(0.1); };
  return { system, world, kid, busy, moedBar, state, syncActors, blockChanged, persist, saved: () => saved, play10, loop, play };
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
    // AC219: tired at 5 minutes of play time, gone once every block is back (AC217: within 3 s, not all at once).
    s.loop(KLODDER_TIRED_MS - 1000);
    expect(s.system.state().phase).toBe('klodder');
    expect(s.system.state().klodder?.tired).toBe(false);
    s.loop(1500);
    expect(s.system.state().klodder?.tired ?? true).toBe(true);
    s.loop(3000);
    expect(s.system.state().phase).toBe('idle');
    expect(s.system.state().hiddenCount).toBe(0);
  });
  it('AC217: a tired Klodder stays while a block waits for an occupied cell, then every block is back', () => {
    const s = setup({ knights: 1 });
    s.system.spawnKlodder();
    s.world.hide(40, 10, 40);
    s.busy.box = [40, 10, 40, 41, 11, 41];
    s.loop(KLODDER_TIRED_MS + 3000);
    expect(s.system.state().phase).toBe('klodder');
    expect(s.world.isHidden(40, 10, 40)).toBe(true);
    s.busy.box = null;
    s.loop(1000);
    expect(s.system.state().phase).toBe('idle');
    expect(s.world.hiddenCount()).toBe(0);
  });
  it('AC220: Klodder really teases the live animals the system was given', () => {
    const animal = createDino({ kind: 'kip', golden: false, x: START_SPOT.x + 3, y: START_SPOT.y, z: START_SPOT.z + 3 }, true);
    const s = setup({ knights: 1, animals: [animal] });
    s.system.spawnKlodder();
    expect(s.system.teaseNow()).toBe(true);
    expect(animal.flee).toBeTruthy();
    expect(s.play).toHaveBeenCalledWith('boing');
  });
  it('AC216: the Moed bar is drawn over Klodder only while a knight pokes him', () => {
    const s = setup({ knights: 1 });
    s.system.spawnKlodder();
    s.system.step(0.1);
    expect(s.moedBar.update).toHaveBeenLastCalledWith(null, 0);
    expect(s.system.state().klodder?.pokers).toBe(0);
  });
  it('AC216: with a knight poking, the bar shows over Klodder and fills', () => {
    const body = { x: 0, y: 0, z: 0 };
    const knight = { visible: true, mode: 'guard', body, chase: null };
    const s = setup({ knightList: [knight] });
    s.system.spawnKlodder();
    const k = s.system.state().klodder!;
    Object.assign(body, { x: k.x, y: k.y, z: k.z });
    s.loop(5000);
    const calls = s.moedBar.update.mock.calls;
    const last = calls[calls.length - 1] as [{ x: number; y: number } | null, number];
    expect(last[0]).not.toBeNull();
    expect(last[1]).toBeGreaterThan(0.1);
    expect(last[1]).toBeLessThan(0.3);
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
  it('AC217: the switch going off never puts a block into the kid, an animal or a knight, and it comes back when free', () => {
    const s = setup({ knights: 1 });
    s.system.spawnKlodder();
    const k = s.kid;
    s.world.hide(40, 10, 40);
    s.world.hide(Math.floor(k.x), Math.floor(k.y), Math.floor(k.z));
    s.busy.box = [42, 10, 42, 43, 11, 43];
    s.world.hide(42, 10, 42);
    s.system.applySwitches({ knights: true, bubble: false });
    expect(s.system.state().phase).toBe('idle');
    expect(s.world.isHidden(40, 10, 40)).toBe(false);
    expect(s.world.isHidden(Math.floor(k.x), Math.floor(k.y), Math.floor(k.z))).toBe(true);
    expect(s.world.isHidden(42, 10, 42)).toBe(true);
    k.x += 5;
    s.busy.box = null;
    s.loop(1000);
    expect(s.world.hiddenCount()).toBe(0);
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
