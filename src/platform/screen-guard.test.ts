import { describe, expect, it } from 'vitest';
import { computeGuardState, startScreenGuard } from './screen-guard';

describe('computeGuardState', () => {
  it('landscape iPad is fine', () => {
    expect(computeGuardState(1024, 768)).toEqual({ portrait: false, tooSmall: false });
    expect(computeGuardState(900, 700)).toEqual({ portrait: false, tooSmall: false });
  });
  it('portrait shows only the portrait message', () => {
    expect(computeGuardState(768, 1024)).toEqual({ portrait: true, tooSmall: false });
  });
  it('a landscape window under 900 wide is too small', () => {
    expect(computeGuardState(899, 700)).toEqual({ portrait: false, tooSmall: true });
    expect(computeGuardState(678, 600)).toEqual({ portrait: false, tooSmall: true });
  });
  it('a tall Split View window on a landscape iPad is too small, not portrait (AC108)', () => {
    expect(computeGuardState(678, 768, 90)).toEqual({ portrait: false, tooSmall: true });
    expect(computeGuardState(678, 768, -90)).toEqual({ portrait: false, tooSmall: true });
    expect(computeGuardState(768, 1024, 0)).toEqual({ portrait: true, tooSmall: false });
  });
});

function fakeWindow(w: number, h: number) {
  const target = new EventTarget();
  const win = Object.assign(target, { innerWidth: w, innerHeight: h }) as unknown as Window;
  return {
    win,
    resize(nw: number, nh: number) {
      (win as { innerWidth: number }).innerWidth = nw;
      (win as { innerHeight: number }).innerHeight = nh;
      target.dispatchEvent(new Event('resize'));
    },
  };
}

describe('startScreenGuard', () => {
  it('shows and hides the right overlay and tells subscribers', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const f = fakeWindow(1024, 768);
    const guard = startScreenGuard(f.win, document, host);
    const portrait = host.querySelector<HTMLElement>('[data-overlay="portrait"]')!;
    const small = host.querySelector<HTMLElement>('[data-overlay="small"]')!;
    expect(portrait.textContent).toContain('Draai je iPad');
    expect(small.textContent).toContain('Maak dit venster groter');
    expect(portrait.hidden).toBe(true);
    expect(small.hidden).toBe(true);

    const seen: Array<{ portrait: boolean; tooSmall: boolean }> = [];
    guard.subscribe((s) => seen.push(s));
    expect(seen).toHaveLength(1); // current state right away

    f.resize(768, 1024);
    expect(portrait.hidden).toBe(false);
    expect(small.hidden).toBe(true);

    f.resize(800, 600);
    expect(portrait.hidden).toBe(true);
    expect(small.hidden).toBe(false);

    f.resize(1024, 768);
    expect(portrait.hidden).toBe(true);
    expect(small.hidden).toBe(true);
    expect(seen.map((s) => [s.portrait, s.tooSmall])).toEqual([
      [false, false],
      [true, false],
      [false, true],
      [false, false],
    ]);

    f.resize(1100, 768); // no change, no call
    expect(seen).toHaveLength(4);
    guard.dispose();
    expect(host.children).toHaveLength(0);
    host.remove();
  });
});
