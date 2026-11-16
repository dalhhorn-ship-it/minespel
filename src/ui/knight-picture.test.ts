// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createKnightPicture } from './knight-picture';

const parts = (svg: Element): string[] => [...svg.querySelectorAll('[data-part]')].map((n) => n.getAttribute('data-part')!);
const fill = (svg: Element, part: string) => svg.querySelector(`[data-part="${part}"]`)?.getAttribute('fill');

describe('knight picture', () => {
  it('AC261: it is an inline svg and holds no canvas', () => {
    const svg = createKnightPicture({});
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelector('canvas')).toBeNull();
  });
  it('AC261: a bare knight has the silver helmet and the wooden sword', () => {
    const p = parts(createKnightPicture(undefined));
    expect(p).toContain('helm-default');
    expect(p).toContain('sword-default');
    expect(p).not.toContain('pony');
  });
  it('AC261: the Hoofd item replaces the silver helmet', () => {
    const p = createKnightPicture({ hoofd: 'ijzeren-helm' });
    expect(parts(p)).toContain('helm');
    expect(parts(p)).not.toContain('helm-default');
    expect(parts(createKnightPicture({ hoofd: 'leren-kap' }))).toContain('kap');
  });
  it('AC261: the Hand item replaces the wooden sword and the others show', () => {
    const p = createKnightPicture({ hand: 'glimzwaard', schild: 'houten-schild', rug: 'riddercape', rijdier: 'pony' });
    expect(parts(p)).toContain('glimzwaard');
    expect(parts(p)).not.toContain('sword-default');
    expect(parts(p)).toEqual(expect.arrayContaining(['houten-schild', 'cape', 'pony']));
    expect(fill(p, 'cape')).toBe('#c0392b');
  });
  it('AC261: every worn slot changes the picture', () => {
    const html = (w: object) => [...createKnightPicture(w).querySelectorAll('[data-part]')].map((n) => `${n.getAttribute('data-part')}:${n.getAttribute('fill')}`).join(',');
    const bare = html({});
    for (const w of [{ hoofd: 'leren-kap' }, { schild: 'ijzeren-schild' }, { hand: 'kietelveer' }, { rug: 'riddercape' }, { rijdier: 'pony' }]) {
      expect(html(w)).not.toBe(bare);
    }
  });
  it('AC287: the new parts show in the flat picture and every new item changes it', () => {
    const html = (w: object) => [...createKnightPicture(w).querySelectorAll('[data-part]')].map((n) => `${n.getAttribute('data-part')}:${n.getAttribute('fill')}`).join(',');
    const bare = html({});
    const worn = [{ hoofd: 'pluimhelm' }, { hoofd: 'gouden-helm' }, { schild: 'drakenschild' }, { hand: 'houten-zwaard' }, { hand: 'bubbelstaf' }, { rug: 'koningscape' },
      { lijf: 'malienkolder' }, { lijf: 'glanzend-harnas' }, { voeten: 'snelle-laarzen' }, { vlag: 'banier' }, { vlag: 'koningsbanier' }, { rijdier: 'strijdpaard' }, { rijdier: 'rij-triceratops' }];
    for (const w of worn) expect(html(w), JSON.stringify(w)).not.toBe(bare);
    const p = parts(createKnightPicture({ lijf: 'glanzend-harnas', voeten: 'snelle-laarzen', vlag: 'banier', rijdier: 'rij-triceratops', hand: 'bubbelstaf' }));
    expect(p).toEqual(expect.arrayContaining(['armour', 'boots', 'banner', 'triceratops-frill', 'staff', 'staff-bubble']));
    expect(p).not.toContain('body');
    expect(html({ rijdier: 'rij-triceratops' })).not.toBe(html({ rijdier: 'strijdpaard' }));
  });
});
