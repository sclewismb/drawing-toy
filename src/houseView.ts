import { Container, Graphics, Rectangle, Sprite, Text, Texture, type FederatedPointerEvent } from 'pixi.js';
import type { HouseGeom } from './eggs';
import { ROOMS, type RoomId } from './places';
import { hillDots, PALETTE, type Season } from './seasons';
import { Sky } from './sky';
import { ease, tween } from './tween';

interface RoomTile {
  id: RoomId;
  holder: Container; // centred on the room
  art: Graphics;
  furniture: Sprite[];
  labelBg: Graphics;
  label: Text;
  w: number;
  h: number;
}

/** The main furniture shown in each room of the cut-away (built-in toy pictures). */
export const ROOM_FURNITURE: Record<RoomId, string[]> = {
  'bedroom-a': ['daybed'],
  'bedroom-b': ['bed-tiedye'],
  lounge: ['couch'],
  kitchen: ['fridge', 'stool'],
};

/**
 * The family house with its front taken off: four rooms to choose from.
 * Room names come from the iPad's own settings, never from the code.
 */
export class HouseView extends Container {
  /** The sky with drifting clouds, behind everything (tap a cloud for rain). */
  readonly sky = new Sky(true);
  private bg = new Graphics();
  private shell = new Graphics();
  private tiles: RoomTile[] = [];
  private busy = false;
  private names: Partial<Record<RoomId, string>> = {};
  /** The garden gate beside the house: through it to the backyard. */
  private gate = new Graphics();
  private gateRect = new Rectangle();
  /** Surprises outside the house (see eggs/views.ts): behind it and in front. */
  readonly eggsBehind = new Container();
  readonly eggs = new Container();
  readonly eggsFront = new Container();
  geom: HouseGeom = { w: 0, h: 0, x0: 0, houseW: 0, ridgeY: 0, ground: 0, rooms: [], season: 'spring' };
  onEnter: (id: RoomId | 'backyard', at: { x: number; y: number }) => void = () => {};

  constructor(pictures: Map<string, HTMLCanvasElement>) {
    super();
    this.addChild(this.sky, this.bg, this.eggsBehind, this.shell, this.gate);
    this.gate.eventMode = 'static';
    this.gate.cursor = 'pointer';
    this.gate.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());
    this.gate.on('pointertap', () => this.tapGate());
    for (const id of ROOMS) {
      const holder = new Container();
      const art = new Graphics();
      holder.addChild(art);
      const furniture = ROOM_FURNITURE[id].map((name) => {
        const s = new Sprite(Texture.from(pictures.get(name)!));
        s.anchor.set(0.5, 1);
        holder.addChild(s);
        return s;
      });
      const labelBg = new Graphics();
      const label = new Text({
        text: '',
        style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 20, fontWeight: '700', fill: 0x3a3a3a },
      });
      label.anchor.set(0.5);
      holder.addChild(labelBg, label);
      holder.eventMode = 'static';
      holder.cursor = 'pointer';
      const tile: RoomTile = { id, holder, art, furniture, labelBg, label, w: 0, h: 0 };
      holder.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation());
      holder.on('pointertap', () => this.tap(tile));
      this.addChild(holder);
      this.tiles.push(tile);
    }
    this.addChild(this.eggs, this.eggsFront);
  }

  setNames(names: Partial<Record<RoomId, string>>) {
    this.names = names;
    for (const t of this.tiles) this.drawLabel(t);
  }

  private tap(t: RoomTile) {
    if (this.busy) return;
    this.busy = true;
    tween(
      240,
      (k) => t.holder.scale.set(1 + 0.06 * Math.sin(k * Math.PI)),
      () => {
        t.holder.scale.set(1);
        this.onEnter(t.id, { x: t.holder.x, y: t.holder.y });
        this.busy = false;
      },
    );
  }

  private tapGate() {
    if (this.busy) return;
    this.busy = true;
    const r = this.gateRect;
    const at = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    // the gate gives a little wiggle, then in we go
    this.gate.pivot.set(r.x + r.width / 2, r.y + r.height);
    this.gate.position.set(r.x + r.width / 2, r.y + r.height);
    tween(
      300,
      (k) => (this.gate.skew.y = Math.sin(k * Math.PI * 2) * 0.05),
      () => {
        this.gate.skew.y = 0;
        this.onEnter('backyard', at);
        this.busy = false;
      },
    );
  }

  /** Where a room (or the garden gate) is on screen (for zooming in and out). */
  roomCentre(id: string) {
    if (id === 'backyard') {
      const r = this.gateRect;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    const t = this.tiles.find((x) => x.id === id);
    return t ? { x: t.holder.x, y: t.holder.y } : { x: 0, y: 0 };
  }

  setZoom(at: { x: number; y: number }, amount: number) {
    const s = 1 + 1.8 * ease.inOutSine(amount);
    this.pivot.set(at.x, at.y);
    this.position.set(at.x, at.y);
    this.scale.set(s);
  }

  layout(w: number, h: number, season: Season) {
    const pal = PALETTE[season];
    // outside: the sky with drifting clouds (behind everything), hills, lawn
    const ground = h * 0.9;
    const u = Math.min(w, h);
    this.sky.set({
      x0: 0,
      x1: w,
      h,
      color: pal.sky,
      sun: { x: w * 0.92, y: h * 0.1, r: u * 0.06 * pal.sunSize, color: pal.sun },
      clouds: [[0.04, 0.12, 0.9], [0.4, 0.05, 0.7], [0.68, 0.16, 0.6]].map(([fx, fy, s]) => ({ x: w * fx, y: h * fy, r: u * 0.045 * s })),
      cloudColor: pal.cloud,
    });
    this.bg.clear();
    this.bg.ellipse(w * 0.2, ground, w * 0.4, h * 0.25).fill(pal.hillBack);
    hillDots(this.bg, w * 0.2, ground, w * 0.4, h * 0.25, pal.dots, 5);
    this.bg.ellipse(w * 0.8, ground, w * 0.45, h * 0.28).fill(pal.hillFront);
    hillDots(this.bg, w * 0.8, ground, w * 0.45, h * 0.28, pal.dots, 6);
    this.bg.rect(0, ground, w, h - ground).fill(pal.grass);

    // the house: dark roof, brick walls, four rooms inside
    // (a little left of the middle, to leave room for the garden gate)
    const houseW = Math.min(w * 0.76, h * 1.2);
    const roofH = h * 0.14;
    const bodyH = ground - h * 0.08 - roofH;
    const x0 = (w - houseW) * 0.36;
    const top = h * 0.08 + roofH;
    const wall = 16;
    const g = this.shell.clear();
    g.poly([x0 - 30, top, x0 + houseW * 0.18, h * 0.08, x0 + houseW * 0.82, h * 0.08, x0 + houseW + 30, top])
      .fill(0x33333b)
      .stroke({ width: 6, color: 0x3a3a3a });
    g.rect(x0, top, houseW, bodyH).fill(0xeadbc8).stroke({ width: 6, color: 0x3a3a3a });
    for (let y = top + 14; y < top + bodyH; y += 14) g.moveTo(x0, y).lineTo(x0 + houseW, y);
    g.stroke({ width: 1.5, color: 0xcbb79c });

    const innerW = houseW - wall * 3;
    const innerH = bodyH - wall * 3;
    const cw = innerW / 2;
    const ch = innerH / 2;
    this.tiles.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = x0 + wall + col * (cw + wall) + cw / 2;
      const cy = top + wall + row * (ch + wall) + ch / 2;
      t.w = cw;
      t.h = ch;
      t.holder.position.set(cx, cy);
      t.holder.pivot.set(0, 0);
      t.holder.hitArea = new Rectangle(-cw / 2, -ch / 2, cw, ch);
      this.drawRoom(t);
      this.drawLabel(t);
    });
    this.drawGate(x0 + houseW, w, ground, h, season);
    this.geom = {
      w,
      h,
      x0,
      houseW,
      ridgeY: h * 0.08,
      ground,
      rooms: this.tiles.map((t) => new Rectangle(t.holder.x - t.w / 2, t.holder.y - t.h / 2, t.w, t.h)),
      season,
    };
  }

  /** A wooden fence from the house to the edge of the screen, with an arched garden gate. */
  private drawGate(from: number, to: number, ground: number, h: number, season: Season) {
    const g = this.gate.clear();
    this.gate.pivot.set(0, 0);
    this.gate.position.set(0, 0);
    this.gate.skew.set(0, 0);
    const ink = 0x3a3a3a;
    const fh = h * 0.1;
    // fence
    g.rect(from, ground - fh * 0.75, to - from, 8).rect(from, ground - fh * 0.3, to - from, 8).fill(0xc08b5c).stroke({ width: 2, color: ink });
    for (let x = from + 6; x < to; x += 16) g.roundRect(x, ground - fh, 11, fh, 4).fill(0xd4a373).stroke({ width: 2, color: ink });
    // the gate, in the middle of the gap
    const gw = Math.min((to - from) * 0.6, h * 0.13);
    const gh = h * 0.14;
    const gx = from + (to - from - gw) / 2;
    const gy = ground - gh;
    g.rect(gx - 8, gy - 4, 8, gh + 4).rect(gx + gw, gy - 4, 8, gh + 4).fill(0x8d5a3b).stroke({ width: 2, color: ink });
    g.roundRect(gx, gy, gw, gh, 4).fill(0xd4a373).stroke({ width: 3, color: ink });
    for (let x = gx + gw / 5; x < gx + gw - 2; x += gw / 5) g.moveTo(x, gy + 4).lineTo(x, ground - 4);
    g.stroke({ width: 2, color: 0xa47e4b });
    g.moveTo(gx + 4, gy + gh * 0.25).lineTo(gx + gw - 4, gy + gh * 0.25).moveTo(gx + 4, gy + gh * 0.75).lineTo(gx + gw - 4, gy + gh * 0.75).stroke({ width: 5, color: 0x8d5a3b });
    g.circle(gx + gw * 0.85, gy + gh * 0.5, 4).fill(ink);
    // a leafy arch over the gate, with flowers (snowy in winter)
    const leaf = season === 'winter' ? 0xe9f1f7 : season === 'autumn' ? 0xd08c3a : 0x52b788;
    const ax = gx + gw / 2, ay = gy - 6, ar = gw / 2 + 14;
    g.moveTo(ax - ar, gy + gh * 0.3).arc(ax, ay, ar, Math.PI, 0).lineTo(ax + ar, gy + gh * 0.3).stroke({ width: 9, color: 0x8d5a3b });
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const lx = ax + Math.cos(a) * ar, ly = ay + Math.sin(a) * ar;
      g.circle(lx, ly, 9).fill(leaf).stroke({ width: 1.5, color: ink });
      if ((season === 'spring' || season === 'summer') && i % 2 === 0) g.circle(lx, ly - 3, 4).fill(i % 4 ? 0xff8fb1 : 0xffd166);
    }
    // stepping stones up to the gate
    for (let i = 0; i < 3; i++) g.ellipse(ax - 6 + i * 6, ground + 10 + i * 14, 14 - i, 5).fill(0xbdb5a6).stroke({ width: 1.5, color: ink });
    this.gateRect = new Rectangle(gx - 20, gy - ar - 10, gw + 40, gh + ar + 40);
    this.gate.hitArea = this.gateRect;
  }

  private drawRoom(t: RoomTile) {
    const { w, h } = t;
    const g = t.art.clear();
    const L = -w / 2, T = -h / 2, floorY = T + h * 0.72;
    const ink = 0x3a3a3a;
    switch (t.id) {
      case 'bedroom-a':
        g.rect(L, T, w, h).fill(0xe4e6ea);
        g.poly([L + w * 0.45, T, L + w * 0.62, T, L + w * 0.56, floorY, L + w * 0.45, floorY]).fill(0xd4e94a);
        g.poly([L + w * 0.62, T, L + w, T, L + w * 0.56, floorY]).fill(0xfbfbfb);
        g.poly([L + w, T, L + w, floorY, L + w * 0.56, floorY]).fill(0x9fd8e8);
        g.rect(L + w * 0.12, T + h * 0.14, w * 0.22, h * 0.24).fill(0x1f1f1f);
        g.rect(L, floorY, w, T + h - floorY).fill(0x5f5a57);
        break;
      case 'bedroom-b':
        g.rect(L, T, w * 0.45, h).fill(0x7fdde0);
        g.rect(L + w * 0.45, T, w * 0.55, h).fill(0xf6f6f8);
        for (const [fx, fy, c] of [[0.6, 0.2, 0xff8fb1], [0.75, 0.12, 0xb07de8], [0.88, 0.25, 0x7fdde0], [0.68, 0.34, 0xffd166], [0.82, 0.4, 0xc3b1ff]] as const) {
          g.circle(L + w * fx - 4, T + h * fy, 5).circle(L + w * fx + 4, T + h * fy, 5).fill(c);
        }
        g.rect(L + w * 0.15, T + h * 0.12, w * 0.2, h * 0.28).fill(0xdff3ff).stroke({ width: 3, color: 0xffffff });
        g.rect(L, floorY, w, T + h - floorY).fill(0x6b625c);
        g.ellipse(L + w * 0.18, T + h * 0.88, w * 0.12, h * 0.06).fill(0xc8a2e8);
        break;
      case 'lounge':
        g.rect(L, T, w, h).fill(0xe9ecef);
        g.rect(L + w * 0.62, T + h * 0.1, w * 0.32, h * 0.36).fill(0xf4f4f4).stroke({ width: 4, color: 0xffffff });
        for (let y = T + h * 0.14; y < T + h * 0.44; y += 9) g.rect(L + w * 0.63, y, w * 0.3, 4).fill(0xc9cdd2);
        g.rect(L + w * 0.1, T + h * 0.24, w * 0.18, h * 0.2).fill(0x111111);
        g.rect(L, floorY, w, T + h - floorY).fill(0x3b2620);
        g.roundRect(L + w * 0.25, floorY + h * 0.06, w * 0.55, h * 0.16, 6).fill(0xd6ccc2);
        break;
      case 'kitchen':
        g.rect(L, T, w, h).fill(0xeef1f4);
        g.rect(L + w * 0.3, T + h * 0.06, w * 0.62, h * 0.22).fill(0xfbfbf8).stroke({ width: 2, color: 0xadb5bd });
        g.rect(L + w * 0.3, T + h * 0.44, w * 0.62, floorY - (T + h * 0.44)).fill(0xfbfbf8).stroke({ width: 2, color: 0xadb5bd });
        g.rect(L + w * 0.3, T + h * 0.42, w * 0.62, 6).fill(0xffffff).stroke({ width: 2, color: 0xadb5bd });
        for (const px of [0.45, 0.6, 0.75]) {
          g.moveTo(L + w * px, T).lineTo(L + w * px, T + h * 0.12).stroke({ width: 2, color: 0x1f1f1f });
          g.poly([L + w * px - 8, T + h * 0.18, L + w * px + 8, T + h * 0.18, L + w * px + 4, T + h * 0.12, L + w * px - 4, T + h * 0.12]).fill(0x2b2b2b);
        }
        g.rect(L, floorY, w, T + h - floorY).fill(0x3b2620);
        break;
    }
    g.rect(L, T, w, h).stroke({ width: 5, color: ink });

    // furniture, standing on the floor
    const base = T + h * 0.92;
    const spots: Record<RoomId, number[]> = {
      'bedroom-a': [0.6],
      'bedroom-b': [0.55],
      lounge: [0.6],
      kitchen: [0.15, 0.5],
    };
    t.furniture.forEach((s, i) => {
      const tex = s.texture;
      const maxW = w * (t.id === 'kitchen' ? 0.26 : 0.62);
      const maxH = h * (t.id === 'kitchen' && i === 0 ? 0.8 : 0.5);
      const k = Math.min(maxW / tex.width, maxH / tex.height);
      s.scale.set(k);
      s.position.set(L + w * spots[t.id][i], base);
    });
  }

  private drawLabel(t: RoomTile) {
    const name = (this.names[t.id] ?? '').trim();
    t.label.text = name;
    t.label.visible = !!name;
    t.labelBg.clear();
    if (!name) return;
    t.label.style.fontSize = Math.max(14, Math.min(24, t.h * 0.09));
    const tw = t.label.width + 20;
    const th = t.label.height + 8;
    const y = -t.h / 2 + th / 2 + 8;
    t.labelBg.roundRect(-tw / 2, y - th / 2, tw, th, th / 2).fill(0xffffff).stroke({ width: 3, color: 0x3a3a3a });
    t.label.position.set(0, y);
  }
}
