import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuardState } from '../platform/screen-guard';
import { createNullRenderer, type GameRenderer } from '../render/renderer';
import { START_SPOT } from '../world/terrain';
import { addEgg, getActiveDinoStore } from '../dinos/dino-store';
import { createGame, type Game } from './game';
import { createScreens } from '../app/screens';

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
  const screens = createScreens(document.body);
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
    screens,
    rendererFactory: (o) => {
      renderer = { ...createNullRenderer(o), render, setCamera };
      return renderer;
    },
  });
  return { game, screens, container, render, setCamera, setGuard: (s: GuardState) => guardListener?.(s) };
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

describe('game screens', () => {
  it('the dino menu is a kid-overlay screen while open', () => {
    const s = setup();
    s.game.dinos.store.load({ dinos: [{ kind: 'compy', x: 22.5, y: 40, z: 22.5, growth: 2 }] });
    const id = s.game.dinos.store.dinos[0]!.id;
    expect(s.screens.current()).toBe('world');
    s.game.openDinoMenu(id);
    expect(s.screens.current()).toBe('kid-overlay');
    s.game.openDinoMenu(id); // twice opens only one screen
    expect(s.screens.depth()).toBe(1);
    const back = [...s.container.querySelectorAll('.dino-menu button')].find((b) => b.textContent === 'Terug naar de wereld')!;
    for (const type of ['pointerdown', 'pointerup']) {
      const e = new MouseEvent(type, { bubbles: true });
      Object.defineProperty(e, 'pointerId', { value: 9 });
      back.dispatchEvent(e);
    }
    expect(s.screens.current()).toBe('world');
  });
  it('the block grid is a kid-overlay screen while open', async () => {
    const s = setup();
    const grid = s.container.querySelector('.block-grid') as HTMLElement;
    const flush = () => new Promise((r) => setTimeout(r, 0));
    grid.hidden = false;
    await flush();
    expect(s.screens.current()).toBe('kid-overlay');
    grid.hidden = true;
    await flush();
    expect(s.screens.current()).toBe('world');
  });
});

describe('held HUD controls', () => {
  const press = (node: Element, type: string, id = 3) => {
    const e = new MouseEvent(type, { bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: id });
    node.dispatchEvent(e);
  };
  const setupHeld = () => {
    const s = setup();
    const up = s.container.querySelector('.hud-fly-up')!;
    const arrow = s.container.querySelector('.hud-arrow-right')!;
    const asc = vi.spyOn(s.game.player, 'setAscending');
    const look = vi.spyOn(s.game.player, 'setLookInput');
    return { ...s, up, arrow, asc, look };
  };
  it('the Omhoog button drives the player', () => {
    const s = setupHeld();
    press(s.up, 'pointerdown');
    expect(s.asc).toHaveBeenLastCalledWith(true);
    press(s.up, 'pointerup');
    expect(s.asc).toHaveBeenLastCalledWith(false);
  });
  it('opening a screen on top lets go of a held Omhoog and a held arrow', async () => {
    vi.useFakeTimers();
    try {
      const s = setupHeld();
      press(s.up, 'pointerdown', 3);
      press(s.arrow, 'pointerdown', 4);
      vi.advanceTimersByTime(250);
      expect(s.look).toHaveBeenLastCalledWith(1, 0);
      s.asc.mockClear();
      s.look.mockClear();
      s.screens.open('kid-overlay');
      expect(s.asc).toHaveBeenCalledWith(false);
      expect(s.look).toHaveBeenLastCalledWith(0, 0);
      expect(s.up.getAttribute('data-held')).toBeNull();
      press(s.up, 'pointerup', 3); // the late pointerup finds nothing held
      expect(s.asc.mock.calls.filter((c) => c[0] === false).length).toBe(2); // once from the HUD, once from the game's own release
    } finally {
      vi.useRealTimers();
    }
  });
  it('pause lets go of fly and look holds', () => {
    const s = setupHeld();
    press(s.up, 'pointerdown');
    s.asc.mockClear();
    s.game.pause();
    expect(s.asc).toHaveBeenCalledWith(false);
    expect(s.look).toHaveBeenCalledWith(0, 0);
    expect(s.up.getAttribute('data-held')).toBeNull();
  });
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

  it('has no dinos or eggs at the start, and the dino menu pauses the world (AC12, AC16)', () => {
    const s = setup();
    expect(s.game.dinos.store.dinos).toHaveLength(0);
    expect(s.game.dinos.store.eggs).toHaveLength(0);
    const egg = s.game.dinos.store.addEgg('compy');
    runFrames(2);
    expect(Number.isFinite(egg.egg.x)).toBe(true);
    s.game.dinos.store.load({ dinos: [{ kind: 'compy', x: 22.5, y: 40, z: 22.5, growth: 2 }] });
    runFrames(2);
    const id = s.game.dinos.store.dinos[0]!.id;
    s.game.openDinoMenu(id);
    expect(s.container.querySelector('.dino-menu')).not.toBeNull();
    expect((s.container.querySelector('.dino-menu') as HTMLElement).hidden).toBe(false);
    expect(s.game.isRunning()).toBe(false);
    const back = [...s.container.querySelectorAll('.dino-menu button')].find((b) => b.textContent === 'Terug naar de wereld')!;
    for (const type of ['pointerdown', 'pointerup']) {
      const e = new MouseEvent(type, { bubbles: true });
      Object.defineProperty(e, 'pointerId', { value: 9 });
      back.dispatchEvent(e);
    }
    expect(s.game.isRunning()).toBe(true);
  });

  it('teleportHome brings a Volg mij dino along (AC106) and resetWorld keeps all dinos (AC152)', () => {
    const s = setup();
    s.game.dinos.store.load({ dinos: [{ kind: 'compy', x: 5.5, y: 40, z: 5.5, growth: 2 }] });
    runFrames(2);
    s.game.teleportHome();
    const d = s.game.dinos.store.dinos[0]!.state;
    expect(Math.hypot(d.x - START_SPOT.x, d.z - START_SPOT.z)).toBeLessThan(3.5);
    s.game.resetWorld();
    expect(s.game.dinos.store.dinos).toHaveLength(1);
  });

  it('the shared addEgg goes to the running game and stops at dispose', () => {
    const s = setup();
    addEgg('brachiosaurus', true);
    expect(s.game.dinos.store.eggs).toHaveLength(1);
    s.game.dispose();
    expect(getActiveDinoStore()).toBeNull();
  });
});
