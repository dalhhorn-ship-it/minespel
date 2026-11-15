// Scene, camera, fog, pixel ratio cap and chunk meshes. The only place that talks to WebGL for the world.
// Game state never lives in three.js objects: the renderer is told what to draw.

import {
  BoxGeometry, Color, Fog, Frustum, Group, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
  type BufferGeometry,
} from 'three';
import { registerHook } from '../dev/e2e-hooks';
import { SPIKE_DINO_COUNT, type SpikeDino } from '../dev/spike-load';
import type { WorldDino, WorldEgg } from '../dinos/dino-store';
import type { VillagerState } from '../villagers/villager';
import { CHUNK_SIZE } from '../world/terrain';
import { createAtlasTexture } from './atlas';
import {
  CHUNKS_PER_SIDE, buildChunkGeometry, chunkKey, chunkOf, chunksTouchedBy, planNearChunks, type WorldView,
} from './chunk-mesh';
import { createActorSceneSync, type ActorGroup, type ActorView } from './actor-render';
import { createDinoSceneSync } from './dino-render';
import { createVillagerSceneSync } from './villager-render';
import { DEFAULT_QUALITY, pixelRatioFor, type Quality } from './quality';

export { CHUNK_SIZE };
export type { ActorGroup, ActorView };

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
  /** Syncs real world dinos and eggs into the 3D scene (T42). */
  syncDinos?(dinos: readonly WorldDino[], eggs: readonly WorldEgg[]): void;
  /** Syncs the village people into the 3D scene (V11c). They are not dinos. */
  syncVillagers?(villagers: readonly VillagerState[]): void;
  /** Syncs one group of creature actors (knights, monsters) into the 3D scene (v17, decision 135). */
  syncActors?(group: ActorGroup, actors: readonly ActorView[]): void;
  render(): void;
  dispose(): void;
}

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  quality?: Quality;
}

export type RendererFactory = (options: RendererOptions) => GameRenderer;

const SKY = 0x9ad7ff;

/** The camera sees this far past the fog end. Beyond the fog end everything is sky colour, so nothing visible changes. */
export const FAR_PAST_FOG = 4;

/** Near mode: how many chunks around the player get a mesh at once when the world is set (no hole at the start). */
const NEAR_FIRST_FILL = 25;

/** What the chunk meshes did in the last frame (v15, e2e hook `chunkStats`). */
export interface ChunkStats {
  /** Chunks that have a mesh. */
  meshed: number;
  /** Chunks drawn in the last frame. */
  drawn: number;
  /** Faces of the drawn chunks. */
  facesDrawn: number;
  /** Camera far plane. */
  far: number;
  /** The largest depth (along the view direction) at which a drawn chunk starts. Never above `far`. */
  deepestDrawnStart: number;
  /** The largest distance in chunks between a drawn chunk and the player's chunk. */
  farthestDrawnChunks: number;
  /** The largest distance in chunks between a meshed chunk and the player's chunk. */
  farthestMeshedChunks: number;
}

/** One WebGL renderer on one canvas, with no recovery. `createWebGlRenderer` wraps it. */
const createPlainWebGlRenderer: RendererFactory = ({ canvas, quality = DEFAULT_QUALITY }) => {
  let q = quality;
  const gl = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  const scene = new Scene();
  scene.background = new Color(SKY);
  scene.fog = new Fog(SKY, q.fogNear, q.fogFar);
  const camera = new PerspectiveCamera(70, 1, 0.1, q.fogFar + FAR_PAST_FOG);
  camera.rotation.order = 'YXZ';

  const material = new MeshBasicMaterial({ map: createAtlasTexture(), vertexColors: true, alphaTest: 0.5 });
  const chunkGroup = new Group();
  scene.add(chunkGroup);
  const chunks = new Map<string, Mesh>();
  /** Keys of chunks that were tried in near mode (an empty chunk counts, so it is not tried again). */
  const tried = new Set<string>();
  let world: WorldView | null = null;
  let firstFill = false;
  const frustum = new Frustum();
  const viewProjection = new Matrix4();
  let frame = { drawn: 0, faces: 0, deepest: 0, farthest: 0 };
  let lastFrame = { ...frame };

  /** Depth along the view direction at which a chunk box starts. Only for the e2e hook. */
  function startDepth(mesh: Mesh): number {
    const box = mesh.geometry.boundingBox;
    if (!box) return 0;
    let min = Infinity;
    const v = new Vector3();
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) min = Math.min(min, -v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse).z);
      }
    }
    return min;
  }

  function playerChunk(): [number, number] {
    return [chunkOf(camera.position.x), chunkOf(camera.position.z)];
  }

  function chunkDistance(cx: number, cz: number): number {
    const [pcx, pcz] = playerChunk();
    return Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz));
  }

  const dinoSync = createDinoSceneSync(canvas.ownerDocument);
  scene.add(dinoSync.group);
  const villagerSync = createVillagerSceneSync();
  scene.add(villagerSync.group);
  const actorSync = createActorSceneSync();
  scene.add(actorSync.group);

  const spikeGroup = new Group();
  scene.add(spikeGroup);
  const spikeGeometry = new BoxGeometry(1, 1, 1);
  const spikeMaterials = new Map<number, MeshBasicMaterial>();
  let spikeDinos: readonly SpikeDino[] = [];
  let spikeGroups: Group[] = [];

  function dropChunk(key: string): void {
    const old = chunks.get(key);
    if (old) {
      chunkGroup.remove(old);
      old.geometry.dispose();
      chunks.delete(key);
    }
    tried.delete(key);
  }

  function rebuildChunk(cx: number, cz: number): void {
    if (!world) return;
    const key = chunkKey(cx, cz);
    tried.add(key);
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
    mesh.frustumCulled = false; // `render` culls by the box of the chunk, which is tighter than three's sphere
    mesh.userData = { faceCount: (geometry.getIndex()?.count ?? 0) / 6, cx, cz };
    mesh.onBeforeRender = () => {
      frame.drawn++;
      frame.faces += mesh.userData.faceCount as number;
      if (__E2E__) {
        frame.deepest = Math.max(frame.deepest, startDepth(mesh));
        frame.farthest = Math.max(frame.farthest, chunkDistance(cx, cz));
      }
    };
    chunkGroup.add(mesh);
    chunks.set(key, mesh);
  }

  if (__E2E__) {
    registerHook('chunkStats', (): ChunkStats => {
      let farthestMeshed = 0;
      for (const m of chunks.values()) farthestMeshed = Math.max(farthestMeshed, chunkDistance(m.userData.cx as number, m.userData.cz as number));
      return {
        meshed: chunks.size,
        drawn: lastFrame.drawn,
        facesDrawn: lastFrame.faces,
        far: camera.far,
        deepestDrawnStart: lastFrame.deepest,
        farthestDrawnChunks: lastFrame.farthest,
        farthestMeshedChunks: farthestMeshed,
      };
    });
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
      if (q.near) {
        for (const key of [...chunks.keys()]) dropChunk(key);
        tried.clear();
        firstFill = true;
        return;
      }
      for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
        for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) rebuildChunk(cx, cz);
      }
    },
    blockChanged(x, z) {
      for (const [cx, cz] of chunksTouchedBy(x, z)) {
        // Near mode: a chunk without a mesh is meshed later with the current blocks.
        if (!q.near || tried.has(chunkKey(cx, cz))) rebuildChunk(cx, cz);
      }
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
      const wasNear = q.near;
      q = next;
      if (wasNear && !q.near && world) {
        for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
          for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) if (!tried.has(chunkKey(cx, cz))) rebuildChunk(cx, cz);
        }
      }
      const fog = scene.fog as Fog;
      fog.near = q.fogNear;
      fog.far = q.fogFar;
      camera.far = q.fogFar + FAR_PAST_FOG;
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
    syncDinos(dinos, eggs) {
      dinoSync.sync(dinos, eggs);
    },
    syncVillagers(villagers) {
      villagerSync.sync(villagers);
    },
    syncActors(group, actors) {
      actorSync.sync(group, actors);
    },
    render() {
      spikeDinos.forEach((d, i) => {
        const g = spikeGroups[i];
        if (!g) return;
        g.position.set(d.x, d.y, d.z);
        g.rotation.y = d.yaw;
      });
      if (q.near && world) {
        const [pcx, pcz] = playerChunk();
        const plan = planNearChunks(pcx, pcz, tried, firstFill ? NEAR_FIRST_FILL : undefined);
        firstFill = false;
        for (const key of plan.drop) dropChunk(key);
        for (const [cx, cz] of plan.build) rebuildChunk(cx, cz);
      }
      // Cull the chunks by their box against the view, then three draws what is left.
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      for (const m of chunks.values()) {
        const box = m.geometry.boundingBox;
        const inRadius = q.drawRadius === null || chunkDistance(m.userData.cx as number, m.userData.cz as number) <= q.drawRadius;
        m.visible = inRadius && (!box || frustum.intersectsBox(box));
      }
      frame = { drawn: 0, faces: 0, deepest: 0, farthest: 0 };
      gl.render(scene, camera);
      lastFrame = frame;
    },
    dispose() {
      for (const m of chunks.values()) m.geometry.dispose();
      chunks.clear();
      dinoSync.dispose();
      villagerSync.dispose();
      actorSync.dispose();
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
  syncDinos() {},
  syncVillagers() {},
  syncActors() {},
  render() {},
  dispose() {},
});

/** Makes a renderer through a factory. The default is the WebGL one. */
export function createRenderer(options: RendererOptions, factory: RendererFactory = createWebGlRenderer): GameRenderer {
  return factory(options);
}

/** How long to wait for the browser to restore a lost WebGL context before making a new canvas. */
export const CONTEXT_RESTORE_WAIT_MS = 1500;

/**
 * Wraps a renderer so that a lost WebGL context (iOS does this when the app was in the background)
 * is fixed. Everything the game told the renderer is remembered. On restore the inner renderer is
 * built again on the same canvas (atlas, chunks, dinos). With no restore in 1.5 seconds it is built
 * on a new canvas that takes the place of the old one. The game state is not touched.
 */
export function withContextRecovery(inner: RendererFactory): RendererFactory {
  return ({ canvas: firstCanvas, quality }) => {
    let canvas = firstCanvas;
    let q = quality;
    let world: WorldView | null = null;
    let pose: CameraPose | null = null;
    let size: { w: number; h: number; dpr: number } | null = null;
    let dinos: readonly SpikeDino[] | null = null;
    let worldDinos: readonly WorldDino[] = [];
    let worldEggs: readonly WorldEgg[] = [];
    let villagers: readonly VillagerState[] = [];
    const actors = new Map<ActorGroup, readonly ActorView[]>();
    let lost = false;
    let disposed = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let core: GameRenderer = inner({ canvas, quality: q });

    const clearTimer = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const replay = () => {
      if (size) core.resize(size.w, size.h, size.dpr);
      if (world) core.setWorld(world);
      if (dinos) core.setSpikeDinos(dinos);
      if (worldDinos.length > 0 || worldEggs.length > 0) core.syncDinos?.(worldDinos, worldEggs);
      if (villagers.length > 0) core.syncVillagers?.(villagers);
      for (const [group, list] of actors) if (list.length > 0) core.syncActors?.(group, list);
      if (pose) core.setCamera(pose);
    };

    const onLost = (event: Event) => {
      event.preventDefault(); // Tells the browser that we want the context back.
      if (disposed) return;
      lost = true;
      clearTimer();
      timer = setTimeout(newCanvas, CONTEXT_RESTORE_WAIT_MS);
    };
    const onRestored = () => {
      if (disposed || !lost) return;
      clearTimer();
      rebuild(canvas);
    };
    const listen = (c: HTMLCanvasElement) => {
      c.addEventListener('webglcontextlost', onLost);
      c.addEventListener('webglcontextrestored', onRestored);
    };
    const unlisten = (c: HTMLCanvasElement) => {
      c.removeEventListener('webglcontextlost', onLost);
      c.removeEventListener('webglcontextrestored', onRestored);
    };

    /** Builds the inner renderer again on this canvas and gives it everything. */
    function rebuild(onto: HTMLCanvasElement): void {
      try {
        core.dispose();
      } catch {
        /* the old one may be half dead */
      }
      try {
        core = inner({ canvas: onto, quality: q });
        replay();
        lost = false;
      } catch {
        // WebGL is not ready yet. Try again later, the screen keeps its last picture.
        lost = true;
        clearTimer();
        timer = setTimeout(newCanvas, CONTEXT_RESTORE_WAIT_MS);
      }
    }

    function newCanvas(): void {
      timer = undefined;
      if (disposed) return;
      const fresh = document.createElement('canvas');
      for (const a of Array.from(canvas.attributes)) fresh.setAttribute(a.name, a.value);
      unlisten(canvas);
      canvas.replaceWith(fresh);
      canvas = fresh;
      listen(canvas);
      generation++;
      rebuild(canvas);
    }

    listen(canvas);

    if (__E2E__) {
      // A lost context gives no extension, so keep the one we got while it was alive.
      let loseExt: WEBGL_lose_context | null = null;
      registerHook('loseWebGl', () => {
        loseExt = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context') ?? canvas.getContext('webgl')?.getExtension('WEBGL_lose_context') ?? null;
        loseExt?.loseContext();
        return !!loseExt;
      });
      registerHook('restoreWebGl', () => {
        loseExt?.restoreContext();
      });
      registerHook('canvasGeneration', () => generation);
      registerHook('webGlLost', () => lost);
    }

    return {
      get canvas() {
        return canvas;
      },
      setWorld(w) {
        world = w;
        core.setWorld(w);
      },
      blockChanged(x, z) {
        if (!lost) core.blockChanged(x, z); // the saved world already has it, the rebuild draws it
      },
      setCamera(p) {
        pose = p;
        if (!lost) core.setCamera(p);
      },
      resize(width, height, dpr) {
        size = { w: width, h: height, dpr };
        if (!lost) core.resize(width, height, dpr);
      },
      setQuality(next) {
        q = next;
        if (!lost) core.setQuality(next);
      },
      setSpikeDinos(d) {
        dinos = d;
        if (!lost) core.setSpikeDinos(d);
      },
      syncDinos(dList, eList) {
        worldDinos = dList;
        worldEggs = eList;
        if (!lost) core.syncDinos?.(dList, eList);
      },
      syncVillagers(list) {
        villagers = list;
        if (!lost) core.syncVillagers?.(list);
      },
      syncActors(group, list) {
        actors.set(group, list);
        if (!lost) core.syncActors?.(group, list);
      },
      render() {
        if (!lost) core.render();
      },
      dispose() {
        disposed = true;
        clearTimer();
        unlisten(canvas);
        core.dispose();
        canvas.remove();
      },
    };
  };
}

/** The real WebGL renderer, with context loss recovery. */
export const createWebGlRenderer: RendererFactory = withContextRecovery(createPlainWebGlRenderer);
