// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createDino, type DinoMode } from '../dinos/dino-ai';
import type { WorldDino } from '../dinos/dino-store';
import { createDinoMenu } from './dino-menu';
import { createNameScreen, filterDinoNameDraft } from './name-screen';

function tap(el: Element | undefined | null) {
  if (!el) return;
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('dino-menu and name-screen (T45)', () => {
  it('filters name draft to allowed keyboard characters and caps at 12 chars (AC18)', () => {
    expect(filterDinoNameDraft('Rex<script>123!@#')).toBe('Rexscript');
    expect(filterDinoNameDraft('Brachiosaurus')).toBe('Brachiosauru');
    expect(filterDinoNameDraft("Zëé-Rex'je")).toBe("Zëé-Rex'je");
  });

  it('switches between Volg mij, Vrij rondlopen, Knuffel, and Naam geven (AC16, AC18)', () => {
    let time = 1000;
    const now = () => {
      time += 500;
      return time;
    };
    const dino: WorldDino = {
      ...createDino({ kind: 'stegosaurus', golden: true, x: 10, y: 5, z: 10 }, true),
      id: 'dino-1',
      name: '',
    };
    const modes: DinoMode[] = [];
    const names: string[] = [];
    let knuffels = 0;
    let closed = 0;

    const menu = createDinoMenu({
      dino,
      now,
      onModeChange: (m) => modes.push(m),
      onNameSave: (n) => names.push(n),
      onKnuffel: () => knuffels++,
      onClose: () => closed++,
    });

    const buttons = () => Array.from(menu.element.querySelectorAll('button'));
    const findBtn = (txt: string) => buttons().find((b) => b.textContent?.includes(txt));

    tap(findBtn('Vrij rondlopen'));
    expect(modes).toEqual(['stay']);

    tap(findBtn('Volg mij'));
    expect(modes).toEqual(['stay', 'follow']);

    tap(findBtn('Knuffel'));
    expect(knuffels).toBe(1);
    expect(menu.element.textContent).toContain('Wat een fijne knuffel!');

    // Open Naam geven
    tap(findBtn('Naam geven'));
    expect(menu.element.textContent).toContain('Bedenk een leuke dinonaam');

    // Terug goes back to main menu, then Sluiten closes
    tap(findBtn('Terug'));
    tap(findBtn('Sluiten'));
    expect(closed).toBe(1);

    menu.destroy();
  });

  it('types a name with the kid keyboard and saves it (AC18)', () => {
    let saved = '';
    const screen = createNameScreen({
      initialName: 'Rex',
      speciesName: 'Compy',
      onSave: (name) => {
        saved = name;
      },
      onCancel: () => {},
    });
    expect(screen.getValue()).toBe('Rex');
    const opslaan = Array.from(screen.element.querySelectorAll('button')).find(
      (b) => b.textContent === 'Opslaan',
    );
    tap(opslaan);
    expect(saved).toBe('Rex');
    screen.destroy();
  });

  it('AC315: Lavakip geven shows only with an option, closes the menu, then gives', () => {
    const dino: WorldDino = { ...createDino({ kind: 'stegosaurus', golden: false, x: 1, y: 5, z: 1 }, true), id: 'd', name: '' };
    const base = { dino, onModeChange: () => {}, onNameSave: () => {}, onKnuffel: () => {} };
    const none = createDinoMenu({ ...base, onClose: () => {}, lavakip: null });
    expect(none.element.querySelector('[data-action="lavakip"]')).toBeNull();
    none.destroy();
    const order: string[] = [];
    const give = vi.fn(() => order.push('give'));
    const menu = createDinoMenu({
      ...base,
      onClose: () => order.push('close'),
      lavakip: { text: 'Lavakip geven', give },
    });
    const btn = menu.element.querySelector('[data-action="lavakip"]');
    expect(btn?.textContent).toBe('Lavakip geven');
    tap(btn);
    expect(order).toEqual(['close', 'give']);
    menu.destroy();
  });
});
