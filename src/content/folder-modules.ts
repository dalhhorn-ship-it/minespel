// Built in folder modules. Every folder in docs/modules/ with a module.json becomes one module
// bundle, with no copy step and no code change (AC59). A new module is just a new folder:
// see docs/modules/README.md and the /module skill.
import { APP_NAME, FORMAT_VERSION } from './format';
import type { ModuleBundle, ModuleInfo, Topic } from './format';

/** Fixed, so a bundle is the same every time (T20 compares the bundle script output to it). */
export const FOLDER_MODULE_CREATED_AT = '2026-10-17T00:00:00.000Z';

/** Path key -> parsed JSON. Keys look like `../../docs/modules/<folder>/<file>.json`. */
export type JsonFiles = Record<string, unknown>;

const files = import.meta.glob('../../docs/modules/*/*.json', {
  eager: true,
  import: 'default',
}) as JsonFiles;

function splitKey(key: string): { folder: string; name: string } | null {
  const m = /\/([^/]+)\/([^/]+)\.json$/.exec(key);
  return m ? { folder: m[1] ?? '', name: m[2] ?? '' } : null;
}

/** Builds one bundle per folder that has a module.json, sorted by folder name. Pure, so tests can pass their own files. */
export function buildFolderBundles(input: JsonFiles): ModuleBundle[] {
  const byFolder = new Map<string, Map<string, unknown>>();
  for (const [key, value] of Object.entries(input)) {
    const parts = splitKey(key);
    if (!parts) continue;
    const folder = byFolder.get(parts.folder) ?? new Map<string, unknown>();
    folder.set(parts.name, value);
    byFolder.set(parts.folder, folder);
  }
  const bundles: { folder: string; bundle: ModuleBundle }[] = [];
  for (const [folder, folderFiles] of byFolder) {
    const module = folderFiles.get('module') as ModuleInfo | undefined;
    if (module === undefined) continue;
    const topics = module.topics.map((id) => {
      const topic = folderFiles.get(id);
      if (topic === undefined) throw new Error(`Module ${folder}: ${id}.json is missing`);
      return topic as Topic;
    });
    bundles.push({
      folder,
      bundle: {
        app: APP_NAME,
        kind: 'module',
        formatVersion: FORMAT_VERSION,
        createdAt: FOLDER_MODULE_CREATED_AT,
        module,
        topics,
      },
    });
  }
  bundles.sort((a, b) => a.folder.localeCompare(b.folder));
  return bundles.map((b) => b.bundle);
}

export const folderBundles: readonly ModuleBundle[] = buildFolderBundles(files);
