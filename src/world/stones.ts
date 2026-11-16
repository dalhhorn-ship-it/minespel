// The 8 deep stones of v20 Diepe edelstenen: ids 43 to 50 (the vein blocks). Data only, no imports, so blocks and the atlas can use it.

export interface StoneInfo {
  /** Block id, 43 to 50. Stored in saves: never renumber. */
  id: number;
  /** Dutch name, as the kid reads it. */
  name: string;
  /** Price in points. */
  price: number;
  /** Colour of the specks, as r, g, b. */
  colour: readonly [number, number, number];
}

/** The stones in shop order (cheapest first). */
export const STONES: readonly StoneInfo[] = [
  { id: 43, name: 'Maansteen', price: 80, colour: [196, 214, 255] },
  { id: 44, name: 'Zonnesteen', price: 100, colour: [255, 190, 40] },
  { id: 45, name: 'Jade', price: 120, colour: [60, 200, 120] },
  { id: 46, name: 'Opaal', price: 150, colour: [255, 150, 210] },
  { id: 47, name: 'Topaas', price: 180, colour: [255, 120, 30] },
  { id: 48, name: 'Parelsteen', price: 220, colour: [250, 244, 232] },
  { id: 49, name: 'Drakensteen', price: 300, colour: [230, 40, 50] },
  { id: 50, name: 'Mollengoud', price: 400, colour: [255, 220, 60] },
];

export const STONE_IDS: readonly number[] = STONES.map((s) => s.id);

export function stoneById(id: number): StoneInfo | undefined {
  return STONES.find((s) => s.id === id);
}
