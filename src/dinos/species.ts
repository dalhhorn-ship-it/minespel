// The animal table: every dino in the Dinowinkel, plus the kip. One entry per animal, nothing else to wire.
// Add one with `npm run new-animal` (docs/ANIMALS.md, decision 111). The shop card, the 3D model, the egg,
// the saves and the golden egg pick it up from here. Prices live here and nowhere else (ARCHITECTURE).
//
// Only id, name, price, plan, size, color and trait are needed. The rest is made by src/dinos/kinds.ts;
// the optional fields below override that for an animal that was tuned by hand.

import type { Body, BodyPlan, Palette, Size } from './body';

export interface SpeciesDef {
  /** Lower case, used in saves. Never rename or remove one that shipped. */
  readonly id: string;
  /** Dutch name shown to the kid. */
  readonly name: string;
  /** Price in points. */
  readonly price: number;
  /** false for the kip, which is sold in the Kippenhok and not as an egg card. */
  readonly inShop: boolean;
  readonly plan: BodyPlan;
  /** Box size in blocks (width, height, length) of the grown animal. */
  readonly size: Size;
  /** Main body colour. */
  readonly color: number;
  /** Colour of horns, plates or neck. Default: a light version of color. */
  readonly featureColor?: number;
  /** One or two short sentences for the shop card. */
  readonly trait: string;
  readonly body?: Body;
  readonly palette?: Palette;
  readonly sizeLabel?: string;
  /** Shop emblem gradient, top and bottom. */
  readonly emblem?: { readonly light: string; readonly tint: string };
}

export const SPECIES = [
  {
    id: 'compy',
    name: 'Compy',
    price: 20,
    inShop: true,
    plan: 'twoLegs',
    size: { w: 0.6, h: 0.8, l: 1 },
    color: 0x66bb6a,
    trait: 'Snel & nieuwsgierig! Huppelt vrolijk overal achter je aan.',
    palette: { body: 0x66bb6a, head: 0x81c784, legs: 0x43a047, feature: 0x66bb6a },
    emblem: { light: '#e8f5e9', tint: '#a5d6a7' },
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    price: 40,
    inShop: true,
    plan: 'fourLegs',
    size: { w: 1, h: 1, l: 1.6 },
    color: 0xffa726,
    trait: 'Sterk & dapper! Met drie stoere hoorns en een groot nekschild.',
    sizeLabel: 'Middel (1,6 blok)',
    palette: { body: 0xffa726, head: 0xffb74d, legs: 0xf57c00, feature: 0xfff3e0 },
    emblem: { light: '#fff8e1', tint: '#ffcc80' },
    body: {
      body: { x: 0, y: 0.55, z: -0.1, w: 0.9, h: 0.5, d: 0.9 },
      head: { x: 0, y: 0.6, z: 0.55, w: 0.6, h: 0.6, d: 0.5 },
      tail: { x: 0, y: 0.6, z: -0.675, w: 0.25, h: 0.25, d: 0.25 },
      leg: { w: 0.25, h: 0.35, d: 0.25, at: [[-0.3, -0.35], [0.3, -0.35], [-0.3, 0.2], [0.3, 0.2]] },
      feature: [
        { x: 0, y: 0.7, z: 0.36, w: 0.95, h: 0.6, d: 0.1 },
        { x: -0.18, y: 0.92, z: 0.77, w: 0.1, h: 0.1, d: 0.2 },
        { x: 0.18, y: 0.92, z: 0.77, w: 0.1, h: 0.1, d: 0.2 },
      ],
    },
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    price: 40,
    inShop: true,
    plan: 'fourLegs',
    size: { w: 1, h: 1.2, l: 1.8 },
    color: 0x26a69a,
    trait: 'Rustig & vriendelijk! Heeft prachtige roze rugplaten.',
    sizeLabel: 'Groot (1,8 blok)',
    palette: { body: 0x26a69a, head: 0x4db6ac, legs: 0x00897b, feature: 0xf48fb1 },
    emblem: { light: '#e0f2f1', tint: '#80cbc4' },
    body: {
      body: { x: 0, y: 0.625, z: -0.1, w: 0.9, h: 0.55, d: 1.2 },
      head: { x: 0, y: 0.55, z: 0.62, w: 0.45, h: 0.4, d: 0.45 },
      tail: { x: 0, y: 0.6, z: -0.675, w: 0.35, h: 0.3, d: 0.45 },
      leg: { w: 0.28, h: 0.4, d: 0.28, at: [[-0.32, -0.5], [0.32, -0.5], [-0.32, 0.3], [0.32, 0.3]] },
      feature: [
        { x: 0, y: 1.05, z: -0.45, w: 0.1, h: 0.3, d: 0.3 },
        { x: 0, y: 1.05, z: -0.1, w: 0.1, h: 0.3, d: 0.3 },
        { x: 0, y: 1.05, z: 0.25, w: 0.1, h: 0.3, d: 0.3 },
      ],
    },
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    price: 80,
    inShop: true,
    plan: 'longNeck',
    size: { w: 1.2, h: 2.4, l: 2 },
    color: 0x42a5f5,
    trait: 'De vriendelijke reus! Kijkt met zijn lange nek over je muren heen.',
    palette: { body: 0x42a5f5, head: 0x64b5f6, legs: 0x1e88e5, feature: 0x90caf9 },
    emblem: { light: '#e3f2fd', tint: '#90caf9' },
  },
  {
    id: 'kip',
    name: 'Kip',
    price: 5,
    inShop: false,
    plan: 'twoLegs',
    size: { w: 0.5, h: 0.7, l: 0.7 },
    color: 0xfafafa,
    trait: 'Tok tok! Fladdert en scharrelt gezellig rond in je wereld.',
    palette: { body: 0xfafafa, head: 0xf5f5f5, legs: 0xff9800, feature: 0xe53935 },
    emblem: { light: '#fffde7', tint: '#ffe082' },
    body: {
      body: { x: 0, y: 0.34, z: -0.03, w: 0.34, h: 0.26, d: 0.38 },
      head: { x: 0, y: 0.52, z: 0.18, w: 0.24, h: 0.24, d: 0.22 },
      tail: { x: 0, y: 0.4, z: -0.26, w: 0.18, h: 0.18, d: 0.12 },
      leg: { w: 0.08, h: 0.22, d: 0.08, at: [[-0.09, -0.02], [0.09, -0.02]] },
      feature: [
        { x: 0, y: 0.67, z: 0.18, w: 0.08, h: 0.08, d: 0.14 },
        { x: 0, y: 0.48, z: 0.33, w: 0.12, h: 0.08, d: 0.1 },
      ],
    },
  },
  // new-animal: entries are added above this line
] as const satisfies readonly SpeciesDef[];
