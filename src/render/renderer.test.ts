import { describe, expect, it, vi } from 'vitest';
import { World } from '../world/world';
import { createNullRenderer, createRenderer, type GameRenderer, type RendererFactory } from './renderer';
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
