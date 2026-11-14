import type { Ctx, Plan } from './figure';

/**
 * Dress-up clothes: what a piece is, and when it's drawn. Each piece draws
 * itself on any of the three body shapes, at the right moment:
 *   back:  behind everyone (wings, a cape, the back of a hood)
 *   legs:  trousers, skirts           feet:  shoes and socks
 *   body:  tops                       waist: a skirt's waistband, over the top
 *   outer: robes, coats, straps       hands: gloves (a colour)
 *   neck:  scarves, necklaces         front: after the face (a hood's rim, glasses, hats)
 */
export type Slot = 'top' | 'bottom' | 'dress' | 'shoes' | 'costume' | 'hat' | 'neck' | 'face' | 'back';
export interface DrawCtx {
  skin: string;
  /** Drawing a picture of the piece on its own (for the choice tiles). */
  alone?: boolean;
}
export type Draw = (c: Ctx, P: Plan, d: DrawCtx) => void;
export interface Garment {
  id: string;
  slot: Slot;
  /** A whole outfit (no top or bottoms under it). */
  full?: boolean;
  /** Its own boots or no feet (a mermaid): no shoes. */
  noShoes?: boolean;
  /** A long top: a skirt's waistband stays hidden under it. */
  long?: boolean;
  back?: Draw;
  legs?: Draw;
  feet?: Draw;
  body?: Draw;
  waist?: Draw;
  outer?: Draw;
  hands?: string;
  neck?: Draw;
  front?: Draw;
  /** Its picture on the choice tile, if it isn't drawn by the parts above (bare feet). */
  tile?: Draw;
}
export interface Outfit {
  top: string;
  bottom: string;
  shoes: string;
  dress?: string;
  costume?: string;
  hat?: string;
  neck?: string;
  face?: string;
  back?: string;
}
