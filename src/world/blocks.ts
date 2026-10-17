// Block ids, Dutch names and flags. Id 0 is air. Ids are stored in saves: never renumber.

export const AIR = 0;
export const GRAS = 1;
export const AARDE = 2;
export const STEEN = 3;
export const KEISTEEN = 4;
export const ZAND = 5;
export const BOOMSTAM = 6;
export const PLANKEN = 7;
export const BLADEREN = 8;
export const GLAS = 9;
export const BAKSTEEN = 10;
export const WOL_WIT = 11;
export const WOL_ROOD = 12;
export const WOL_GEEL = 13;
export const WOL_BLAUW = 14;
export const WOL_GROEN = 15;
export const WOL_PAARS = 16;
export const OERSTEEN = 17;

export interface BlockInfo {
  id: number;
  name: string;
  solid: boolean;
  /** Drawn with see through pixels (alpha test), so neighbours keep their faces. */
  cutout: boolean;
  minable: boolean;
  placeable: boolean;
}

function block(id: number, name: string, cutout = false): BlockInfo {
  return { id, name, solid: true, cutout, minable: true, placeable: true };
}

export const BLOCKS: readonly BlockInfo[] = [
  { id: AIR, name: 'lucht', solid: false, cutout: true, minable: false, placeable: false },
  block(GRAS, 'gras'),
  block(AARDE, 'aarde'),
  block(STEEN, 'steen'),
  block(KEISTEEN, 'keisteen'),
  block(ZAND, 'zand'),
  block(BOOMSTAM, 'boomstam'),
  block(PLANKEN, 'planken'),
  block(BLADEREN, 'bladeren', true),
  block(GLAS, 'glas', true),
  block(BAKSTEEN, 'baksteen'),
  block(WOL_WIT, 'wol wit'),
  block(WOL_ROOD, 'wol rood'),
  block(WOL_GEEL, 'wol geel'),
  block(WOL_BLAUW, 'wol blauw'),
  block(WOL_GROEN, 'wol groen'),
  block(WOL_PAARS, 'wol paars'),
  { id: OERSTEEN, name: 'oersteen', solid: true, cutout: false, minable: false, placeable: false },
];

/** The 16 blocks a kid can place, in grid order. */
export const PLACEABLE_BLOCKS: readonly number[] = BLOCKS.filter((b) => b.placeable).map((b) => b.id);

/** Highest block id, used to size atlas tables. */
export const MAX_BLOCK_ID = OERSTEEN;

export function blockInfo(id: number): BlockInfo {
  const info = BLOCKS[id];
  if (!info) throw new RangeError(`Unknown block id ${id}`);
  return info;
}

export const isSolid = (id: number): boolean => blockInfo(id).solid;
export const isCutout = (id: number): boolean => blockInfo(id).cutout;
export const isMinable = (id: number): boolean => blockInfo(id).minable;
export const isPlaceable = (id: number): boolean => blockInfo(id).placeable;
