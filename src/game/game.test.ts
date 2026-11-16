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
  it('AC234: mineAt mines a cell, says one mined event with the old block and refuses oersteen', () => {
    const { game } = setup();
    const seen: unknown[] = [];
    game.on('mined', (e) => seen.push(e));
    const { x, z } = START_SPOT;
    const cx = Math.floor(x), cz = Math.floor(z), y = Math.floor(START_SPOT.y) - 1;
    const block = game.world.get(cx, y, cz);
    expect(block).not.toBe(0);
    expect(game.mineAt(cx, y, cz)).toBe(true);
    expect(game.world.get(cx, y, cz)).toBe(0);
    expect(seen).toEqual([{ x: cx, y, z: cz, block }]);
    expect(game.mineAt(cx, 0, cz)).toBe(false);
    expect(seen).toHaveLength(1);
  });

  it('decision 144: a tap mine fires blockChanged with the column', () => {
    const { game } = setup();
    const seen: unknown[] = [];
    game.on('blockChanged', (e) => seen.push(e));
    const { x, z } = START_SPOT;
    const cx = Math.floor(x), cz = Math.floor(z), y = Math.floor(START_SPOT.y) - 1;
    expect(game.mineAt(cx, y, cz)).toBe(true);
    expect(seen).toEqual([{ x: cx, z: cz }]);
  });

  it('decision 144: onRunningChange fires on pause, resume and portrait, and the listener can be removed', () => {
    const { game, setGuard } = setup();
    const seen: boolean[] = [];
    const off = game.onRunningChange((r) => seen.push(r));
    game.pause();
    game.pause();
    game.resume();
    setGuard({ portrait: true, tooSmall: false });
    setGuard({ portrait: true, tooSmall: false });
    setGuard({ portrait: false, tooSmall: false });
    expect(seen).toEqual([false, true, false, true]);
    off();
    game.pause();
    expect(seen).toEqual([false, true, false, true]);
  });

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

  it('decision 122: Allemaal blijven works while the loop is paused', () => {
    const s = setup();
    const chicken = s.game.dinoStore.spawnChickenInMemory();
    s.game.dinoStore.setDinoMode(chicken.id, 'follow');
    runFrames(2);
    const btn = s.container.querySelector<HTMLButtonElement>('[data-testid="hud-stay"]')!;
    expect(btn.hidden).toBe(false);
    s.game.pause();
    expect(s.game.isRunning()).toBe(false);
    btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    expect(s.game.dinoStore.getDino(chicken.id)?.mode).toBe('stay');
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

  it('AC275 AC276: setStones fills the Diep tab, unlocks bought stones and empties the slot of a locked one', () => {
    const s = setup();
    s.game.setBuildState({ hotbar: [43, 44, 3, 4, 6, 9, 10, 12], selected: 0 });
    const slot = (i: number) => s.container.querySelectorAll('.hotbar-slot')[i]!;
    expect(slot(0).classList.contains('hotbar-slot-empty')).toBe(true);
    s.game.setStones([43, 44], [43]);
    expect(slot(0).classList.contains('hotbar-slot-empty')).toBe(false);
    expect(slot(1).classList.contains('hotbar-slot-empty')).toBe(true);
    expect(s.container.textContent).toContain('1 van de 8 gekocht');
    expect(s.game.getBuildState().hotbar[1]).toBe(44);
    s.game.giveToHotbar(44);
    expect(s.game.getBuildState().hotbar[0]).toBe(43);
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

  describe('creature layers (V17a, decision 135)', () => {
    /** A quick short touch on the right half of the screen. */
    function tapRight(s: ReturnType<typeof setup>) {
      for (const type of ['pointerdown', 'pointerup']) {
        s.container.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: 900, clientY: 300, bubbles: true }));
      }
    }

    it('AC209: a creature with priority 10 gets the tap before priority 20 and before the dinos', () => {
      const s = setup();
      const calls: string[] = [];
      const dinoTap = vi.spyOn(s.game.dinoSystem, 'handleTap').mockImplementation(() => { calls.push('dinos'); return false; });
      s.game.addCreatures({ step() {}, handleTap: () => { calls.push('20'); return false; } }, 20);
      s.game.addCreatures({ step() {}, handleTap: () => { calls.push('10'); return true; } }, 10);
      runFrames(1);
      tapRight(s);
      expect(calls).toEqual(['10']);
      expect(dinoTap).not.toHaveBeenCalled();
    });

    it('a creature that does not take the tap passes it on in priority order, then to the dinos', () => {
      const s = setup();
      const calls: string[] = [];
      vi.spyOn(s.game.dinoSystem, 'handleTap').mockImplementation(() => { calls.push('dinos'); return true; });
      s.game.addCreatures({ step() {}, handleTap: () => { calls.push('20'); return false; } }, 20);
      s.game.addCreatures({ step() {}, handleTap: () => { calls.push('10'); return false; } }, 10);
      runFrames(1);
      tapRight(s);
      expect(calls).toEqual(['10', '20', 'dinos']);
    });

    it('no creature layer: the tap still goes to the dinos', () => {
      const s = setup();
      const dinoTap = vi.spyOn(s.game.dinoSystem, 'handleTap').mockReturnValue(true);
      runFrames(1);
      tapRight(s);
      expect(dinoTap).toHaveBeenCalledTimes(1);
    });

    it('creatures step every frame after the villagers, and the remover stops it', () => {
      const s = setup();
      const step = vi.fn();
      const remove = s.game.addCreatures({ step }, 10);
      runFrames(3);
      expect(step).toHaveBeenCalledTimes(3);
      remove();
      runFrames(2);
      expect(step).toHaveBeenCalledTimes(3);
    });

    it('AC209: isOccupied joins the creatures for building: an occupied spot gets no block', () => {
      const s = setup();
      const seen = vi.fn(() => true);
      s.game.addCreatures({ step() {}, isOccupied: seen }, 20);
      s.game.setBuildState({ mode: 'bouwen' });
      s.game.player.pitch = -1.2;
      const before = s.game.world.diff().length;
      runFrames(1);
      for (const type of ['pointerdown', 'pointerup']) {
        s.container.dispatchEvent(new PointerEvent(type, { pointerId: 8, clientX: 900, clientY: 384, bubbles: true }));
      }
      expect(seen).toHaveBeenCalled();
      expect(s.game.world.diff().length).toBe(before);
    });

    it('AC209: resetWorld calls onWorldReset after the player is home', () => {
      const s = setup();
      const spots: { x: number; y: number; z: number }[] = [];
      const order: string[] = [];
      s.game.on('teleported', () => order.push('teleported'));
      s.game.addCreatures({ step() {}, onWorldReset: (spot) => { order.push('reset'); spots.push(spot); } }, 20);
      s.game.player.player.x += 5;
      s.game.resetWorld();
      expect(order).toEqual(['teleported', 'reset']);
      expect(spots[0]!.x).toBeCloseTo(s.game.player.player.x, 5);
      expect(spots[0]!.z).toBeCloseTo(s.game.player.player.z, 5);
    });

    it('advanceWorld steps the creatures in 1/30 s steps, only while the loop runs', () => {
      const s = setup();
      const dts: number[] = [];
      s.game.addCreatures({ step: (dt) => dts.push(dt) }, 20);
      expect(s.game.advanceWorld(1000)).toBe(1000);
      expect(dts).toHaveLength(30);
      expect(dts[0]).toBeCloseTo(1 / 30, 6);
      expect(s.game.frameCount()).toBe(0);
      s.game.pause();
      expect(s.game.advanceWorld(1000)).toBe(0);
      expect(dts).toHaveLength(30);
    });

    it('the game exposes its container', () => {
      const s = setup();
      expect(s.game.container).toBe(s.container);
    });
  });
});
