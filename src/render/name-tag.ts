// Name tag above a dino. Two parts: a pure layout (unit tested, no canvas needed)
// and a thin canvas part that draws the layout and wraps it in a three.js sprite.

import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from 'three';

export const NAME_MAX_LENGTH = 12;
export const NAME_FONT_PX = 48;
const PAD_X = 20;
const PAD_Y = 12;
/** Height of the tag in the world, in blocks. */
const WORLD_HEIGHT = 0.3;

export interface NameTagLayout {
  /** Cleaned name that is drawn. */
  text: string;
  /** Canvas size in pixels. */
  width: number;
  height: number;
  fontPx: number;
  /** Text is centred on this point. */
  textX: number;
  textY: number;
  /** Corner radius of the rounded plate. */
  radius: number;
  /** Size of the sprite in blocks. */
  worldWidth: number;
  worldHeight: number;
}

/** Trims, squeezes spaces and cuts to 12 characters. Empty means no tag. */
export function cleanName(name: string): string {
  return Array.from(name.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX_LENGTH).join('');
}

/** `measure` returns the pixel width of a text at the tag font (canvas `measureText`, or a fake in tests). */
export function layoutNameTag(name: string, measure: (text: string) => number): NameTagLayout | null {
  const text = cleanName(name);
  if (text === '') return null;
  const width = Math.ceil(measure(text)) + PAD_X * 2;
  const height = NAME_FONT_PX + PAD_Y * 2;
  return {
    text,
    width,
    height,
    fontPx: NAME_FONT_PX,
    textX: width / 2,
    textY: height / 2,
    radius: height / 2,
    worldWidth: (WORLD_HEIGHT * width) / height,
    worldHeight: WORLD_HEIGHT,
  };
}

export const NAME_TAG_FONT = `bold ${NAME_FONT_PX}px system-ui, -apple-system, sans-serif`;

/** Thin canvas part: draws a prepared layout. Not unit tested (jsdom has no canvas), covered in e2e. */
export function drawNameTag(ctx: CanvasRenderingContext2D, l: NameTagLayout): void {
  ctx.clearRect(0, 0, l.width, l.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.roundRect(0, 0, l.width, l.height, l.radius);
  ctx.fill();
  ctx.font = NAME_TAG_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#263238';
  ctx.fillText(l.text, l.textX, l.textY);
}

/** A sprite that always faces the camera, or null for an empty name or no canvas support. */
export function createNameTagSprite(name: string, doc: Document = document): Sprite | null {
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = NAME_TAG_FONT;
  const layout = layoutNameTag(name, (t) => ctx.measureText(t).width);
  if (!layout) return null;
  canvas.width = layout.width;
  canvas.height = layout.height;
  drawNameTag(ctx, layout); // resizing resets the context, so draw after
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, fog: false }));
  sprite.scale.set(layout.worldWidth, layout.worldHeight, 1);
  return sprite;
}

export function disposeNameTag(sprite: Sprite): void {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}
