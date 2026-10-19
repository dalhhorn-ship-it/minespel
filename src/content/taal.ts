// The built in Taal module. It is built from exactly the folder docs/modules/cito-taalverzorging/
// (AC59), with no copy step. All folder modules are loaded by ./folder-modules.
import { FOLDER_MODULE_CREATED_AT, folderBundles } from './folder-modules';
import type { ModuleBundle } from './format';

export const TAAL_MODULE_ID = 'cito-taalverzorging';

/** Fixed, so the bundle is the same every time (T20 compares the bundle script output to this one). */
export const TAAL_CREATED_AT = FOLDER_MODULE_CREATED_AT;

function find(): ModuleBundle {
  const bundle = folderBundles.find((b) => b.module.id === TAAL_MODULE_ID);
  if (bundle === undefined) throw new Error('Taal module: module.json is missing');
  return bundle;
}

export const taalBundle: ModuleBundle = find();
