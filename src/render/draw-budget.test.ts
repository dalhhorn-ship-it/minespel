import { Box3, Frustum, Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { AIR } from '../world/blocks';
import { EYE_HEIGHT } from '../world/physics';
import { CHUNK_SIZE, START_SPOT, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE } from '../world/terrain';
import { LEGACY_HEIGHT, LEGACY_SEED, LEGACY_SIZE, LEGACY_START_SPOT, generateLegacyTerrain, legacyCellIndex } from '../world/terrain-legacy';
import { World } from '../world/world';
import {
  CHUNKS_PER_SIDE, NEAR_BUILD_RADIUS, NEAR_KEEP_RADIUS, buildChunkData, chunkKey, chunkOf, chunksTouchedBy, planNearChunks,
  type MeshData, type WorldView,
} from './chunk-mesh';
import { DEFAULT_QUALITY } from './quality';
import { FAR_PAST_FOG } from './renderer';

// AC240: the draw budget of the big world, counted in CI. No GPU needed: faces are counted, and the frame
// is the set of chunks whose box meets the camera frustum (the rule the renderer culls by).

interface Pose { x: number; y: number; z: number; yaw: number; pitch: number }

/** The 0.7.0 world, meshed by the mesher as it was in 0.7.0 (chunks 0 to 3, 64 x 64 x 64, nothing built outside). */
function legacyView(): WorldView {
  const blocks = generateLegacyTerrain(LEGACY_SEED, 2);
  const inX = (x: number, z: number) => x >= 0 && z >= 0 && x < LEGACY_SIZE && z < LEGACY_SIZE;
  return {
    // Above the old top the mesher builds the top faces, below y 0 nothing, like 0.7.0.
    inBounds: (x, y, z) => inX(x, z) && y >= 0,
    get: (x, y, z) => (inX(x, z) && y >= 0 && y < LEGACY_HEIGHT ? (blocks[legacyCellIndex(x, y, z)] ?? AIR) : AIR),
  };
}

function meshAll(view: WorldView, chunksPerSide: number): Map<string, MeshData> {
  const out = new Map<string, MeshData>();
  for (let cx = 0; cx < chunksPerSide; cx++) {
    for (let cz = 0; cz < chunksPerSide; cz++) out.set(chunkKey(cx, cz), buildChunkData(view, cx, cz));
  }
  return out;
}

/** The frustum of the game camera: 70 degrees up and down, the given aspect and far plane. */
function frustumFor(p: Pose, far: number, aspect = 1180 / 820): Frustum {
  const camera = new PerspectiveCamera(70, aspect, 0.1, far);
  camera.rotation.order = 'YXZ';
  camera.position.set(p.x, p.y, p.z);
  camera.rotation.set(p.pitch, p.yaw + Math.PI, 0);
  camera.updateMatrixWorld();
  const frustum = new Frustum();
  frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return frustum;
}

/** Faces of every chunk whose bounding box meets the frustum, and how many chunks that is. */
function frameFaces(meshes: Map<string, MeshData>, frustum: Frustum): { faces: number; chunks: number } {
  let faces = 0;
  let chunks = 0;
  for (const data of meshes.values()) {
    if (data.faceCount === 0) continue;
    if (frustum.intersectsBox(new Box3().setFromArray(data.positions))) {
      faces += data.faceCount;
      chunks++;
    }
  }
  return { faces, chunks };
}

/** Top block of a column plus one: where feet stand. */
function groundAt(world: World, x: number, z: number): number {
  let y = WORLD_HEIGHT - 1;
  while (y > 0 && world.get(x, y, z) === AIR) y--;
  return y + 1;
}

/** The legacy (0.7.0) start spot: eye height, looking along +z. The camera far was the fog end 60 plus 20. */
const LEGACY_START_POSE: Pose = {
  x: LEGACY_START_SPOT.x, y: LEGACY_START_SPOT.y + EYE_HEIGHT, z: LEGACY_START_SPOT.z, yaw: 0, pitch: 0,
};
const LEGACY_FAR = 80;
/** The big world far plane: the fog end plus the margin the renderer uses. */
const FAR = DEFAULT_QUALITY.fogFar + FAR_PAST_FOG;

// Measured once on the 0.7.0 world (a view over generateLegacyTerrain(seed, 2), chunks 0 to 3) with the mesher of
// commit 97f876c, which already built no face against the world edge or under y 0: all faces, and the faces of the
// chunks in the frame at the legacy start spot (eye 1.6, yaw 0, pitch 0, fov 70, aspect 1180 / 820, far 80).
const FACES_070_TOTAL = 9613;
const FACES_070_START = 4002;

const world = new World(WORLD_SEED);
const v3 = meshAll(world, CHUNKS_PER_SIDE);
const legacy = meshAll(legacyView(), LEGACY_SIZE / CHUNK_SIZE);
const sum = (m: Map<string, MeshData>) => [...m.values()].reduce((n, d) => n + d.faceCount, 0);

describe('draw budget of the big world', () => {
  it('AC240: the 0.7.0 numbers are the ones kept as constants', () => {
    expect(sum(legacy)).toBe(FACES_070_TOTAL);
    expect(frameFaces(legacy, frustumFor(LEGACY_START_POSE, LEGACY_FAR)).faces).toBe(FACES_070_START);
  });

  it('AC240: no chunk mesh has more than 65 536 vertices', () => {
    expect(v3.size).toBe(CHUNKS_PER_SIDE * CHUNKS_PER_SIDE);
    for (const d of v3.values()) expect(d.positions.length / 3).toBeLessThanOrEqual(65_536);
  });

  it('AC240: all faces together are at most 5 times those of the version 2 start world', () => {
    expect(sum(v3)).toBeLessThanOrEqual(5 * sum(legacy));
  });

  it('AC240: the faces drawn at the start spot are at most 3.5 times what 0.7.0 draws', () => {
    const pose: Pose = { x: START_SPOT.x, y: START_SPOT.y + EYE_HEIGHT, z: START_SPOT.z, yaw: 0, pitch: 0 };
    expect(frameFaces(v3, frustumFor(pose, FAR)).faces).toBeLessThanOrEqual(3.5 * FACES_070_START);
  });

  // AC240 sets the 3.5 times budget for the start spot only. At this corner the frame holds more
  // land: measured 15202 faces in 28 chunks, 3.8 times the 0.7.0 start frame (worst spot found: 4.9 times).
  // That is reported to the founder for the iPad check (AC241); the Kijkafstand switch (AC243) is the lever.
  // This case keeps the corner from getting worse and checks that culling still drops chunks there.
  it('AC240: at (8, ground, 8) looking to the middle the frame is culled and no heavier than measured', () => {
    const yaw = Math.atan2(WORLD_SIZE / 2 - 8, WORLD_SIZE / 2 - 8);
    const pose: Pose = { x: 8, y: groundAt(world, 8, 8) + EYE_HEIGHT, z: 8, yaw, pitch: 0 };
    const frame = frameFaces(v3, frustumFor(pose, FAR));
    expect(frame.faces).toBeLessThanOrEqual(15202);
    expect(frame.faces).toBeLessThan(sum(v3));
  });

  it('AC240: one block change rebuilds at most 3 chunks, on a corner, an edge or inside', () => {
    let most = 0;
    for (let x = 0; x < WORLD_SIZE; x++) {
      for (const z of [0, 1, 15, 16, 17, 31, 32, 64, 127]) most = Math.max(most, chunksTouchedBy(x, z).length);
    }
    expect(most).toBe(3);
  });

  it('AC240: the camera far plane is the fog end plus 4', () => {
    expect(FAR_PAST_FOG).toBe(4);
    expect(FAR).toBe(DEFAULT_QUALITY.fogFar + 4);
  });
});

describe('near mode (fallback step 1)', () => {
  /** Walks a path of chunk positions with the frame rule: at most 2 new meshes per frame, nearest first. */
  function walk(path: [number, number][], framesPerStep: number): { builtFar: number; keptFar: number; final: Set<string> } {
    const done = new Set<string>();
    let builtFar = 0;
    let keptFar = 0;
    for (const [pcx, pcz] of path) {
      for (let f = 0; f < framesPerStep; f++) {
        const plan = planNearChunks(pcx, pcz, done);
        expect(plan.build.length).toBeLessThanOrEqual(2);
        for (const key of plan.drop) done.delete(key);
        for (const [cx, cz] of plan.build) {
          builtFar = Math.max(builtFar, Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)));
          done.add(chunkKey(cx, cz));
        }
        for (const key of done) {
          const [a = 0, b = 0] = key.split(',').map(Number);
          keptFar = Math.max(keptFar, Math.max(Math.abs(a - pcx), Math.abs(b - pcz)));
        }
      }
    }
    return { builtFar, keptFar, final: done };
  }

  it('AC240: with near on, nothing farther than 4 chunks is built and nothing over 6 is kept', () => {
    const path: [number, number][] = [];
    for (let x = chunkOf(0); x < CHUNKS_PER_SIDE; x++) path.push([x, 0]);
    for (let z = 0; z < CHUNKS_PER_SIDE; z++) path.push([CHUNKS_PER_SIDE - 1, z]);
    for (let x = CHUNKS_PER_SIDE - 1; x >= 0; x--) path.push([x, CHUNKS_PER_SIDE - 1]);
    const r = walk(path, 30);
    expect(r.builtFar).toBeLessThanOrEqual(NEAR_BUILD_RADIUS);
    expect(r.keptFar).toBeLessThanOrEqual(NEAR_KEEP_RADIUS);
    // Standing in the last corner for a while: the near chunks are all there, and the far corner is gone.
    for (const key of r.final) {
      const [a = 0, b = 0] = key.split(',').map(Number);
      expect(Math.max(Math.abs(a - 0), Math.abs(b - (CHUNKS_PER_SIDE - 1)))).toBeLessThanOrEqual(NEAR_KEEP_RADIUS);
    }
    expect(r.final.has(chunkKey(0, CHUNKS_PER_SIDE - 1))).toBe(true);
    expect(r.final.has(chunkKey(7, 0))).toBe(false);
  });

  it('AC240: the nearest chunks come first, 2 per frame', () => {
    const plan = planNearChunks(4, 4, []);
    expect(plan.build).toHaveLength(2);
    expect(plan.build[0]).toEqual([4, 4]);
    expect(plan.drop).toEqual([]);
  });

  it('AC240: a jump far away drops what is over 6 chunks and builds near the new place', () => {
    const done = [chunkKey(0, 0), chunkKey(1, 0), chunkKey(7, 7)];
    const plan = planNearChunks(7, 7, done);
    expect(plan.drop.sort()).toEqual([chunkKey(0, 0), chunkKey(1, 0)].sort());
    expect([[6, 7], [7, 6]]).toContainEqual(plan.build[0]);
  });
});
