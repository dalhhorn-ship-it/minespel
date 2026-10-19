import { describe, expect, it } from 'vitest';
import { createCatalog } from './catalog';
import { buildFolderBundles, folderBundles } from './folder-modules';
import { validateBundle } from './validate';

const topic = (id: string) => ({ id, title: id, groups: [6], lesson: { pages: [] }, items: [] });
const info = (id: string, topics: string[]) => ({
  id,
  title: id,
  subject: 'taal',
  version: 1,
  language: 'nl',
  levels: ['M6'],
  topics,
  exams: [],
});

describe('folder modules', () => {
  it('builds one bundle per folder with a module.json, sorted by folder name', () => {
    const bundles = buildFolderBundles({
      '../../docs/modules/zz/module.json': info('zz', ['b', 'a']),
      '../../docs/modules/zz/a.json': topic('a'),
      '../../docs/modules/zz/b.json': topic('b'),
      '../../docs/modules/aa/module.json': info('aa', []),
      '../../docs/modules/loose/notes.json': {},
    });
    expect(bundles.map((b) => b.module.id)).toEqual(['aa', 'zz']);
    expect(bundles[1]?.topics.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('fails loudly when a topic file is missing', () => {
    expect(() =>
      buildFolderBundles({ '../../docs/modules/x/module.json': info('x', ['gone']) }),
    ).toThrow('gone.json is missing');
  });

  it('loads every module folder in docs/modules, and each passes the built in rules', () => {
    const ids = folderBundles.map((b) => b.module.id);
    expect(ids).toContain('cito-taalverzorging');
    expect(ids).toContain('taal-e6');
    for (const bundle of folderBundles) {
      expect(validateBundle(bundle, { builtIn: true }), bundle.module.id).toEqual({
        ok: true,
        problems: [],
      });
    }
  });

  it('puts every folder module in the catalog as a built in module', () => {
    const catalog = createCatalog();
    for (const bundle of folderBundles) {
      expect(catalog.getModule(bundle.module.id)).toBe(bundle);
      expect(catalog.isBuiltIn(bundle.module.id)).toBe(true);
    }
  });
});
