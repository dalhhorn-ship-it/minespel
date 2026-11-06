// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { pickFile, TOO_BIG_MESSAGE } from './file-pick';

function fakeInputClick(files: File[] | null, cancel = false) {
  const orig = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    queueMicrotask(() => {
      if (cancel) return void this.dispatchEvent(new Event('cancel'));
      Object.defineProperty(this, 'files', { value: files, configurable: true });
      this.dispatchEvent(new Event('change'));
    });
  };
  return () => {
    HTMLInputElement.prototype.click = orig;
  };
}

describe('file pick helper (AC195 size, AC133)', () => {
  it('reads a small json file and removes the input', async () => {
    const undo = fakeInputClick([new File(['{"a":1}'], 'b.json')]);
    const r = await pickFile({ maxBytes: 100 });
    undo();
    expect(r).toEqual({ ok: true, name: 'b.json', text: '{"a":1}' });
    expect(document.querySelector('input[type=file]')).toBeNull();
  });
  it('refuses a file over the limit before reading it', async () => {
    let read = false;
    const big = new File(['x'.repeat(50)], 'big.json');
    big.text = () => {
      read = true;
      return Promise.resolve('');
    };
    const undo = fakeInputClick([big]);
    const r = await pickFile({ maxBytes: 10 });
    undo();
    expect(r).toEqual({ ok: false, message: TOO_BIG_MESSAGE });
    expect(TOO_BIG_MESSAGE).toBe('Dit bestand is te groot.');
    expect(read).toBe(false);
  });
  it('resolves null when nothing is picked', async () => {
    const undo = fakeInputClick(null, true);
    expect(await pickFile({ maxBytes: 10 })).toBeNull();
    undo();
    const undo2 = fakeInputClick([]);
    expect(await pickFile({ maxBytes: 10 })).toBeNull();
    undo2();
  });
});
