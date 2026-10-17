import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION } from './format';
import { TAAL_MODULE_ID, taalBundle } from './taal';
import { validateBundle } from './validate';

// Pinned on purpose. Changing the Taal content changes this number and must be a conscious act.
const TAAL_ITEM_COUNT = 288;

describe('built in Taal module', () => {
  it('has the bundle shape', () => {
    expect(taalBundle.app).toBe('Dino Blokwereld');
    expect(taalBundle.kind).toBe('module');
    expect(taalBundle.formatVersion).toBe(FORMAT_VERSION);
    expect(taalBundle.module.id).toBe(TAAL_MODULE_ID);
    expect(taalBundle.topics.map((t) => t.id)).toEqual(taalBundle.module.topics);
    expect(taalBundle.module.exams).toHaveLength(4);
  });

  it('has exactly 288 items', () => {
    const count = taalBundle.topics.reduce((n, t) => n + t.items.length, 0);
    expect(count).toBe(TAAL_ITEM_COUNT);
  });

  it('passes the validator with the built in rules', () => {
    expect(validateBundle(taalBundle, { builtIn: true })).toEqual({ ok: true, problems: [] });
  });

  it('has unique item ids', () => {
    const ids = taalBundle.topics.flatMap((t) => t.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
