// The four shop dinos plus deployable chickens (kip). Prices live here and nowhere else (ARCHITECTURE).

export const SHOP_DINO_IDS = ['compy', 'triceratops', 'stegosaurus', 'brachiosaurus'] as const;
export const DINO_KIND_IDS = ['compy', 'triceratops', 'stegosaurus', 'brachiosaurus', 'kip'] as const;
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
  kip: { id: 'kip', name: 'Kip', price: 0, size: { w: 0.5, h: 0.7, l: 0.7 } },
};

/** Shop dino egg order, cheapest first. */
export const SHOP_KINDS: readonly DinoKind[] = SHOP_DINO_IDS.map((id) => DINO_KINDS[id]);

export function isDinoKindId(x: unknown): x is DinoKindId {
  return typeof x === 'string' && (DINO_KIND_IDS as readonly string[]).includes(x);
}
