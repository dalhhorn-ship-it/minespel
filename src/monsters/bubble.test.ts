import { describe, expect, it } from 'vitest';
import { START_SPOT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { BUBBLE_BASE_SIZE, bubbleBox, bubbleScale, createBubble, findBubbleSpot, stepBubble } from './bubble';
import { BUBBLE_FLOAT_IN_MS, BUBBLE_FLOAT_OUT_MS, BUBBLE_STAY_MS } from './monster-types';

const eye = { x: START_SPOT.x, y: START_SPOT.y + 1.6, z: START_SPOT.z, yaw: 0 };

describe('bubble spot and life (v18, AC213)', () => {
  it('AC213: the spot is 6 to 10 blocks in front of the kid in an air cell with a clear ray', () => {
    const w = new World();
    const spot = findBubbleSpot(w, eye);
    expect(spot).not.toBeNull();
    const d = Math.hypot(spot!.x - eye.x, spot!.z - eye.z);
    expect(d).toBeGreaterThanOrEqual(6);
    expect(d).toBeLessThanOrEqual(10);
    expect(w.get(Math.floor(spot!.x), Math.floor(spot!.y), Math.floor(spot!.z))).toBe(0);
  });
  it('AC213: a hidden (overlay) cell counts as air for the spot, and a wall in the way gives no spot', () => {
    const w = new World();
    const ex = Math.floor(eye.x);
    const ez = Math.floor(eye.z);
    // A solid 7 by 3 wall of stone one block in front, over the whole fan.
    for (let dx = -12; dx <= 12; dx++) for (let dy = -2; dy <= 3; dy++) w.set(ex + dx, Math.floor(eye.y) + dy, ez + 2, 3);
    expect(findBubbleSpot(w, eye)).toBeNull();
    for (let dx = -12; dx <= 12; dx++) for (let dy = -2; dy <= 3; dy++) w.hide(ex + dx, Math.floor(eye.y) + dy, ez + 2);
    expect(findBubbleSpot(w, eye)).not.toBeNull();
  });
  it('AC213: no spot outside the world', () => {
    const w = new World();
    expect(findBubbleSpot(w, { x: 2, y: 20, z: WORLD_SIZE - 1, yaw: 0 })).toBeNull();
  });
  it('AC213: the bubble is at least 80 points wide at every distance and screen height', () => {
    for (const h of [600, 768, 1024, 1366]) {
      for (const d of [6, 8, 10]) {
        const width = bubbleScale(d, h) * BUBBLE_BASE_SIZE * ((h / 2) / (Math.tan((70 * Math.PI) / 360) * d));
        expect(width, `h ${h} d ${d}`).toBeGreaterThanOrEqual(80);
      }
    }
  });
  it('AC213: floats in for at least 3 s, drifts within 1 block for 30 s, floats away after 60 s', () => {
    const spot = { x: eye.x, y: eye.y, z: eye.z + 8 };
    const b = createBubble(spot, eye, 768);
    let t = 0;
    const step = (ms: number) => stepBubble(b, ms, eye, 768);
    while (t < 2900) {
      step(100);
      t += 100;
      expect(b.stage).toBe('in');
    }
    while (t < BUBBLE_FLOAT_IN_MS + 100) {
      step(100);
      t += 100;
    }
    expect(b.stage).toBe('drift');
    let worst = 0;
    for (; t < 30_000; t += 100) {
      step(100);
      worst = Math.max(worst, Math.hypot(b.x - spot.x, b.y - spot.y, b.z - spot.z));
    }
    expect(worst).toBeLessThanOrEqual(1);
    let result: 'gone' | null = null;
    for (; t <= BUBBLE_STAY_MS + BUBBLE_FLOAT_OUT_MS + 200 && !result; t += 100) result = step(100);
    expect(result).toBe('gone');
  });
  it('AC213: the tap box is as wide as the drawn size', () => {
    const b = createBubble({ x: 50, y: 20, z: 50 }, eye, 768);
    const box = bubbleBox(b);
    expect(box[3] - box[0]).toBeCloseTo(b.scale * BUBBLE_BASE_SIZE);
  });
});
