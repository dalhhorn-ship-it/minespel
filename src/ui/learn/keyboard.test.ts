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
const keyByText = (root: Element, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement;
const item = (over: Partial<TypeItem> = {}): TypeItem => ({ id: 't', type: 'type', answer: ['x'], ...over }) as TypeItem;

describe('kid keyboard', () => {
  it('has letters, Dutch special characters, space, backspace and Klaar, and no input', () => {
    const kb = createKidKeyboard({ onChar: () => {}, onBackspace: () => {}, onDone: () => {} });
    for (const c of [...LETTER_ROWS.join(''), ...SPECIAL_KEYS]) expect(keyByText(kb.el, c)).toBeTruthy();
    for (const c of ['é', 'è', 'ë', 'ï', 'ö', 'ü', "'", '-', 'spatie', 'Klaar']) expect(keyByText(kb.el, c)).toBeTruthy();
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

  it('shift capitalises one letter, also é', () => {
    const chars: string[] = [];
    const kb = createKidKeyboard({ onChar: (c) => chars.push(c), onBackspace: () => {}, onDone: () => {} });
    tap(kb.el.querySelector('.kb-shift') as Element);
    expect(kb.isShift()).toBe(true);
    tap(keyByText(kb.el, 'É'));
    expect(chars).toEqual(['É']);
    expect(kb.isShift()).toBe(false);
    tap(keyByText(kb.el, 'é'));
    expect(chars).toEqual(['É', 'é']);
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
