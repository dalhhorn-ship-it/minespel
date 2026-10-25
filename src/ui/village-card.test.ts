// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { ChoiceItem, TypeItem } from '../content/format';
import { BLOCK_COLORS } from '../render/effects';
import { reduceVillage, startVillageCard, type VillageCardState, type VillageQuestion } from '../learning/village-question';
import { VILLAGER_LOOKS } from '../villagers/villager';
import { RARE_BLOCKS } from '../world/blocks';
import { createVillageCard, type VillageCardAction } from './village-card';

const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const byId = (root: Element, id: string) => root.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

const choice: ChoiceItem = {
  id: 'c1', level: 'M6', skill: 's', prompt: 'Welke is goed?', explain: 'Kijk naar de eind-t.',
  type: 'choice', options: ['loopt', 'loop'], answer: 0,
};
const html: TypeItem = {
  id: 't1', level: 'M6', skill: 's', prompt: '<b>fet</b> https://example.com', explain: '<img src=x onerror=alert(1)> <a href="http://x.nl">link</a>',
  type: 'type', answer: ['ja'],
};
const q = (item: ChoiceItem | TypeItem): VillageQuestion => ({ moduleId: 'taal', topic: 't', entry: { item, box: 2 } });

function open(question: VillageQuestion, found: number[] = [], gives = 35) {
  const actions: VillageCardAction[] = [];
  const card = createVillageCard({ state: startVillageCard(question, gives, found), look: VILLAGER_LOOKS[0]!, onAction: (a) => actions.push(a), now: () => 0 });
  document.body.append(card.element);
  return { card, actions };
}
const step = (s: VillageCardState, ev: Parameters<typeof reduceVillage>[1]) => reduceVillage(s, ev).state;
const ans = (index: number, roll = 0.7) => ({ type: 'answer', response: { type: 'choice', index }, ms: 1, at: 1, roll }) as const;

describe('village card (V11d)', () => {
  it('AC183: shows the villager face and the question with its answer buttons, plus Laat maar', () => {
    const { card, actions } = open(q(choice));
    expect(byId(card.element, 'village-face')).not.toBeNull();
    expect(card.element.textContent).toContain('Welke is goed?');
    const options = [...card.element.querySelectorAll('.q-option')];
    expect(options).toHaveLength(2);
    tap(options[1]!);
    expect(actions).toEqual([{ type: 'answer', response: { type: 'choice', index: 1 } }]);
    tap(byId(card.element, 'village-laat-maar')!);
    expect(actions[1]).toEqual({ type: 'laatMaar' });
    expect(card.phase()).toBe('question');
  });

  it('AC184: a wrong first try shows "Net niet. Probeer het nog een keer." and not the answer', () => {
    const { card } = open(q(choice));
    const s = step(startVillageCard(q(choice), 35, []), ans(1));
    card.render(s);
    expect(card.phase()).toBe('retry');
    expect(card.element.textContent).toContain('Net niet. Probeer het nog een keer.');
    expect(card.element.textContent).not.toContain('Zo zit het');
  });

  it('AC184: right shows Respect bruuuuu! or the dance, the block, "In mijn hotbar" and "Verder"', () => {
    const { card, actions } = open(q(choice));
    const s0 = startVillageCard(q(choice), 35, []);
    card.render(step(s0, ans(0, 0.9)));
    expect(card.element.textContent).toContain('Respect bruuuuu!');
    expect(byId(card.element, 'village-found')?.textContent).toBe('Je hebt lavakristal gevonden!');
    tap(byId(card.element, 'village-hotbar')!);
    tap(byId(card.element, 'village-verder')!);
    expect(actions.map((a) => a.type)).toEqual(['hotbar', 'verder']);
    card.render(step(s0, ans(0, 0.1)));
    expect(card.element.textContent).toContain('Kijk, een dansje!');
  });

  it('AC184: the cheer shows once on the reward card', () => {
    const { card } = open(q(choice));
    const s0 = startVillageCard(q(choice), 35, []);
    for (const c of [step(s0, ans(0, 0.9)), step(s0, ans(0, 0.1))]) {
      card.render(c);
      const text = card.element.textContent ?? '';
      const cheer = text.includes('Respect bruuuuu!') ? 'Respect bruuuuu!' : 'Kijk, een dansje!';
      expect(text.split(cheer).length - 1).toBe(1);
    }
  });

  it('AC184: a block found before shows "Die had je al!" and only Verder', () => {
    const { card } = open(q(choice), [35]);
    card.render(step(startVillageCard(q(choice), 35, [35]), ans(0)));
    expect(byId(card.element, 'village-already')?.textContent).toBe('Die had je al!');
    expect(byId(card.element, 'village-hotbar')).toBeNull();
    expect(byId(card.element, 'village-found')).toBeNull();
    expect(byId(card.element, 'village-verder')).not.toBeNull();
  });

  it('AC184: wrong twice shows "Zo zit het:", the right answer and the explain text, with no block', () => {
    const { card } = open(q(choice));
    let s = startVillageCard(q(choice), 35, []);
    s = step(step(s, ans(1)), ans(1));
    card.render(s);
    expect(card.phase()).toBe('wrong');
    expect(card.element.textContent).toContain('Zo zit het:');
    expect(byId(card.element, 'village-answer')?.textContent).toBe('loopt');
    expect(byId(card.element, 'village-explain')?.textContent).toBe('Kijk naar de eind-t.');
    expect(card.element.textContent).toContain('Volgende keer lukt het vast!');
    expect(byId(card.element, 'village-hotbar')).toBeNull();
    expect(byId(card.element, 'village-laat-maar')).toBeNull();
  });

  it('AC185: the card never shows a plus or minus number or a bonus', () => {
    const { card } = open(q(choice));
    const s0 = startVillageCard(q(choice), 35, []);
    for (const s of [s0, step(s0, ans(1)), step(step(s0, ans(1)), ans(1)), step(s0, ans(0))]) {
      card.render(s);
      expect(card.element.textContent).not.toMatch(/[+−]\s?\d|punt|bonus/i);
    }
  });

  it('AC189: an item that looks like HTML or a web address is plain text, with no link, image or script', () => {
    const { card } = open(q(html));
    expect(card.element.textContent).toContain('<b>fet</b> https://example.com');
    let s = startVillageCard(q(html), 35, []);
    const wrongAns = (): Parameters<typeof reduceVillage>[1] => ({ type: 'answer', response: { type: 'type', text: 'nee' }, ms: 1, at: 1, roll: 0.5 });
    s = step(step(s, wrongAns()), wrongAns());
    card.render(s);
    expect(byId(card.element, 'village-explain')?.textContent).toBe(html.explain);
    expect(card.element.querySelector('a, img, script, iframe, b')).toBeNull();
  });

  it('AC184: every card button is at least 56 high and the stylesheet has no hover rule', () => {
    const css = nodeFs.readFileSync('src/styles/village.css', 'utf8');
    expect(css.match(/\.village-btn \{[^}]*\}/)?.[0]).toMatch(/min-height:\s*56px/);
    expect(css).not.toMatch(/:hover/);
  });

  it('AC187: every rare block has a colour for the reward picture', () => {
    for (const id of RARE_BLOCKS) expect(BLOCK_COLORS[id]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('AC184: a double tap on a card button acts once', () => {
    const onAction = vi.fn();
    let t = 0;
    const card = createVillageCard({ state: startVillageCard(q(choice), 35, []), look: VILLAGER_LOOKS[0]!, onAction, now: () => t });
    const b = byId(card.element, 'village-laat-maar')!;
    tap(b);
    t += 50;
    tap(b);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
