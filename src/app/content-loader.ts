// Loads what a break needs to pick questions: the catalog (built in modules; the parent's own
// modules join later) and what the parent switched on. The catalog is built once per page.
import { loadCatalog, type Catalog } from '../content/catalog';
import type { Item } from '../content/format';
import { readSwitches, type Switches } from '../content/switches';
import type { Records } from '../storage/records';

let catalogPromise: Promise<Catalog> | null = null;

export function loadBreakCatalog(): Promise<Catalog> {
  catalogPromise ??= loadCatalog().catch((e: unknown) => {
    catalogPromise = null; // try again at the next break
    throw e;
  });
  return catalogPromise;
}

/** The switches the parent chose. Nothing saved, or storage unavailable, means everything is on. */
export async function loadSwitches(records: Records | null): Promise<Switches> {
  if (!records) return readSwitches(null);
  try {
    return readSwitches(await records.get('switches'));
  } catch {
    return readSwitches(null);
  }
}

/** The topic an item belongs to. Generated sums say it in their id ("tafels:7x8"). */
export function topicOfItem(catalog: Catalog, moduleId: string, item: Item): string {
  if (catalog.module(moduleId)?.generated) {
    const id = item.id.split(':')[0] ?? '';
    if (catalog.topic(moduleId, id)) return id;
  }
  return catalog.topics(moduleId).find((t) => t.items.some((i) => i.id === item.id))?.id ?? '';
}
