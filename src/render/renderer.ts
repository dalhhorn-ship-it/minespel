// Scene, camera, fog, pixel ratio cap and chunk meshes. The only place that talks to WebGL for the world.
// Game state never lives in three.js objects: the renderer is told what to draw.

import {
  BoxGeometry, Color, Fog, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer,
  type BufferGeometry,
} from 'three';
import { SPIKE_DINO_COUNT, type SpikeDino } from '../dev/spike-load';
import { CHUNK_SIZE } from '../world/terrain';
import { createAtlasTexture } from './atlas';
import { CHUNKS_PER_SIDE, buildChunkGeometry, chunksTouchedBy, type WorldView } from './chunk-mesh';
import { DEFAULT_QUALITY, pixelRatioFor, type Quality } from './quality';

export { CHUNK_SIZE };

export interface CameraPose {
  /** Eye position in world coordinates. */
  x: number;
  y: number;
  z: number;
  /** Turn around the up axis, radians. 0 looks towards +z. */
  yaw: number;
  /** Up and down, radians. Positive looks up. */
  pitch: number;
}

/** What the game needs from a renderer. Tests and the e2e build can pass any object that fits. */
export interface GameRenderer {
  readonly canvas: HTMLCanvasElement | null;
  /** Builds the meshes of every chunk. Call once after the world is ready. */
  setWorld(world: WorldView): void;
  /** Rebuilds the chunk(s) that a changed block at (x, z) touches. */
  blockChanged(x: number, z: number): void;
  setCamera(pose: CameraPose): void;
  /** Size in css pixels and the device pixel ratio (which the quality cap limits). */
  resize(width: number, height: number, devicePixelRatio: number): void;
  setQuality(quality: Quality): void;
  /** Shows these placeholder dinos (the speed spike), or none with null. Transforms are read every frame. */
  setSpikeDinos(dinos: readonly SpikeDino[] | null): void;
  render(): void;
  dispose(): void;
}

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  quality?: Quality;
}

export type RendererFactory = (options: RendererOptions) => GameRenderer;

const SKY = 0x9ad7ff;

function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** The real WebGL renderer. */
export const createWebGlRenderer: RendererFactory = ({ canvas, quality = DEFAULT_QUALITY }) => {
  let q = quality;
  const gl = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const scene = new Scene();
  scene.background = new Color(SKY);
  scene.fog = new Fog(SKY, q.fogNear, q.fogFar);
  const camera = new PerspectiveCamera(70, 1, 0.1, q.fogFar + 20);
  camera.rotation.order = 'YXZ';

  const material = new MeshBasicMaterial({ map: createAtlasTexture(), vertexColors: true, alphaTest: 0.5 });
  const chunkGroup = new Group();
  scene.add(chunkGroup);
  const chunks = new Map<string, Mesh>();
  let world: WorldView | null = null;

  const spikeGroup = new Group();
  scene.add(spikeGroup);
  const spikeGeometry = new BoxGeometry(1, 1, 1);
  const spikeMaterials = new Map<number, MeshBasicMaterial>();
  let spikeDinos: readonly SpikeDino[] = [];
  let spikeGroups: Group[] = [];

  function rebuildChunk(cx: number, cz: number): void {
    if (!world) return;
    const key = chunkKey(cx, cz);
    const old = chunks.get(key);
    if (old) {
      chunkGroup.remove(old);
      old.geometry.dispose();
      chunks.delete(key);
    }
    const geometry: BufferGeometry | null = buildChunkGeometry(world, cx, cz);
    if (!geometry) return;
    const mesh = new Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    chunkGroup.add(mesh);
    chunks.set(key, mesh);
  }

  function clearSpike(): void {
    spikeGroup.clear();
    spikeGroups = [];
    spikeDinos = [];
  }

  return {
    canvas,
    setWorld(w) {
      world = w;
      for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
        for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) rebuildChunk(cx, cz);
      }
    },
    blockChanged(x, z) {
      for (const [cx, cz] of chunksTouchedBy(x, z)) rebuildChunk(cx, cz);
    },
    setCamera(p) {
      camera.position.set(p.x, p.y, p.z);
      // Yaw 0 looks towards +z, so turn half a circle from three's default of -z.
      camera.rotation.set(p.pitch, p.yaw + Math.PI, 0);
    },
    resize(width, height, dpr) {
      gl.setPixelRatio(pixelRatioFor(dpr, q));
      gl.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    },
    setQuality(next) {
      q = next;
      const fog = scene.fog as Fog;
      fog.near = q.fogNear;
      fog.far = q.fogFar;
      camera.far = q.fogFar + 20;
      camera.updateProjectionMatrix();
      gl.setPixelRatio(pixelRatioFor(window.devicePixelRatio, q));
      gl.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height, false);
    },
    setSpikeDinos(dinos) {
      clearSpike();
      if (!dinos) return;
      spikeDinos = dinos.slice(0, SPIKE_DINO_COUNT * 4);
      spikeGroups = spikeDinos.map((d) => {
        const g = new Group();
        for (const part of d.parts) {
          let m = spikeMaterials.get(part.color);
          if (!m) {
            m = new MeshBasicMaterial({ color: part.color });
            spikeMaterials.set(part.color, m);
          }
          const box = new Mesh(spikeGeometry, m);
          box.scale.set(part.w, part.h, part.d);
          box.position.set(part.ox, part.oy + part.h / 2, part.oz);
          g.add(box);
        }
        spikeGroup.add(g);
        return g;
      });
    },
    render() {
      spikeDinos.forEach((d, i) => {
        const g = spikeGroups[i];
        if (!g) return;
        g.position.set(d.x, d.y, d.z);
        g.rotation.y = d.yaw;
      });
      gl.render(scene, camera);
    },
    dispose() {
      for (const m of chunks.values()) m.geometry.dispose();
      chunks.clear();
      clearSpike();
      spikeGeometry.dispose();
      for (const m of spikeMaterials.values()) m.dispose();
      material.map?.dispose();
      material.dispose();
      gl.dispose();
    },
  };
};

/** Draws nothing. For tests and for a build where headless WebKit has no WebGL. */
export const createNullRenderer: RendererFactory = ({ canvas }) => ({
  canvas,
  setWorld() {},
  blockChanged() {},
  setCamera() {},
  resize() {},
  setQuality() {},
  setSpikeDinos() {},
  render() {},
  dispose() {},
});

/** Makes a renderer through a factory. The default is the WebGL one. */
export function createRenderer(options: RendererOptions, factory: RendererFactory = createWebGlRenderer): GameRenderer {
  return factory(options);
}
