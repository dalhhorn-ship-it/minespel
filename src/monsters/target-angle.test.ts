import { describe, expect, it } from 'vitest';
import { targetAngle } from './target-angle';
import { addTarget, clearTargets, createTargetList, MAX_TARGETS } from './targets';

const YAWS = [0, Math.PI / 2, Math.PI, -0.7];

describe('targetAngle (AC301, AC325)', () => {
  for (const yaw of YAWS) {
    it(`ahead 0, right 90, behind 180, left -90 for yaw ${yaw.toFixed(2)}`, () => {
      const pose = { x: 10, z: 20, yaw };
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const at = (a: number, b: number) => ({ x: pose.x + fx * a + rx * b, z: pose.z + fz * a + rz * b });
      expect(targetAngle(pose, at(5, 0))).toBeCloseTo(0, 6);
      expect(targetAngle(pose, at(0, 5))).toBeCloseTo(90, 6);
      expect(Math.abs(targetAngle(pose, at(-5, 0)))).toBeCloseTo(180, 6);
      expect(targetAngle(pose, at(0, -5))).toBeCloseTo(-90, 6);
      expect(targetAngle(pose, at(5, 5))).toBeCloseTo(45, 6);
    });
  }
  it('behind is always +180, never -180, and a target on the kid gives 0', () => {
    expect(targetAngle({ x: 0, z: 0, yaw: 0 }, { x: 0, z: -3 })).toBe(180);
    expect(targetAngle({ x: 1, z: 1, yaw: 2 }, { x: 1, z: 1 })).toBe(0);
  });
  it('agrees with the screen: a point on the right half of the screen has a positive angle', async () => {
    const { screenPointOf } = await import('../game/actor-hit');
    const pose = { x: 5, y: 10, z: 5, yaw: 0.9, pitch: 0 };
    const p = { x: 5 + Math.sin(0.9) * 6 - Math.cos(0.9) * 2, y: 10, z: 5 + Math.cos(0.9) * 6 + Math.sin(0.9) * 2 };
    expect(screenPointOf(pose, 1000, 600, p)?.x).toBeGreaterThan(500);
    expect(targetAngle(pose, p)).toBeGreaterThan(0);
  });
});

describe('target list', () => {
  it('holds 8 reused objects, refuses a ninth and clears without allocating', () => {
    const list = createTargetList();
    const first = list.items[0];
    for (let i = 0; i < MAX_TARGETS; i++) expect(addTarget(list, `t${i}`, 'mole', i, 1, 2)).toBe(true);
    expect(addTarget(list, 'x', 'bar', 0, 0, 0)).toBe(false);
    expect(list.count).toBe(8);
    clearTargets(list);
    expect(list.count).toBe(0);
    addTarget(list, 'bubble', 'bubble', 3, 4, 5);
    expect(list.items[0]).toBe(first);
    expect(first).toEqual({ id: 'bubble', kind: 'bubble', x: 3, y: 4, z: 5 });
  });
});
