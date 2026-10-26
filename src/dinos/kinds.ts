// The four shop dinos, the ten Bijzondere dino's (decision 113) and chickens (kip).
// Prices live here and nowhere else (ARCHITECTURE).

export const SHOP_DINO_IDS = ['compy', 'triceratops', 'stegosaurus', 'brachiosaurus'] as const;
/** The expensive special dinos, cheapest first. A golden exam egg never is one of these. */
export const SPECIAL_DINO_IDS = [
  'velociraptor', 'pachycephalosaurus', 'parasaurolophus', 'ankylosaurus', 'dilophosaurus',
  'spinosaurus', 'trex', 'ijsraptor', 'lavarex', 'regenboogsaurus',
] as const;
export const DINO_KIND_IDS = [...SHOP_DINO_IDS, ...SPECIAL_DINO_IDS, 'kip'] as const;
export type DinoKindId = (typeof DINO_KIND_IDS)[number];

export interface DinoKind {
  id: DinoKindId;
  /** Dutch name shown to the kid. */
  name: string;
  /** Price in points. */
  price: number;
  /** Box size in blocks (width, height, length) of the grown dino. */
  size: { w: number; h: number; l: number };
}

export const DINO_KINDS: Record<DinoKindId, DinoKind> = {
  compy: { id: 'compy', name: 'Compy', price: 20, size: { w: 0.6, h: 0.8, l: 1 } },
  triceratops: { id: 'triceratops', name: 'Triceratops', price: 40, size: { w: 1, h: 1, l: 1.6 } },
  stegosaurus: { id: 'stegosaurus', name: 'Stegosaurus', price: 40, size: { w: 1, h: 1.2, l: 1.8 } },
  brachiosaurus: { id: 'brachiosaurus', name: 'Brachiosaurus', price: 80, size: { w: 1.2, h: 2.4, l: 2 } },
  velociraptor: { id: 'velociraptor', name: 'Velociraptor', price: 100, size: { w: 0.6, h: 1, l: 1.2 } },
  pachycephalosaurus: { id: 'pachycephalosaurus', name: 'Pachycephalosaurus', price: 110, size: { w: 0.8, h: 1.2, l: 1.2 } },
  parasaurolophus: { id: 'parasaurolophus', name: 'Parasaurolophus', price: 120, size: { w: 1, h: 1.6, l: 1.8 } },
  ankylosaurus: { id: 'ankylosaurus', name: 'Ankylosaurus', price: 130, size: { w: 1.2, h: 0.9, l: 1.8 } },
  dilophosaurus: { id: 'dilophosaurus', name: 'Dilophosaurus', price: 140, size: { w: 0.8, h: 1.4, l: 1.6 } },
  spinosaurus: { id: 'spinosaurus', name: 'Spinosaurus', price: 180, size: { w: 1, h: 2, l: 2.2 } },
  trex: { id: 'trex', name: 'T-rex', price: 200, size: { w: 1.2, h: 2.2, l: 2.2 } },
  ijsraptor: { id: 'ijsraptor', name: 'IJsraptor', price: 220, size: { w: 0.6, h: 1, l: 1.2 } },
  lavarex: { id: 'lavarex', name: 'Lavarex', price: 250, size: { w: 1.2, h: 2.2, l: 2.2 } },
  regenboogsaurus: { id: 'regenboogsaurus', name: 'Regenboogsaurus', price: 300, size: { w: 1.2, h: 2.4, l: 2 } },
  kip: { id: 'kip', name: 'Kip', price: 5, size: { w: 0.5, h: 0.7, l: 0.7 } },
};

/** Shop dino egg order, cheapest first. */
export const SHOP_KINDS: readonly DinoKind[] = SHOP_DINO_IDS.map((id) => DINO_KINDS[id]);
/** The Bijzondere dino's in shop order, cheapest first. */
export const SPECIAL_KINDS: readonly DinoKind[] = SPECIAL_DINO_IDS.map((id) => DINO_KINDS[id]);

export function isDinoKindId(x: unknown): x is DinoKindId {
  return typeof x === 'string' && (DINO_KIND_IDS as readonly string[]).includes(x);
}
