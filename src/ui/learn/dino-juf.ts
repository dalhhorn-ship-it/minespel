// Dino Juf character card in the corner of the learning break screen (T36, PRD 4.5).
import { el } from '../dom';

export interface DinoJuf {
  readonly element: HTMLElement;
  say(text: string): void;
}

export function createDinoJuf(initialText = 'Tijd voor een leerpauze!'): DinoJuf {
  const speech = el('p', { class: 'dino-juf-speech', text: initialText });
  const element = el('div', { class: 'dino-juf', attrs: { 'aria-label': 'Dino Juf' } }, [
    el('span', { class: 'dino-juf-avatar', text: '🦕', attrs: { 'aria-hidden': 'true' } }),
    el('div', { class: 'dino-juf-bubble' }, [
      el('span', { class: 'dino-juf-name', text: 'Dino Juf:' }),
      speech,
    ]),
  ]);

  return {
    element,
    say(text: string) {
      speech.textContent = text;
    },
  };
}
