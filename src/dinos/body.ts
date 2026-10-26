// Box body shapes for dinos and the generator that makes one for a new animal (decision 111).
// Pure data, no three.js: src/render/dino-models.ts turns a body into meshes.
// Local space: feet at y = 0, centred on x and z, facing +z.

/** A box described by its centre and size. */
export interface Part {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

export interface Body {
  readonly body: Part;
  readonly head: Part;
  readonly tail: Part;
  /** Leg size and where they stand (x, z pairs). */
  readonly leg: { readonly w: number; readonly h: number; readonly d: number; readonly at: readonly (readonly [number, number])[] };
  /** Horns, frill, plates or neck. */
  readonly feature: readonly Part[];
}

export interface Size {
  readonly w: number;
  readonly h: number;
  readonly l: number;
}

export interface Palette {
  readonly body: number;
  readonly head: number;
  readonly legs: number;
  readonly feature: number;
}

/** The body shapes a new animal can start from. */
export const BODY_PLANS = ['twoLegs', 'fourLegs', 'longNeck'] as const;
export type BodyPlan = (typeof BODY_PLANS)[number];

/** Templates taken from the compy, the stegosaurus (without plates) and the brachiosaurus, with their sizes. */
const TEMPLATES: Record<BodyPlan, { size: Size; body: Body }> = {
  twoLegs: {
    size: { w: 0.6, h: 0.8, l: 1 },
    body: {
      body: { x: 0, y: 0.4, z: -0.05, w: 0.45, h: 0.3, d: 0.5 },
      head: { x: 0, y: 0.61, z: 0.3, w: 0.4, h: 0.38, d: 0.4 },
      tail: { x: 0, y: 0.4, z: -0.375, w: 0.2, h: 0.2, d: 0.25 },
      leg: { w: 0.14, h: 0.25, d: 0.14, at: [[-0.12, -0.05], [0.12, -0.05]] },
      feature: [],
    },
  },
  fourLegs: {
    size: { w: 1, h: 1.2, l: 1.8 },
    body: {
      body: { x: 0, y: 0.625, z: -0.1, w: 0.9, h: 0.55, d: 1.2 },
      head: { x: 0, y: 0.55, z: 0.62, w: 0.45, h: 0.4, d: 0.45 },
      tail: { x: 0, y: 0.6, z: -0.675, w: 0.35, h: 0.3, d: 0.45 },
      leg: { w: 0.28, h: 0.4, d: 0.28, at: [[-0.32, -0.5], [0.32, -0.5], [-0.32, 0.3], [0.32, 0.3]] },
      feature: [],
    },
  },
  longNeck: {
    size: { w: 1.2, h: 2.4, l: 2 },
    body: {
      body: { x: 0, y: 0.95, z: -0.1, w: 1.1, h: 0.7, d: 1.4 },
      head: { x: 0, y: 2.2, z: 0.72, w: 0.5, h: 0.4, d: 0.55 },
      tail: { x: 0, y: 1.0, z: -0.8, w: 0.35, h: 0.3, d: 0.4 },
      leg: { w: 0.35, h: 0.7, d: 0.35, at: [[-0.4, -0.55], [0.4, -0.55], [-0.4, 0.4], [0.4, 0.4]] },
      feature: [{ x: 0, y: 1.75, z: 0.45, w: 0.4, h: 1.1, d: 0.4 }],
    },
  },
};

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/** A body for a new animal: the plan's template stretched to the animal's size. */
export function bodyFromPlan(plan: BodyPlan, size: Size): Body {
  const t = TEMPLATES[plan];
  const sx = size.w / t.size.w;
  const sy = size.h / t.size.h;
  const sz = size.l / t.size.l;
  const part = (p: Part): Part => ({
    x: r3(p.x * sx), y: r3(p.y * sy), z: r3(p.z * sz), w: r3(p.w * sx), h: r3(p.h * sy), d: r3(p.d * sz),
  });
  const leg = t.body.leg;
  return {
    body: part(t.body.body),
    head: part(t.body.head),
    tail: part(t.body.tail),
    leg: { w: r3(leg.w * sx), h: r3(leg.h * sy), d: r3(leg.d * sz), at: leg.at.map(([x, z]) => [r3(x * sx), r3(z * sz)] as const) },
    feature: t.body.feature.map(part),
  };
}

/** Mixes a colour with white (amount above 0) or black (amount below 0). */
export function shade(color: number, amount: number): number {
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  const mix = (c: number): number => Math.round(c + (target - c) * a);
  const r = mix((color >> 16) & 0xff);
  const g = mix((color >> 8) & 0xff);
  const b = mix(color & 0xff);
  return (r << 16) | (g << 8) | b;
}

/** Head a bit lighter, legs a bit darker, feature light unless given. */
export function paletteFrom(color: number, feature?: number): Palette {
  return { body: color, head: shade(color, 0.15), legs: shade(color, -0.15), feature: feature ?? shade(color, 0.45) };
}

/** Shop chip text for a size, like the hand written ones: "Middel (1,6 blok)". */
export function sizeLabelFor(size: Size): string {
  const h = String(Math.round(size.h * 10) / 10).replace('.', ',');
  if (size.h >= 2) return `Reusachtig (${h} blok hoog)`;
  if (size.h >= 1.1) return `Groot (${h} blok)`;
  if (size.h >= 0.9) return `Middel (${h} blok)`;
  return `Klein (${h} blok)`;
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
