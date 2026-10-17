import { describe, expect, it } from 'vitest';
import { registerHook } from './dev/e2e-hooks';

describe('scaffold', () => {
  it('has fake-indexeddb loaded', () => {
    expect(typeof indexedDB.open).toBe('function');
  });

  it('stubs the 2D canvas', () => {
    expect(document.createElement('canvas').getContext('2d')).toBeNull();
  });

  it('does not register hooks outside the e2e build', () => {
    registerHook('x', () => 1);
    expect((window as { __dino?: unknown }).__dino).toBeUndefined();
  });
});
