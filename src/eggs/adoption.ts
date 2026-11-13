import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { adoptionLayout } from '../adoption';
import { PET_KINDS, renderPet } from '../petArt';
import { PETS } from '../pets';
import { tween } from '../tween';
import { everyFrame, oneAtATime, tappable, type Cleanups, type EggKit } from './common';

/**
 * The adoption corner's pets, one in each pen, breathing and looking about.
 * Tap one: it says hello, and the meet screen opens (main.ts listens for
 * 'adopt' on kit.events).
 */
export function adoption(kit: EggKit, cleanups: Cleanups) {
  const { w, h } = kit;
  const L = adoptionLayout(w, h);
  const pets: { c: Container; s: Sprite; base: number; phase: number }[] = [];
  PET_KINDS.forEach((kind, i) => {
    const p = L.pens[i];
    const pic = renderPet({ kind, collar: -1, name: '' }, 0.4);
    const s = new Sprite(Texture.from(pic));
    s.anchor.set(0.5, 1);
    const k = Math.min((p.w * 0.78) / pic.width, (p.h * 0.72) / pic.height);
    s.scale.set(k);
    const c = new Container();
    c.addChild(s);
    c.position.set(p.x + p.w / 2, p.y + p.h - 18);
    kit.under.addChild(c);
    pets.push({ c, s, base: k, phase: i * 1.7 });
    tappable(c, oneAtATime((done) => {
      PETS[kind].voice();
      tween(500, (t) => c.scale.set(1 + Math.sin(t * Math.PI) * 0.12), () => {
        kit.events?.emit('adopt', kind);
        done();
      });
    }), new Rectangle(-p.w / 2, -p.h + 18, p.w, p.h));
  });
  // breathing, and a little look about now and then
  let time = 0;
  everyFrame((dt) => {
    time += dt;
    for (const p of pets) {
      p.s.scale.set(p.base * (1 + Math.sin(time * 0.003 + p.phase) * 0.02), p.base * (1 - Math.sin(time * 0.003 + p.phase) * 0.02));
      p.s.rotation = Math.sin(time * 0.0007 + p.phase) > 0.8 ? Math.sin(time * 0.01) * 0.05 : 0;
    }
  }, cleanups);
}
