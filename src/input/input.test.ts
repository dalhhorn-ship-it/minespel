// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createPointerRouter } from './pointer-router';
import { createStick } from './stick';
import { createLook } from './look';
import { createHud } from '../ui/hud';

function ptr(type: string, id: number, x: number, y: number): Event {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  let time = 0;
  const taps: Array<[number, number]> = [];
  const stick = createStick();
  const look = createLook({ onTap: (x, y) => taps.push([x, y]), now: () => time });
  const router = createPointerRouter(root, { stick, look, splitX: () => 500 });
  const fire = (target: Element, type: string, id: number, x: number, y: number) =>
    target.dispatchEvent(ptr(type, id, x, y));
  return { root, stick, look, router, taps, fire, advance: (ms: number) => (time += ms) };
}

describe('look zone', () => {
  it('a quick still touch on the right is a tap', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 700, 300);
    s.advance(100);
    s.fire(s.root, 'pointerup', 1, 702, 301);
    expect(s.taps).toEqual([[702, 301]]);
  });
  it('a drag looks and never taps', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 700, 300);
    s.fire(s.root, 'pointermove', 1, 730, 290);
    s.advance(100);
    s.fire(s.root, 'pointerup', 1, 730, 290);
    expect(s.taps).toEqual([]);
    expect(s.look.consumeDelta()).toEqual({ dx: 30, dy: -10 });
    expect(s.look.consumeDelta()).toEqual({ dx: 0, dy: 0 });
  });
  it('a long press is not a tap', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 700, 300);
    s.advance(400);
    s.fire(s.root, 'pointerup', 1, 700, 300);
    expect(s.taps).toEqual([]);
  });
});

describe('two fingers (AC8)', () => {
  it('stick and look work at the same time', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 100, 400);
    s.fire(s.root, 'pointerdown', 2, 700, 300);
    expect(s.router.ownerOf(1)).toBe('stick');
    expect(s.router.ownerOf(2)).toBe('look');
    s.fire(s.root, 'pointermove', 1, 100, 340); // up by 60 = full forward
    s.fire(s.root, 'pointermove', 2, 720, 300);
    expect(s.stick.vector().y).toBeCloseTo(-1);
    expect(s.look.consumeDelta().dx).toBe(20);
    s.fire(s.root, 'pointerup', 2, 720, 300);
    expect(s.stick.vector().y).toBeCloseTo(-1); // stick still held
    s.fire(s.root, 'pointerup', 1, 100, 340);
    expect(s.stick.vector()).toEqual({ x: 0, y: 0 });
  });
  it('a second finger on the same side is ignored', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 100, 400);
    s.fire(s.root, 'pointerdown', 2, 200, 400);
    expect(s.router.ownerOf(2)).toBeNull();
  });
  it('stick has a dead zone and a cancel resets it', () => {
    const s = setup();
    s.fire(s.root, 'pointerdown', 1, 100, 400);
    s.fire(s.root, 'pointermove', 1, 103, 400);
    expect(s.stick.vector()).toEqual({ x: 0, y: 0 });
    s.fire(s.root, 'pointermove', 1, 130, 400);
    expect(s.stick.vector().x).toBeCloseTo(0.5);
    s.fire(s.root, 'pointercancel', 1, 130, 400);
    expect(s.stick.vector()).toEqual({ x: 0, y: 0 });
  });
});

describe('ignore zones (AC104)', () => {
  it('a touch that starts on a button never looks, taps or steers', () => {
    const s = setup();
    const btn = document.createElement('button');
    s.root.append(btn);
    s.router.addIgnoreZone(btn);
    s.fire(btn, 'pointerdown', 1, 700, 300);
    s.fire(s.root, 'pointermove', 1, 760, 300);
    s.fire(s.root, 'pointerup', 1, 760, 300);
    s.fire(btn, 'pointerdown', 2, 100, 300);
    expect(s.router.ownerOf(1)).toBeNull();
    expect(s.router.ownerOf(2)).toBeNull();
    expect(s.taps).toEqual([]);
    expect(s.look.consumeDelta()).toEqual({ dx: 0, dy: 0 });
    expect(s.stick.vector()).toEqual({ x: 0, y: 0 });
  });
  it('a child of a zone counts, and a removed zone does not', () => {
    const s = setup();
    const zone = document.createElement('div');
    const child = document.createElement('span');
    zone.append(child);
    s.root.append(zone);
    const remove = s.router.addIgnoreZone(zone);
    s.fire(child, 'pointerdown', 1, 700, 300);
    expect(s.router.ownerOf(1)).toBeNull();
    remove();
    s.fire(child, 'pointerdown', 2, 700, 300);
    expect(s.router.ownerOf(2)).toBe('look');
  });
});

describe('hud', () => {
  it('builds buttons that are ignore zones and call their handlers', () => {
    const s = setup();
    const calls: string[] = [];
    const hud = createHud({
      router: s.router,
      onJump: () => calls.push('jump'),
      onMode: (m) => calls.push(m),
      onPause: () => calls.push('pause'),
    });
    s.root.append(hud.root);
    expect(hud.slots).toHaveLength(8);
    const buttons = [...hud.root.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Pauze', 'Hakken', 'Bouwen', 'Spring']);
    const find = (t: string) => buttons.find((b) => b.textContent === t)!;
    let id = 10;
    for (const t of ['Spring', 'Bouwen', 'Pauze']) {
      id++;
      s.fire(find(t), 'pointerdown', id, 700, 300);
      s.fire(find(t), 'pointerup', id, 700, 300);
      expect(s.router.ownerOf(id)).toBeNull();
      s.advance(1);
    }
    expect(calls).toEqual(['jump', 'bouwen', 'pause']);
    expect(find('Bouwen').getAttribute('aria-pressed')).toBe('true');
    expect(find('Hakken').getAttribute('aria-pressed')).toBe('false');
    s.fire(hud.countdownSlot, 'pointerdown', 20, 700, 300);
    expect(s.router.ownerOf(20)).toBeNull();
    hud.destroy();
  });
});
