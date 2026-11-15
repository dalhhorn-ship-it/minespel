// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { TypeItem } from '../../content/format';
import { createKidKeyboard, LETTER_ROWS, SPECIAL_KEYS } from './kid-keyboard';
import { createNumberPad, PAD_KEYS } from './number-pad';
import { createNumberView } from './number-view';
import { createTypeView } from './type-view';

let time = 0;
function fire(node: Element, type: string, id = 1): void {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  node.dispatchEvent(e);
}
/** Each tap is far enough apart in real time? onTap uses performance.now, so fake it. */
function tap(node: Element): void {
  time += 1000;
  vi.spyOn(performance, 'now').mockReturnValue(time);
  fire(node, 'pointerdown');
  fire(node, 'pointerup');
}
const accentKey = (root: Element) => root.querySelector('.kb-accent') as HTMLButtonElement;
const keyByText = (root: Element, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement;
const item = (over: Partial<TypeItem> = {}): TypeItem => ({ id: 't', type: 'type', answer: ['x'], ...over }) as TypeItem;

describe('kid keyboard', () => {
  it('has letters, Dutch special characters, space, backspace and Klaar, and no input', () => {
    const kb = createKidKeyboard({ onChar: () => {}, onBackspace: () => {}, onDone: () => {} });
    for (const c of [...LETTER_ROWS.join(''), ...SPECIAL_KEYS]) expect(keyByText(kb.el, c)).toBeTruthy();
    for (const c of ['é', 'è', 'ë', 'ï', 'ö', 'ü', "'", '-', 'spatie', 'Klaar']) expect(keyByText(kb.el, c)).toBeTruthy();
    expect(kb.el.querySelectorAll('.kb-bottom').length).toBe(1);
    expect(kb.el.querySelector('input, textarea, [contenteditable]')).toBeNull();
    expect(kb.el.querySelectorAll('button').length).toBeGreaterThan(30);
  });

  it('no key can take focus (AC57)', () => {
    const kb = createKidKeyboard({ onChar: () => {}, onBackspace: () => {}, onDone: () => {} });
    document.body.append(kb.el);
    const a = keyByText(kb.el, 'a');
    expect(a.tabIndex).toBe(-1);
    a.focus();
    expect(document.activeElement).not.toBe(a);
    const md = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    a.dispatchEvent(md);
    expect(md.defaultPrevented).toBe(true);
    kb.el.remove();
  });

  it('one tap is one character (AC57)', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    const a = keyByText(kb.el, 'a');
    tap(a);
    expect(chars).toEqual(['a']);
  });

  it('typing "ee" with two taps 100 ms apart gives two letters', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    const e = keyByText(kb.el, 'e');
    for (const t of [5000, 5100]) {
      vi.spyOn(performance, 'now').mockReturnValue(t);
      fire(e, 'pointerdown');
      fire(e, 'pointerup');
    }
    expect(chars).toEqual(['e', 'e']);
  });

  it('one tap gives one character even with a following click or a stray pointerup', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    const a = keyByText(kb.el, 'a');
    fire(a, 'pointerdown');
    fire(a, 'pointerup');
    fire(a, 'pointerup');
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(chars).toEqual(['a']);
  });

  it('AC57: bottom row is accent key, wide space bar, Klaar, and there is no separate accent or space row', () => {
    const kb = createKidKeyboard({ onChar: () => {}, onBackspace: () => {}, onDone: () => {} });
    const bottom = kb.el.querySelector('.kb-bottom') as Element;
    expect([...bottom.children].map((b) => b.textContent)).toEqual(['é ë', 'spatie', 'Klaar']);
    expect(bottom.children[0]?.getAttribute('aria-label')).toBe('Letters met streepjes');
    // The direct rows are the letter panel, the accent panel and the bottom row. Letters are rows 1 to 3.
    const letters = [...kb.el.querySelectorAll('.kb-letters .kb-row')].map((r) => [...r.children].map((b) => b.textContent).join(''));
    expect(letters).toEqual(['qwertyuiop', 'asdfghjkl', '⇧zxcvbnm⌫']);
    expect(kb.el.querySelector('.kb-letters .kb-space, .kb-letters .kb-done, .kb-letters .kb-accent')).toBeNull();
  });

  it('AC57: the accent key shows the accent panel, one accent types one char and returns to the letters', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    const letters = kb.el.querySelector('.kb-letters') as HTMLElement;
    const accents = kb.el.querySelector('.kb-accents') as HTMLElement;
    expect(letters.hidden).toBe(false);
    expect(accents.hidden).toBe(true);
    tap(accentKey(kb.el));
    expect(kb.isAccentPanel()).toBe(true);
    expect(letters.hidden).toBe(true);
    expect(accents.hidden).toBe(false);
    expect(accentKey(kb.el).textContent).toBe('abc');
    expect(accentKey(kb.el).getAttribute('aria-label')).toBe('Terug naar letters');
    expect([...accents.querySelectorAll('.kb-char')].map((b) => b.textContent)).toEqual(SPECIAL_KEYS);
    tap(keyByText(accents, 'ë'));
    expect(chars).toEqual(['ë']);
    expect(kb.isAccentPanel()).toBe(false);
    expect(letters.hidden).toBe(false);
    expect(accents.hidden).toBe(true);
    expect(accentKey(kb.el).textContent).toBe('é ë');
  });

  it('AC57: abc on the accent key goes back without typing', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    tap(accentKey(kb.el));
    tap(accentKey(kb.el));
    expect(kb.isAccentPanel()).toBe(false);
    expect(chars).toEqual([]);
  });

  it('AC57: shift capitalises one letter, also an accent through the accent panel', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    tap(kb.el.querySelector('.kb-letters .kb-shift') as Element);
    expect(kb.isShift()).toBe(true);
    tap(accentKey(kb.el));
    expect(keyByText(kb.el.querySelector('.kb-accents') as Element, 'É')).toBeTruthy();
    tap(keyByText(kb.el, 'É'));
    expect(chars).toEqual(['É']);
    expect(kb.isShift()).toBe(false);
    tap(accentKey(kb.el));
    tap(keyByText(kb.el, 'é'));
    expect(chars).toEqual(['É', 'é']);
    // Shift can also be set on the accent panel itself.
    tap(accentKey(kb.el));
    tap(kb.el.querySelector('.kb-accents .kb-shift') as Element);
    tap(keyByText(kb.el, 'ü'.toUpperCase()));
    expect(chars).toEqual(['É', 'é', 'Ü']);
    expect(kb.el.querySelector('.kb-letters .kb-shift')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('AC57: fast taps on accent key, accent and space are one character each', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    const quick = (node: Element, t: number) => {
      vi.spyOn(performance, 'now').mockReturnValue(t);
      fire(node, 'pointerdown');
      fire(node, 'pointerup');
    };
    quick(accentKey(kb.el), 7000);
    quick(keyByText(kb.el, 'é'), 7040);
    quick(keyByText(kb.el, 'spatie'), 7080);
    quick(keyByText(kb.el, 'spatie'), 7120);
    expect(chars).toEqual(['é', ' ', ' ']);
  });

  it('Klaar does nothing while grey', () => {
    const onDone = vi.fn();
    const kb = createKidKeyboard({ onChar: () => {}, onBackspace: () => {}, onDone });
    const done = keyByText(kb.el, 'Klaar');
    expect(done.disabled).toBe(true);
    tap(done);
    expect(onDone).not.toHaveBeenCalled();
    kb.setDoneEnabled(true);
    tap(done);
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('type view', () => {
  it('collects typed text as plain text and answers once', () => {
    const onAnswer = vi.fn();
    const v = createTypeView({ item: item({ sentence: '<b>Schrijf het woord</b>' }), onAnswer });
    expect(v.el.querySelector('b')).toBeNull();
    expect(v.el.querySelector('.type-sentence')?.textContent).toBe('<b>Schrijf het woord</b>');
    const klaar = keyByText(v.el, 'Klaar');
    expect(klaar.disabled).toBe(true);
    tap(keyByText(v.el, 'z'));
    tap(accentKey(v.el));
    tap(keyByText(v.el, 'ë'));
    tap(keyByText(v.el, 'n'));
    expect(v.getText()).toBe('zën');
    expect(v.el.querySelector('.type-text')?.textContent).toBe('zën');
    expect(klaar.disabled).toBe(false);
    tap(keyByText(v.el, '⌫'));
    expect(v.getText()).toBe('zë');
    for (const t of [9000, 9100]) {
      vi.spyOn(performance, 'now').mockReturnValue(t);
      fire(klaar, 'pointerdown');
      fire(klaar, 'pointerup');
    }
    expect(onAnswer).toHaveBeenCalledOnce();
    expect(onAnswer).toHaveBeenCalledWith('zë');
    tap(keyByText(v.el, 'a'));
    expect(v.getText()).toBe('zë');
  });

  it('stays grey for only spaces and stops at the max length', () => {
    const v = createTypeView({ item: item(), onAnswer: () => {}, maxLength: 3 });
    tap(keyByText(v.el, 'spatie'));
    expect(keyByText(v.el, 'Klaar').disabled).toBe(true);
    for (const c of 'abc') tap(keyByText(v.el, c));
    expect(v.getText()).toBe(' ab');
  });

  it('has no input element', () => {
    const v = createTypeView({ item: item(), onAnswer: () => {} });
    expect(v.el.querySelector('input, textarea, [contenteditable]')).toBeNull();
  });
});

describe('number pad and view', () => {
  it('has digits and a comma, never a dot, minus or space (AC121)', () => {
    const pad = createNumberPad({ onChar: () => {}, onBackspace: () => {}, onDone: () => {} });
    const labels = [...pad.el.querySelectorAll('button')].map((b) => b.textContent);
    for (const d of '0123456789,') expect(labels).toContain(d);
    for (const bad of ['.', '-', ' ', '−']) expect(labels).not.toContain(bad);
    expect(PAD_KEYS).toHaveLength(11);
  });

  it('Klaar is grey for empty, "3," and ",5" and ready for "3,5" (AC58)', () => {
    const onAnswer = vi.fn();
    const v = createNumberView({ item: item(), onAnswer });
    const klaar = keyByText(v.el, 'Klaar');
    expect(klaar.disabled).toBe(true);
    tap(keyByText(v.el, '3'));
    expect(klaar.disabled).toBe(false);
    tap(keyByText(v.el, ','));
    expect(v.getText()).toBe('3,');
    expect(klaar.disabled).toBe(true);
    tap(keyByText(v.el, '5'));
    expect(klaar.disabled).toBe(false);
    tap(klaar);
    expect(onAnswer).toHaveBeenCalledWith('3,5');
  });

  it('",5" is grey and a second comma is ignored', () => {
    const v = createNumberView({ item: item(), onAnswer: () => {} });
    tap(keyByText(v.el, ','));
    tap(keyByText(v.el, '5'));
    expect(v.getText()).toBe(',5');
    expect(keyByText(v.el, 'Klaar').disabled).toBe(true);
    tap(keyByText(v.el, ','));
    expect(v.getText()).toBe(',5');
  });

  it('backspace and max length, no input element', () => {
    const v = createNumberView({ item: item(), onAnswer: () => {}, maxLength: 2 });
    tap(keyByText(v.el, '1'));
    tap(keyByText(v.el, '2'));
    tap(keyByText(v.el, '3'));
    expect(v.getText()).toBe('12');
    tap(keyByText(v.el, '⌫'));
    expect(v.getText()).toBe('1');
    expect(v.el.querySelector('input, textarea')).toBeNull();
  });
});
