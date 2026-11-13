import { circle, ellipse, fillPath, heartPath, part, shade, trim, type Ctx, type PathFn } from './makerArt';

/**
 * The pets waiting to be adopted at the vet, drawn in code (side on, facing
 * right, standing on the ground at y = 320 of a 480 x 340 area), with an
 * optional collar and a little gold name tag.
 */
export const PET_KINDS = ['ginger-kitten', 'tuxedo-cat', 'spotty-puppy', 'golden-dog', 'bunny', 'hamster', 'parrot', 'tortoise', 'green-snake', 'stripy-snake'] as const;
export type PetKind = (typeof PET_KINDS)[number];
export const COLLARS = ['#e5383b', '#ff8fab', '#4dabf7', '#69db7c', '#ffd43b', '#9775fa', '#ff922b', '#20c997', '#2b2d42', '#ffffff'];

export interface PetRecipe {
  kind: PetKind;
  /** Collar colour (-1 = no collar yet). */
  collar: number;
  name: string;
}

/** Cute pet names for the name tag (generic ones only). */
export const PET_NAMES = [
  'Biscuit', 'Noodle', 'Pickles', 'Pepper', 'Mango', 'Bean', 'Ziggy', 'Coco', 'Waffles', 'Muffin', 'Pudding', 'Sprout',
  'Bubbles', 'Jellybean', 'Nugget', 'Peanut', 'Toffee', 'Marshmallow', 'Pumpkin', 'Sunny', 'Ollie', 'Maple', 'Pip', 'Domino',
  'Twinkle', 'Cupcake', 'Fizz', 'Button', 'Squiggle', 'Wiggles', 'Doodle', 'Zippy', 'Clover', 'Honey', 'Pebble', 'Splash',
  'Sir Fluff', 'Captain Wiggle', 'Princess Pom', 'Mr Snuggles', 'Lady Sprinkles', 'Professor Pip',
];
export const randomName = (not?: string) => {
  let n = not;
  while (n === not) n = PET_NAMES[Math.floor(Math.random() * PET_NAMES.length)];
  return n!;
};

export const PET_AREA = { w: 480, h: 340 };
const INK = '#3a3a3a';

/** Legs: little rounded posts down to the ground. */
function legs(c: Ctx, xs: number[], top: number, col: string, paw?: string) {
  for (const x of xs) {
    part(c, (cc) => cc.roundRect(x - 14, top, 28, 320 - top, 12), col);
    if (paw) fillPath(c, ellipse(x + 2, 314, 15, 8), paw, 4);
  }
}
function eye(c: Ctx, x: number, y: number, r = 9, iris = '#2b2118') {
  fillPath(c, circle(x, y, r), iris, 3);
  fillPath(c, circle(x - r * 0.35, y - r * 0.35, r * 0.35), '#ffffff');
}
function whiskers(c: Ctx, x: number, y: number) {
  c.lineWidth = 2.5;
  c.strokeStyle = INK;
  for (const dy of [-6, 4]) {
    c.beginPath();
    c.moveTo(x, y + dy);
    c.lineTo(x + 44, y + dy * 1.8 - 3);
    c.stroke();
  }
}
/** A thick curvy line (tails, snakes), outlined. */
function tube(c: Ctx, path: PathFn, width: number, col: string, dash?: { col: string; len: number }) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  path(c);
  c.lineWidth = width + 8;
  c.strokeStyle = INK;
  c.stroke();
  c.beginPath();
  path(c);
  c.lineWidth = width;
  c.strokeStyle = col;
  c.stroke();
  if (dash) {
    c.setLineDash([dash.len, dash.len]);
    c.lineCap = 'butt';
    c.beginPath();
    path(c);
    c.strokeStyle = dash.col;
    c.stroke();
    c.setLineDash([]);
    c.lineCap = 'round';
  }
}

/** Where each kind's collar goes: the band from (x1,y1) to (x2,y2); `bow` = a bow instead (birds and snakes). */
const COLLAR_AT: Record<PetKind, { x1: number; y1: number; x2: number; y2: number; bow?: boolean }> = {
  'ginger-kitten': { x1: 274, y1: 178, x2: 300, y2: 232 },
  'tuxedo-cat': { x1: 274, y1: 178, x2: 300, y2: 232 },
  'spotty-puppy': { x1: 272, y1: 172, x2: 300, y2: 230 },
  'golden-dog': { x1: 268, y1: 168, x2: 298, y2: 232 },
  bunny: { x1: 272, y1: 196, x2: 312, y2: 214 },
  hamster: { x1: 286, y1: 186, x2: 318, y2: 222 },
  parrot: { x1: 262, y1: 158, x2: 262, y2: 158, bow: true },
  tortoise: { x1: 344, y1: 222, x2: 358, y2: 256 },
  'green-snake': { x1: 352, y1: 214, x2: 352, y2: 214, bow: true },
  'stripy-snake': { x1: 352, y1: 214, x2: 352, y2: 214, bow: true },
};

function collar(c: Ctx, kind: PetKind, colour: string) {
  const a = COLLAR_AT[kind];
  if (a.bow) {
    for (const s of [-1, 1]) fillPath(c, (cc) => {
      cc.moveTo(a.x1, a.y1);
      cc.lineTo(a.x1 + s * 26, a.y1 - 16);
      cc.lineTo(a.x1 + s * 26, a.y1 + 16);
      cc.closePath();
    }, colour, 4);
    fillPath(c, circle(a.x1, a.y1, 9), colour, 4);
    return;
  }
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a.x1, a.y1);
  c.lineTo(a.x2, a.y2);
  c.lineWidth = 20;
  c.strokeStyle = INK;
  c.stroke();
  c.lineWidth = 13;
  c.strokeStyle = colour;
  c.stroke();
  // the little gold name tag
  const tx = (a.x1 + a.x2) / 2 + 6, ty = (a.y1 + a.y2) / 2 + 8;
  c.beginPath();
  c.moveTo(tx - 3, ty - 6);
  c.lineTo(tx + 2, ty + 6);
  c.lineWidth = 3;
  c.strokeStyle = INK;
  c.stroke();
  fillPath(c, circle(tx + 4, ty + 16, 11), '#ffd43b', 3.5);
  fillPath(c, circle(tx + 1, ty + 13, 3.5), '#fff3b0');
}

export function drawPet(c: Ctx, r: PetRecipe) {
  const k = r.kind;
  // a soft shadow
  c.globalAlpha = 0.14;
  fillPath(c, ellipse(240, 322, 170, 14), '#000000');
  c.globalAlpha = 1;

  if (k === 'ginger-kitten' || k === 'tuxedo-cat') {
    const ginger = k === 'ginger-kitten';
    const fur = ginger ? '#f4a261' : '#3d3d46';
    const light = ginger ? '#ffe8cc' : '#f8f9fa';
    const stripe = shade('#f4a261', -0.25);
    tube(c, (cc) => {
      cc.moveTo(130, 220);
      cc.quadraticCurveTo(60, 200, 80, 120);
    }, 18, fur, ginger ? { col: stripe, len: 16 } : undefined);
    legs(c, [140, 172], 236, fur, ginger ? undefined : light);
    part(c, ellipse(215, 232, 102, 54), fur, ginger ? (cc) => {
      for (const x of [160, 200, 240]) {
        cc.beginPath();
        cc.moveTo(x, 182);
        cc.quadraticCurveTo(x + 10, 205, x - 4, 228);
        cc.lineWidth = 9;
        cc.strokeStyle = stripe;
        cc.stroke();
      }
    } : (cc) => fillPath(cc, ellipse(282, 250, 40, 34), light));
    legs(c, [258, 290], 240, fur, ginger ? undefined : light);
    // ears, head, face
    for (const [x1, x2] of [[276, 300], [334, 362]]) part(c, (cc) => {
      cc.moveTo(x1, 130);
      cc.lineTo((x1 + x2) / 2 + 4, 74);
      cc.lineTo(x2, 128);
      cc.closePath();
    }, fur);
    for (const [x1, x2] of [[284, 298], [342, 356]]) fillPath(c, (cc) => {
      cc.moveTo(x1, 124);
      cc.lineTo((x1 + x2) / 2 + 3, 90);
      cc.lineTo(x2, 122);
      cc.closePath();
    }, '#ffc2d4');
    part(c, circle(320, 165, 60), fur, ginger ? (cc) => {
      for (const x of [300, 320, 340]) {
        cc.beginPath();
        cc.moveTo(x, 105);
        cc.lineTo(x + 2, 128);
        cc.lineWidth = 7;
        cc.strokeStyle = stripe;
        cc.stroke();
      }
    } : undefined);
    fillPath(c, ellipse(352, 190, 36, 24), light, 3);
    eye(c, 312, 158, 10, ginger ? '#2b9348' : '#2b9348');
    eye(c, 352, 156, 10, '#2b9348');
    fillPath(c, (cc) => {
      cc.moveTo(362, 178);
      cc.lineTo(376, 178);
      cc.lineTo(369, 187);
      cc.closePath();
    }, '#ff8fab', 2.5);
    c.beginPath();
    c.moveTo(369, 188);
    c.quadraticCurveTo(362, 198, 354, 194);
    c.moveTo(369, 188);
    c.quadraticCurveTo(376, 198, 384, 194);
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    whiskers(c, 380, 190);
  } else if (k === 'spotty-puppy' || k === 'golden-dog') {
    const golden = k === 'golden-dog';
    const fur = golden ? '#e0a458' : '#f8f9fa';
    const ear = golden ? shade('#e0a458', -0.2) : '#2b2d42';
    tube(c, (cc) => {
      cc.moveTo(118, 210);
      cc.quadraticCurveTo(84, 170, 92, 128);
    }, golden ? 24 : 16, fur);
    legs(c, [138, 170], 232, fur);
    const spots = (cc: Ctx) => {
      if (golden) return;
      for (const [x, y, s] of [[170, 210, 18], [240, 250, 14], [210, 190, 10], [130, 250, 12], [330, 140, 9], [290, 230, 9]]) fillPath(cc, circle(x, y, s), '#2b2d42');
    };
    part(c, ellipse(212, 228, 108, 58), fur, spots);
    if (golden) {
      c.beginPath();
      for (const x of [260, 280, 300]) {
        c.moveTo(x, 250);
        c.quadraticCurveTo(x + 6, 266, x - 2, 278);
      }
      c.lineWidth = 3;
      c.strokeStyle = shade(fur, -0.25);
      c.stroke();
    }
    legs(c, [262, 294], 236, fur);
    part(c, circle(318, 158, 58), fur, spots);
    fillPath(c, ellipse(372, 186, 40, 27), golden ? '#f3dfc1' : '#ffffff', 4);
    fillPath(c, ellipse(408, 176, 12, 9), '#1f1f1f', 3);
    c.beginPath();
    c.moveTo(404, 188);
    c.quadraticCurveTo(390, 204, 370, 198);
    c.lineWidth = 4;
    c.strokeStyle = INK;
    c.stroke();
    if (golden) fillPath(c, (cc) => cc.roundRect(372, 198, 18, 26, 9), '#ff6b81', 3);
    eye(c, 338, 146, 10);
    eye(c, 306, 144, 8);
    part(c, ellipse(292, 170, 24, 50, 0.3), ear); // floppy ear
  } else if (k === 'bunny') {
    const fur = '#d8cfc4';
    fillPath(c, circle(108, 244, 24), '#ffffff', 5); // cotton tail
    part(c, ellipse(190, 250, 88, 68), fur);
    fillPath(c, ellipse(222, 312, 56, 14), shade(fur, -0.1), 4);
    part(c, ellipse(268, 236, 56, 66), fur);
    fillPath(c, ellipse(286, 306, 22, 12), shade(fur, -0.1), 4);
    for (const [x, rot] of [[274, -0.3], [304, 0.08]]) {
      part(c, ellipse(x, 84, 18, 62, rot), fur);
      fillPath(c, ellipse(x, 90, 8, 44, rot), '#ffc2d4');
    }
    part(c, circle(302, 162, 50), fur);
    eye(c, 320, 150, 9);
    fillPath(c, ellipse(346, 170, 8, 6), '#ff8fab', 2.5);
    whiskers(c, 350, 176);
    c.beginPath();
    c.moveTo(346, 176);
    c.lineTo(346, 186);
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
  } else if (k === 'hamster') {
    const fur = '#f4a261';
    for (const x of [150, 200]) fillPath(c, ellipse(x, 312, 18, 9), '#ffc2d4', 3);
    part(c, ellipse(236, 238, 120, 84), fur, (cc) => fillPath(cc, ellipse(280, 280, 80, 50), '#fff3e0'));
    for (const x of [290, 320]) fillPath(c, ellipse(x, 314, 16, 8), '#ffc2d4', 3);
    part(c, circle(220, 160, 18), fur);
    fillPath(c, circle(220, 162, 9), '#ffc2d4');
    part(c, circle(262, 152, 18), fur);
    fillPath(c, circle(262, 154, 9), '#ffc2d4');
    fillPath(c, ellipse(320, 228, 30, 24), '#fff3e0', 3); // puffy cheek
    eye(c, 300, 196, 9);
    fillPath(c, circle(348, 214, 7), '#ff8fab', 2.5);
    whiskers(c, 350, 220);
  } else if (k === 'parrot') {
    tube(c, (cc) => {
      cc.moveTo(205, 250);
      cc.lineTo(140, 330);
    }, 30, '#e5383b');
    tube(c, (cc) => {
      cc.moveTo(215, 250);
      cc.lineTo(168, 334);
    }, 20, '#4dabf7');
    c.beginPath();
    c.moveTo(232, 300);
    c.lineTo(226, 320);
    c.moveTo(254, 300);
    c.lineTo(258, 320);
    c.lineWidth = 7;
    c.strokeStyle = '#868e96';
    c.stroke();
    part(c, ellipse(240, 220, 56, 86, -0.25), '#52b788');
    part(c, ellipse(222, 222, 36, 66, -0.35), '#2d6a4f', (cc) => {
      fillPath(cc, ellipse(200, 280, 30, 26), '#e5383b');
      fillPath(cc, ellipse(212, 258, 26, 14), '#4dabf7');
    });
    part(c, circle(272, 130, 44), '#69db7c');
    fillPath(c, circle(286, 122, 16), '#ffffff', 3);
    fillPath(c, circle(289, 121, 7), '#1f1f1f');
    fillPath(c, (cc) => {
      cc.moveTo(306, 116);
      cc.quadraticCurveTo(350, 118, 336, 160);
      cc.quadraticCurveTo(322, 140, 306, 146);
      cc.closePath();
    }, '#ffd43b', 4);
  } else if (k === 'tortoise') {
    const skin = '#a3b18a';
    legs(c, [150, 300], 270, skin);
    tube(c, (cc) => {
      cc.moveTo(320, 250);
      cc.quadraticCurveTo(350, 236, 370, 230);
    }, 30, skin);
    part(c, ellipse(386, 226, 34, 26), skin);
    eye(c, 398, 218, 6);
    c.beginPath();
    c.arc(400, 232, 9, 0.2, 1.4);
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    part(c, (cc) => {
      cc.moveTo(96, 274);
      cc.bezierCurveTo(100, 140, 340, 140, 344, 274);
      cc.closePath();
    }, '#8a9a5b', (cc) => {
      cc.lineWidth = 5;
      cc.strokeStyle = '#5f6f3a';
      for (const [x, y] of [[170, 210], [240, 190], [300, 225], [140, 255], [220, 250], [290, 262]]) {
        cc.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = x + Math.cos(a) * 30, py = y + Math.sin(a) * 26;
          if (i === 0) cc.moveTo(px, py);
          else cc.lineTo(px, py);
        }
        cc.stroke();
      }
    });
    part(c, (cc) => cc.roundRect(88, 266, 264, 20, 10), '#c9b37e');
  } else {
    // a snake, curled in an S along the ground
    const stripy = k === 'stripy-snake';
    const col = stripy ? '#ff8fab' : '#7bd36b';
    const body: PathFn = (cc) => {
      cc.moveTo(70, 300);
      cc.bezierCurveTo(120, 220, 190, 330, 240, 280);
      cc.bezierCurveTo(290, 230, 300, 210, 350, 220);
    };
    tube(c, body, 40, col, stripy ? { col: '#ff922b', len: 22 } : undefined);
    if (!stripy) {
      c.setLineDash([6, 22]);
      c.beginPath();
      body(c);
      c.lineWidth = 12;
      c.strokeStyle = '#2d6a4f';
      c.stroke();
      c.setLineDash([]);
    }
    // the head and a flicky tongue
    c.beginPath();
    c.moveTo(410, 226);
    c.lineTo(440, 228);
    c.moveTo(440, 228);
    c.lineTo(452, 220);
    c.moveTo(440, 228);
    c.lineTo(452, 236);
    c.lineWidth = 4;
    c.strokeStyle = '#e5383b';
    c.stroke();
    part(c, ellipse(380, 222, 38, 28), col);
    eye(c, 390, 210, 9);
    eye(c, 370, 208, 7);
    c.beginPath();
    c.arc(392, 228, 12, 0.2, 1.2);
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
  }
  if (r.collar >= 0) collar(c, k, COLLARS[r.collar] ?? COLLARS[0]);
}

/** The pet as a picture, ready to be a character. */
export function renderPet(r: PetRecipe, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(PET_AREA.w * scale);
  c.height = Math.ceil(PET_AREA.h * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  drawPet(ctx, r);
  return trim(c);
}

void heartPath;
