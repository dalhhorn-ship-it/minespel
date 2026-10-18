import { BufferAttribute, BufferGeometry } from 'three';
import { AIR, isCutout, isGlowing } from '../world/blocks';
import { CHUNK_SIZE, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { tileFor, tileUv, type FaceKind } from './atlas';

/** What the mesher needs from the world. `World` fits. */
export interface WorldView {
  get(x: number, y: number, z: number): number;
  inBounds(x: number, y: number, z: number): boolean;
  /** Highest y index in chunk (cx, cz) with a non-air block, or -1 when all air. */
  highestNonAirY?(cx: number, cz: number): number;
}

export interface MeshData {
  positions: Float32Array;
  uvs: Float32Array;
  /** Per vertex brightness as rgb. */
  colors: Float32Array;
  indices: Uint32Array;
  faceCount: number;
}

export const CHUNKS_PER_SIDE = WORLD_SIZE / CHUNK_SIZE;

interface Face {
  dir: readonly [number, number, number];
  kind: FaceKind;
  /** Fixed brightness, no lights needed. */
  shade: number;
  /** Four corners, counter clockwise seen from outside. */
  corners: readonly (readonly [number, number, number])[];
}

export const FACES: readonly Face[] = [
  { dir: [0, 1, 0], kind: 'top', shade: 1.0, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], kind: 'bottom', shade: 0.5, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], kind: 'side', shade: 0.8, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], kind: 'side', shade: 0.8, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 0, 1], kind: 'side', shade: 0.6, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], kind: 'side', shade: 0.6, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

/**
 * A face is built when the cell next to it lets you see it: air or a cut out block.
 * Two touching blocks of the same cut out kind (glass in glass) hide each other.
 * Faces towards the world edge and the ground under the world are never built.
 */
function faceVisible(world: WorldView, id: number, nx: number, ny: number, nz: number): boolean {
  if (ny >= WORLD_HEIGHT) return true;
  if (!world.inBounds(nx, ny, nz)) return false;
  const other = world.get(nx, ny, nz);
  if (other === AIR) return true;
  if (!isCutout(other)) return false;
  return other !== id;
}

/** Builds the mesh data of one chunk (cx, cz count chunks, not blocks). Vertices use world coordinates. */
export function buildChunkData(world: WorldView, cx: number, cz: number): MeshData {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const x0 = cx * CHUNK_SIZE;
  const z0 = cz * CHUNK_SIZE;
  let faces = 0;

  const topY = world.highestNonAirY ? world.highestNonAirY(cx, cz) : WORLD_HEIGHT - 1;
  const yLimit = topY < 0 ? 0 : Math.min(WORLD_HEIGHT, topY + 2);

  for (let y = 0; y < yLimit; y++) {
    for (let z = z0; z < z0 + CHUNK_SIZE; z++) {
      for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const glowing = isGlowing(id);
        for (const face of FACES) {
          const [dx, dy, dz] = face.dir;
          if (!faceVisible(world, id, x + dx, y + dy, z + dz)) continue;
          const tile = tileFor(id, face.kind);
          if (tile < 0) continue;
          const { u0, u1, v0, v1 } = tileUv(tile);
          const base = positions.length / 3;
          const uvCorners = [u0, v0, u1, v0, u1, v1, u0, v1];
          const shade = glowing ? 1.0 : face.shade;
          face.corners.forEach((c, i) => {
            positions.push(x + c[0], y + c[1], z + c[2]);
            uvs.push(uvCorners[i * 2] ?? 0, uvCorners[i * 2 + 1] ?? 0);
            colors.push(shade, shade, shade);
          });
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          faces++;
        }
      }
    }
  }

  return {
    positions: Float32Array.from(positions),
    uvs: Float32Array.from(uvs),
    colors: Float32Array.from(colors),
    indices: Uint32Array.from(indices),
    faceCount: faces,
  };
}

/** Wraps mesh data in a three.js geometry. Returns null for an empty chunk. */
export function toGeometry(data: MeshData): BufferGeometry | null {
  if (data.faceCount === 0) return null;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(data.positions, 3));
  g.setAttribute('uv', new BufferAttribute(data.uvs, 2));
  g.setAttribute('color', new BufferAttribute(data.colors, 3));
  g.setIndex(new BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export function buildChunkGeometry(world: WorldView, cx: number, cz: number): BufferGeometry | null {
  return toGeometry(buildChunkData(world, cx, cz));
}

/** Chunk coordinates that a changed block touches: its own chunk plus neighbours when on a chunk edge. */
export function chunksTouchedBy(x: number, z: number): [number, number][] {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const out: [number, number][] = [[cx, cz]];
  const lx = x - cx * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  if (lx === 0) out.push([cx - 1, cz]);
  if (lx === CHUNK_SIZE - 1) out.push([cx + 1, cz]);
  if (lz === 0) out.push([cx, cz - 1]);
  if (lz === CHUNK_SIZE - 1) out.push([cx, cz + 1]);
  return out.filter(([a, b]) => a >= 0 && b >= 0 && a < CHUNKS_PER_SIDE && b < CHUNKS_PER_SIDE);
}
