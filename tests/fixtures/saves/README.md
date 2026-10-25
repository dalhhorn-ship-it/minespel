# Old save fixtures

One fixture per schema version, so migrations are tested against a real old shape.
Each file is named `v<version>-<what>.json`. A schema change bumps `SCHEMA_VERSION`,
adds a step in `src/storage/migrate.ts` and adds a fixture of the old shape here.

The first fixture, `v1-world.json` (the M1 save with world and player only), is added by task T37.

## v11 village fixtures (AC179)

Saves from 0.4.0: the `world` record has only a `diff` against terrain version 1 (no `terrainVersion`).
`src/game/world-save.test.ts` opens each one and checks every cell, the player spot, the `worldV1` copy and a second open.

* `v1-village-none.json`: no block changed. All 3 villages are stamped in.
* `v1-village-one-site.json`: changes inside site oost only (also high in the air and deep in the margin). Oost stays as it was.
* `v1-village-all-sites.json`: changes in all 3 sites. No site gets houses.
* `v1-village-standing.json`: no block changed; four variants where only the player, a dino, an egg or a chicken stands in one site. That site stays as it was.
* `v1-village-random-500.json`: 500 random changes spread over the world (seed 500). Every site has a change, so no site gets houses.
