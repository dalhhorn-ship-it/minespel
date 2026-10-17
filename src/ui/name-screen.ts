// The naming screen (AC18): a field and the app's own keyboard. No input element, so the iPad
// keyboard never opens. Only keyboard characters get in, at most NAME_MAX of them.
import '../styles/dino-menu.css';
import { createKidKeyboard } from './learn/kid-keyboard';
import { el } from './dom';
import { onTap } from './tap';

export const NAME_MAX = 12;
export const NAME_PROMPT = 'Bedenk een leuke dinonaam';

export interface NameScreenOptions {
  /** The name so far, for a dino that already has one. */
  initial?: string;
  /** Klaar with a name that is not empty. */
  onDone: (name: string) => void;
  /** Terug without changing anything. */
  onCancel: () => void;
}

export interface NameScreen {
  readonly root: HTMLElement;
  value(): string;
  destroy(): void;
}

export function createNameScreen(options: NameScreenOptions): NameScreen {
  const chars: string[] = Array.from(options.initial ?? '').slice(0, NAME_MAX);
  const cleanups: Array<() => void> = [];

  const prompt = el('div', { class: 'name-prompt', text: NAME_PROMPT });
  const text = el('span', { class: 'name-text' });
  const caret = el('span', { class: 'type-caret', attrs: { 'aria-hidden': 'true' } });
  const field = el('div', { class: 'type-field name-field', attrs: { 'aria-live': 'polite' } }, [text, caret]);
  const count = el('div', { class: 'name-count' });

  const value = () => chars.join('').replace(/\s+/g, ' ').trim();
  const keyboard = createKidKeyboard({
    onChar(c) {
      if (chars.length >= NAME_MAX) return;
      if (c === ' ' && (chars.length === 0 || chars[chars.length - 1] === ' ')) return;
      chars.push(c);
      refresh();
    },
    onBackspace() {
      chars.pop();
      refresh();
    },
    onDone() {
      const v = value();
      if (v !== '') options.onDone(v);
    },
    doneLabel: 'Klaar',
  });
  function refresh(): void {
    text.textContent = chars.join('');
    count.textContent = `${chars.length} van ${NAME_MAX}`;
    keyboard.setDoneEnabled(value() !== '');
  }

  const back = el('button', { class: 'dino-btn name-back', text: 'Terug', attrs: { type: 'button' } });
  cleanups.push(onTap(back, () => options.onCancel()));

  const panel = el('div', { class: 'name-panel' }, [prompt, field, count, keyboard.el, back]);
  const root = el('div', { class: 'name-screen', attrs: { role: 'dialog', 'aria-label': 'Naam geven' } }, [panel]);
  refresh();

  return {
    root,
    value,
    destroy() {
      for (const c of cleanups) c();
      keyboard.destroy();
      root.remove();
    },
  };
}
