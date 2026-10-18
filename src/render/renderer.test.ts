import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../world/world';
import {
  CONTEXT_RESTORE_WAIT_MS, createNullRenderer, createRenderer, withContextRecovery, type GameRenderer, type RendererFactory,
} from './renderer';
import { DEFAULT_QUALITY } from './quality';

// three.js needs WebGL, which jsdom does not have. The real renderer is proven in the e2e run.
describe('createRenderer', () => {
  it('uses the factory it is given and passes the options', () => {
    const fake: GameRenderer = { ...createNullRenderer({ canvas: document.createElement('canvas') }), render: vi.fn() };
    const factory = vi.fn<RendererFactory>(() => fake);
    const canvas = document.createElement('canvas');
    const r = createRenderer({ canvas, quality: DEFAULT_QUALITY }, factory);
    expect(r).toBe(fake);
    expect(factory).toHaveBeenCalledWith({ canvas, quality: DEFAULT_QUALITY });
    r.render();
    expect(fake.render).toHaveBeenCalledOnce();
  });
  it('null renderer accepts every call', () => {
    const r = createRenderer({ canvas: document.createElement('canvas') }, createNullRenderer);
    r.setWorld(new World());
    r.blockChanged(1, 1);
    r.setCamera({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    r.resize(100, 100, 2);
    r.setQuality(DEFAULT_QUALITY);
    r.setSpikeDinos(null);
    r.render();
    r.dispose();
  });
});

describe('withContextRecovery', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A factory that records every inner renderer it makes and what each was told. */
  function setup() {
    const made: { canvas: HTMLCanvasElement | null; calls: string[]; dispose: ReturnType<typeof vi.fn> }[] = [];
    const inner: RendererFactory = ({ canvas }) => {
      const calls: string[] = [];
      const dispose = vi.fn();
      made.push({ canvas, calls, dispose });
      return {
        canvas,
        setWorld: () => void calls.push('world'),
        blockChanged: () => void calls.push('block'),
        setCamera: () => void calls.push('camera'),
        resize: () => void calls.push('resize'),
        setQuality: () => void calls.push('quality'),
        setSpikeDinos: (d) => void calls.push(d ? 'dinos' : 'nodinos'),
        render: () => void calls.push('render'),
        dispose,
      };
    };
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.className = 'world-canvas';
    canvas.style.cssText = 'width:100%';
    host.append(canvas);
    const r = withContextRecovery(inner)({ canvas });
    r.setWorld(new World());
    r.setSpikeDinos([]);
    r.resize(800, 600, 2);
    r.setCamera({ x: 1, y: 2, z: 3, yaw: 0, pitch: 0 });
    return { made, host, canvas, r };
  }
  const lose = (c: HTMLCanvasElement) => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

  it('prevents the default on loss and stops drawing', () => {
    const { made, canvas, r } = setup();
    const ev = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    r.render();
    expect(made[0]?.calls).not.toContain('render');
  });

  it('rebuilds everything on the same canvas when the context comes back', () => {
    const { made, canvas, r } = setup();
    lose(canvas);
    vi.advanceTimersByTime(CONTEXT_RESTORE_WAIT_MS - 100);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(made).toHaveLength(2);
    expect(made[0]?.dispose).toHaveBeenCalled();
    expect(made[1]?.canvas).toBe(canvas);
    expect(made[1]?.calls).toEqual(['resize', 'world', 'dinos', 'camera']);
    r.render();
    expect(made[1]?.calls).toContain('render');
    vi.advanceTimersByTime(5000);
    expect(made).toHaveLength(2); // the timer was cancelled
  });

  it('makes a new canvas in the same place when there is no restore in 1.5 seconds', () => {
    const { made, host, canvas, r } = setup();
    lose(canvas);
    vi.advanceTimersByTime(CONTEXT_RESTORE_WAIT_MS);
    expect(made).toHaveLength(2);
    expect(r.canvas).not.toBe(canvas);
    expect(host.contains(canvas)).toBe(false);
    expect(host.querySelector('canvas')).toBe(r.canvas);
    expect(r.canvas?.className).toBe('world-canvas');
    expect(r.canvas?.style.cssText).toBe(canvas.style.cssText);
    expect(made[1]?.calls).toEqual(['resize', 'world', 'dinos', 'camera']);
    // The new canvas is watched too.
    lose(r.canvas as HTMLCanvasElement);
    vi.advanceTimersByTime(CONTEXT_RESTORE_WAIT_MS);
    expect(made).toHaveLength(3);
  });

  it('dispose cancels the timer and removes the canvas', () => {
    const { made, host, canvas, r } = setup();
    lose(canvas);
    r.dispose();
    vi.advanceTimersByTime(5000);
    expect(made).toHaveLength(1);
    expect(host.querySelector('canvas')).toBeNull();
  });
});
