// 14 placeholder dinos for the speed spike (`?spike=1`). They walk about so the iPad has real work to do.
// Pure data: the renderer turns these boxes into meshes (about 5 per dino, like the real ones will be).

import { createRng } from '../core/rng';
import { AIR } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import type { WorldView } from '../render/chunk-mesh';

export const SPIKE_DINO_COUNT = 14;

export function isSpikeEnabled(search: string): boolean {
  return new URLSearchParams(search).get('spike') === '1';
}

export interface SpikePart {
  /** Offset from the dino feet, in blocks, before turning. */
  ox: number;
  oy: number;
  oz: number;
  /** Box size. */
  w: number;
  h: number;
  d: number;
  color: number;
}

export interface SpikeDino {
  x: number;
  y: number;
  z: number;
  /** Turn around the up axis, radians. */
  yaw: number;
  /** Walking speed in blocks per second. */
  speed: number;
  /** Turn speed in radians per second. */
  turn: number;
  parts: SpikePart[];
}

const COLORS = [0x4caf50, 0xff9800, 0x42a5f5, 0xec407a, 0xab47bc, 0xffca28, 0x26a69a];

function dinoParts(color: number): SpikePart[] {
  return [
    { ox: 0, oy: 0.6, oz: 0, w: 0.8, h: 0.7, d: 1.2, color },
    { ox: 0, oy: 1.1, oz: 0.8, w: 0.6, h: 0.6, d: 0.6, color },
    { ox: 0, oy: 0.7, oz: -0.9, w: 0.3, h: 0.3, d: 0.6, color },
    { ox: -0.25, oy: 0, oz: 0.3, w: 0.25, h: 0.6, d: 0.25, color },
    { ox: 0.25, oy: 0, oz: -0.3, w: 0.25, h: 0.6, d: 0.25, color },
  ];
}

/** Top of the highest solid column at (x, z): the y a dino stands on. */
export function groundY(world: WorldView, x: number, z: number): number {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
    if (world.get(bx, y, bz) !== AIR) return y + 1;
  }
  return 0;
}

/** Same seed, same dinos. They start spread over the world, away from the edge. */
export function createSpikeDinos(world: WorldView, count = SPIKE_DINO_COUNT, seed = 14): SpikeDino[] {
  const rng = createRng(seed);
  const dinos: SpikeDino[] = [];
  for (let i = 0; i < count; i++) {
    const x = 4 + rng.next() * (WORLD_SIZE - 8);
    const z = 4 + rng.next() * (WORLD_SIZE - 8);
    dinos.push({
      x,
      y: groundY(world, x, z),
      z,
      yaw: rng.next() * Math.PI * 2,
      speed: 0.8 + rng.next() * 1.2,
      turn: (rng.next() - 0.5) * 1.2,
      parts: dinoParts(COLORS[i % COLORS.length] ?? 0x4caf50),
    });
  }
  return dinos;
}

/** Walks every dino forward and bounces it back from the world edge. Stays on the ground. */
export function stepSpikeDinos(world: WorldView, dinos: readonly SpikeDino[], dt: number): void {
  const margin = 2;
  for (const d of dinos) {
    d.yaw += d.turn * dt;
    d.x += Math.sin(d.yaw) * d.speed * dt;
    d.z += Math.cos(d.yaw) * d.speed * dt;
    if (d.x < margin || d.x > WORLD_SIZE - margin || d.z < margin || d.z > WORLD_SIZE - margin) {
      d.x = Math.min(WORLD_SIZE - margin, Math.max(margin, d.x));
      d.z = Math.min(WORLD_SIZE - margin, Math.max(margin, d.z));
      d.yaw += Math.PI * 0.75;
    }
    d.y = groundY(world, d.x, d.z);
  }
}
