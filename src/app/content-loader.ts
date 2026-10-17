// Loads built-in Rekenen & Taal plus any valid ownModules from IndexedDB into a Catalog (T43).

import { createCatalog, type Catalog } from '../content/catalog';
import type { ModuleBundle } from '../content/format';
import { validateBundle } from '../content/validate';
import { getAll } from '../storage/db';

export async function loadCatalog(db: IDBDatabase): Promise<Catalog> {
  let storedOwn: unknown[] = [];
  try {
    storedOwn = await getAll<unknown>(db, 'ownModules');
  } catch {
    storedOwn = [];
  }
  const validOwn: ModuleBundle[] = [];
  for (const raw of storedOwn) {
    if (validateBundle(raw).ok) {
      validOwn.push(raw as ModuleBundle);
    }
  }
  return createCatalog(validOwn);
}
