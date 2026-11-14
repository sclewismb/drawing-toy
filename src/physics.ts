import type { Character } from './character';
import type { PlaceId } from './places';

/**
 * Throwing, falling and bouncing.
 *
 * Let go of something up in the air and it falls; flick it and it flies,
 * spins a little, and bounces when it lands (off the walls too). It lands on
 * whatever's underneath: furniture toys (bed, sofa, table...), furniture in
 * the room's picture (dresser, kitchen counter, stairs...), or the floor.
 *
 * The floor is a strip with depth (the room's floor seen from the front), so
 * a thing let go on the floor stays at that depth; one dropped from up high
 * lands near the back of the floor.
 */
export interface Surface {
  x0: number;
  x1: number;
  y: number;
  /** How much it bounces things back up (0..1). */
  bounce?: number;
  /** The furniture character it belongs to (things don't land on themselves). */
  owner?: Character;
  /** The bottom of the furniture (let go over its top half, and that's where it goes). */
  bottom?: number;
}

export interface World {
  x0: number;
  x1: number;
  floor: number; // top of the floor strip
  bottom: number;
  surfaces: Surface[];
}

/** Furniture toys you can put things on: how far down from the top their top is, and how bouncy. */
export const FURNITURE: Record<string, { top: number; bounce?: number }> = {
  bed: { top: 0.35 },
  'bed-tiedye': { top: 0.38 },
  daybed: { top: 0.42 },
  sofa: { top: 0.5 },
  couch: { top: 0.5 },
  armchair: { top: 0.5 },
  table: { top: 0.08 },
  stool: { top: 0.06 },
  fridge: { top: 0.03 },
  'school-desk': { top: 0.12 },
  bench: { top: 0.42 },
  trampoline: { top: 0.3, bounce: 0.92 },
  'fire-engine': { top: 0.12 },
  'police-car': { top: 0.2 },
  'rocking-horse': { top: 0.36 },
  wheelbarrow: { top: 0.25 },
  'dog-bed': { top: 0.4 },
  'dog-house': { top: 0.06 },
  piano: { top: 0.14 },
  bookshelf: { top: 0.03 },
  wardrobe: { top: 0.1 },
  'dump-truck': { top: 0.22 },
  'pirate-ship': { top: 0.66 },
};

/**
 * Furniture in the room pictures you can put things on (fractions of the
 * room's main view: x across, y down; the wide rooms carry on below 0 and
 * beyond 1).
 */
export const SHELVES: Partial<Record<PlaceId, [x0: number, x1: number, y: number][]>> = {
  'bedroom-a': [
    [0, 0.17, 0.46], // dresser
    [0.15, 0.39, 0.5], // window sill
    [-0.37, -0.23, 0.24], // book ledges
    [-0.37, -0.23, 0.4],
    [-0.37, -0.23, 0.56],
    [0.84, 0.98, 0.6], // toy bin
  ],
  'bedroom-b': [
    [0.18, 0.38, 0.5], // window sill
    [0.82, 1.0, 0.52], // desk
    [0.66, 0.74, 0.62], // side table
    [1.03, 1.29, 0.49], // dresser
  ],
  lounge: [
    [0.15, 0.32, 0.5], // TV stand
    [1.02, 1.14, 0.5], // little table
    [-0.6, -0.16, 0.42], // the landing at the top of the stairs
    [-0.16, -0.132, 0.42], // the stairs, step by step
    [-0.132, -0.104, 0.48],
    [-0.104, -0.076, 0.54],
    [-0.076, -0.048, 0.6],
    [-0.048, -0.02, 0.66],
  ],
  kitchen: [
    [0.2, 0.8, 0.47], // counter
    [0.2, 0.74, 0.58], // island
    [-0.3, -0.1, 0.57], // dining table
  ],
  school: [[0.18, 0.82, 0.5]], // the chalk ledge under the blackboard
  backyard: [
    [1.13, 1.37, 0.66], // picnic table
    [1.71, 1.86, 0.58], // TV room counter
  ],
  vet: [
    [0.05, 0.37, 0.48], // reception desk
    [1.08, 1.32, 0.55], // check-up table
    [0.78, 0.96, 0.52], // under the fish tank
  ],
  restaurant: [
    [-0.31, -0.01, 0.44], // the kitchen hatch
    [0.09, 0.25, 0.58], // tables
    [0.42, 0.58, 0.58],
    [0.75, 0.91, 0.58],
    [1.04, 1.28, 0.46], // dessert counter
  ],
  toyshop: [
    [-0.55, -0.13, 0.52], // train table
    [0.04, 0.44, 0.3], // shelves
    [0.04, 0.44, 0.46],
    [0.04, 0.44, 0.62],
    [0.56, 0.96, 0.3],
    [0.56, 0.96, 0.46],
    [0.56, 0.96, 0.62],
    [0.41, 0.59, 0.5], // till counter
    [1.4, 1.56, 0.56], // the jack-in-the-box's table
  ],
  ninja: [
    [0.82, 0.94, 0.3], // the top of the warped wall
  ],
  niagara: [
    [1.04, 1.76, 0.36], // the bridge
  ],
  workshop: [
    [0.33, 0.67, 0.58], // the maker table
    [1.06, 1.52, 0.53], // the squishy bar
    [1.74, 2.12, 0.54], // the glow bar
    [0.03, 0.3, 0.2], // display shelves
    [0.03, 0.3, 0.36],
    [0.03, 0.3, 0.52],
    [0.7, 0.97, 0.2],
    [0.7, 0.97, 0.36],
    [0.7, 0.97, 0.52],
  ],
  conservatory: [
    [1.42, 1.6, 0.655], // the bench
    [-0.22, -0.12, 0.6], // the fruit stump
  ],
};

const GRAVITY = 0.0028; // pixels per ms, per ms
const MAX_SPEED = 2.2;
const THROW = 0.7; // a flick sends things a bit less far than the finger went, so they stay nearby
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Where a character's feet are, and half its width. */
export const feetOf = (ch: Character) => ch.y + ch.restY * Math.abs(ch.scale.y);
const setFeet = (ch: Character, y: number) => (ch.y = y - ch.restY * Math.abs(ch.scale.y));
const halfWidthOf = (ch: Character) => (Math.abs(ch.sprite.width) / 2) * Math.abs(ch.scale.x);

/** The top of a furniture toy, as a surface (or null if it isn't furniture). */
export function furnitureSurface(ch: Character): Surface | null {
  const f = ch.ref.kind === 'sample' ? FURNITURE[ch.ref.name] : undefined;
  if (!f) return null;
  const h = ch.restY * 2 * Math.abs(ch.scale.y);
  const half = halfWidthOf(ch) * 0.8;
  return { x0: ch.x - half, x1: ch.x + half, y: ch.y - h / 2 + f.top * h, bounce: f.bounce, owner: ch, bottom: ch.y + h / 2 };
}

interface Body {
  vx: number;
  vy: number;
  spin: number;
  floorFeet: number; // where it lands if it reaches the floor
  prevFeet: number;
  bounces: number;
  /** Dropped onto this (the trampoline): land on it whatever's in the way. */
  target?: Surface;
}

export class Physics {
  private bodies = new Map<Character, Body>();
  /** It hit something: how hard (pixels per ms), and whether it bounced back up. */
  onLand: (ch: Character, speed: number, bounced: boolean, on: Surface | null) => void = () => {};
  /** It has come to rest (on a surface, or the floor). `spun` = it was spinning (so stand it back up). */
  onSettle: (ch: Character, on: Surface | null, spun: boolean) => void = () => {};
  /** How bouncy a thing itself is (balls!) and how heavy (frisbees and beach balls float). */
  feel: (ch: Character) => { bounce?: number; gravity?: number } = () => ({});

  active(ch: Character) {
    return this.bodies.has(ch);
  }

  stop(ch: Character) {
    this.bodies.delete(ch);
  }

  clear() {
    this.bodies.clear();
  }

  /**
   * Let go of a character: thrown at this speed (pixels per ms), or just
   * dropped. Returns false if it's already standing on something.
   */
  release(ch: Character, vx: number, vy: number, world: World): boolean {
    const feet = feetOf(ch);
    const onFloor = feet >= world.floor - 2;
    const speed = Math.hypot(vx, vy);
    let target: Surface | undefined;
    if (speed < 0.2) {
      vx = vy = 0;
      // let go over a piece of furniture (or a shelf): it goes on it
      const over = this.surfaceOver(ch, feet, world);
      if (over?.bounce) {
        // the trampoline: drop in from just above, and boing
        target = over;
        setFeet(ch, Math.min(feet, over.y - 70));
      } else if (over) {
        setFeet(ch, over.y);
        this.onSettle(ch, over, false);
        return false;
      } else if (onFloor) {
        return false; // standing on the floor already
      }
    }
    const k = THROW * (speed * THROW > MAX_SPEED ? MAX_SPEED / (speed * THROW) : 1);
    this.bodies.set(ch, {
      vx: vx * k,
      vy: vy * k,
      spin: speed > 0.6 ? clamp(vx * 0.004, -0.02, 0.02) : 0,
      floorFeet: onFloor
        ? clamp(feet, world.floor + 2, world.bottom - 4)
        : world.floor + (world.bottom - world.floor) * rand(0.08, 0.22),
      prevFeet: feetOf(ch),
      bounces: 0,
      target,
    });
    return true;
  }

  /** The surface it's being held over: just above its top, or over the top half of the furniture. */
  private surfaceOver(ch: Character, feet: number, world: World) {
    let best: Surface | null = null;
    for (const s of world.surfaces) {
      if (s.owner === ch || ch.x < s.x0 || ch.x > s.x1) continue;
      const below = s.bottom !== undefined ? (s.bottom - s.y) * 0.5 : 14;
      if (feet >= s.y - 18 && feet <= s.y + below && (!best || s.y > best.y)) best = s;
    }
    return best;
  }

  update(dtMs: number, world: World) {
    const dt = Math.min(dtMs, 40);
    for (const [ch, b] of this.bodies) {
      if (ch.destroyed) {
        this.bodies.delete(ch);
        continue;
      }
      b.vy += GRAVITY * (this.feel(ch).gravity ?? 1) * dt;
      ch.x += b.vx * dt;
      ch.y += b.vy * dt;
      ch.rotation += b.spin * dt;

      // bump off the walls and the ceiling
      const half = halfWidthOf(ch) * 0.6;
      if (ch.x < world.x0 + half && b.vx < 0) {
        ch.x = world.x0 + half;
        b.vx = -b.vx * 0.5;
        this.onLand(ch, Math.abs(b.vx), true, null);
      } else if (ch.x > world.x1 - half && b.vx > 0) {
        ch.x = world.x1 - half;
        b.vx = -b.vx * 0.5;
        this.onLand(ch, Math.abs(b.vx), true, null);
      }
      const head = ch.y - ch.restY * Math.abs(ch.scale.y);
      if (head < 0 && b.vy < 0) {
        ch.y -= head;
        b.vy = -b.vy * 0.3;
      }

      const feet = feetOf(ch);
      if (b.vy > 0) {
        // landing on something on the way down (the highest thing it passes), or the floor
        let on: Surface | null = null;
        let landAt = b.floorFeet;
        if (b.target && !b.target.owner?.destroyed && ch.x >= b.target.x0 && ch.x <= b.target.x1) {
          on = b.target;
          landAt = b.target.y;
        } else {
          for (const s of world.surfaces) {
            if (s.owner === ch || ch.x < s.x0 || ch.x > s.x1) continue;
            if (b.prevFeet <= s.y + 1 && feet >= s.y && s.y < landAt) {
              on = s;
              landAt = s.y;
            }
          }
        }
        if (feet >= landAt) {
          setFeet(ch, landAt);
          const impact = b.vy;
          const own = this.feel(ch).bounce;
          const bouncy = on?.bounce ?? own ?? 0.42;
          const maxBounces = own && own > 0.7 ? 9 : 5;
          if ((on?.bounce ?? 0) > 0.8 && b.bounces < 4) {
            // the trampoline: boing, boing, boing...
            b.vy = -Math.max(impact * bouncy, 1.05 - b.bounces * 0.18);
            b.bounces++;
            this.onLand(ch, impact, true, on);
          } else if (impact > (own ? 0.18 : 0.4) && b.bounces < maxBounces) {
            b.vy = -impact * bouncy;
            b.vx *= 0.7;
            b.spin *= 0.6;
            b.bounces++;
            this.onLand(ch, impact, true, on);
          } else {
            const spun = b.spin !== 0;
            this.bodies.delete(ch);
            this.onLand(ch, impact, false, on);
            this.onSettle(ch, on, spun);
          }
        }
      }
      b.prevFeet = feetOf(ch);
    }
  }
}
