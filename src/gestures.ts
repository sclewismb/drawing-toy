import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { Character } from './character';

type Pt = { x: number; y: number };

/** One character being handled by one or two fingers. */
interface Gesture {
  ch: Character;
  ids: number[]; // pointer ids, max 2
  // Snapshot taken whenever fingers are added or removed:
  offset: Pt; // one finger: character position minus finger
  d0: number; // two fingers: starting distance
  a0: number; // two fingers: starting angle
  c0: Pt; // two fingers: starting midpoint
  s0: number; // character scale at start
  r0: number; // character rotation at start
  p0: Pt; // character position at start
  // Telling a tap from a drag from a shake:
  start: Pt; // where the first finger went down
  startT: number;
  moved: boolean; // travelled far enough to count as a drag
  pinched: boolean; // a second finger joined in at some point
  last: Pt; // previous finger position and time, for speed
  lastT: number;
  fastDir: Pt | null; // direction of the last fast movement
  reversals: number; // fast back-and-forth direction changes
  firstReversalT: number;
  // How fast the finger was going when it let go (for throwing), pixels per ms:
  vx: number;
  vy: number;
  velP: Pt;
  velT: number;
  lastShakeT: number;
}

/** Further than this (in screen pixels) and it's a drag, not a tap. */
const TAP_SLOP = 12;
const TAP_MAX_MS = 450;
/** Speed (pixels per millisecond) that counts as shaking. */
const SHAKE_SPEED = 1.0;
const SHAKE_REVERSALS = 4;
const SHAKE_WINDOW_MS = 900;

/**
 * Shared with the surprises: a finger that went down on a surprise and then
 * slid the room along shouldn't also set the surprise off.
 */
export const touchState = { panned: false };
const eggTouches = new Set<number>();
/** A surprise was touched (it still lets the room slide if the finger moves). */
export function markEggTouch(pointerId: number) {
  eggTouches.add(pointerId);
}

/** A finger on empty space (or a surprise): a tap, or sliding the room along. */
interface Pan {
  id: number;
  start: Pt;
  last: Pt;
  lastT: number;
  vx: number; // pixels per ms
  moved: boolean;
  egg: boolean; // started on a surprise
}

/**
 * Turns raw touches and mouse input into character moves.
 *
 * - One finger on a character drags it.
 * - A second finger (on the same character OR on empty space) pinches to
 *   resize and twists to rotate.
 * - A finger on a *different* character drags that one separately, so two
 *   kids can play at once.
 * - A quick touch without moving is a tap; shaking while carrying is a shake.
 * - Mouse wheel resizes the selected character (Shift+wheel rotates), for
 *   testing on the PC.
 */
export class GestureController {
  private pointers = new Map<number, Pt>();
  private gestures = new Map<Character, Gesture>();
  private owner = new Map<number, Character>();

  selected: Character | null = null;
  onSelect: (ch: Character | null) => void = () => {};
  onTap: (ch: Character) => void = () => {};
  onTapEmpty: (x: number, y: number) => void = () => {};
  onDragStart: (ch: Character) => void = () => {};
  /** While dragging with one finger: where the finger is. */
  onDragMove: (ch: Character, x: number, y: number) => void = () => {};
  /** Let go after dragging: where the finger was. */
  /** Let go after dragging: where the finger was, and how fast it was going (pixels per ms) for a throw. */
  onDrop: (ch: Character, x: number, y: number, vx: number, vy: number) => void = () => {};
  /** A finger has just taken hold of a character (to stop it falling or wandering). */
  onGrab: (ch: Character) => void = () => {};
  onShake: (ch: Character) => void = () => {};
  /** All fingers lifted off a character (after a tap, drag or pinch). */
  onGestureEnd: (ch: Character) => void = () => {};
  /** Can empty space be dragged to slide the room along? */
  canPan: () => boolean = () => false;
  /** A finger went down on empty space (stop any glide). */
  onPanStart: () => void = () => {};
  /** Sliding the room: how far the finger moved (screen pixels). */
  onPan: (dx: number) => void = () => {};
  /** Let go after sliding: the finger's speed (pixels per ms). */
  onPanEnd: (vx: number) => void = () => {};
  /** Where characters may go, in their layer's coordinates (default: the screen). */
  bounds: () => { x0: number; x1: number; y0: number; y1: number } = () => ({
    x0: 0,
    x1: this.app.screen.width,
    y0: 0,
    y1: this.app.screen.height,
  });
  private pan: Pan | null = null;

  constructor(
    private app: Application,
    private layer: Container,
  ) {
    const stage = app.stage;
    stage.eventMode = 'static';
    stage.hitArea = app.screen; // the whole screen catches touches

    stage.on('pointerdown', this.down, this);
    stage.on('globalpointermove', this.move, this);
    stage.on('pointerup', this.up, this);
    stage.on('pointerupoutside', this.up, this);
    stage.on('pointercancel', this.up, this);

    app.canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
  }

  private static findCharacter(target: unknown): Character | null {
    let node = target as Container | null;
    while (node) {
      if (node instanceof Character) return node;
      node = node.parent;
    }
    return null;
  }

  private down(e: FederatedPointerEvent) {
    const id = e.pointerId;
    const pos = { x: e.global.x, y: e.global.y };
    this.pointers.set(id, pos);
    if (this.pointers.size === 1) touchState.panned = false;
    const onEgg = eggTouches.delete(id);

    const hit = onEgg ? null : (GestureController.findCharacter(e.target) ?? this.characterAt(pos));

    // A finger on a character that nobody is holding: start dragging it.
    if (hit && !this.gestures.has(hit)) {
      this.startGesture(hit, id);
      return;
    }

    // A finger on a character that's already held by one finger,
    // or on empty space while exactly one character is held by one finger:
    // that becomes a pinch on that character.
    const target =
      hit ??
      (!onEgg && this.gestures.size === 1 ? [...this.gestures.keys()][0] : null);
    const g = target ? this.gestures.get(target) : undefined;
    if (g && g.ids.length === 1) {
      g.ids.push(id);
      g.pinched = true;
      this.owner.set(id, g.ch);
      this.rebase(g);
      return;
    }

    // Empty space (or a surprise) with nothing held: a tap, or the start of
    // sliding the room along. We find out which when the finger moves or lifts.
    if (!hit && this.gestures.size === 0 && !this.pan) {
      this.pan = { id, start: pos, last: pos, lastT: performance.now(), vx: 0, moved: false, egg: onEgg };
      if (this.canPan()) this.onPanStart();
    }
  }

  /** A finger's position in the characters' layer (which may be slid along). */
  private local(id: number): Pt {
    const p = this.pointers.get(id)!;
    return this.layer.toLocal(p);
  }

  /**
   * Backup check when a touch seems to land on empty space: ask each
   * character directly, top one first, using its up-to-date position.
   * (Pixi's own check can briefly use a stale position right after a
   * character has been brought to the front.)
   */
  private characterAt(pos: Pt): Character | null {
    const kids = this.layer.children;
    for (let i = kids.length - 1; i >= 0; i--) {
      const ch = kids[i];
      if (!(ch instanceof Character) || !ch.visible) continue;
      const local = ch.toLocal(pos);
      if (ch.hitArea?.contains(local.x, local.y)) return ch;
    }
    return null;
  }

  private startGesture(ch: Character, id: number) {
    const p = this.pointers.get(id)!;
    const now = performance.now();
    const g: Gesture = {
      ch,
      ids: [id],
      offset: { x: 0, y: 0 },
      d0: 1,
      a0: 0,
      c0: { x: 0, y: 0 },
      s0: 1,
      r0: 0,
      p0: { x: 0, y: 0 },
      start: { ...p },
      startT: now,
      moved: false,
      pinched: false,
      last: { ...p },
      lastT: now,
      fastDir: null,
      reversals: 0,
      firstReversalT: 0,
      lastShakeT: 0,
      vx: 0,
      vy: 0,
      velP: { ...p },
      velT: now,
    };
    this.gestures.set(ch, g);
    this.owner.set(id, ch);
    this.layer.addChild(ch); // bring to front
    ch.setHeld(true);
    this.onGrab(ch);
    this.select(ch);
    this.rebase(g);
  }

  /** Take a fresh snapshot so the character doesn't jump when fingers change. */
  private rebase(g: Gesture) {
    const ch = g.ch;
    g.s0 = ch.scale.x;
    g.r0 = ch.rotation;
    g.p0 = { x: ch.x, y: ch.y };
    if (g.ids.length === 1) {
      const p = this.local(g.ids[0]);
      g.offset = { x: ch.x - p.x, y: ch.y - p.y };
    } else {
      const [a, b] = g.ids.map((i) => this.local(i));
      g.d0 = Math.max(10, Math.hypot(b.x - a.x, b.y - a.y));
      g.a0 = Math.atan2(b.y - a.y, b.x - a.x);
      g.c0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }

  private move(e: FederatedPointerEvent) {
    const id = e.pointerId;
    if (!this.pointers.has(id)) return; // mouse hovering, not pressed
    const pos = { x: e.global.x, y: e.global.y };
    this.pointers.set(id, pos);

    const pan = this.pan;
    if (pan && pan.id === id) {
      const now = performance.now();
      if (!pan.moved && this.canPan() && Math.hypot(pos.x - pan.start.x, pos.y - pan.start.y) > TAP_SLOP) {
        pan.moved = true;
        touchState.panned = true;
        pan.last = { ...pan.start };
      }
      if (pan.moved) {
        const dx = pos.x - pan.last.x;
        const dt = now - pan.lastT;
        if (dt > 0) pan.vx = pan.vx * 0.3 + (dx / dt) * 0.7;
        this.onPan(dx);
        pan.last = pos;
        pan.lastT = now;
      }
      return;
    }

    const ch = this.owner.get(id);
    const g = ch && this.gestures.get(ch);
    if (!g) return;

    this.apply(g);
    if (g.ids.length === 1) {
      const p = this.pointers.get(g.ids[0])!;
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > TAP_SLOP) {
        g.moved = true;
        if (!g.pinched) this.onDragStart(ch);
      }
      if (g.moved) this.onDragMove(ch, p.x, p.y);
      this.checkShake(g, p);
      // how fast it's going (smoothed), in case it's about to be thrown
      const now = performance.now();
      const dt = now - g.velT;
      if (dt >= 8) {
        g.vx = g.vx * 0.4 + ((p.x - g.velP.x) / dt) * 0.6;
        g.vy = g.vy * 0.4 + ((p.y - g.velP.y) / dt) * 0.6;
        g.velP = { ...p };
        g.velT = now;
      }
    } else {
      g.moved = true;
    }
  }

  /** Put a held character where its finger(s) say. */
  private apply(g: Gesture) {
    const ch = g.ch;
    if (g.ids.length === 1) {
      const p = this.local(g.ids[0]);
      ch.position.set(p.x + g.offset.x, p.y + g.offset.y);
    } else {
      const [a, b] = g.ids.map((i) => this.local(i));
      const d = Math.max(10, Math.hypot(b.x - a.x, b.y - a.y));
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

      const s = clamp(g.s0 * (d / g.d0), Character.MIN_SCALE, Character.MAX_SCALE);
      ch.scale.set(s);
      ch.rotation = g.r0 + (ang - g.a0);
      ch.position.set(g.p0.x + c.x - g.c0.x, g.p0.y + c.y - g.c0.y);
    }
    this.keepOnScreen(ch);
  }

  /** The room slid along under the fingers: held characters stay with them. */
  refresh() {
    for (const g of this.gestures.values()) this.apply(g);
  }

  /** Where a character is being carried by one finger (screen position), if any. */
  get dragPoint(): Pt | null {
    for (const g of this.gestures.values()) {
      if (g.ids.length === 1 && g.moved) return this.pointers.get(g.ids[0]) ?? null;
    }
    return null;
  }

  private up(e: FederatedPointerEvent) {
    const id = e.pointerId;
    const lastPos = this.pointers.get(id) ?? { x: e.global.x, y: e.global.y };
    this.pointers.delete(id);
    eggTouches.delete(id);

    const pan = this.pan;
    if (pan && pan.id === id) {
      this.pan = null;
      if (pan.moved) {
        this.onPanEnd(performance.now() - pan.lastT < 80 ? pan.vx : 0);
      } else if (!pan.egg) {
        // Tapping empty space: deselect (and a little sparkle).
        this.select(null);
        this.onTapEmpty(pan.start.x, pan.start.y);
      }
      return;
    }
    const ch = this.owner.get(id);
    this.owner.delete(id);
    const g = ch && this.gestures.get(ch);
    if (!g) return;

    g.ids = g.ids.filter((i) => i !== id);
    if (g.ids.length === 0) {
      this.gestures.delete(ch);
      ch.setHeld(false);
      const quick = performance.now() - g.startT < TAP_MAX_MS;
      if (!g.moved && !g.pinched && quick) this.onTap(ch);
      else if (g.moved && !g.pinched) {
        const fresh = performance.now() - g.velT < 90; // still moving when it let go?
        this.onDrop(ch, lastPos.x, lastPos.y, fresh ? g.vx : 0, fresh ? g.vy : 0);
      }
      this.onGestureEnd(ch);
    } else {
      this.rebase(g); // back to a one-finger drag
    }
  }

  /** Fast back-and-forth while carrying a character = shaking it. */
  private checkShake(g: Gesture, p: Pt) {
    const now = performance.now();
    const dt = now - g.lastT;
    if (dt < 8) return; // too soon to measure speed
    const vx = (p.x - g.last.x) / dt;
    const vy = (p.y - g.last.y) / dt;
    g.last = { ...p };
    g.lastT = now;
    if (Math.hypot(vx, vy) < SHAKE_SPEED) return;

    if (g.fastDir && vx * g.fastDir.x + vy * g.fastDir.y < 0) {
      if (g.reversals === 0 || now - g.firstReversalT > SHAKE_WINDOW_MS) {
        g.reversals = 0;
        g.firstReversalT = now;
      }
      g.reversals++;
      if (g.reversals >= SHAKE_REVERSALS && now - g.lastShakeT > 1500) {
        g.reversals = 0;
        g.lastShakeT = now;
        this.onShake(g.ch);
      }
    }
    g.fastDir = { x: vx, y: vy };
  }

  private wheel(e: WheelEvent) {
    const ch = this.selected;
    if (!ch) return;
    e.preventDefault();
    if (e.shiftKey) {
      ch.rotation += e.deltaY * 0.002;
    } else {
      const s = clamp(ch.scale.x * Math.exp(-e.deltaY * 0.0015), Character.MIN_SCALE, Character.MAX_SCALE);
      ch.scale.set(s);
    }
    this.onGestureEnd(ch);
  }

  select(ch: Character | null) {
    this.selected = ch;
    this.onSelect(ch);
  }

  /** Never let a character get lost off the edge of the room. */
  keepOnScreen(ch: Character) {
    const b = this.bounds();
    ch.x = clamp(ch.x, b.x0, b.x1);
    ch.y = clamp(ch.y, b.y0, b.y1);
  }

  /** True while any finger is holding this character. */
  isHeld(ch: Character) {
    return this.gestures.has(ch);
  }

  /** True while any finger is holding any character. */
  get busy() {
    return this.gestures.size > 0;
  }

  /** Forget a character that has been taken out of the scene. */
  release(ch: Character) {
    const g = this.gestures.get(ch);
    if (g) for (const id of g.ids) this.owner.delete(id);
    this.gestures.delete(ch);
    if (this.selected === ch) this.select(null);
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
