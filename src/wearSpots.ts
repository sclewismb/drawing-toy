import { FACE_AT, toyOffset, type BearRecipe, type SquishyRecipe } from './makerArt';

/**
 * Where things go on animals, stuffies and the little people: their head,
 * eyes, neck, a wrist (or a front leg) and a hand (or a mouth or a beak), so
 * the glow sticks sit in the right places. As fractions of their picture, the
 * way it's drawn (main.ts mirrors them along with the picture):
 *   head:  middle x, y and radius      eyes:  middle x, y and the gap between them
 *   neck:  middle x, y and half width  wrist: x, y and half width
 *   hand:  x, y                        tall:  how tall they are (of the picture's height)
 *   mouth: animals hold things in their mouth (or beak), crossways
 * x and sizes are fractions of the picture's width, y of its height.
 */
export interface WearSpots {
  head: [number, number, number];
  eyes: [number, number, number];
  neck: [number, number, number];
  wrist: [number, number, number];
  hand: [number, number];
  tall?: number;
  mouth?: boolean;
}

/** The built-in animals, stuffies and little people (read off their pictures). */
export const SAMPLE_SPOTS: Record<string, WearSpots> = {
  dog: { head: [0.78, 0.33, 0.13], eyes: [0.83, 0.28, 0.07], neck: [0.7, 0.47, 0.07], wrist: [0.68, 0.82, 0.045], hand: [0.9, 0.5] },
  kitten: { head: [0.78, 0.36, 0.14], eyes: [0.785, 0.36, 0.13], neck: [0.7, 0.55, 0.08], wrist: [0.67, 0.84, 0.045], hand: [0.82, 0.48] },
  bunny: { head: [0.72, 0.43, 0.19], eyes: [0.715, 0.4, 0.14], neck: [0.66, 0.6, 0.1], wrist: [0.6, 0.85, 0.06], hand: [0.82, 0.5] },
  duck: { head: [0.78, 0.2, 0.13], eyes: [0.8, 0.19, 0.07], neck: [0.68, 0.45, 0.07], wrist: [0.43, 0.9, 0.03], hand: [0.93, 0.25] },
  chicken: { head: [0.72, 0.3, 0.16], eyes: [0.74, 0.28, 0.08], neck: [0.66, 0.45, 0.1], wrist: [0.42, 0.9, 0.03], hand: [0.92, 0.33] },
  hedgehog: { head: [0.83, 0.55, 0.12], eyes: [0.85, 0.48, 0.06], neck: [0.72, 0.65, 0.06], wrist: [0.6, 0.92, 0.03], hand: [0.97, 0.58] },
  turtle: { head: [0.9, 0.6, 0.08], eyes: [0.91, 0.56, 0.05], neck: [0.84, 0.66, 0.05], wrist: [0.68, 0.92, 0.04], hand: [0.97, 0.68] },
  pig: { head: [0.78, 0.42, 0.14], eyes: [0.76, 0.35, 0.08], neck: [0.68, 0.62, 0.08], wrist: [0.68, 0.85, 0.04], hand: [0.92, 0.5] },
  piglet: { head: [0.78, 0.42, 0.14], eyes: [0.76, 0.35, 0.08], neck: [0.68, 0.62, 0.08], wrist: [0.68, 0.85, 0.04], hand: [0.92, 0.5] },
  reindeer: { head: [0.76, 0.33, 0.1], eyes: [0.77, 0.29, 0.06], neck: [0.68, 0.48, 0.07], wrist: [0.65, 0.8, 0.04], hand: [0.9, 0.36] },
  'kid-girl': { head: [0.5, 0.3, 0.3], eyes: [0.51, 0.33, 0.18], neck: [0.5, 0.52, 0.12], wrist: [0.22, 0.72, 0.07], hand: [0.8, 0.76], tall: 0.95 },
  'kid-boy': { head: [0.5, 0.32, 0.3], eyes: [0.52, 0.34, 0.19], neck: [0.5, 0.52, 0.12], wrist: [0.2, 0.71, 0.06], hand: [0.82, 0.73], tall: 0.95 },
  grandma: { head: [0.52, 0.3, 0.32], eyes: [0.52, 0.33, 0.2], neck: [0.52, 0.53, 0.12], wrist: [0.25, 0.7, 0.07], hand: [0.85, 0.72], tall: 0.95 },
  grownup: { head: [0.5, 0.26, 0.28], eyes: [0.51, 0.28, 0.18], neck: [0.5, 0.48, 0.12], wrist: [0.2, 0.69, 0.07], hand: [0.8, 0.72], tall: 0.95 },
  teddy: { head: [0.5, 0.33, 0.27], eyes: [0.5, 0.27, 0.2], neck: [0.5, 0.52, 0.15], wrist: [0.15, 0.6, 0.07], hand: [0.86, 0.66] },
  koala: { head: [0.5, 0.25, 0.33], eyes: [0.5, 0.27, 0.3], neck: [0.5, 0.48, 0.13], wrist: [0.14, 0.73, 0.07], hand: [0.88, 0.78] },
  'red-panda': { head: [0.15, 0.4, 0.1], eyes: [0.12, 0.38, 0.07], neck: [0.24, 0.55, 0.07], wrist: [0.3, 0.8, 0.04], hand: [0.04, 0.45] },
  robot: { head: [0.42, 0.3, 0.2], eyes: [0.42, 0.3, 0.2], neck: [0.42, 0.45, 0.13], wrist: [0.1, 0.62, 0.06], hand: [0.92, 0.38] },
  monster: { head: [0.5, 0.35, 0.3], eyes: [0.5, 0.38, 0.22], neck: [0.5, 0.65, 0.2], wrist: [0.85, 0.35, 0.03], hand: [0.88, 0.22] },
  cat: { head: [0.4, 0.33, 0.25], eyes: [0.39, 0.33, 0.18], neck: [0.42, 0.55, 0.13], wrist: [0.42, 0.85, 0.06], hand: [0.45, 0.85] },
  dinosaur: { head: [0.85, 0.2, 0.1], eyes: [0.85, 0.15, 0.06], neck: [0.76, 0.38, 0.06], wrist: [0.62, 0.85, 0.05], hand: [0.95, 0.27] },
  snowman: { head: [0.47, 0.25, 0.18], eyes: [0.47, 0.22, 0.12], neck: [0.47, 0.38, 0.17], wrist: [0.15, 0.37, 0.03], hand: [0.86, 0.33] },
  gingerbread: { head: [0.5, 0.2, 0.24], eyes: [0.5, 0.18, 0.17], neck: [0.5, 0.38, 0.13], wrist: [0.18, 0.47, 0.06], hand: [0.86, 0.47] },
};

/** The pets you can adopt at the vet (their pictures are drawn in code: petArt.ts). */
export const PET_SPOTS: Record<string, WearSpots> = {
  'ginger-kitten': { head: [0.7, 0.33, 0.16], eyes: [0.72, 0.33, 0.11], neck: [0.62, 0.55, 0.06], wrist: [0.57, 0.85, 0.04], hand: [0.85, 0.48] },
  'tuxedo-cat': { head: [0.7, 0.33, 0.16], eyes: [0.72, 0.33, 0.11], neck: [0.62, 0.55, 0.06], wrist: [0.57, 0.85, 0.04], hand: [0.85, 0.48] },
  'spotty-puppy': { head: [0.72, 0.3, 0.14], eyes: [0.75, 0.24, 0.08], neck: [0.6, 0.5, 0.06], wrist: [0.55, 0.82, 0.04], hand: [0.88, 0.45] },
  'golden-dog': { head: [0.72, 0.3, 0.14], eyes: [0.75, 0.24, 0.08], neck: [0.6, 0.5, 0.06], wrist: [0.55, 0.82, 0.04], hand: [0.88, 0.45] },
  bunny: { head: [0.73, 0.42, 0.14], eyes: [0.74, 0.38, 0.07], neck: [0.66, 0.58, 0.07], wrist: [0.6, 0.88, 0.05], hand: [0.84, 0.47] },
  hamster: { head: [0.72, 0.45, 0.12], eyes: [0.76, 0.43, 0.06], neck: [0.66, 0.55, 0.06], wrist: [0.62, 0.92, 0.04], hand: [0.82, 0.48] },
  parrot: { head: [0.6, 0.18, 0.13], eyes: [0.62, 0.17, 0.07], neck: [0.56, 0.37, 0.08], wrist: [0.45, 0.88, 0.03], hand: [0.73, 0.25] },
  tortoise: { head: [0.88, 0.32, 0.08], eyes: [0.9, 0.3, 0.05], neck: [0.8, 0.45, 0.05], wrist: [0.63, 0.8, 0.04], hand: [0.95, 0.38] },
  'green-snake': { head: [0.79, 0.25, 0.08], eyes: [0.8, 0.22, 0.05], neck: [0.71, 0.3, 0.05], wrist: [0.4, 0.62, 0.05], hand: [0.92, 0.28] },
  'stripy-snake': { head: [0.79, 0.25, 0.08], eyes: [0.8, 0.22, 0.05], neck: [0.71, 0.3, 0.05], wrist: [0.4, 0.62, 0.05], hand: [0.92, 0.28] },
};

// the animals hold a glow stick in their mouth (or beak), not in a hand
for (const n of ['dog', 'kitten', 'bunny', 'duck', 'chicken', 'hedgehog', 'turtle', 'pig', 'piglet', 'reindeer', 'red-panda', 'dinosaur']) SAMPLE_SPOTS[n].mouth = true;
for (const s of Object.values(PET_SPOTS)) s.mouth = true;

/**
 * Teddies and squishies made in the workshop: worked out from how they're
 * drawn (makerArt.ts), for the picture renderToy makes from this recipe.
 * Also that picture's size, to check a saved picture really is that one.
 */
export function toySpots(kind: 'bear' | 'squishy', r: BearRecipe | SquishyRecipe): { spots: WearSpots; w: number; h: number } {
  const off = toyOffset(kind, r);
  const fx = (x: number) => (x - off.x) / off.w;
  const fy = (y: number) => (y - off.y) / off.h;
  const fw = (v: number) => v / off.w;
  if (kind === 'bear') {
    // a teddy (and the bunnies, kitties, puppies and unicorns): head round (300, 245), paws at the ends of the arms
    return {
      spots: {
        head: [fx(300), fy(245), fw(150)],
        eyes: [fx(300), fy(227), fw(124)],
        neck: [fx(300), fy(392), fw(80)],
        wrist: [fx(128), fy(470), fw(34)],
        hand: [fx(481), fy(491)],
        tall: (663 - 95) / off.h,
      },
      w: off.w,
      h: off.h,
    };
  }
  // a squishy: no head or arms, so things go on the top, the face and the sides
  const face = FACE_AT[(r as SquishyRecipe).shape] ?? [280, 340, 1];
  return {
    spots: {
      head: [fx(280), fy(300), fw(150)],
      eyes: [fx(face[0]), fy(face[1] - 8 * face[2]), fw(124 * face[2])],
      neck: [fx(280), fy(face[1] + 60 * face[2]), fw(100 * face[2])],
      wrist: [fx(95), fy(390), fw(30)],
      hand: [fx(470), fy(390)],
      tall: 400 / off.h,
    },
    w: off.w,
    h: off.h,
  };
}
