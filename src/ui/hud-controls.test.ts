import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHud, type Hud } from './hud';
import { LOOK_TAP_MAX_MS } from '../game/player-controller';

function ptr(type: string, id: number): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}

let hud: Hud;
const calls = {
  asc: vi.fn<(on: boolean) => void>(),
  desc: vi.fn<(on: boolean) => void>(),
  tap: vi.fn<(x: number, y: number) => void>(),
  look: vi.fn<(x: number, y: number) => void>(),
};
const q = (cls: string) => hud.root.querySelector<HTMLElement>(`.${cls}`)!;
const fire = (node: Element, type: string, id = 1) => node.dispatchEvent(ptr(type, id));

beforeEach(() => {
  vi.useFakeTimers();
  for (const f of Object.values(calls)) f.mockReset();
  hud = createHud({
    router: { addIgnoreZone: () => () => {}, ownerOf: () => null, destroy: () => {} },
    onJump: () => {},
    onMode: () => {},
    onPause: () => {},
    onAscend: calls.asc,
    onDescend: calls.desc,
    onLookTap: calls.tap,
    onLook: calls.look,
  });
  document.body.append(hud.root);
});
afterEach(() => {
  hud.destroy();
  vi.useRealTimers();
  document.body.textContent = '';
});

const releases: Array<[string, () => void]> = [
  ['pointerup', () => fire(q('hud-fly-up'), 'pointerup')],
  ['pointercancel', () => fire(q('hud-fly-up'), 'pointercancel')],
  ['lostpointercapture', () => fire(q('hud-fly-up'), 'lostpointercapture')],
  ['window blur', () => window.dispatchEvent(new Event('blur'))],
  ['orientationchange', () => window.dispatchEvent(new Event('orientationchange'))],
  ['hidden page', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  }],
  ['releaseAll (screen opened, pause)', () => hud.releaseAll()],
];

describe('Omhoog and Omlaag', () => {
  it('have labels and aria labels', () => {
    expect(q('hud-fly-up').textContent).toContain('Omhoog');
    expect(q('hud-fly-down').textContent).toContain('Omlaag');
    expect(q('hud-fly-up').getAttribute('aria-label')).toBeTruthy();
  });
  for (const [name, release] of releases) {
    it(`Omhoog releases once on ${name}`, () => {
      fire(q('hud-fly-up'), 'pointerdown');
      expect(calls.asc).toHaveBeenCalledTimes(1);
      expect(calls.asc).toHaveBeenLastCalledWith(true);
      release();
      expect(calls.asc).toHaveBeenCalledTimes(2);
      expect(calls.asc).toHaveBeenLastCalledWith(false);
      release();
      fire(q('hud-fly-up'), 'lostpointercapture'); // the follow up events find nothing held
      expect(calls.asc).toHaveBeenCalledTimes(2);
    });
    it(`Omlaag releases once on ${name}`, () => {
      const down = q('hud-fly-down');
      fire(down, 'pointerdown');
      expect(calls.desc).toHaveBeenLastCalledWith(true);
      if (name.startsWith('pointer') || name.startsWith('lost')) fire(down, name.startsWith('lost') ? 'lostpointercapture' : name);
      else release();
      expect(calls.desc).toHaveBeenCalledTimes(2);
      expect(calls.desc).toHaveBeenLastCalledWith(false);
    });
  }
  it('a rotation through resize releases, a resize that keeps the orientation does not', () => {
    fire(q('hud-fly-up'), 'pointerdown');
    window.dispatchEvent(new Event('resize'));
    expect(calls.asc).toHaveBeenCalledTimes(1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: h, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: w + 1, configurable: true });
    window.dispatchEvent(new Event('resize'));
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
    expect(calls.asc).toHaveBeenLastCalledWith(false);
    expect(calls.asc).toHaveBeenCalledTimes(2);
  });
  it('a second finger on a held button is ignored, and another pointer cannot release it', () => {
    fire(q('hud-fly-up'), 'pointerdown', 1);
    fire(q('hud-fly-up'), 'pointerdown', 2);
    fire(q('hud-fly-up'), 'pointerup', 2);
    expect(calls.asc).toHaveBeenCalledTimes(1);
  });
  it('destroy while held releases and removes the listeners', () => {
    fire(q('hud-fly-up'), 'pointerdown');
    hud.destroy();
    expect(calls.asc).toHaveBeenLastCalledWith(false);
    window.dispatchEvent(new Event('blur'));
    expect(calls.asc).toHaveBeenCalledTimes(2);
  });
});

describe('camera arrows', () => {
  it('a press under 200 ms is one tap and never a hold', () => {
    fire(q('hud-arrow-left'), 'pointerdown');
    vi.advanceTimersByTime(LOOK_TAP_MAX_MS - 20);
    fire(q('hud-arrow-left'), 'pointerup');
    vi.advanceTimersByTime(1000);
    expect(calls.tap).toHaveBeenCalledTimes(1);
    expect(calls.tap).toHaveBeenCalledWith(-1, 0);
    expect(calls.look).not.toHaveBeenCalled();
  });
  it('a press past 200 ms sets the look input and releases to zero, with no tap', () => {
    fire(q('hud-arrow-up'), 'pointerdown');
    vi.advanceTimersByTime(LOOK_TAP_MAX_MS - 1);
    expect(calls.look).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(calls.look).toHaveBeenCalledTimes(1);
    expect(calls.look).toHaveBeenLastCalledWith(0, 1);
    fire(q('hud-arrow-up'), 'pointerup');
    expect(calls.look).toHaveBeenCalledTimes(2);
    expect(calls.look).toHaveBeenLastCalledWith(0, 0);
    expect(calls.tap).not.toHaveBeenCalled();
  });
  it('left and right held together give 0, and up plus left add up', () => {
    fire(q('hud-arrow-left'), 'pointerdown', 1);
    fire(q('hud-arrow-right'), 'pointerdown', 2);
    vi.advanceTimersByTime(300);
    expect(calls.look).toHaveBeenLastCalledWith(0, 0);
    fire(q('hud-arrow-right'), 'pointerup', 2);
    expect(calls.look).toHaveBeenLastCalledWith(-1, 0);
    fire(q('hud-arrow-up'), 'pointerdown', 3);
    vi.advanceTimersByTime(300);
    expect(calls.look).toHaveBeenLastCalledWith(-1, 1);
    fire(q('hud-arrow-left'), 'pointerup', 1);
    expect(calls.look).toHaveBeenLastCalledWith(0, 1);
  });
  it('a short tap on a second arrow while another is held is a tap, not a hold', () => {
    fire(q('hud-arrow-left'), 'pointerdown', 1);
    vi.advanceTimersByTime(300);
    calls.look.mockClear();
    fire(q('hud-arrow-up'), 'pointerdown', 2);
    vi.advanceTimersByTime(50);
    fire(q('hud-arrow-up'), 'pointerup', 2);
    expect(calls.tap).toHaveBeenCalledWith(0, 1);
    expect(calls.look).not.toHaveBeenCalled();
  });
  for (const [name, release] of [
    ['pointercancel', () => fire(q('hud-arrow-right'), 'pointercancel')],
    ['lostpointercapture', () => fire(q('hud-arrow-right'), 'lostpointercapture')],
    ['window blur', () => window.dispatchEvent(new Event('blur'))],
    ['orientationchange', () => window.dispatchEvent(new Event('orientationchange'))],
    ['releaseAll', () => hud.releaseAll()],
  ] as Array<[string, () => void]>) {
    it(`a held arrow releases once on ${name}`, () => {
      fire(q('hud-arrow-right'), 'pointerdown');
      vi.advanceTimersByTime(300);
      expect(calls.look).toHaveBeenLastCalledWith(1, 0);
      release();
      release();
      expect(calls.look).toHaveBeenCalledTimes(2);
      expect(calls.look).toHaveBeenLastCalledWith(0, 0);
      expect(calls.tap).not.toHaveBeenCalled();
    });
    it(`an arrow cut short by ${name} is neither a tap nor a hold`, () => {
      fire(q('hud-arrow-right'), 'pointerdown');
      vi.advanceTimersByTime(50);
      release();
      vi.advanceTimersByTime(1000);
      expect(calls.tap).not.toHaveBeenCalled();
      expect(calls.look).not.toHaveBeenCalled();
    });
  }
});
