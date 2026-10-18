import { describe, expect, it, vi } from 'vitest';
import { AIR, OBSIDIAAN, PLANKEN, STEEN, VUUR } from '../world/blocks';
import { GATE_FLOOR_X, GATE_Z } from '../world/gate';
import { EYE_HEIGHT, createPlayer } from '../world/physics';
import { GROUND_Y, MID } from '../world/terrain';
import { World } from '../world/world';
import { createBuildController } from './build-controller';

const [F1, F2, F3, F4] = GATE_FLOOR_X as [number, number, number, number];
const G = GROUND_Y;

function setup(isOccupied?: (box: number[]) => boolean, playerAt = { x: MID + 0.5, z: MID + 0.5 }) {
  const world = new World();
  const p = createPlayer(playerAt.x, G + 1, playerAt.z);
  const eye = { x: MID + 0.5, y: G + 1 + EYE_HEIGHT, z: MID + 0.5 };
  const ctrl = { player: p, pose: () => ({ ...eye, yaw: 0, pitch: 0 }) };
  const onBlockChanged = vi.fn();
  const play = vi.fn();
  const c = createBuildController({
    world, player: ctrl as never, onBlockChanged, effects: { pop: vi.fn() }, sound: { play },
    viewport: () => ({ width: 1000, height: 700 }), ...(isOccupied ? { isOccupied } : {}),
  });
  c.setMode('bouwen');
  /** Places `block` on top of the block at (x, y, GATE_Z) by aiming at its top face centre. */
  function placeOnTop(x: number, y: number, block: number) {
    const ty = y + 1, tz = GATE_Z + 0.5;
    eye.x = x + 0.5;
    eye.y = Math.max(G + 1 + EYE_HEIGHT, ty + 1); // look down on the top face
    const dx = 0, dy = ty - eye.y, dz = tz - eye.z;
    ctrl.pose = () => ({ ...eye, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) });
    c.setSlotBlock(0, block);
    c.tap(500, 350);
  }
  /** Looks at the middle of the cell (x, y, GATE_Z) from the player's side. */
  function aimAt(x: number, y: number) {
    eye.x = x + 0.5;
    const dy = y + 0.5 - eye.y, dz = GATE_Z + 0.5 - eye.z;
    ctrl.pose = () => ({ ...eye, yaw: 0, pitch: Math.atan2(dy, dz) });
  }
  return { world, p, c, onBlockChanged, play, placeOnTop, aimAt };
}

function frame(s: ReturnType<typeof setup>, left: number, right: number) {
  for (let i = 1; i <= left; i++) s.world.set(F1, G + i, GATE_Z, OBSIDIAAN);
  for (let i = 1; i <= right; i++) s.world.set(F4, G + i, GATE_Z, OBSIDIAAN);
}

describe('lighting the gate through the build controller', () => {
  it('AC160: vuur in the opening of a 2 high frame fills it, with one whoosh', () => {
    const s = setup();
    frame(s, 2, 2);
    s.placeOnTop(F2, G, VUUR);
    for (const x of [F2, F3]) for (const y of [G + 1, G + 2]) expect(s.world.get(x, y, GATE_Z)).toBe(VUUR);
    expect(s.play.mock.calls.filter((a) => a[0] === 'whoosh')).toHaveLength(1);
    // F2 and F3 sit on both sides of the chunk border: at most 2 changes, never one per block.
    expect(s.onBlockChanged.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('AC161: pillars of 3 and 2 fill G+1 and G+2 only', () => {
    const s = setup();
    frame(s, 3, 2);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(VUUR);
    expect(s.world.get(F2, G + 3, GATE_Z)).toBe(AIR);
    expect(s.world.get(F3, G + 3, GATE_Z)).toBe(AIR);
  });

  it('AC162: vuur first, then the second obsidiaan on F4 lights it', () => {
    const s = setup();
    frame(s, 2, 1);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(AIR);
    s.placeOnTop(F4, G + 1, OBSIDIAAN);
    expect(s.world.get(F4, G + 2, GATE_Z)).toBe(OBSIDIAAN);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(VUUR);
    expect(s.world.get(F2, G + 2, GATE_Z)).toBe(VUUR);
  });

  it('pillars 20 high light as one change per chunk', () => {
    const s = setup();
    frame(s, 20, 20);
    s.placeOnTop(F2, G, VUUR);
    for (let y = G + 1; y <= G + 20; y++) expect(s.world.get(F3, y, GATE_Z)).toBe(VUUR);
    expect(s.onBlockChanged.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('AC162: a steen pillar fills nothing and plays no whoosh', () => {
    const s = setup();
    frame(s, 2, 1);
    s.world.set(F4, G + 2, GATE_Z, STEEN);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(AIR);
    expect(s.play).not.toHaveBeenCalledWith('whoosh');
  });

  it('AC163: planken stays, and mining a lit vuur block removes only that block', () => {
    const s = setup();
    frame(s, 2, 2);
    s.world.set(F3, G + 1, GATE_Z, PLANKEN);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(PLANKEN);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(VUUR);
    const before = Array.from(s.world.diff());
    s.c.setMode('hakken');
    s.aimAt(F3, G + 2);
    s.c.tap(500, 350);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(AIR);
    // exactly one cell changed, nothing lit again
    const after = Array.from(s.world.diff());
    expect(before.length - after.length).toBe(1);
    expect(s.world.get(F2, G + 2, GATE_Z)).toBe(VUUR);
    expect(s.world.get(F2, G + 1, GATE_Z)).toBe(VUUR);
    expect(s.play).toHaveBeenCalledTimes(3); // thunk + whoosh when lit, then pop
  });

  it('AC163: a dino, egg or chicken in a cell skips it, a later placement fills it', () => {
    let busy = true;
    const s = setup((box: number[]) => busy && box[0] === F3 && box[1] === G + 1);
    frame(s, 2, 2);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(AIR);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(VUUR);
    busy = false;
    s.placeOnTop(F1, G + 2, OBSIDIAAN); // any placement in a gate column
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(VUUR);
  });

  it('AC163: the player standing in an opening cell is left alone, then it fills', () => {
    const s = setup(undefined, { x: F3 + 0.5, z: GATE_Z + 0.5 });
    frame(s, 2, 2);
    s.placeOnTop(F2, G, VUUR);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(AIR);
    expect(s.world.get(F3, G + 2, GATE_Z)).toBe(AIR);
    expect(s.world.get(F2, G + 2, GATE_Z)).toBe(VUUR);
    s.p.x = MID + 0.5;
    s.p.z = MID + 0.5;
    s.placeOnTop(F1, G + 2, OBSIDIAAN);
    expect(s.world.get(F3, G + 1, GATE_Z)).toBe(VUUR);
  });

  it('the same frame built elsewhere fills nothing', () => {
    const s = setup();
    const z = GATE_Z - 2;
    for (const x of GATE_FLOOR_X) s.world.set(x, G, z, OBSIDIAAN);
    for (let i = 1; i <= 2; i++) {
      s.world.set(F1, G + i, z, OBSIDIAAN);
      s.world.set(F4, G + i, z, OBSIDIAAN);
    }
    s.world.set(F2, G + 1, z, VUUR);
    s.placeOnTop(F2, G, VUUR); // gate columns, but the real frame is missing
    expect(s.world.get(F3, G + 1, z)).toBe(AIR);
    expect(F1).toBeGreaterThan(F4);
  });
});
