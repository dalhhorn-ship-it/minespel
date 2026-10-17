// The built in Taal module. It is built from exactly the folder docs/modules/cito-taalverzorging/
// (AC59), with no copy step. Load it lazily with `import('./content/taal')` so it gets its own chunk.
import { APP_NAME, FORMAT_VERSION } from './format';
import type { ModuleBundle, ModuleInfo, Topic } from './format';

export const TAAL_MODULE_ID = 'cito-taalverzorging';

/** Fixed, so the bundle is the same every time (T20 compares the bundle script output to this one). */
export const TAAL_CREATED_AT = '2026-10-17T00:00:00.000Z';

const files = import.meta.glob('../../docs/modules/cito-taalverzorging/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function fileNamed(name: string): unknown {
  const key = Object.keys(files).find((k) => k.endsWith(`/${name}.json`));
  if (key === undefined) throw new Error(`Taal module: ${name}.json is missing`);
  return files[key];
}

function build(): ModuleBundle {
  const module = fileNamed('module') as ModuleInfo;
  return {
    app: APP_NAME,
    kind: 'module',
    formatVersion: FORMAT_VERSION,
    createdAt: TAAL_CREATED_AT,
    module,
    topics: module.topics.map((id) => fileNamed(id) as Topic),
  };
}

export const taalBundle: ModuleBundle = build();
