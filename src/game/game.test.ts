// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuardState } from '../platform/screen-guard';
import { createNullRenderer, type GameRenderer } from '../render/renderer';
import { START_SPOT } from '../world/terrain';
import { createGame, type Game } from './game';

let frameCb: ((t: number) => void) | null = null;
let clock = 0;

function runFrames(n: number, ms = 16): void {
  for (let i = 0; i < n; i++) {
    clock += ms;
    const cb = frameCb;
    frameCb = null;
    cb?.(clock);
  }
}

function setup(search = '') {
  const container = document.createElement('div');
  document.body.append(container);
  let guardListener: ((s: GuardState) => void) | null = null;
  const guard = {
    subscribe(l: (s: GuardState) => void) {
      guardListener = l;
      l({ portrait: false, tooSmall: false });
      return () => {
        guardListener = null;
      };
    },
  };
  let renderer!: GameRenderer;
  const render = vi.fn();
  const setCamera = vi.fn();
  const game: Game = createGame({
    container,
    guard,
    search,
    rendererFactory: (o) => {
      renderer = { ...createNullRenderer(o), render, setCamera };
      return renderer;
    },
  });
  return { game, container, render, setCamera, setGuard: (s: GuardState) => guardListener?.(s) };
}

beforeEach(() => {
  frameCb = null;
  clock = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    frameCb = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frameCb = null;
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.textContent = '';
});

describe('game', () => {
  it('mounts a sized canvas, the hud and the stick, and draws frames', () => {
    const s = setup();
    expect(s.container.querySelector('canvas')?.style.width).toBe('100%');
    expect(s.container.querySelector('.hud')).not.toBeNull();
    expect(s.container.querySelector('.stick-base')).not.toBeNull();
    runFrames(3);
    expect(s.render).toHaveBeenCalledTimes(3);
    expect(s.setCamera).toHaveBeenCalled();
    expect(s.game.frameCount()).toBe(3);
  });

  it('pause stops the loop and resume starts it again', () => {
    const s = setup();
    runFrames(2);
    s.game.pause();
    expect(s.game.isRunning()).toBe(false);
    runFrames(5);
    expect(s.render).toHaveBeenCalledTimes(2);
    s.game.resume();
    expect(s.game.isRunning()).toBe(true);
    runFrames(2);
    expect(s.render).toHaveBeenCalledTimes(4);
  });

  it('stays paused in portrait and when too small, and resumes when the guard clears', () => {
    const s = setup();
    s.setGuard({ portrait: true, tooSmall: false });
    expect(s.game.isRunning()).toBe(false);
    s.setGuard({ portrait: false, tooSmall: true });
    expect(s.game.isRunning()).toBe(false);
    s.setGuard({ portrait: false, tooSmall: false });
    expect(s.game.isRunning()).toBe(true);
  });

  it('a manual pause survives the guard clearing', () => {
    const s = setup();
    s.game.pause();
    s.setGuard({ portrait: true, tooSmall: false });
    s.setGuard({ portrait: false, tooSmall: false });
    expect(s.game.isRunning()).toBe(false);
  });

  it('pauses while the page is hidden', () => {
    const s = setup();
    let state: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(s.game.isRunning()).toBe(false);
    state = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(s.game.isRunning()).toBe(true);
    vi.restoreAllMocks();
  });

  it('a long gap between frames moves the player at most 100 ms worth', () => {
    const s = setup();
    runFrames(30);
    const z0 = s.game.player.player.z;
    s.game.player.player.onGround = true;
    runFrames(1, 5000);
    expect(Math.abs(s.game.player.player.z - z0)).toBeLessThan(0.01);
  });

  it('teleportHome puts the player on the start spot and emits teleported', () => {
    const s = setup();
    const seen: unknown[] = [];
    const off = s.game.on('teleported', (e) => seen.push(e));
    s.game.player.player.x = 3;
    s.game.player.player.z = 4;
    s.game.teleportHome();
    expect(seen).toEqual([{ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }]);
    expect(s.game.player.player.x).toBe(START_SPOT.x);
    off();
    s.game.teleportHome();
    expect(seen).toHaveLength(1);
  });

  it('dispose removes what it added', () => {
    const s = setup();
    s.game.dispose();
    expect(s.container.children).toHaveLength(0);
    expect(s.game.isRunning()).toBe(false);
  });

  it('V11c: the game has 8 villagers beside the dinos and shows them every frame', () => {
    const s = setup();
    const sync = vi.fn();
    expect(s.game.villagerSystem.villagers()).toHaveLength(8);
    expect(s.game.dinoStore.dinos()).toHaveLength(0);
    expect(s.game.dinoStore.eggs()).toHaveLength(0);
    s.game.renderer.syncVillagers = sync;
    runFrames(2);
    expect(sync).toHaveBeenCalled();
  });

  it('V11c: ?still=1 starts the villagers in stillMode', () => {
    expect(setup().game.villagerSystem.stillMode()).toBe(false);
    expect(setup('?still=1').game.villagerSystem.stillMode()).toBe(true);
  });

  it('V11c: a new world puts the villagers back at home', () => {
    const s = setup();
    const v = s.game.villagerSystem.villagers()[0]!;
    v.x += 2;
    s.game.resetWorld();
    expect(v.x).toBe(v.home.x);
  });

  it('V11d: the game has a hidden village bubble and passes a tap on it on', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const onVillageBubbleTapped = vi.fn();
    const game = createGame({
      container,
      guard: { subscribe: (l) => { l({ portrait: false, tooSmall: false }); return () => {}; } },
      rendererFactory: (o) => createNullRenderer(o),
      onVillageBubbleTapped,
    });
    const node = container.querySelector('.village-bubble') as HTMLElement;
    expect(game.villageBubble.state().visible).toBe(false);
    game.villageBubble.show('v1', true);
    node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    expect(onVillageBubbleTapped).toHaveBeenCalledTimes(1);
    game.dispose();
  });

  it('AC184: giveToHotbar puts the rare block in the selected slot and says the build state changed', () => {
    const s = setup();
    const changed = vi.fn();
    s.game.on('changed', changed);
    const slot = s.game.getBuildState().selected;
    s.game.giveToHotbar(35);
    expect(s.game.getBuildState().hotbar[slot]).toBe(35);
    expect(changed).toHaveBeenCalledWith({ kind: 'build' });
  });

  it('AC187: setFoundBlocks lets the Dorp tab count the found blocks', () => {
    const s = setup();
    s.game.setFoundBlocks([35, 39, 41]);
    expect(s.container.textContent).toContain('3 van de 8 gevonden');
  });

  it('has 8 hotbar slots and the Alle blokken button, and the Bouwen button switches mode (AC7)', () => {
    const s = setup();
    expect(s.container.querySelectorAll('.hotbar-slot')).toHaveLength(8);
    expect(s.container.querySelector('.hotbar-all')?.textContent).toBe('Alle blokken');
    expect(s.game.getBuildState().mode).toBe('hakken');
    const bouwen = [...s.container.querySelectorAll('.hud-mode')].find((b) => b.textContent === 'Bouwen')!;
    const fire = (type: string) => {
      const e = new MouseEvent(type, { bubbles: true });
      Object.defineProperty(e, 'pointerId', { value: 3 });
      bouwen.dispatchEvent(e);
    };
    fire('pointerdown');
    fire('pointerup');
    expect(s.game.getBuildState().mode).toBe('bouwen');
  });

  it('the hotbar can be read and set back (for saving)', () => {
    const s = setup();
    const state = { mode: 'bouwen' as const, hotbar: [1, 2, 3, 4, 5, 6, 7, 8], selected: 6 };
    s.game.setBuildState(state);
    expect(s.game.getBuildState()).toEqual(state);
    const pressed = [...s.container.querySelectorAll('.hotbar-slot')].map((b) => b.getAttribute('aria-pressed'));
    expect(pressed.indexOf('true')).toBe(6);
  });
});
