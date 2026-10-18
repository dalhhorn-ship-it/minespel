import { describe, expect, it, vi } from 'vitest';
import { AIR, GRAS, OBSIDIAAN, OERSTEEN, STEEN, VUUR, WOL_ROOD } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { EYE_HEIGHT, createPlayer } from '../world/physics';
import { DEFAULT_HOTBAR, aimFromScreen, createBuildController, tryLightObsidianGate } from './build-controller';

const FLOOR = 4; // floor top at y = 5
function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++)
    for (let z = 0; z < WORLD_SIZE; z++) for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
  return w;
}

function setup(yaw = 0, pitch = 0, py = 5) {
  const world = flatWorld();
  const p = createPlayer(20.5, py, 20.5);
  const ctrl = {
    player: p,
    yaw,
    pitch,
    pose: () => ({ x: p.x, y: p.y + EYE_HEIGHT, z: p.z, yaw: ctrl.yaw, pitch: ctrl.pitch }),
  };
  const onBlockChanged = vi.fn();
  const pop = vi.fn();
  const play = vi.fn();
  const c = createBuildController({
    world,
    player: ctrl as never,
    onBlockChanged,
    effects: { pop },
    sound: { play },
    viewport: () => ({ width: 1000, height: 700 }),
  });
  return { world, p, ctrl, c, onBlockChanged, pop, play };
}

describe('aimFromScreen', () => {
  const unit = (a: { dx: number; dy: number; dz: number }) => {
    const l = Math.hypot(a.dx, a.dy, a.dz);
    return { x: a.dx / l, y: a.dy / l, z: a.dz / l };
  };

  it('the screen centre looks along the view direction (yaw 0 is +z)', () => {
    const a = unit(aimFromScreen({ x: 1, y: 2, z: 3, yaw: 0, pitch: 0 }, 1000, 700, 500, 350));
    expect(a.x).toBeCloseTo(0);
    expect(a.y).toBeCloseTo(0);
    expect(a.z).toBeCloseTo(1);
  });

  it('yaw pi/2 looks towards +x', () => {
    const a = unit(aimFromScreen({ x: 0, y: 0, z: 0, yaw: Math.PI / 2, pitch: 0 }, 1000, 700, 500, 350));
    expect(a.x).toBeCloseTo(1);
  });

  it('the right of the screen is to the right of the view, the top is up', () => {
    const right = unit(aimFromScreen({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 1000, 700, 900, 350));
    expect(right.x).toBeLessThan(0); // facing +z, right is -x
    const top = unit(aimFromScreen({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 1000, 700, 500, 50));
    expect(top.y).toBeGreaterThan(0);
  });

  it('the top edge is half the field of view above the centre', () => {
    const top = unit(aimFromScreen({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, 1000, 700, 500, 0));
    expect(Math.asin(top.y)).toBeCloseTo((35 * Math.PI) / 180, 5);
  });
});

describe('build controller', () => {
  it('starts with the 8 given blocks in the hotbar and Hakken mode (AC7)', () => {
    const { c } = setup();
    expect(DEFAULT_HOTBAR).toHaveLength(8);
    expect(c.getState()).toEqual({ mode: 'hakken', hotbar: [...DEFAULT_HOTBAR], selected: 0 });
    expect(DEFAULT_HOTBAR[7]).toBe(WOL_ROOD);
  });

  it('AC3: a tap in Hakken mode removes the block under the finger, with pop and sound', () => {
    const s = setup(0, 0); // eye y is 6.6
    s.world.set(20, 6, 24, GRAS);
    s.c.tap(500, 350);
    expect(s.world.get(20, 6, 24)).toBe(AIR);
    expect(s.onBlockChanged).toHaveBeenCalledWith(20, 24);
    expect(s.pop).toHaveBeenCalledWith(500, 350, GRAS);
    expect(s.play).toHaveBeenCalledWith('pop');
  });

  it('AC4: oersteen and far blocks stay', () => {
    const s = setup(0, 0);
    s.world.set(20, 6, 24, OERSTEEN);
    s.c.tap(500, 350);
    expect(s.world.get(20, 6, 24)).toBe(OERSTEEN);
    const far = setup(0, 0);
    far.world.set(20, 6, 30, GRAS);
    far.c.tap(500, 350);
    expect(far.world.get(20, 6, 30)).toBe(GRAS);
    expect(far.play).not.toHaveBeenCalled();
  });

  it('AC5: Bouwen puts the selected block against the face, with thunk', () => {
    const s = setup(0, 0);
    s.world.set(20, 6, 24, GRAS);
    s.c.setMode('bouwen');
    s.c.select(3);
    s.c.tap(500, 350);
    expect(s.world.get(20, 6, 23)).toBe(s.c.getState().hotbar[3]);
    expect(s.onBlockChanged).toHaveBeenCalledWith(20, 23);
    expect(s.play).toHaveBeenCalledWith('thunk');
  });

  it('AC151: every placeable block can be put in a slot, none runs out', () => {
    const s = setup(0, 0);
    s.world.set(20, 6, 24, GRAS);
    s.c.setMode('bouwen');
    s.c.setSlotBlock(2, WOL_ROOD);
    expect(s.c.getState().selected).toBe(2);
    s.c.tap(500, 350);
    expect(s.world.get(20, 6, 23)).toBe(WOL_ROOD);
    s.c.tap(500, 350); // again: the next cell in front, the block is still there to use
    expect(s.world.get(20, 6, 22)).toBe(WOL_ROOD);
  });

  it('AC6: no block is placed inside the player', () => {
    const s = setup(0, -0.9);
    s.world.set(20, 5, 21, GRAS); // a wall right in front of the feet
    s.c.setMode('bouwen');
    s.c.tap(500, 350);
    expect(s.world.get(20, 5, 20)).toBe(AIR); // the cell the player stands in
    expect(s.play).not.toHaveBeenCalled();
  });

  it('AC103: tapping the top of the block under the feet builds up and lifts the player', () => {
    const s = setup(0, -1.4, 5); // looking steeply down
    s.c.setMode('bouwen');
    s.c.tap(500, 350);
    const y = s.p.y;
    expect(y).toBe(6);
    expect(s.p.vy).toBe(0);
    expect(s.world.get(20, 5, 20)).not.toBe(AIR);
  });

  it('AC103: no room above the head means nothing is placed', () => {
    const s = setup(0, -1.4, 5);
    s.world.set(20, 7, 20, STEEN); // ceiling low
    s.world.set(20, 8, 20, STEEN);
    s.c.setMode('bouwen');
    s.c.tap(500, 350);
    expect(s.p.y).toBe(5);
    expect(s.world.get(20, 5, 20)).toBe(AIR);
    expect(s.play).not.toHaveBeenCalled();
  });

  it('AC105: two quick taps never fill one cell twice', () => {
    const s = setup(0, 0);
    s.world.set(20, 6, 24, GRAS);
    s.c.setMode('bouwen');
    s.c.tap(500, 350);
    s.c.tap(500, 350);
    expect(s.onBlockChanged).toHaveBeenCalledTimes(2);
    expect(s.world.get(20, 6, 23)).not.toBe(AIR);
    expect(s.world.get(20, 6, 22)).not.toBe(AIR);
  });

  it('does nothing while the world is stopped', () => {
    const s = setup(0, 0);
    s.world.set(20, 6, 24, GRAS);
    const c = createBuildController({
      world: s.world, player: { player: s.p, pose: () => ({ x: 20.5, y: 6.6, z: 20.5, yaw: 0, pitch: 0 }) } as never,
      onBlockChanged: s.onBlockChanged, effects: { pop: s.pop }, sound: { play: s.play },
      viewport: () => ({ width: 1000, height: 700 }), canAct: () => false,
    });
    c.tap(500, 350);
    expect(s.world.get(20, 6, 24)).toBe(GRAS);
  });

  it('setState fixes up bad data', () => {
    const { c } = setup();
    c.setState({ hotbar: [1, 2, 3], selected: 99, mode: 'bouwen' });
    const s = c.getState();
    expect(s.hotbar).toEqual([...DEFAULT_HOTBAR]);
    expect(s.selected).toBe(0);
    expect(s.mode).toBe('bouwen');
    c.setState({ hotbar: [1, 2, 3, 4, 5, 6, 7, 17] });
    expect(c.getState().hotbar).toEqual([...DEFAULT_HOTBAR]);
    c.setState({ hotbar: [1, 2, 3, 4, 5, 6, 7, 8], selected: 5 });
    expect(c.getState().hotbar).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(c.getState().selected).toBe(5);
  });

  it('CR2: lights the inner gate floor with VUUR when 4 obsidian floor blocks have left and right pillars', () => {
    const w = flatWorld();
    const changed: Array<[number, number]> = [];
    // 4 obsidian blocks on the ground at y = 5, x = 10..13, z = 20
    for (let x = 10; x <= 13; x++) w.set(x, 5, 20, OBSIDIAAN);
    // Left pillar (x=10) and right pillar (x=13) built up 2 blocks high (y=6, 7)
    w.set(10, 6, 20, OBSIDIAAN);
    w.set(10, 7, 20, OBSIDIAAN);
    w.set(13, 6, 20, OBSIDIAAN);
    w.set(13, 7, 20, OBSIDIAAN);
    // Place fire on one inner floor block (x=11, y=6, z=20)
    w.set(11, 6, 20, VUUR);

    const lit = tryLightObsidianGate(w, 11, 6, 20, (x, z) => changed.push([x, z]));
    expect(lit).toBe(true);
    expect(w.get(11, 6, 20)).toBe(VUUR);
    expect(w.get(12, 6, 20)).toBe(VUUR);
    expect(changed).toContainEqual([12, 20]);
  });
});
