// The running game: world, renderer, input, HUD and the loop. Other features hook in through the returned object.
import { createSound, type Sound } from '../audio/sound';
import { createDinoStore, type DinoStore, type WorldDino } from '../dinos/dino-store';
import type { AudioUnlock } from '../platform/audio-unlock';
import { createEffects } from '../render/effects';
import { createBlockGrid } from '../ui/block-grid';
import { createHotbar } from '../ui/hotbar';
import { createBuildController, type BuildState } from './build-controller';
import { createDinoSystem, type DinoSystem } from './dino-system';
import { createVillagerSystem, type VillagerSystem } from './villager-system';
import { createFpsCounter, type FpsCounter } from '../render/fps-counter';
import { createLook } from '../input/look';
import { createPointerRouter } from '../input/pointer-router';
import { createStick } from '../input/stick';
import { createSpikeDinos, isSpikeEnabled, stepSpikeDinos, type SpikeDino } from '../dev/spike-load';
import type { GuardState } from '../platform/screen-guard';
import { qualityFromSearch } from '../render/quality';
import type { GameRenderer, RendererFactory } from '../render/renderer';
import { createHud, type Hud } from '../ui/hud';
import { createVillageBubble, type VillageBubble } from '../ui/village-bubble';
import { el } from '../ui/dom';
import { RARE_BLOCKS } from '../world/blocks';
import { World } from '../world/world';
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
  readonly dinoStore: DinoStore;
  readonly dinoSystem: DinoSystem;
  /** The village people (V11c). Beside the dinos, never in the dino store. */
  readonly villagerSystem: VillagerSystem;
  /** The speech bubble of the nearest villager (V11d). The village flow shows and hides it. */
  readonly villageBubble: VillageBubble;
  /** Tells the Dorp tab in Alle blokken which rare blocks are found (V11d, AC187). */
  setFoundBlocks(ids: readonly number[]): void;
  /** Puts a block in the selected hotbar slot and saves it (V11d "In mijn hotbar", AC184). */
  giveToHotbar(block: number): void;
  /** Sets how many of each rare block are left (decision 106). The hotbar and the Dorp tab show it. */
  setRareStock(stock: Readonly<Record<number, number>>): void;
  /** A copy of the rare block stock, keyed by block id. */
  rareStock(): Record<number, number>;
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
  /**
   * Puts every block back to the start world, saves that, and puts the player on the start spot.
   * Every rare block placed in the old world goes back to the stock first (decision 106).
   */
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
  onPausePressed?: () => void;
  onShopPressed?: () => void;
  onParentPressed?: () => void;
  onDinoTapped?: (dino: WorldDino, screenX: number, screenY: number) => void;
  onBlockGridOpenChange?: (open: boolean) => void;
  /** The kid tapped the villager bubble (V11d). */
  onVillageBubbleTapped?: () => void;
  /** The rare block stock changed by placing, mining or Wereld opnieuw beginnen (decision 106). Not on setRareStock. */
  onRareStockChanged?: (stock: Record<number, number>) => void;
}

/** "Op!" line when a rare block runs out (decision 106, AC192). */
export const RARE_EMPTY_TEXT = 'Op! Een dorpeling geeft je er meer.';
const RARE_EMPTY_MS = 2500;

/** How many of each rare block stand in a world diff (cellIndex * 256 + blockId). The start world has none. */
export function placedRareBlocks(diff: ArrayLike<number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (let k = 0; k < diff.length; k++) {
    const id = (diff[k] ?? 0) % 256;
    if (RARE_BLOCKS.includes(id)) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
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
  const dinoStore = createDinoStore({
    world,
    getPlayerSpot: () => ({
      x: player.player.x,
      y: player.player.y,
      z: player.player.z,
    }),
  });
  const dinoSystem = createDinoSystem({
    world,
    player,
    store: dinoStore,
    renderer,
    container: options.container,
    sound,
    effects,
    viewport: () => ({ width: win.innerWidth, height: win.innerHeight }),
    onDinoTapped: (dino, sx, sy) => options.onDinoTapped?.(dino, sx, sy),
    doc,
  });

  // Rare block stock (decision 106). The village flow loads and saves it; building uses it.
  let rareStock = new Map<number, number>();
  const stockCopy = (): Record<number, number> => Object.fromEntries(rareStock) as Record<number, number>;
  const emptyNote = el('div', { class: 'rare-empty-note', text: RARE_EMPTY_TEXT, attrs: { role: 'status', 'data-testid': 'rare-empty' } }, [], doc);
  emptyNote.hidden = true;
  let emptyTimer: ReturnType<typeof setTimeout> | null = null;
  const showEmpty = () => {
    emptyNote.hidden = false;
    if (emptyTimer !== null) clearTimeout(emptyTimer);
    emptyTimer = setTimeout(() => {
      emptyNote.hidden = true;
      emptyTimer = null;
    }, RARE_EMPTY_MS);
  };
  const showStock = () => {
    const copy = stockCopy();
    hotbar.setStock(copy);
    grid.setStock(copy);
  };
  const stockChanged = () => {
    showStock();
    options.onRareStockChanged?.(stockCopy());
  };

  const villagerSystem = createVillagerSystem({
    world,
    player,
    renderer,
    stillMode: new URLSearchParams(search).get('still') === '1',
  });

  const hud = createHud({
    router,
    onJump: () => player.jump(),
    onAscend: (active) => player.setAscending(active),
    onDescend: (active) => player.setDescending(active),
    onLookInput: (tx, ty) => player.setLookInput(tx, ty),
    onLookNudge: (tx, ty) => player.nudgeLook(tx, ty),
    onMode: (m) => {
      build.setMode(m);
      emitChanged('build');
    },
    onPause: () => options.onPausePressed?.(),
    onShop: options.onShopPressed ? () => options.onShopPressed?.() : undefined,
    onParent: options.onParentPressed ? () => options.onParentPressed?.() : undefined,
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
    isOccupied: (box) => dinoSystem.isOccupied(box) || villagerSystem.isOccupied(box),
    canAct: () => loopRunning(),
    stock: {
      limited: (block) => RARE_BLOCKS.includes(block),
      count: (block) => rareStock.get(block) ?? 0,
      change(block, delta) {
        rareStock.set(block, Math.max(0, (rareStock.get(block) ?? 0) + delta));
        if (delta < 0) emptyNote.hidden = true;
        stockChanged();
      },
    },
    onEmpty: () => showEmpty(),
  });
  tapWorld.fn = (x, y) => {
    if (!loopRunning()) return;
    if (dinoSystem.handleTap(x, y)) return;
    build.tap(x, y);
  };
  const initial = build.getState();
  const hotbar = createHotbar({
    slots: hud.slots,
    allBlocksSlot: hud.allBlocksSlot,
    blocks: initial.hotbar,
    selected: initial.selected,
    onSelect: (slot) => {
      build.select(slot);
      hotbar.setSelected(slot);
      grid.setHotbar?.(build.getState().hotbar, slot);
      emitChanged('build');
    },
    onAllBlocks: () => grid.open(),
  });
  const grid = createBlockGrid({
    router,
    hotbar: initial.hotbar,
    selectedSlot: initial.selected,
    onSelectSlot: (slot) => {
      build.select(slot);
      hotbar.setSelected(slot);
      emitChanged('build');
    },
    onPick: (block) => {
      build.setSlotBlock(build.getState().selected, block);
      refreshHotbar();
      emitChanged('build');
    },
    onOpenChange: (open) => options.onBlockGridOpenChange?.(open),
  });
  const refreshHotbar = () => {
    const s = build.getState();
    hotbar.setBlocks(s.hotbar);
    hotbar.setSelected(s.selected);
    grid.setHotbar?.(s.hotbar, s.selected);
    hud.setMode(s.mode);
  };
  const villageBubble = createVillageBubble({ router, onTap: () => options.onVillageBubbleTapped?.() });
  options.container.append(hud.root, stick.element, grid.root, villageBubble.element, emptyNote);

  let dinos: SpikeDino[] | null = null;
  if (isSpikeEnabled(search)) {
    dinos = createSpikeDinos(world);
    renderer.setSpikeDinos(dinos);
  }
  const fps: FpsCounter = createFpsCounter(search, doc.body);

  let frames = 0;
  const loop = createLoop({
    frame(dt, now) {
      player.update(dt);
      dinoSystem.step(dt);
      villagerSystem.step(dt);
      if (dinos) stepSpikeDinos(world, dinos, dt);
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

  const arrowKeys = new Set<string>();
  const syncArrowLook = () => {
    const tx = (arrowKeys.has('ArrowRight') ? 1 : 0) - (arrowKeys.has('ArrowLeft') ? 1 : 0);
    const ty = (arrowKeys.has('ArrowUp') ? 1 : 0) - (arrowKeys.has('ArrowDown') ? 1 : 0);
    player.setLookInput(tx, ty);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!loop.running) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      arrowKeys.add(e.key);
      syncArrowLook();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (arrowKeys.delete(e.key)) {
      syncArrowLook();
    }
  };
  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);

  // The loop runs only when nobody asked for a pause, the iPad is landscape and big enough, and the page is visible.
  let manualPause = false;
  let guardBlocks = false;
  const update = () => {
    const hidden = doc.visibilityState === 'hidden';
    if (manualPause || guardBlocks || hidden) {
      arrowKeys.clear();
      player.setLookInput(0, 0);
      loop.stop();
    } else {
      loop.start();
    }
  };
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
    dinoSystem.onPlayerTeleported({ x: p.x, y: p.y, z: p.z });
    for (const l of [...listeners.teleported]) l({ x: p.x, y: p.y, z: p.z });
  }

  return {
    world,
    player,
    renderer,
    hud,
    dinoStore,
    dinoSystem,
    villagerSystem,
    villageBubble,
    setFoundBlocks: (ids) => grid.setFound(ids),
    giveToHotbar(block) {
      build.setSlotBlock(build.getState().selected, block);
      refreshHotbar();
      emitChanged('build');
    },
    setRareStock(stock) {
      const next = new Map<number, number>();
      for (const id of RARE_BLOCKS) {
        const n = stock[id];
        if (typeof n === 'number' && Number.isFinite(n) && n > 0) next.set(id, Math.floor(n));
      }
      rareStock = next;
      showStock();
    },
    rareStock: () => stockCopy(),
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
      // Rare blocks in the old world go back to the stock before the world resets (decision 106, AC188).
      const placed = placedRareBlocks(world.diff());
      const ids = Object.keys(placed).map(Number);
      for (const id of ids) rareStock.set(id, (rareStock.get(id) ?? 0) + (placed[id] ?? 0));
      if (ids.length > 0) stockChanged();
      world.reset();
      villagerSystem.reset();
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
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      router.destroy();
      hud.destroy();
      villageBubble.destroy();
      if (emptyTimer !== null) clearTimeout(emptyTimer);
      emptyNote.remove();
      hotbar.destroy();
      grid.destroy();
      dinoSystem.dispose();
      effects.dispose();
      stick.element.remove();
      fps.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
