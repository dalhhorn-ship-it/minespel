// Every animal with all its properties, made from the table in species.ts (decision 111).
// The shop dinos plus deployable chickens (kip).

import { bodyFromPlan, cssColor, paletteFrom, shade, sizeLabelFor, type Body, type Palette, type Size } from './body';
import { SPECIES, type SpeciesDef } from './species';

export type DinoKindId = (typeof SPECIES)[number]['id'];
export const DINO_KIND_IDS: readonly DinoKindId[] = SPECIES.map((s) => s.id);

export interface DinoKind {
  id: DinoKindId;
  /** Dutch name shown to the kid. */
  name: string;
  /** Price in points. */
  price: number;
  /** Box size in blocks (width, height, length) of the grown dino. */
  size: Size;
  /** Sold as an egg card in the Dinowinkel. */
  inShop: boolean;
  trait: string;
  sizeLabel: string;
  body: Body;
  palette: Palette;
  emblem: { light: string; tint: string; body: string };
}

/** Fills in what a species entry leaves out. */
export function generateKind(def: SpeciesDef): DinoKind {
  const palette = def.palette ?? paletteFrom(def.color, def.featureColor);
  return {
    id: def.id as DinoKindId,
    name: def.name,
    price: def.price,
    size: def.size,
    inShop: def.inShop,
    trait: def.trait,
    sizeLabel: def.sizeLabel ?? sizeLabelFor(def.size),
    body: def.body ?? bodyFromPlan(def.plan, def.size),
    palette,
    emblem: {
      light: def.emblem?.light ?? cssColor(shade(def.color, 0.85)),
      tint: def.emblem?.tint ?? cssColor(shade(def.color, 0.45)),
      body: cssColor(palette.body),
    },
  };
}

export const DINO_KINDS = Object.fromEntries(SPECIES.map((s) => [s.id, generateKind(s)])) as Record<DinoKindId, DinoKind>;

/** Shop dino egg order, cheapest first (stable, so equal prices keep table order). */
export const SHOP_KINDS: readonly DinoKind[] = DINO_KIND_IDS.map((id) => DINO_KINDS[id])
  .filter((k) => k.inShop)
  .sort((a, b) => a.price - b.price);
export const SHOP_DINO_IDS: readonly DinoKindId[] = SHOP_KINDS.map((k) => k.id);

export function isDinoKindId(x: unknown): x is DinoKindId {
  return typeof x === 'string' && (DINO_KIND_IDS as readonly string[]).includes(x);
}
