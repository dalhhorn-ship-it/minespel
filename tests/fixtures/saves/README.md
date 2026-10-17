# Old save fixtures

One fixture per schema version, so migrations are tested against a real old shape.
Each file is named `v<version>-<what>.json`. A schema change bumps `SCHEMA_VERSION`,
adds a step in `src/storage/migrate.ts` and adds a fixture of the old shape here.

The first fixture, `v1-world.json` (the M1 save with world and player only), is added by task T37.
