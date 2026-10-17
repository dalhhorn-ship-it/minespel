// The running game: world, renderer, input, HUD and the loop. Other features hook in through the returned object.
import { createSound, type Sound } from '../audio/sound';
import type { AudioUnlock } from '../platform/audio-unlock';
import { createEffects } from '../render/effects';
import { createBlockGrid } from '../ui/block-grid';
import { createHotbar } from '../ui/hotbar';
import { createBuildController, type BuildState } from './build-controller';
import { createFpsCounter, type FpsCounter } from '../render/fps-counter';
import { createLook } from '../input/look';
import { createPointerRouter } from '../input/pointer-router';
import { createStick } from '../input/stick';
import { createSpikeDinos, isSpikeEnabled, stepSpikeDinos, type SpikeDino } from '../dev/spike-load';
import type { GuardState } from '../platform/screen-guard';
import { qualityFromSearch } from '../render/quality';
import type { GameRenderer, RendererFactory } from '../render/renderer';
import { createHud, type Hud } from '../ui/hud';
import { el } from '../ui/dom';
import { World } from '../world/world';
import { createDinoRender } from '../render/dino-render';
import { createDinoStore, setActiveDinoStore, type DinoStore } from '../dinos/dino-store';
import { createDinoMenu } from '../ui/dino-menu';
import { DINO_KINDS } from '../dinos/kinds';
import { createDinoSystem, type DinoSystem } from './dino-system';
import { registerHook } from '../dev/e2e-hooks';
import type { Screens } from '../app/screens';
import { createLoop } from './loop';
import { createPlayerController, type PlayerController } from './player-controller';

export interface TeleportedEvent {
  x: number;
  y: number;
  z: number;
}

/** Something worth saving changed: a block, or the mode, hotbar or selected slot. */
export interface ChangedEvent {
  kind: 'world' | 'build';
}

export interface GameEvents {
  teleported: TeleportedEvent;
  changed: ChangedEvent;
}

export interface Game {
  readonly world: World;
  readonly player: PlayerController;
  readonly renderer: GameRenderer;
  readonly hud: Hud;
  /** Dinos and eggs: the store, hit tests and stepping. */
  readonly dinos: DinoSystem;
  /** Opens the dino menu for a dino (the tap does this by itself). */
  openDinoMenu(id: number): void;
  /** Stops the world: no steps, no drawing. Safe to call twice. */
  pause(): void;
  resume(): void;
  /** True while frames are being drawn. */
  isRunning(): boolean;
  /** Mode, the 8 hotbar blocks and the selected slot. T37 saves these. */
  getBuildState(): BuildState;
  setBuildState(state: Partial<BuildState>): void;
  /** Puts the player back on the start spot and says so with `teleported`. */
  teleportHome(): void;
  /** Puts every block back to the start world, saves that, and puts the player on the start spot. */
  resetWorld(): void;
  on<K extends keyof GameEvents>(event: K, listener: (payload: GameEvents[K]) => void): () => void;
  /** Frames drawn since the start. */
  frameCount(): number;
  dispose(): void;
}

export interface GameOptions {
  /** Where the canvas, HUD and stick go. */
  container: HTMLElement;
  rendererFactory: RendererFactory;
  guard: { subscribe(listener: (state: GuardState) => void): () => void };
  /** The address query, for ?fps=1, ?spike=1, ?pr= and ?fog=. */
  search?: string;
  /** Test seams. */
  win?: Window;
  doc?: Document;
  world?: World;
  /** The first tap detector main.ts holds. Without it the game is silent. */
  audioUnlock?: AudioUnlock;
  sound?: Sound;
  /** When given, the dino menu and the block grid open a node less 'kid-overlay' screen, so the play timer waits (AC23). */
  screens?: Screens;
}

const SILENT_UNLOCK = { isUnlocked: () => false, watch: () => {}, whenUnlocked: () => {} };

export function createGame(options: GameOptions): Game {
  const win = options.win ?? window;
  const doc = options.doc ?? document;
  const search = options.search ?? '';
  const world = options.world ?? new World();

  const canvas = el('canvas', { class: 'world-canvas', attrs: { 'aria-hidden': 'true' } });
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none';
  options.container.append(canvas);

  const renderer = options.rendererFactory({ canvas, quality: qualityFromSearch(search) });
  renderer.setWorld(world);

  const stick = createStick();
  const sound = options.sound ?? createSound({ unlock: options.audioUnlock ?? SILENT_UNLOCK });
  const effects = createEffects(options.container, doc);
  const tapWorld: { fn: ((x: number, y: number) => void) | null } = { fn: null }; // set once the build controller exists
  let loopRunning = () => false;
  const look = createLook({ onTap: (x, y) => tapWorld.fn?.(x, y) });
  const router = createPointerRouter(options.container, { stick, look });
  const listeners: { [K in keyof GameEvents]: Set<(p: GameEvents[K]) => void> } = { teleported: new Set(), changed: new Set() };
  const emitChanged = (kind: ChangedEvent['kind']) => {
    for (const l of [...listeners.changed]) l({ kind });
  };
  const player = createPlayerController({ world, stick, look });
  const dinoStore: DinoStore = createDinoStore();
  setActiveDinoStore(dinoStore);
  const dinoRender = createDinoRender(doc);
  renderer.setDinoLayer(dinoRender.layer);
  const dinos = createDinoSystem({
    world,
    store: dinoStore,
    player: () => player.player,
    onEvent: (e) => dinoRender.burst(e.type, e.x, e.y, e.z),
  });
  let menuOpen = false;
  let closeMenuScreen: (() => void) | null = null;
  let closeGridScreen: (() => void) | null = null;
  let updateLoop = () => {};
  const hud = createHud({
    router,
    onJump: () => player.jump(),
    onMode: (m) => {
      build.setMode(m);
      emitChanged('build');
    },
    onPause: () => {}, // the pause menu comes with T41
  });
  const build = createBuildController({
    world,
    player,
    onBlockChanged: (x, z) => {
      renderer.blockChanged(x, z);
      emitChanged('world');
    },
    effects,
    sound,
    viewport: () => ({ width: win.innerWidth, height: win.innerHeight }),
    canAct: () => loopRunning(),
    isOccupied: (box) => dinos.isOccupied(box),
    tapFirst: (aim) => {
      const hit = dinos.hitTest(aim);
      if (!hit) return false;
      if (hit.kind === 'dino') openDinoMenu(hit.id);
      return true;
    },
  });
  tapWorld.fn = (x, y) => build.tap(x, y);
  const initial = build.getState();
  const hotbar = createHotbar({
    slots: hud.slots,
    allBlocksSlot: hud.allBlocksSlot,
    blocks: initial.hotbar,
    selected: initial.selected,
    onSelect: (slot) => {
      build.select(slot);
      hotbar.setSelected(slot);
      emitChanged('build');
    },
    onAllBlocks: () => grid.open(),
  });
  const grid = createBlockGrid({
    router,
    onPick: (block) => {
      build.setSlotBlock(build.getState().selected, block);
      refreshHotbar();
      emitChanged('build');
    },
  });
  const refreshHotbar = () => {
    const s = build.getState();
    hotbar.setBlocks(s.hotbar);
    hotbar.setSelected(s.selected);
    hud.setMode(s.mode);
  };
  options.container.append(hud.root, stick.element, grid.root);
  // The grid closes itself (pick, Klaar, backdrop), so watch its hidden flag.
  const gridWatch = new MutationObserver(() => {
    if (grid.isOpen() && !closeGridScreen && options.screens) closeGridScreen = options.screens.open('kid-overlay');
    else if (!grid.isOpen() && closeGridScreen) {
      closeGridScreen();
      closeGridScreen = null;
    }
  });
  gridWatch.observe(grid.root, { attributes: true, attributeFilter: ['hidden'] });

  let spike: SpikeDino[] | null = null;
  if (isSpikeEnabled(search)) {
    spike = createSpikeDinos(world);
    renderer.setSpikeDinos(spike);
  }
  const dinoMenu = createDinoMenu({
    container: options.container,
    router,
    onMode: (id, mode) => dinoStore.setMode(id, mode),
    onRename: (id, name) => dinoStore.rename(id, name),
    onHug: (id) => {
      const d = dinoStore.findDino(id);
      if (!d) return;
      dinoRender.burst('hearts', d.state.x, d.state.y + DINO_KINDS[d.state.kind].size.h, d.state.z);
      sound.play('chirp');
    },
    onClose: () => {
      menuOpen = false;
      closeMenuScreen?.();
      closeMenuScreen = null;
      updateLoop();
    },
  });
  function openDinoMenu(id: number): void {
    const d = dinoStore.findDino(id);
    if (!d) return;
    menuOpen = true;
    if (!closeMenuScreen && options.screens) closeMenuScreen = options.screens.open('kid-overlay');
    dinoMenu.open({ id: d.id, kind: d.state.kind, name: d.name, mode: d.state.mode });
    updateLoop();
  }
  if (__E2E__) {
    registerHook('dinoMenuOpen', () => dinoMenu.isOpen());
    registerHook('closeDinoMenu', () => dinoMenu.close());
  }
  const fps: FpsCounter = createFpsCounter(search, doc.body);

  let frames = 0;
  const loop = createLoop({
    frame(dt, now) {
      player.update(dt);
      if (spike) stepSpikeDinos(world, spike, dt);
      dinos.step(dt);
      dinoRender.sync(dinoStore.dinos, dinoStore.eggs, dt);
      renderer.setCamera(player.pose());
      renderer.render();
      fps.frame(now, dt);
      frames++;
    },
  });

  const resize = () => renderer.resize(win.innerWidth, win.innerHeight, win.devicePixelRatio || 1);
  resize();
  win.addEventListener('resize', resize);
  win.addEventListener('orientationchange', resize);

  // The loop runs only when nobody asked for a pause, the iPad is landscape and big enough, and the page is visible.
  let manualPause = false;
  let guardBlocks = false;
  const update = () => {
    const hidden = doc.visibilityState === 'hidden';
    if (manualPause || menuOpen || guardBlocks || hidden) loop.stop();
    else loop.start();
  };
  updateLoop = update;
  loopRunning = () => loop.running;
  const unsubscribe = options.guard.subscribe((s) => {
    guardBlocks = s.portrait || s.tooSmall;
    if (!guardBlocks) resize();
    update();
  });
  doc.addEventListener('visibilitychange', update);
  update();

  function teleportHome() {
    player.reset();
    const p = player.player;
    dinos.teleported();
    for (const l of [...listeners.teleported]) l({ x: p.x, y: p.y, z: p.z });
  }

  return {
    world,
    player,
    renderer,
    hud,
    dinos,
    openDinoMenu,
    pause() {
      manualPause = true;
      update();
    },
    resume() {
      manualPause = false;
      update();
    },
    isRunning: () => loop.running,
    getBuildState: () => build.getState(),
    setBuildState(state) {
      build.setState(state);
      refreshHotbar();
    },
    teleportHome,
    resetWorld() {
      world.reset();
      renderer.setWorld(world);
      emitChanged('world');
      teleportHome();
    },
    on(event, listener) {
      const set = listeners[event] as Set<typeof listener>;
      set.add(listener);
      return () => set.delete(listener);
    },
    frameCount: () => frames,
    dispose() {
      loop.stop();
      unsubscribe();
      doc.removeEventListener('visibilitychange', update);
      win.removeEventListener('resize', resize);
      win.removeEventListener('orientationchange', resize);
      router.destroy();
      hud.destroy();
      hotbar.destroy();
      gridWatch.disconnect();
      closeGridScreen?.();
      closeMenuScreen?.();
      grid.destroy();
      dinoMenu.destroy();
      renderer.setDinoLayer(null);
      dinoRender.dispose();
      setActiveDinoStore(null);
      effects.dispose();
      stick.element.remove();
      fps.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
