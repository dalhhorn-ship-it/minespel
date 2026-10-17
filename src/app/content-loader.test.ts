import { describe, expect, it } from 'vitest';
import { loadBreakCatalog, loadSwitches, topicOfItem } from './content-loader';

describe('content loader', () => {
  it('finds the topic of generated sums and stored items', async () => {
    const catalog = await loadBreakCatalog();
    expect(await loadBreakCatalog()).toBe(catalog);
    const rek = catalog.item('rekenen-basis', 'tafels:7x8');
    expect(rek && topicOfItem(catalog, 'rekenen-basis', rek)).toBe('tafels');
    const sum = catalog.item('rekenen-basis', 'optellen:12+15', 'M6');
    expect(sum && topicOfItem(catalog, 'rekenen-basis', sum)).toBe('optellen');
    const taal = catalog.topics('cito-taalverzorging')[0];
    const item = taal?.items[0];
    expect(item && topicOfItem(catalog, 'cito-taalverzorging', item)).toBe(taal?.id);
  });

  it('everything is on without saved switches or storage', async () => {
    expect(await loadSwitches(null)).toEqual({ modules: {}, weights: {} });
  });
});
