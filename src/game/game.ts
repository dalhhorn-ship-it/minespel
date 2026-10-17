// The running game: world, renderer, input, HUD and the loop. Other features hook in through the returned object.
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
import { createLoop } from './loop';
import { createPlayerController, type PlayerController } from './player-controller';

export interface TeleportedEvent {
  x: number;
  y: number;
  z: number;
}

export interface GameEvents {
  teleported: TeleportedEvent;
}

export interface Game {
  readonly world: World;
  readonly player: PlayerController;
  readonly renderer: GameRenderer;
  readonly hud: Hud;
  /** Stops the world: no steps, no drawing. Safe to call twice. */
  pause(): void;
  resume(): void;
  /** True while frames are being drawn. */
  isRunning(): boolean;
  /** Puts the player back on the start spot and says so with `teleported`. */
  teleportHome(): void;
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
}

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
  const look = createLook({ onTap: () => {} }); // taps mine and build in T33
  const router = createPointerRouter(options.container, { stick, look });
  const player = createPlayerController({ world, stick, look });
  const hud = createHud({
    router,
    onJump: () => player.jump(),
    onMode: () => {}, // T33
    onPause: () => {}, // the pause menu comes with T41
  });
  options.container.append(hud.root, stick.element);

  const listeners: { [K in keyof GameEvents]: Set<(p: GameEvents[K]) => void> } = { teleported: new Set() };

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
      if (dinos) stepSpikeDinos(world, dinos, dt);
      renderer.setCamera(player.pose());
      renderer.render();
      fps.frame(now);
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
    if (manualPause || guardBlocks || hidden) loop.stop();
    else loop.start();
  };
  const unsubscribe = options.guard.subscribe((s) => {
    guardBlocks = s.portrait || s.tooSmall;
    if (!guardBlocks) resize();
    update();
  });
  doc.addEventListener('visibilitychange', update);
  update();

  return {
    world,
    player,
    renderer,
    hud,
    pause() {
      manualPause = true;
      update();
    },
    resume() {
      manualPause = false;
      update();
    },
    isRunning: () => loop.running,
    teleportHome() {
      player.reset();
      const p = player.player;
      for (const l of [...listeners.teleported]) l({ x: p.x, y: p.y, z: p.z });
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
      stick.element.remove();
      fps.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
