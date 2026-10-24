// The three villages of v11 Dorp: fixed, hand placed sites with small houses of existing blocks.
// No random numbers here: the version 1 terrain stream must never change (V11b).
// Only existing building block ids are used, never the rare blocks.
import { BAKSTEEN, BOOMSTAM, GLAS, PLANKEN, WOL_BLAUW, WOL_ROOD, WOL_WIT } from './blocks';

/** Blocks around the village rectangle that also belong to the site (PRD 12: "plus 2 blocks"). */
export const SITE_MARGIN = 2;

/** One block of a house, relative to the house corner (dx, dz) and the pad (dy 1 is the first block above the ground). */
export interface TemplateCell {
  dx: number;
  dy: number;
  dz: number;
  id: number;
}

export interface HouseTemplate {
  name: string;
  /** Footprint, x by z. */
  width: number;
  depth: number;
  cells: readonly TemplateCell[];
}

export interface HousePlacement {
  template: HouseTemplate;
  /** World x and z of the house corner with the smallest x and z. */
  x: number;
  z: number;
}

export interface HomeSpot {
  /** Feet position, like the player spot. */
  x: number;
  y: number;
  z: number;
}

export interface VillageSite {
  id: string;
  /** The village rectangle (inclusive), without the margin. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** The y of the flat grass top of the pad. */
  padY: number;
  houses: readonly HousePlacement[];
  /** Where the villagers of this site live. */
  homes: readonly HomeSpot[];
}

export interface SiteRegion {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

const HOUSE_SIZE = 5;
const WALL_HEIGHT = 3;

/**
 * A 5 by 5 house: corner posts, walls 3 high, a door in the middle of the front (+z) wall,
 * a glass window in each side wall and a flat roof on top.
 */
function house(name: string, wall: number, post: number, roof: number): HouseTemplate {
  const cells: TemplateCell[] = [];
  const last = HOUSE_SIZE - 1;
  const mid = Math.floor(HOUSE_SIZE / 2);
  for (let dz = 0; dz < HOUSE_SIZE; dz++) {
    for (let dx = 0; dx < HOUSE_SIZE; dx++) {
      const edgeX = dx === 0 || dx === last;
      const edgeZ = dz === 0 || dz === last;
      for (let dy = 1; dy <= WALL_HEIGHT; dy++) {
        if (!edgeX && !edgeZ) continue;
        if (edgeX && edgeZ) {
          cells.push({ dx, dy, dz, id: post });
          continue;
        }
        const door = dz === last && dx === mid && dy <= 2;
        if (door) continue;
        const window = dy === 2 && ((edgeX && dz === mid) || (dz === 0 && dx === mid));
        cells.push({ dx, dy, dz, id: window ? GLAS : wall });
      }
      cells.push({ dx, dy: WALL_HEIGHT + 1, dz, id: roof });
    }
  }
  return { name, width: HOUSE_SIZE, depth: HOUSE_SIZE, cells };
}

export const HOUSE_TEMPLATES = {
  hout: house('hout', PLANKEN, BOOMSTAM, WOL_ROOD),
  steen: house('steen', BAKSTEEN, BOOMSTAM, PLANKEN),
  wol: house('wol', WOL_WIT, BOOMSTAM, WOL_BLAUW),
} as const;

const T = HOUSE_TEMPLATES;

/** Homes stand on the yard in front of the doors, one block above the pad. */
function home(x: number, padY: number, z: number): HomeSpot {
  return { x: x + 0.5, y: padY + 1, z: z + 0.5 };
}

/**
 * The three sites, placed by hand on the version 1 terrain of WORLD_SEED: fairly flat ground,
 * more than 10 blocks from the start spot and the obsidiaan gate, and every tree either fully
 * inside a site (cleared) or fully outside it (untouched).
 */
export const VILLAGE_SITES: readonly VillageSite[] = [
  {
    id: 'noord',
    x0: 16, z0: 3, x1: 32, z1: 10,
    padY: 9,
    houses: [
      { template: T.hout, x: 16, z: 3 },
      { template: T.steen, x: 22, z: 3 },
      { template: T.wol, x: 28, z: 3 },
    ],
    homes: [home(18, 9, 9), home(24, 9, 9), home(30, 9, 9)],
  },
  {
    id: 'oost',
    x0: 47, z0: 30, x1: 58, z1: 37,
    padY: 9,
    houses: [
      { template: T.steen, x: 47, z: 30 },
      { template: T.hout, x: 54, z: 30 },
    ],
    homes: [home(49, 9, 36), home(52, 9, 36), home(56, 9, 36)],
  },
  {
    id: 'west',
    x0: 6, z0: 29, x1: 17, z1: 36,
    padY: 10,
    houses: [
      { template: T.wol, x: 6, z: 29 },
      { template: T.steen, x: 13, z: 29 },
    ],
    homes: [home(8, 10, 35), home(15, 10, 35)],
  },
];

/** The site rectangle plus the margin: every cell that belongs to the site, at any height. */
export function siteRegion(site: VillageSite): SiteRegion {
  return {
    x0: site.x0 - SITE_MARGIN,
    z0: site.z0 - SITE_MARGIN,
    x1: site.x1 + SITE_MARGIN,
    z1: site.z1 + SITE_MARGIN,
  };
}

/** True when column (x, z) lies in the region. */
export function inRegion(region: SiteRegion, x: number, z: number): boolean {
  return x >= region.x0 && x <= region.x1 && z >= region.z0 && z <= region.z1;
}

/** Every house block of a site in world coordinates. */
export function houseCells(site: VillageSite): { x: number; y: number; z: number; id: number }[] {
  const out: { x: number; y: number; z: number; id: number }[] = [];
  for (const h of site.houses) {
    for (const c of h.template.cells) {
      out.push({ x: h.x + c.dx, y: site.padY + c.dy, z: h.z + c.dz, id: c.id });
    }
  }
  return out;
}
