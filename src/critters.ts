import type { Character } from './character';
import { sfx } from './sound';

/**
 * Animals and little people that wander about by themselves.
 *
 * They're ordinary characters (pick them up, tap them, put them away), with a
 * little "brain" that walks them along the floor, stops to look around, and
 * now and then does their own thing. Put one up on the bed or the sofa and
 * it stays there, doing its tricks, until you put it back on the floor.
 *
 * The walk is just the picture bobbing and swaying (each kind in its own
 * way), which is plenty for a paper cut-out world.
 */

type Gait = 'trot' | 'walk' | 'hop' | 'waddle' | 'scurry' | 'creep' | 'slither';
type Trick = 'jump' | 'look' | 'nibble' | 'peck' | 'hide' | 'wave';

export interface CritterKind {
  url: string;
  size: number; // starting size, compared with a normal character
  gait: Gait;
  speed: number; // pixels per millisecond, roughly
  trick: Trick;
  voice: () => void;
}

export const CRITTERS: Record<string, CritterKind> = {
  dog: { url: 'critters/dog.svg', size: 0.65, gait: 'trot', speed: 0.11, trick: 'jump', voice: () => sfx.woof() },
  kitten: { url: 'critters/kitten.svg', size: 0.5, gait: 'walk', speed: 0.07, trick: 'look', voice: () => sfx.meow() },
  bunny: { url: 'critters/bunny.svg', size: 0.45, gait: 'hop', speed: 0.09, trick: 'nibble', voice: () => sfx.squeak(1.7) },
  duck: { url: 'critters/duck.svg', size: 0.5, gait: 'waddle', speed: 0.05, trick: 'look', voice: () => sfx.quack() },
  chicken: { url: 'critters/chicken.svg', size: 0.48, gait: 'walk', speed: 0.06, trick: 'peck', voice: () => sfx.chirp() },
  hedgehog: { url: 'critters/hedgehog.svg', size: 0.4, gait: 'scurry', speed: 0.08, trick: 'hide', voice: () => sfx.squeak(2.1) },
  turtle: { url: 'critters/turtle.svg', size: 0.45, gait: 'creep', speed: 0.02, trick: 'hide', voice: () => sfx.blub() },
  'kid-girl': { url: 'critters/kid-girl.svg', size: 0.85, gait: 'walk', speed: 0.07, trick: 'wave', voice: () => sfx.giggle(1.3) },
  'kid-boy': { url: 'critters/kid-boy.svg', size: 0.85, gait: 'walk', speed: 0.08, trick: 'jump', voice: () => sfx.yippee(1.2) },
  grandma: { url: 'critters/grandma.svg', size: 0.85, gait: 'walk', speed: 0.035, trick: 'wave', voice: () => sfx.giggle(0.9) },
  grownup: { url: 'critters/grownup.svg', size: 0.95, gait: 'walk', speed: 0.06, trick: 'wave', voice: () => sfx.yippee(0.8) },
  pig: { url: 'critters/pig.svg', size: 0.6, gait: 'trot', speed: 0.05, trick: 'nibble', voice: () => sfx.oink() },
  piglet: { url: 'critters/piglet.svg', size: 0.42, gait: 'trot', speed: 0.08, trick: 'jump', voice: () => sfx.oink(1.5) },
  reindeer: { url: 'critters/reindeer.svg', size: 0.7, gait: 'trot', speed: 0.09, trick: 'jump', voice: () => sfx.sleighBells() },
};

export const isCritter = (name: string) => name in CRITTERS;

/**
 * The kids' own drawings can move too (chosen with the move button): walk
 * and hop use the same brain as the animals; fly uses the Flyer below.
 */
export const DRAWN_WALK: CritterKind = { url: '', size: 1, gait: 'walk', speed: 0.07, trick: 'jump', voice: () => sfx.giggle(1.1) };
export const DRAWN_HOP: CritterKind = { url: '', size: 1, gait: 'hop', speed: 0.09, trick: 'jump', voice: () => sfx.boing(1.2) };
export const DRAWN_FLY: CritterKind = { url: '', size: 1, gait: 'walk', speed: 0.16, trick: 'look', voice: () => sfx.buzz() };

/** Where critters may walk: the floor (for their feet), and left and right edges. */
export interface Area {
  x0: number;
  x1: number;
  floor: number; // top of the floor
  bottom: number; // bottom of the screen
  screenW: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// Only one critter "talks" at a time, and not too often, so it isn't noisy.
let lastChatter = 0;
function chatter(kind: CritterKind, now: number) {
  if (now - lastChatter < 4500) return;
  lastChatter = now;
  kind.voice();
}

export class Wanderer {
  private state: 'rest' | 'walk' | 'trick' = 'rest';
  private timer = rand(400, 2500);
  private target = { x: 0, y: 0 };
  private phase = Math.random() * 10;
  private trickT = 0;
  private speed: number;
  /** Not until this time will it stop to say hello again. */
  helloAfter = 0;
  /** Called when it has walked somewhere (so the scene can be saved). */
  onMoved: () => void = () => {};

  constructor(
    readonly ch: Character,
    readonly kind: CritterKind,
  ) {
    this.speed = kind.speed * rand(0.85, 1.15);
  }

  get walking() {
    return this.state === 'walk';
  }

  /** Fetching a thrown ball: run to it, carry it back, drop it. */
  private fetching: {
    ball: Character;
    home: { x: number; y: number };
    carrying: boolean;
    free: () => boolean;
    drop: () => void;
  } | null = null;

  get isFetching() {
    return !!this.fetching;
  }

  /** Go and get the ball, and bring it back to `home`. */
  fetch(ball: Character, home: { x: number; y: number }, free: () => boolean, drop: () => void) {
    if (this.fetching) return false;
    this.fetching = { ball, home, carrying: false, free, drop };
    this.state = 'walk';
    this.kind.voice();
    return true;
  }

  private doFetch(dt: number, s: number) {
    const f = this.fetching!;
    if (!f.free()) {
      // someone grabbed the ball (or it's gone): never mind
      this.fetching = null;
      this.rest(900);
      return;
    }
    const half = (Math.abs(this.ch.sprite.width) / 2) * this.ch.scale.x;
    const mouth = () => ({ x: this.ch.x + this.ch.facing * half * 0.8, y: this.ch.y - this.ch.restY * this.ch.scale.y * 0.15 });
    const ballFeet = f.ball.y + f.ball.restY * f.ball.scale.y;
    const target = f.carrying
      ? f.home
      : { x: f.ball.x - this.ch.facing * half * 0.8, y: ballFeet - this.ch.restY * this.ch.scale.y };
    const dx = target.x - this.ch.x, dy = target.y - this.ch.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 12) this.face(f.carrying ? f.home.x : f.ball.x);
    const step = this.speed * 2.6 * s * dt;
    if (dist > step) {
      this.ch.x += (dx / dist) * step;
      this.ch.y += (dy / dist) * step;
      this.phase += dt * 0.02;
      this.gait(s);
    }
    if (f.carrying) {
      const m = mouth();
      f.ball.position.set(m.x, m.y);
      f.ball.rotation = 0;
    }
    if (dist <= step) {
      if (!f.carrying) {
        f.carrying = true; // got it!
        f.ball.parent?.addChild(f.ball); // carry it in front
      } else {
        // back home: drop it, and ask for another go
        f.drop();
        this.fetching = null;
        this.kind.voice();
        this.doTrick('jump');
        this.onMoved();
      }
    }
  }

  /** Where its feet are. */
  private feet() {
    return this.ch.y + this.ch.restY * this.ch.scale.y;
  }

  /** On the floor (rather than perched up on the furniture)? */
  private onFloor(area: Area) {
    return this.feet() >= area.floor + 6;
  }

  /** Stop and stand still for a bit (tapped, picked up, saying hello...). */
  rest(ms = 1200) {
    this.state = 'rest';
    this.timer = ms;
    this.pose(0, 0);
  }

  /** Do its trick now (e.g. when saying hello). */
  doTrick(trick: Trick = this.kind.trick) {
    this.state = 'trick';
    this.trickT = 0;
    this.timer = trick === 'hide' ? 2200 : 1300;
    this.currentTrick = trick;
  }
  private currentTrick: Trick = 'jump';

  /** Face someone (or something) at x. */
  face(x: number) {
    const want = x < this.ch.x ? -1 : 1;
    if (this.ch.facing !== want) this.ch.flip();
  }

  private pose(y: number, rotation: number) {
    this.ch.sprite.y = y;
    this.ch.sprite.rotation = rotation;
  }

  update(dt: number, area: Area, held: boolean, onScreen: boolean, now: number) {
    if (held) {
      if (this.fetching?.carrying) this.fetching.drop();
      this.fetching = null;
      if (this.state !== 'rest') this.rest(700);
      this.timer = Math.max(this.timer, 500);
      return;
    }
    this.timer -= dt;
    const s = Math.max(0.5, Math.sqrt(this.ch.scale.x)); // bigger ones take bigger steps
    if (this.fetching) return this.doFetch(dt, s);

    if (this.state === 'walk') {
      const dx = this.target.x - this.ch.x;
      const dy = this.target.y - this.ch.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * s * dt;
      if (dist <= step || this.timer <= 0) {
        this.rest(rand(900, 3200));
        this.onMoved();
        return;
      }
      this.ch.x += (dx / dist) * step;
      this.ch.y += (dy / dist) * step;
      this.phase += dt * 0.012 * (this.kind.gait === 'scurry' ? 1.8 : this.kind.gait === 'creep' ? 0.5 : 1);
      this.gait(s);
      return;
    }

    if (this.state === 'trick') {
      this.trickT += dt;
      this.trick(this.trickT, s);
      if (this.timer <= 0) this.rest(rand(800, 2000));
      return;
    }

    // resting: when it's time, set off somewhere (or do a trick)
    if (this.timer > 0) return;
    if (Math.random() < 0.3) {
      this.doTrick();
      if (onScreen && Math.random() < 0.5) chatter(this.kind, now);
      return;
    }
    if (!this.onFloor(area)) {
      // perched on something: stay put, just do tricks now and then
      this.rest(rand(1500, 4000));
      return;
    }
    const reach = area.screenW * rand(0.12, 0.35);
    let tx = this.ch.x + (Math.random() < 0.5 ? -reach : reach);
    const margin = 60;
    if (tx < area.x0 + margin || tx > area.x1 - margin) tx = this.ch.x - (tx - this.ch.x); // turn back at the walls
    tx = Math.min(area.x1 - margin, Math.max(area.x0 + margin, tx));
    const feetOffset = this.ch.restY * this.ch.scale.y;
    const band0 = area.floor + 14, band1 = area.bottom - 10;
    const feetNow = this.feet();
    const feetTo = Math.min(band1, Math.max(band0, feetNow + rand(-1, 1) * (band1 - band0) * 0.35));
    this.target = { x: tx, y: feetTo - feetOffset };
    this.face(tx);
    this.state = 'walk';
    this.timer = 12000; // give up if it somehow can't get there
  }

  /** Bob and sway while walking, each kind in its own way. */
  private gait(s: number) {
    const p = this.phase;
    const k = 1 / s; // the picture is scaled with the character, so keep the bob a sensible size
    switch (this.kind.gait) {
      case 'trot':
        return this.pose(-Math.abs(Math.sin(p)) * 10 * k, Math.sin(p) * 0.05);
      case 'walk':
        return this.pose(-Math.abs(Math.sin(p)) * 6 * k, Math.sin(p) * 0.06);
      case 'hop':
        return this.pose(-Math.abs(Math.sin(p * 0.6)) * 30 * k, -Math.cos(p * 0.6) * 0.1);
      case 'waddle':
        return this.pose(-Math.abs(Math.sin(p)) * 3 * k, Math.sin(p) * 0.16);
      case 'scurry':
        return this.pose(-Math.abs(Math.sin(p)) * 3 * k, Math.sin(p) * 0.03);
      case 'creep':
        return this.pose(-Math.abs(Math.sin(p)) * 2 * k, Math.sin(p) * 0.02);
      case 'slither':
        return this.pose(-Math.abs(Math.sin(p * 0.5)) * 2 * k, Math.sin(p * 0.5) * 0.06);
    }
  }

  private trick(t: number, s: number) {
    const k = 1 / s;
    switch (this.currentTrick) {
      case 'jump': {
        const j = (t % 650) / 650;
        return this.pose(-Math.sin(j * Math.PI) * 40 * k, 0);
      }
      case 'look':
        return this.pose(0, Math.sin(t * 0.006) * 0.12);
      case 'nibble':
        return this.pose(-Math.abs(Math.sin(t * 0.03)) * 3 * k, 0.05);
      case 'peck':
        return this.pose(0, Math.max(0, Math.sin(t * 0.012)) * 0.45);
      case 'hide':
        return this.pose(Math.min(1, t / 250) * 8 * k * (t > 1900 ? (2200 - t) / 300 : 1), 0);
      case 'wave':
        return this.pose(-Math.abs(Math.sin(t * 0.01)) * 4 * k, Math.sin(t * 0.018) * 0.12);
    }
  }
}

/**
 * When two critters walk into each other they stop, turn to face each
 * other, and say hello (each with their own trick).
 */
export function sayHellos(list: Wanderer[], now: number) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!a.walking && !b.walking) continue;
      if (now < a.helloAfter || now < b.helloAfter) continue;
      const near = (a.ch.restY * a.ch.scale.y + b.ch.restY * b.ch.scale.y) * 0.9;
      if (Math.abs(a.ch.x - b.ch.x) > near || Math.abs(a.ch.y - b.ch.y) > near * 0.6) continue;
      a.helloAfter = b.helloAfter = now + 9000;
      a.face(b.ch.x);
      b.face(a.ch.x);
      a.doTrick();
      b.doTrick();
      a.kind.voice();
      setTimeout(() => b.kind.voice(), 450);
    }
  }
}

/**
 * Things that fly about: a bee, a bird, a dragon... They drift from spot to
 * spot through the air with a gentle bob, lean into the way they're going,
 * hover for a moment, and sometimes go and visit someone else in the scene
 * (a bee likes to visit a flower). Let go of one anywhere and it carries on
 * flying from there.
 */
export class Flyer {
  private state: 'hover' | 'fly' = 'hover';
  private timer = rand(300, 1200);
  private target = { x: 0, y: 0 };
  private vx = 0;
  private vy = 0;
  private phase = Math.random() * 10;
  onMoved: () => void = () => {};

  constructor(
    readonly ch: Character,
    readonly kind: CritterKind,
  ) {}

  /** Hover where it is for a bit (tapped, picked up...). */
  rest(ms = 1200) {
    this.state = 'hover';
    this.timer = ms;
  }

  update(dt: number, area: Area, held: boolean, onScreen: boolean, now: number, others: readonly Character[] = []) {
    this.phase += dt;
    if (held) {
      this.rest(700);
      this.vx = this.vy = 0;
      this.ch.sprite.position.set(0, 0);
      this.ch.sprite.rotation = 0;
      return;
    }
    const s = Math.max(0.5, Math.sqrt(this.ch.scale.x));
    const k = 1 / s;
    this.timer -= dt;

    if (this.state === 'hover') {
      // a busy little hover: quick wobble, slowing to a stop
      this.vx *= Math.pow(0.99, dt);
      this.vy *= Math.pow(0.99, dt);
      this.ch.x += this.vx * dt;
      this.ch.y += this.vy * dt;
      this.ch.sprite.y = Math.sin(this.phase * 0.012) * 5 * k;
      this.ch.sprite.rotation = Math.sin(this.phase * 0.02) * 0.04;
      if (this.timer <= 0) this.setOff(area, others, onScreen, now);
      return;
    }

    // flying: steer smoothly towards the target
    const dx = this.target.x - this.ch.x, dy = this.target.y - this.ch.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 16 || this.timer <= 0) {
      this.rest(rand(500, 2200));
      this.onMoved();
      return;
    }
    const max = this.kind.speed * s;
    const want = { x: (dx / dist) * max, y: (dy / dist) * max };
    const steer = Math.min(1, dt * 0.004);
    this.vx += (want.x - this.vx) * steer;
    this.vy += (want.y - this.vy) * steer;
    this.ch.x += this.vx * dt;
    this.ch.y += this.vy * dt;
    // face the way it's going, bob up and down, and lean forwards
    if (Math.abs(this.vx) > 0.03) {
      const want = this.vx < 0 ? -1 : 1;
      if (this.ch.facing !== want) this.ch.flip();
    }
    this.ch.sprite.y = Math.sin(this.phase * 0.007) * 9 * k;
    this.ch.sprite.rotation = Math.max(-0.3, Math.min(0.3, Math.abs(this.vx) * 1.4 + this.vy * 1.2)); // nose down going forwards or down, up when climbing
  }

  private setOff(area: Area, others: readonly Character[], onScreen: boolean, now: number) {
    const margin = 60;
    const top = area.bottom * 0.08, low = area.bottom * 0.86;
    let tx: number, ty: number;
    const friends = others.filter((o) => o !== this.ch && !o.destroyed && Math.abs(o.x - this.ch.x) < area.screenW * 0.8);
    if (friends.length && Math.random() < 0.35) {
      // go and say hello to someone: hover just above them
      const f = friends[Math.floor(Math.random() * friends.length)];
      tx = f.x + rand(-40, 40);
      ty = f.y - f.restY * f.scale.y - this.ch.restY * this.ch.scale.y * 0.6;
    } else {
      tx = this.ch.x + rand(-1, 1) * area.screenW * 0.45;
      ty = rand(top, low);
    }
    this.target = {
      x: Math.min(area.x1 - margin, Math.max(area.x0 + margin, tx)),
      y: Math.min(low, Math.max(top, ty)),
    };
    this.state = 'fly';
    this.timer = 9000;
    if (onScreen && Math.random() < 0.4) chatter(this.kind, now);
  }
}
