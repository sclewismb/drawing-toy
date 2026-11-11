import { Container, Graphics, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js';
import { PLACES, type PlaceDef, type PlaceId } from './places';
import { hillDots, PALETTE, type Season } from './seasons';
import { ease, tween } from './tween';

interface Building {
  place: PlaceDef;
  holder: Container; // positioned on the pavement, bottom-centre
  sprite: Sprite;
}

/**
 * The neighbourhood: a street with a building for each place. Tap a
 * building to go inside.
 */
export class StreetView extends Container {
  private bg = new Graphics();
  private buildings: Building[] = [];
  private busy = false;
  onEnter: (id: PlaceId, at: { x: number; y: number }) => void = () => {};
  onBuildingTap: () => void = () => {};

  constructor(pictures: Map<string, HTMLCanvasElement>) {
    super();
    this.addChild(this.bg);
    for (const place of PLACES) {
      const pic = pictures.get(place.building)!;
      const sprite = new Sprite(Texture.from(pic));
      sprite.anchor.set(0.5, 1);
      const holder = new Container();
      holder.addChild(sprite);
      holder.eventMode = 'static';
      holder.cursor = 'pointer';
      holder.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation()); // not "empty space"
      holder.on('pointertap', () => this.tap(place, holder));
      this.addChild(holder);
      this.buildings.push({ place, holder, sprite });
    }
  }

  private tap(place: PlaceDef, holder: Container) {
    if (this.busy) return;
    this.busy = true;
    this.onBuildingTap();
    // A happy bounce, then in we go.
    tween(260, (t) => {
      const k = Math.sin(t * Math.PI);
      holder.scale.set(1 + 0.08 * k, 1 - 0.1 * k + 0.18 * Math.sin(t * Math.PI * 2) * (1 - t));
    }, () => {
      holder.scale.set(1);
      const b = holder.getBounds();
      this.onEnter(place.id, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
      this.busy = false;
    });
  }

  /** Where a place's building is on screen (for zooming in and out). */
  buildingCentre(id: PlaceId) {
    const b = this.buildings.find((x) => x.place.id === id);
    if (!b) return { x: 0, y: 0 };
    const r = b.holder.getBounds();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }

  /** Zoom the street around a point: 0 = normal, 1 = fully zoomed in. */
  setZoom(at: { x: number; y: number }, amount: number) {
    const s = 1 + 1.6 * ease.inOutSine(amount);
    this.pivot.set(at.x, at.y);
    this.position.set(at.x, at.y);
    this.scale.set(s);
  }

  layout(w: number, h: number, season: Season) {
    const pal = PALETTE[season];
    const ground = h * 0.66;
    const g = this.bg.clear();
    // sky, sun, clouds, hills (coloured by the season)
    g.rect(0, 0, w, h).fill(pal.sky);
    g.circle(w * 0.9, h * 0.13, Math.min(w, h) * 0.07 * pal.sunSize).fill(pal.sun);
    for (const [cx, cy, s] of [[0.12, 0.12, 1], [0.48, 0.08, 0.8], [0.7, 0.2, 0.6]]) {
      const x = w * cx, y = h * cy, r = Math.min(w, h) * 0.045 * s;
      g.circle(x, y, r).circle(x + r, y - r * 0.4, r * 1.2).circle(x + r * 2.1, y, r).fill(pal.cloud);
    }
    g.ellipse(w * 0.15, ground, w * 0.35, h * 0.22).fill(pal.hillBack);
    hillDots(g, w * 0.15, ground, w * 0.35, h * 0.22, pal.dots, 1);
    g.ellipse(w * 0.7, ground, w * 0.5, h * 0.26).fill(pal.hillFront);
    hillDots(g, w * 0.7, ground, w * 0.5, h * 0.26, pal.dots, 2);
    if (season === 'winter') {
      g.ellipse(w * 0.15, ground, w * 0.35, h * 0.22).stroke({ width: 3, color: 0xc9d6e3 });
      g.ellipse(w * 0.7, ground, w * 0.5, h * 0.26).stroke({ width: 3, color: 0xc9d6e3 });
    }
    // pavement, road with a dashed line, grass verge (snowy in winter)
    g.rect(0, ground - 6, w, h * 0.06).fill(season === 'winter' ? 0xeef3f8 : 0xd9d9d9).stroke({ width: 4, color: 0x3a3a3a });
    const roadTop = ground - 6 + h * 0.06;
    g.rect(0, roadTop, w, h * 0.22).fill(0x5c5c5c);
    for (let x = 20; x < w; x += 90) g.roundRect(x, roadTop + h * 0.105, 50, 10, 5).fill(0xffffff);
    g.rect(0, roadTop + h * 0.22, w, h).fill(pal.grass);
    if (season === 'winter') g.rect(0, roadTop + h * 0.22, w, 4).fill(0xc9d6e3);

    // Buildings in a row along the pavement.
    const margin = w * 0.025;
    const slot = (w - margin * 2) / this.buildings.length;
    for (const [i, b] of this.buildings.entries()) {
      const tex = b.sprite.texture;
      const k = Math.min((slot * 0.9) / tex.width, (h * 0.46) / tex.height);
      b.sprite.scale.set(k);
      b.holder.position.set(margin + slot * (i + 0.5), ground);
    }
  }
}
