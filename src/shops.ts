import type { Graphics } from 'pixi.js';
import { frame, INK, seeded, windowView } from './places';

/**
 * The vet, the restaurant and the toy shop (made up). Wide like the rooms:
 * x = 0..w is the middle, the left part is negative x, the right part is
 * beyond w. All of each is drawn here; things that move or can be tapped are
 * in eggs/shops.ts.
 */
export const SHOP_WIDE = {
  vet: { left: 0.55, right: 0.65 },
  restaurant: { left: 0.6, right: 0.6 },
  toyshop: { left: 0.6, right: 0.6 },
};
export const SHOP_FLOOR = 0.72;

function room(g: Graphics, x0: number, x1: number, h: number, wall: number, floor: number, lines = 0x000000) {
  const fy = h * SHOP_FLOOR;
  g.rect(x0, 0, x1 - x0, fy).fill(wall);
  g.rect(x0, fy, x1 - x0, h - fy).fill(floor);
  for (let x = x0 + 40; x < x1; x += 80) g.moveTo(x, fy).lineTo(x - 50, h);
  g.stroke({ width: 2, color: lines, alpha: 0.12 });
  g.rect(x0, fy - 8, x1 - x0, 16).fill(0xffffff).stroke({ width: 4, color: INK });
}

function table(g: Graphics, x: number, top: number, tw: number, fy: number, cloth: number, check = 0xffffff) {
  g.rect(x - 8, top + 12, 16, fy - top - 12).fill(0x6b4226).stroke({ width: 2, color: INK });
  g.ellipse(x, fy + 4, tw * 0.25, 8).fill(0x6b4226);
  g.ellipse(x, top, tw / 2, 16).fill(cloth).stroke({ width: 3, color: INK });
  for (let i = -2; i <= 2; i++) g.rect(x + i * tw * 0.16 - 6, top - 6, 12, 12).fill(check);
  g.rect(x - tw / 2, top, tw, 24).fill(cloth).stroke({ width: 3, color: INK });
  for (let i = -3; i <= 3; i += 2) g.rect(x + i * tw * 0.14 - tw * 0.07, top, tw * 0.14, 24).fill(check);
  g.rect(x - tw / 2, top, tw, 24).stroke({ width: 3, color: INK });
}

function chair(g: Graphics, x: number, seat: number, fy: number, col: number, dir: number) {
  g.moveTo(x - dir * 20, seat).lineTo(x - dir * 20, seat - 60).stroke({ width: 6, color: col });
  g.rect(x - 22, seat, 44, 10).fill(col).stroke({ width: 2, color: INK });
  g.moveTo(x - 18, seat + 10).lineTo(x - 18, fy).moveTo(x + 18, seat + 10).lineTo(x + 18, fy).stroke({ width: 5, color: col });
}

/** The vet: a pet shelf and a sleepy puppy (left), the waiting room (middle), the check-up room (right). */
export function drawVet(g: Graphics, w: number, h: number) {
  const fy = h * SHOP_FLOOR;
  room(g, -0.55 * w, 1.65 * w, h, 0xd8f3dc, 0xe9ecef);
  // paw prints along the wall
  const rnd = seeded(41);
  for (let x = -0.5 * w; x < 1.6 * w; x += 0.09 * w) {
    const y = h * 0.08 + rnd() * h * 0.05;
    g.ellipse(x, y, 9, 7).fill(0xb7e4c7);
    for (const [dx, dy] of [[-9, -9], [0, -13], [9, -9]]) g.circle(x + dx, y + dy, 3.5).fill(0xb7e4c7);
  }
  // left: shelves of pet food and toys
  g.rect(-0.52 * w, h * 0.2, 0.28 * w, fy - h * 0.2).fill(0xe9c46a).stroke({ width: 4, color: INK });
  for (const sy of [0.36, 0.52]) g.rect(-0.52 * w, h * sy, 0.28 * w, 10).fill(0xc68b59).stroke({ width: 2, color: INK });
  for (let i = 0; i < 5; i++) g.roundRect(-0.5 * w + i * 0.053 * w, h * 0.26, 0.042 * w, h * 0.1, 6).fill([0xe5383b, 0x4ea8ff, 0x7bd36b, 0xffd166, 0xb07de8][i]).stroke({ width: 2, color: INK });
  for (let i = 0; i < 4; i++) g.circle(-0.48 * w + i * 0.065 * w, h * 0.5, 14).fill([0xffd166, 0xff8fb1, 0x7bd36b, 0x4ea8ff][i]).stroke({ width: 2, color: INK });
  // the puppy's basket (the puppy wakes up: see eggs)
  g.ellipse(-0.12 * w, fy + h * 0.08, 0.08 * w, h * 0.04).fill(0xc68b59).stroke({ width: 4, color: INK });
  g.ellipse(-0.12 * w, fy + h * 0.07, 0.065 * w, h * 0.025).fill(0x9fd8e8);
  // middle: reception desk, waiting chairs, a poster
  g.rect(0.06 * w, h * 0.5, 0.3 * w, fy - h * 0.5).fill(0x52b788).stroke({ width: 4, color: INK });
  g.rect(0.05 * w, h * 0.48, 0.32 * w, 18).fill(0xffffff).stroke({ width: 3, color: INK });
  g.roundRect(0.22 * w, h * 0.36, 0.1 * w, h * 0.1, 6).fill(0x2b2d42).stroke({ width: 3, color: INK }); // computer
  g.rect(0.26 * w, h * 0.46, 0.02 * w, h * 0.02).fill(0x2b2d42);
  for (const cx of [0.45, 0.53, 0.61]) chair(g, cx * w, h * 0.6, fy, 0x2a9d8f, -1);
  frame(g, 0.44 * w, h * 0.16, 0.18 * w, h * 0.22);
  g.circle(0.53 * w, h * 0.27, h * 0.06).fill(0xffd6a5).stroke({ width: 2, color: INK }); // a happy dog in the poster
  g.ellipse(0.53 * w - h * 0.05, h * 0.23, h * 0.02, h * 0.04).ellipse(0.53 * w + h * 0.05, h * 0.23, h * 0.02, h * 0.04).fill(0x8d5524);
  g.circle(0.53 * w, h * 0.29, 5).fill(INK);
  // the fish tank stand (the fish swim: see eggs)
  g.rect(0.78 * w, h * 0.52, 0.18 * w, fy - h * 0.52).fill(0x6b4226).stroke({ width: 4, color: INK });
  // right: the check-up table, a sink, the medicine cabinet (eggs) and a window
  g.rect(1.08 * w, h * 0.55, 0.24 * w, 16).fill(0xdee2e6).stroke({ width: 3, color: INK });
  g.rect(1.1 * w, h * 0.55 + 16, 0.2 * w, fy - h * 0.55 - 16).fill(0xadb5bd).stroke({ width: 3, color: INK });
  g.rect(1.52 * w, h * 0.5, 0.1 * w, fy - h * 0.5).fill(0xffffff).stroke({ width: 3, color: INK });
  g.rect(1.51 * w, h * 0.48, 0.12 * w, 14).fill(0xdee2e6).stroke({ width: 2, color: INK });
  g.moveTo(1.57 * w, h * 0.48).lineTo(1.57 * w, h * 0.43).lineTo(1.59 * w, h * 0.43).stroke({ width: 5, color: 0x8d99ae });
  windowView(g, 1.08 * w, h * 0.12, 0.16 * w, h * 0.22);
  g.rect(1.08 * w, h * 0.12, 0.16 * w, h * 0.22).stroke({ width: 8, color: 0xffffff }).rect(1.08 * w, h * 0.12, 0.16 * w, h * 0.22).stroke({ width: 3, color: INK });
}

/** The restaurant: the kitchen pass and pizza oven (left), the tables (middle), the drinks, desserts and a jukebox (right). */
export function drawRestaurant(g: Graphics, w: number, h: number) {
  const fy = h * SHOP_FLOOR;
  room(g, -0.6 * w, 1.6 * w, h, 0xffe8d6, 0xb07d56);
  // wainscot panelling and floorboards
  g.rect(-0.6 * w, h * 0.5, 2.2 * w, fy - h * 0.5).fill(0xc1440e).stroke({ width: 3, color: INK });
  for (let x = -0.6 * w; x < 1.6 * w; x += 40) g.moveTo(x, h * 0.5).lineTo(x, fy - 8);
  g.stroke({ width: 2, color: 0x9c3a0c });
  // left: the pizza oven and the kitchen pass
  const ox = -0.45 * w;
  g.moveTo(ox - 0.11 * w, fy).lineTo(ox - 0.11 * w, h * 0.38).arc(ox, h * 0.38, 0.11 * w, Math.PI, 0).lineTo(ox + 0.11 * w, fy).closePath().fill(0xd08c60).stroke({ width: 4, color: INK });
  for (let y = h * 0.42; y < fy; y += 20) g.moveTo(ox - 0.11 * w, y).lineTo(ox + 0.11 * w, y);
  g.stroke({ width: 2, color: 0xa86b45 });
  g.moveTo(ox - 0.05 * w, h * 0.56).lineTo(ox - 0.05 * w, h * 0.46).arc(ox, h * 0.46, 0.05 * w, Math.PI, 0).lineTo(ox + 0.05 * w, h * 0.56).closePath().fill(0x2b2d42).stroke({ width: 3, color: INK });
  g.rect(ox - 0.02 * w, h * 0.06, 0.04 * w, h * 0.14).fill(0x8d99ae).stroke({ width: 3, color: INK }); // chimney
  g.rect(-0.3 * w, h * 0.2, 0.28 * w, h * 0.24).fill(0xdee2e6).stroke({ width: 4, color: INK }); // the hatch to the kitchen
  g.rect(-0.29 * w, h * 0.21, 0.26 * w, h * 0.22).fill(0xf8f9fa);
  g.rect(-0.31 * w, h * 0.44, 0.3 * w, 16).fill(0x8d5524).stroke({ width: 3, color: INK });
  // middle: a picture menu, lamps' cords and three tables with chairs
  g.rect(0.33 * w, h * 0.08, 0.34 * w, h * 0.22).fill(0x2b2d42).stroke({ width: 8, color: 0x8d5524 });
  g.circle(0.4 * w, h * 0.19, 22).fill(0xffd166).stroke({ width: 2, color: 0xffffff }); // pizza
  g.roundRect(0.47 * w, h * 0.15, 46, 30, 12).fill(0xe0a458).stroke({ width: 2, color: 0xffffff }); // burger
  g.ellipse(0.57 * w, h * 0.2, 26, 14).fill(0xffffff).stroke({ width: 2, color: 0xffffff }); // spaghetti
  g.circle(0.63 * w, h * 0.17, 14).fill(0xff8fb1).stroke({ width: 2, color: 0xffffff }); // ice cream
  for (const tx of [0.17, 0.5, 0.83]) {
    chair(g, (tx - 0.09) * w, h * 0.64, fy, 0x2b2d42, -1);
    chair(g, (tx + 0.09) * w, h * 0.64, fy, 0x2b2d42, 1);
    table(g, tx * w, h * 0.58, 0.16 * w, fy, 0xe5383b);
  }
  // right: the dessert counter, a drinks fridge and a jukebox (eggs)
  g.rect(1.04 * w, h * 0.46, 0.24 * w, fy - h * 0.46).fill(0xffffff).stroke({ width: 4, color: INK });
  g.rect(1.05 * w, h * 0.3, 0.22 * w, h * 0.16).fill({ color: 0xbfe8ff, alpha: 0.5 }).stroke({ width: 3, color: INK });
  g.rect(1.48 * w, h * 0.16, 0.1 * w, fy - h * 0.16).fill(0xe9ecef).stroke({ width: 4, color: INK });
}

/** The toy shop: a train set (left), shelves of toys and the till (middle), the jack-in-the-box and spinning top (right). */
export function drawToyshop(g: Graphics, w: number, h: number) {
  const fy = h * SHOP_FLOOR;
  room(g, -0.6 * w, 1.6 * w, h, 0xf3e8ff, 0xe9c46a);
  // bunting of little stars along the top
  for (let x = -0.58 * w; x < 1.6 * w; x += 0.06 * w) g.star(x, h * 0.06, 5, 12, 6).fill([0xffd166, 0xff8fb1, 0x7fdde0][Math.round(x) % 3 === 0 ? 0 : Math.round(x) % 2 ? 1 : 2]).stroke({ width: 2, color: INK });
  // left: the train set's table (the train goes round: see eggs), a kite on the wall
  g.rect(-0.55 * w, h * 0.52, 0.42 * w, 16).fill(0x52b788).stroke({ width: 3, color: INK });
  g.rect(-0.53 * w, h * 0.52 + 16, 12, fy - h * 0.52 - 16).rect(-0.15 * w, h * 0.52 + 16, 12, fy - h * 0.52 - 16).fill(0x6b4226);
  g.poly([-0.2 * w, h * 0.14, -0.14 * w, h * 0.24, -0.2 * w, h * 0.36, -0.26 * w, h * 0.24]).fill(0xffd166).stroke({ width: 3, color: INK });
  g.moveTo(-0.2 * w, h * 0.36).quadraticCurveTo(-0.16 * w, h * 0.42, -0.2 * w, h * 0.48).stroke({ width: 2, color: INK });
  // middle: big shelves full of toys
  const rnd = seeded(53);
  for (const [sx, sw] of [[0.04, 0.4], [0.56, 0.4]]) {
    g.rect(sx * w, h * 0.14, sw * w, h * 0.5).fill(0xd4a373).stroke({ width: 4, color: INK });
    for (let r = 0; r < 3; r++) {
      const sy = h * 0.14 + (r + 1) * h * 0.16;
      g.rect(sx * w, sy, sw * w, 10).fill(0xa47e4b).stroke({ width: 2, color: INK });
      for (let x = sx * w + 14; x < (sx + sw) * w - 30; x += 40 + rnd() * 20) {
        const kind = Math.floor(rnd() * 4), c = [0xe5383b, 0x4ea8ff, 0x7bd36b, 0xffd166, 0xb07de8, 0xff8fb1][Math.floor(rnd() * 6)];
        if (kind === 0) g.circle(x + 14, sy - 16, 15).fill(c).stroke({ width: 2, color: INK }); // a ball
        else if (kind === 1) g.rect(x, sy - 30, 28, 30).fill(c).stroke({ width: 2, color: INK }).rect(x + 6, sy - 24, 16, 6).fill(0xffffff); // a box
        else if (kind === 2) g.circle(x + 14, sy - 22, 12).fill(0xb5835a).stroke({ width: 2, color: INK }).circle(x + 5, sy - 32, 5).circle(x + 23, sy - 32, 5).fill(0xb5835a).stroke({ width: 2, color: INK }).rect(x + 6, sy - 12, 16, 12).fill(0xb5835a); // a teddy
        else g.rect(x, sy - 22, 12, 22).rect(x + 14, sy - 30, 12, 30).fill(c).stroke({ width: 2, color: INK }); // blocks
      }
    }
  }
  // the till counter between the shelves
  g.rect(0.42 * w, h * 0.52, 0.16 * w, fy - h * 0.52).fill(0xff8fb1).stroke({ width: 4, color: INK });
  g.rect(0.41 * w, h * 0.5, 0.18 * w, 16).fill(0xffffff).stroke({ width: 3, color: INK });
  // right: a dolls' house and a low table for the jack-in-the-box
  const dx = 1.1 * w, dw = 0.2 * w, dh = h * 0.36;
  g.rect(dx, fy - dh, dw, dh).fill(0xffd6a5).stroke({ width: 4, color: INK });
  g.poly([dx - 12, fy - dh, dx + dw / 2, fy - dh - h * 0.12, dx + dw + 12, fy - dh]).fill(0xe5383b).stroke({ width: 4, color: INK });
  g.moveTo(dx, fy - dh / 2).lineTo(dx + dw, fy - dh / 2).moveTo(dx + dw / 2, fy - dh).lineTo(dx + dw / 2, fy).stroke({ width: 3, color: INK });
  g.rect(1.4 * w, h * 0.56, 0.16 * w, 14).fill(0x4ea8ff).stroke({ width: 3, color: INK });
  g.rect(1.41 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).rect(1.54 * w, h * 0.56 + 14, 10, fy - h * 0.56 - 14).fill(0x2b2d42);
}
