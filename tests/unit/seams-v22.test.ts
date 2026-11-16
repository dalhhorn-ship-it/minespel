// @vitest-environment jsdom
// The contract of the seams of V22a (decision 144), now filled by V22b to V24b: the shapes are still the ones every
// consumer relies on (a copy from `state`, one reused state object, one reused target list, no throw before the first tap).
// What each owner does in detail is asserted in the owner's own test file. Only the pill view (V22e) and the feeder and
// snack (V23c) are still stubs here.
import { describe, expect, it, vi } from 'vitest';
import { createNearSounds } from '../../src/audio/near-sounds';
import { closeness, panOf } from '../../src/audio/near-mix';
import { createBubbleHudFlow } from '../../src/app/bubble-hud-flow';
import { createFeeder } from '../../src/lavakip/feed';
import { findHomeSpot, findSpotInFront, isFreeSpot } from '../../src/lavakip/bar-spot';
import { createLavakipBar } from '../../src/lavakip/lavakip-bar';
import { createLavakipEconomy } from '../../src/lavakip/lavakip-economy';
import { snackStep } from '../../src/lavakip/snack';
import { computeBubbleHud, createBubbleHudState } from '../../src/monsters/bubble-hud';
import { createRng } from '../../src/core/rng';
import { createTargetList, addTarget } from '../../src/monsters/targets';
import { createBubblePill } from '../../src/ui/bubble-pill';
import { createLavakipCard } from '../../src/ui/lavakip-card';
import { createMoleTapCard, MOLE_TAP_TEXT } from '../../src/ui/mole-tap-card';
import { createLavakipSection } from '../../src/ui/shop-lavakip';
import { World } from '../../src/world/world';

const pose = { x: 10, y: 20, z: 10, yaw: 0, pitch: 0 };

describe('lavakip seams (AC310 to AC321)', () => {
  const economy = () => createLavakipEconomy({ db: {} as IDBDatabase, world: new World(), pose: () => pose });

  it('the economy keeps the loaded record as a copy, tells onChange, and a broken store answers false and never throws', async () => {
    const e = economy();
    expect(e.state()).toEqual({ bought: false, spot: null, carried: 0 });
    const onChange = vi.fn();
    const f = createLavakipEconomy({ db: {} as IDBDatabase, world: new World(), pose: () => pose, onChange });
    f.load({ bought: true, spot: { x: 1, y: 2, z: 3 }, carried: 4 });
    expect(onChange).toHaveBeenCalledWith({ bought: true, spot: { x: 1, y: 2, z: 3 }, carried: 4 });
    const s = f.state();
    s.carried = 9;
    expect(f.state().carried).toBe(4);
    // The shop state the shop flow draws from (AC310): the same facts as the record plus the points.
    expect(f.shopState(100)).toMatchObject({ points: 100, bought: true, placed: true, carried: 4 });
    // `{}` is no database: every action fails inside the queue, answers false and leaves the record as it was.
    expect(await f.buyBar()).toBe(false);
    expect(await f.order()).toBe(false);
    expect(await f.useOne()).toBe(false);
    await expect(f.moveHome()).resolves.toBeUndefined();
    expect(f.state().carried).toBe(4);
  });

  it('the bar is a creature that never takes a tap or a place, keeps nothing out and has no point or target', async () => {
    const e = economy();
    const bar = createLavakipBar({ economy: e, viewport: () => ({ width: 1, height: 1 }), player: { pose: () => pose } });
    const list = createTargetList();
    expect(bar.handleTap?.(5, 5)).toBe(false);
    expect(bar.isOccupied?.([0, 0, 0, 100, 100, 100])).toBe(false);
    expect(bar.keepOut(1, 2, 3)).toBe(false);
    expect(bar.screenPoint()).toBeNull();
    expect(await bar.placeHere()).toBe(false);
    expect(await bar.order()).toBe(false);
    bar.collectTargets(list);
    expect(list.count).toBe(0);
    expect(() => bar.step(0.1)).not.toThrow();
  });

  it('a world reset moves the bar home through the economy and keeps what the kid carries', () => {
    const moveHome = vi.fn(() => Promise.resolve());
    const bar = createLavakipBar({
      economy: { ...economy(), moveHome },
      viewport: () => ({ width: 1, height: 1 }),
      player: { pose: () => pose },
    });
    bar.onWorldReset?.({ x: 0, y: 0, z: 0 });
    expect(moveHome).toHaveBeenCalledTimes(1);
  });

  it('the feeder has no menu option, feeds nothing and shows no snack', async () => {
    const feeder = createFeeder({ economy: economy() });
    expect(feeder.menuOption({ kind: 'dino', id: 'a' })).toBeNull();
    expect(feeder.menuOption({ kind: 'knight', id: 'k' })).toBeNull();
    expect(await feeder.feed({ kind: 'dino', id: 'a' })).toBe(false);
    expect(feeder.state()).toEqual({ snacking: [], fed: 0 });
  });

  it('a spot the finders give is a free spot by isFreeSpot, and nobody snacks until V23c', () => {
    const world = new World();
    expect(isFreeSpot(world, { x: 5, y: 5, z: 5 })).toBe(false);
    const home = findHomeSpot(world, { x: 5, y: 5, z: 5 }, createRng(1));
    if (home) expect(isFreeSpot(world, home)).toBe(true);
    const front = findSpotInFront(world, pose);
    if (front) expect(isFreeSpot(world, front)).toBe(true);
    expect(snackStep({}, 0.1)).toBe(false);
  });

  it('the shop section and the order card keep their test ids and destroy without a throw', () => {
    const section = createLavakipSection({ onBuy: vi.fn(), onPlaceHere: vi.fn(), onChange: vi.fn() });
    const node = section.render({ points: 0, bought: false, placed: false, carried: 0, canPlaceHere: false }, true);
    expect(node.getAttribute('data-testid')).toBe('shop-lavakip');
    expect(node.childNodes.length).toBeGreaterThan(0);
    section.destroy();
    const card = createLavakipCard({ carried: () => 0, points: () => 0, onOrder: vi.fn(), onClose: vi.fn() });
    expect(card.element.getAttribute('data-testid')).toBe('lavakip-card');
    card.destroy();
  });
});

describe('pill seams (AC301 to AC305)', () => {
  it('computeBubbleHud writes into and returns the one state object it is given', () => {
    const out = createBubbleHudState();
    out.shown = true;
    out.text = 'x';
    const input = {
      clock: { runs: true, held: false, msLeft: 1000 },
      targets: createTargetList(),
      pose: { x: 0, y: 0, z: 0, yaw: 0 },
      bubbleOn: true,
      moleOn: true,
    };
    expect(computeBubbleHud(input, out)).toBe(out);
    expect(out).toEqual({ shown: true, kind: 'clock', text: 'Bubbel over 0:01', angle: 0, distance: 0, vertical: null });
  });

  it('the flow computes every 100 ms of loop time, calls the view once for an unchanged state, and hides on a pause', () => {
    const view = { update: vi.fn(), hide: vi.fn(), destroy: vi.fn() };
    const collect = vi.fn();
    const clockView = vi.fn(() => ({ runs: true, held: false, msLeft: 5000 }));
    const flow = createBubbleHudFlow({
      monsters: { clockView, collectTargets: collect },
      view,
      pose: () => ({ x: 0, y: 0, z: 0, yaw: 0 }),
      switches: () => ({ bubble: true, mole: true }),
    });
    const state = flow.state();
    for (let i = 0; i < 10; i++) flow.step(0.1);
    expect(collect).toHaveBeenCalledTimes(10);
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(flow.state()).toBe(state);
    flow.step(0.05);
    flow.step(0.04);
    expect(collect).toHaveBeenCalledTimes(10);
    flow.setRunning(false);
    expect(view.hide).toHaveBeenCalledTimes(1);
    flow.step(1);
    expect(collect).toHaveBeenCalledTimes(10);
    flow.setRunning(true);
    flow.step(0.01);
    expect(collect).toHaveBeenCalledTimes(11);
    flow.step(0);
    flow.step(NaN);
    expect(collect).toHaveBeenCalledTimes(11);
  });

  it('the pill view draws nothing into its slot', () => {
    const slot = document.createElement('div');
    const pill = createBubblePill(slot);
    pill.update({ shown: true, kind: 'bubble', text: 'Bubbel: 8 blokken', angle: 10, distance: 8, vertical: null });
    pill.hide();
    pill.destroy();
    expect(slot.childNodes).toHaveLength(0);
  });

  it('the mole tap card holds the sleeping text and an OK, and destroy takes it away', () => {
    const onOk = vi.fn();
    const card = createMoleTapCard({ onOk });
    document.body.append(card.element);
    expect(card.element.textContent).toContain(MOLE_TAP_TEXT);
    expect(MOLE_TAP_TEXT).toBe('Zzz... de Monstermol slaapt in zijn hok.');
    const ok = card.element.querySelector<HTMLElement>('.mole-ok');
    expect(ok?.className).toContain('mole-ok');
    card.destroy();
    expect(card.element.isConnected).toBe(false);
  });
});

describe('near sound seams (AC322 to AC326)', () => {
  function voices() {
    const mk = () => ({ play: vi.fn(), set: vi.fn(), silence: vi.fn(), level: 0, pan: 0 });
    const pair: [ReturnType<typeof mk>, ReturnType<typeof mk>] = [mk(), mk()];
    return pair;
  }

  it('the pan is half the sine of the angle and the closeness runs from 1 at the loudest distance to 0 far away', () => {
    expect(panOf(0)).toBeCloseTo(0, 9);
    expect(panOf(180)).toBeCloseTo(0, 9);
    expect(panOf(90)).toBeCloseTo(0.5, 9);
    expect(panOf(-90)).toBeCloseTo(-0.5, 9);
    expect(closeness('klodder', 2)).toBe(1);
    expect(closeness('klodder', 25)).toBe(0);
  });

  it('one Klodder plays on one voice, both voices are silenced on a pause and the view lists the source', () => {
    const pair = voices();
    const near = createNearSounds({
      sound: { nearVoices: () => pair as never, isEnabled: () => true, getVolume: () => 0.7 },
      collectMonsters: (list) => void addTarget(list, 'klodder', 'klodder', 1, 2, 3),
      collectBar: vi.fn(),
      pose: () => ({ x: 0, y: 0, z: 0, yaw: 0 }),
    });
    near.step(0.1);
    expect(pair[0].play).toHaveBeenCalledTimes(1);
    expect(pair[0].set).toHaveBeenCalled();
    expect(pair[1].play).not.toHaveBeenCalled();
    expect(near.view().running).toBe(true);
    expect(near.view().sources).toHaveLength(1);
    near.setRunning(false);
    expect(pair[0].silence).toHaveBeenCalledTimes(1);
    expect(pair[1].silence).toHaveBeenCalledTimes(1);
    expect(near.view().running).toBe(false);
    near.setRunning(true);
    expect(near.view().running).toBe(true);
  });

  it('a pause before the first tap (no voices) does not throw', () => {
    const near = createNearSounds({
      sound: { nearVoices: () => null, isEnabled: () => true, getVolume: () => 0.7 },
      collectMonsters: vi.fn(),
      collectBar: vi.fn(),
      pose: () => ({ x: 0, y: 0, z: 0, yaw: 0 }),
    });
    expect(() => near.setRunning(false)).not.toThrow();
    expect(() => near.silence()).not.toThrow();
  });
});
