import {
  ANIMALS,
  drawBear,
  drawSquishy,
  EXTRAS,
  EYES,
  FACES,
  FURS,
  MOUTHS,
  newBear,
  newSquishy,
  PASTELS,
  PATTERNS,
  randomBear,
  randomSquishy,
  renderToy,
  SHAPES,
  TOPPINGS,
  TUMMIES,
  type BearRecipe,
  type SquishyRecipe,
} from './makerArt';
import {
  AGES,
  bodyOf,
  BOTTOMS,
  BOTTOM_COLOURS,
  BUILDS,
  NECKS,
  WRISTS,
  drawPerson,
  EYE_COLOURS,
  FACE_BITS,
  GLASSES,
  HAIR_COLOURS,
  HAIRS,
  newPerson,
  PERSON_EXTRAS,
  randomPerson,
  renderPerson,
  SHOES,
  SKINS,
  TOP_COLOURS,
  TOPS,
  type PersonRecipe,
} from './personArt';
import {
  drawGlow,
  GLOW_CHARMS,
  GLOW_COLOURS,
  GLOW_RAINBOW,
  GLOW_SHAPES,
  newGlow,
  ONE_COLOUR,
  RAINBOW,
  randomGlow,
  renderGlow,
  type GlowRecipe,
} from './glowArt';
import { sfx } from './sound';

/**
 * The workshop's maker: a full-screen page of pictures (no words) for
 * making a teddy, a squishy, a person or a glow stick. A big preview, picture
 * tabs (animal, colour, pattern, eyes, mouth, tummy, extras, stuffing), and
 * option tiles that each show the toy with that choice. The dice makes a
 * surprise one; the green tick finishes it (stuffed, with a heart inside; a
 * glow stick gets cracked so it glows) and it goes to the toy box.
 */
export type MakerMode = 'bear' | 'squishy' | 'person' | 'glow';
export type MakerRecipe = BearRecipe | SquishyRecipe | PersonRecipe | GlowRecipe;
type Ctx = CanvasRenderingContext2D;
type Area = { x: number; y: number; w: number; h: number };

const AREA: Record<MakerMode, Area> = {
  bear: { x: -10, y: -150, w: 620, h: 860 },
  squishy: { x: 0, y: -10, w: 560, h: 520 },
  person: { x: -40, y: 0, w: 380, h: 650 },
  glow: { x: -20, y: -40, w: 440, h: 510 },
};
const HEAD: Area = { x: 100, y: -20, w: 400, h: 420 };
const EYES_AT: Area = { x: 190, y: 160, w: 220, h: 150 };
const MOUTH_AT: Area = { x: 200, y: 230, w: 200, h: 150 };
const TUMMY_AT: Area = { x: 120, y: 320, w: 360, h: 330 };

interface Choice {
  /** Draws its picture (or it's a colour swatch). */
  draw?: (c: Ctx, size: number) => void;
  swatch?: string;
  on: boolean;
  pick: () => void;
}
interface Tab {
  id: string;
  icon: (c: Ctx, size: number) => void;
  choices: () => Choice[];
}

const CSS = `
#maker { position: fixed; inset: 0; z-index: 30; display: grid; grid-template-columns: 1.15fr 1fr; grid-template-rows: auto minmax(0, 1fr);
  background: radial-gradient(circle at 30% 40%, #fffaf3, #ffe3ef 75%); touch-action: none; -webkit-user-select: none; user-select: none; }
#maker[hidden] { display: none; }
#maker button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
#maker .mk-top { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left)); }
#maker .mk-top .gap { flex: 1; }
#maker .mk-btn { width: 68px; height: 68px; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; display: grid; place-items: center; padding: 6px; box-shadow: 0 5px 0 rgba(0,0,0,.15); }
#maker .mk-btn.on { background: #ffd166; }
#maker .mk-btn canvas, #maker .mk-tab canvas, #maker .mk-opt canvas { width: 100%; height: 100%; display: block; pointer-events: none; }
#maker .mk-stage { position: relative; min-height: 0; }
#maker .mk-preview { position: absolute; inset: 0; width: 100%; height: 100%; }
#maker .mk-panel { display: flex; flex-direction: column; gap: 12px; min-height: 0; padding: 10px max(16px, env(safe-area-inset-right)) 130px 0; }
#maker .mk-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
#maker .mk-tab { width: 62px; height: 62px; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; padding: 5px; transition: transform .15s; }
#maker .mk-tab.on { background: #ffd166; transform: scale(1.1); }
#maker .mk-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 12px; overflow-y: auto; align-content: start; touch-action: pan-y; padding: 4px; }
#maker .mk-name { font: 800 30px/1.2 system-ui, -apple-system, sans-serif; padding: 14px 22px; border-radius: 20px; border: 4px solid #3a3a3a; width: min(100%, 360px); box-sizing: border-box; -webkit-user-select: text; user-select: text; }
#maker .mk-options.naming { display: flex; justify-content: center; padding-top: 18px; }
#maker .mk-options.stuffing { display: flex; gap: 28px; justify-content: center; align-items: center; padding-top: 18px; overflow: visible; }
#maker .mk-opt { aspect-ratio: 1; border-radius: 20px; border: 4px solid #3a3a3a; background: #fff; padding: 4px; }
#maker .mk-opt.swatch { border-radius: 50%; }
#maker .mk-opt.on { border-color: #ff4d6d; box-shadow: 0 0 0 5px #ffd1dc; }
#maker .mk-big { width: 120px; height: 120px; border-radius: 50%; border: 5px solid #3a3a3a; padding: 10px; box-shadow: 0 6px 0 rgba(0,0,0,.18); }
#maker .mk-done { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); width: 104px; height: 104px;
  border-radius: 50%; border: 5px solid #3a3a3a; background: #7bd36b; display: grid; place-items: center; box-shadow: 0 6px 0 rgba(0,0,0,.2); }
#maker .mk-done:active, #maker .mk-btn:active, #maker .mk-big:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,.2); }
#maker.glow { background: radial-gradient(circle at 30% 40%, #2d2766, #0d0b22 75%); }
#maker.glow .mk-opt:not(.swatch) { background: #1c1940; }
#maker.glow .mk-opt.on { border-color: #ff4fd8; box-shadow: 0 0 0 5px rgba(255,79,216,.35); }
@media (orientation: portrait) {
  #maker { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 0.95fr) minmax(0, 1fr); }
  #maker .mk-panel { padding: 0 max(16px, env(safe-area-inset-right)) 130px max(16px, env(safe-area-inset-left)); }
}
`;

const TICK = '<svg viewBox="0 0 24 24" width="60" height="60"><path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round"/></svg>';
const DICE = '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#3a3a3a" stroke-width="2"/><circle cx="8" cy="8" r="1.7" fill="#e5383b"/><circle cx="12" cy="12" r="1.7" fill="#e5383b"/><circle cx="16" cy="16" r="1.7" fill="#e5383b"/><circle cx="16" cy="8" r="1.7" fill="#e5383b"/><circle cx="8" cy="16" r="1.7" fill="#e5383b"/></svg>';

/** A canvas sized for crisp drawing at this many CSS pixels. */
function makeCanvas(css: number) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(css * dpr);
  return c;
}
/** Draw something whose natural area is `area`, fitted into a size x size square. */
function fit(c: Ctx, size: number, area: Area, draw: (c: Ctx) => void) {
  const s = Math.min(size / area.w, size / area.h);
  c.save();
  c.translate(size / 2, size / 2);
  c.scale(s, s);
  c.translate(-(area.x + area.w / 2), -(area.y + area.h / 2));
  draw(c);
  c.restore();
}
function paint(canvas: HTMLCanvasElement, draw: (c: Ctx, size: number) => void) {
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  draw(c, canvas.width);
}

// little hand-drawn tab pictures
function palette(c: Ctx, size: number, cols: string[]) {
  const r = size * 0.2;
  cols.forEach((col, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / cols.length;
    c.beginPath();
    c.arc(size / 2 + Math.cos(a) * size * 0.2, size / 2 + Math.sin(a) * size * 0.2, r, 0, Math.PI * 2);
    c.fillStyle = col;
    c.fill();
    c.lineWidth = size * 0.04;
    c.strokeStyle = '#3a3a3a';
    c.stroke();
  });
}
function fluffAndHeart(c: Ctx, size: number) {
  const s = size / 100;
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#3a3a3a';
  c.lineWidth = 4 * s;
  c.beginPath();
  for (const [x, y, r] of [[34, 58, 18], [52, 46, 20], [70, 58, 17], [52, 66, 18]]) c.moveTo(x * s + r * s, y * s), c.arc(x * s, y * s, r * s, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  const hx = 70 * s, hy = 30 * s, hs = 16 * s;
  c.moveTo(hx, hy + hs * 0.35);
  c.bezierCurveTo(hx - hs * 1.1, hy - hs * 0.3, hx - hs * 0.5, hy - hs * 1.05, hx, hy - hs * 0.45);
  c.bezierCurveTo(hx + hs * 0.5, hy - hs * 1.05, hx + hs * 1.1, hy - hs * 0.3, hx, hy + hs * 0.35);
  c.fillStyle = '#ff4d6d';
  c.fill();
  c.stroke();
}
function pedal(c: Ctx, size: number) {
  const s = size / 100;
  c.lineWidth = 5 * s;
  c.strokeStyle = '#3a3a3a';
  c.fillStyle = '#6c757d';
  c.beginPath();
  c.roundRect(20 * s, 62 * s, 60 * s, 18 * s, 6 * s);
  c.fill();
  c.stroke();
  c.fillStyle = '#e5383b';
  c.beginPath();
  c.ellipse(50 * s, 56 * s, 30 * s, 16 * s, 0, Math.PI, 0);
  c.closePath();
  c.fill();
  c.stroke();
  fluffAndHeart(c, size * 0.7);
}

/** A glow stick snapping: the crack button. */
function crack(c: Ctx, size: number) {
  const s = size / 100;
  c.save();
  c.translate(50 * s, 52 * s);
  c.rotate(-0.7);
  for (const [w, col] of [[22, '#3a3a3a'], [15, '#8cff4d']] as const) {
    c.beginPath();
    c.moveTo(-34 * s, 6 * s);
    c.lineTo(-4 * s, 0);
    c.moveTo(4 * s, 0);
    c.lineTo(34 * s, 6 * s);
    c.lineWidth = w * s;
    c.lineCap = 'round';
    c.strokeStyle = col;
    c.stroke();
  }
  c.restore();
  // the snap: a little burst
  c.strokeStyle = '#ffd43b';
  c.lineWidth = 5 * s;
  c.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45;
    c.beginPath();
    c.moveTo(50 * s + Math.cos(a) * 14 * s, 44 * s + Math.sin(a) * 14 * s);
    c.lineTo(50 * s + Math.cos(a) * 30 * s, 44 * s + Math.sin(a) * 30 * s);
    c.stroke();
  }
}

function pencil(c: Ctx, size: number) {
  const s = size / 100;
  c.save();
  c.translate(50 * s, 50 * s);
  c.rotate(-0.8);
  c.lineWidth = 5 * s;
  c.strokeStyle = '#3a3a3a';
  c.fillStyle = '#ffd43b';
  c.beginPath();
  c.rect(-12 * s, -36 * s, 24 * s, 56 * s);
  c.fill();
  c.stroke();
  c.fillStyle = '#ff8fab';
  c.beginPath();
  c.rect(-12 * s, -44 * s, 24 * s, 10 * s);
  c.fill();
  c.stroke();
  c.fillStyle = '#f3dfc1';
  c.beginPath();
  c.moveTo(-12 * s, 20 * s);
  c.lineTo(0, 40 * s);
  c.lineTo(12 * s, 20 * s);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
}

export function setupMaker(opts: { onDone: (kind: MakerMode, picture: HTMLCanvasElement, recipe: MakerRecipe) => void }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const root = document.createElement('div');
  root.id = 'maker';
  root.hidden = true;
  root.innerHTML = `
    <div class="mk-top">
      <button class="mk-btn" data-close aria-label="Close">${CROSS}</button>
      <button class="mk-btn" data-mode="bear" aria-label="Teddy"></button>
      <button class="mk-btn" data-mode="squishy" aria-label="Squishy"></button>
      <button class="mk-btn" data-mode="person" aria-label="A person"></button>
      <button class="mk-btn" data-mode="glow" aria-label="A glow stick"></button>
      <span class="gap"></span>
      <button class="mk-btn" data-dice aria-label="Surprise me">${DICE}</button>
    </div>
    <div class="mk-stage"><canvas class="mk-preview"></canvas></div>
    <div class="mk-panel"><div class="mk-tabs"></div><div class="mk-options"></div></div>
    <button class="mk-done" aria-label="Finished">${TICK}</button>`;
  document.body.append(root);
  const preview = root.querySelector<HTMLCanvasElement>('.mk-preview')!;
  const tabsEl = root.querySelector<HTMLElement>('.mk-tabs')!;
  const optionsEl = root.querySelector<HTMLElement>('.mk-options')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  for (const b of modeButtons) {
    const c = makeCanvas(56);
    b.append(c);
  }

  let mode: MakerMode = 'bear';
  let bear = newBear();
  let squishy = newSquishy();
  let person = newPerson();
  let glow = newGlow();
  let cracked = false; // a glow stick only glows once it's been cracked
  let glowShown = 0;
  let plump = 0; // how stuffed the teddy is (0..1)
  let plumpShown = 0;
  let tab = 'animal';
  let pulse = 0; // a happy wiggle when something changes
  let finishing = false;
  let finishT = 0;
  const particles: { x: number; y: number; vx: number; vy: number; life: number; kind: 'fluff' | 'heart' | 'star'; tx?: number; ty?: number }[] = [];

  const drawToy = (c: Ctx, p = 1) => (mode === 'bear' ? drawBear(c, bear, p) : mode === 'squishy' ? drawSquishy(c, squishy) : mode === 'glow' ? drawGlowing(c, glow, glowShown) : drawPerson(c, person));
  /** A glow stick: by day, with its glow on top (all of it once it's cracked). */
  function drawGlowing(c: Ctx, r: GlowRecipe, amount = 1) {
    drawGlow(c, r, 'day');
    if (amount <= 0.01) return;
    c.save();
    c.globalAlpha *= Math.min(1, amount);
    drawGlow(c, r, 'glow');
    c.restore();
  }
  const glowWith = (patch: Partial<GlowRecipe>) => ({ ...glow, ...patch });
  const glowChoice = <K extends keyof GlowRecipe>(key: K, values: readonly GlowRecipe[K][]): Choice[] =>
    values.map((v) => ({
      on: glow[key] === v,
      draw: (c, size) => fit(c, size, AREA.glow, (cc) => drawGlow(cc, glowWith({ [key]: v } as Partial<GlowRecipe>), 'glow')),
      pick: () => {
        glow = glowWith({ [key]: v } as Partial<GlowRecipe>);
        changed();
      },
    }));
  /** The second colour's swatches: all one colour, stripes of each colour, or a rainbow. */
  const stripeSwatches = (): Choice[] => {
    const main = GLOW_COLOURS[glow.colour] ?? GLOW_COLOURS[0];
    return [
      { swatch: main, on: glow.colour2 === ONE_COLOUR, pick: () => ((glow = glowWith({ colour2: ONE_COLOUR })), changed()) },
      ...GLOW_COLOURS.map((col, i) => ({
        swatch: `repeating-linear-gradient(45deg, ${main} 0 14px, ${col} 14px 28px)`,
        on: glow.colour2 === i,
        pick: () => ((glow = glowWith({ colour2: i })), changed()),
      })).filter((_, i) => i !== glow.colour),
      { swatch: `linear-gradient(90deg, ${GLOW_RAINBOW.join(', ')})`, on: glow.colour2 === RAINBOW, pick: () => ((glow = glowWith({ colour2: RAINBOW })), changed()) },
    ];
  };
  const personWith = (patch: Partial<PersonRecipe>) => ({ ...person, ...patch });
  const headArea = (): Area => {
    const b = bodyOf(person.age, person.build);
    return { x: 150 - b.headR * 1.7, y: b.headY - b.headR * 1.7, w: b.headR * 3.4, h: b.headR * 3.4 };
  };
  const bodyArea = (): Area => {
    const b = bodyOf(person.age, person.build);
    return { x: 30, y: b.shoulder - 40, w: 240, h: b.hip - b.shoulder + 90 };
  };
  const legsArea = (): Area => {
    const b = bodyOf(person.age, person.build);
    return { x: 30, y: b.hip - 30, w: 240, h: 640 - b.hip + 30 };
  };
  const personChoice = <K extends keyof PersonRecipe>(key: K, values: readonly PersonRecipe[K][], area: () => Area): Choice[] =>
    values.map((v) => ({
      on: person[key] === v,
      draw: (c, size) => fit(c, size, area(), (cc) => drawPerson(cc, personWith({ [key]: v } as Partial<PersonRecipe>))),
      pick: () => {
        person = personWith({ [key]: v } as Partial<PersonRecipe>);
        changed();
      },
    }));
  const personSwatches = (key: 'skin' | 'hairColour' | 'eyes' | 'topColour' | 'shoes' | 'bottomColour', cols: string[]): Choice[] =>
    cols.map((col, i) => ({ swatch: col, on: person[key] === i, pick: () => ((person = personWith({ [key]: i })), changed()) }));
  const bearWith = (patch: Partial<BearRecipe>) => ({ ...bear, ...patch });
  const squishyWith = (patch: Partial<SquishyRecipe>) => ({ ...squishy, ...patch });
  const bearChoice = <K extends keyof BearRecipe>(key: K, values: readonly BearRecipe[K][], area: Area | null): Choice[] =>
    values.map((v) => ({
      on: bear[key] === v,
      draw: (c, size) => fit(c, size, area ?? AREA.bear, (cc) => drawBear(cc, bearWith({ [key]: v } as Partial<BearRecipe>), Math.max(plump, 0.75))),
      pick: () => {
        bear = bearWith({ [key]: v } as Partial<BearRecipe>);
        changed();
      },
    }));
  const squishyChoice = <K extends keyof SquishyRecipe>(key: K, values: readonly SquishyRecipe[K][]): Choice[] =>
    values.map((v) => ({
      on: squishy[key] === v,
      draw: (c, size) => fit(c, size, AREA.squishy, (cc) => drawSquishy(cc, squishyWith({ [key]: v } as Partial<SquishyRecipe>))),
      pick: () => {
        squishy = squishyWith({ [key]: v } as Partial<SquishyRecipe>);
        changed();
      },
    }));

  const TABS: Record<MakerMode, Tab[]> = {
    bear: [
      { id: 'animal', icon: (c, s) => fit(c, s, HEAD, (cc) => drawBear(cc, bear, 1)), choices: () => bearChoice('animal', ANIMALS, HEAD) },
      { id: 'fur', icon: (c, s) => palette(c, s, [FURS[0], FURS[6], FURS[8]]), choices: () => FURS.map((col, i) => ({ swatch: col, on: bear.fur === i, pick: () => ((bear = bearWith({ fur: i })), changed()) })) },
      { id: 'pattern', icon: (c, s) => fit(c, s, TUMMY_AT, (cc) => drawBear(cc, bearWith({ pattern: 'spots', tummy: 'none' }), 1)), choices: () => bearChoice('pattern', PATTERNS, null) },
      { id: 'eyes', icon: (c, s) => fit(c, s, EYES_AT, (cc) => drawBear(cc, bear, 1)), choices: () => bearChoice('eyes', EYES, EYES_AT) },
      { id: 'mouth', icon: (c, s) => fit(c, s, MOUTH_AT, (cc) => drawBear(cc, bear, 1)), choices: () => bearChoice('mouth', MOUTHS, MOUTH_AT) },
      { id: 'tummy', icon: (c, s) => fit(c, s, TUMMY_AT, (cc) => drawBear(cc, bearWith({ tummy: 'heart', pattern: 'plain' }), 1)), choices: () => bearChoice('tummy', TUMMIES, TUMMY_AT) },
      { id: 'extra', icon: (c, s) => fit(c, s, HEAD, (cc) => drawBear(cc, bearWith({ extra: 'party-hat' }), 1)), choices: () => bearChoice('extra', EXTRAS, null) },
      { id: 'stuff', icon: fluffAndHeart, choices: () => [] },
    ],
    squishy: [
      { id: 'shape', icon: (c, s) => fit(c, s, AREA.squishy, (cc) => drawSquishy(cc, squishy)), choices: () => squishyChoice('shape', SHAPES) },
      { id: 'colour', icon: (c, s) => palette(c, s, [PASTELS[0], PASTELS[3], PASTELS[5]]), choices: () => PASTELS.map((col, i) => ({ swatch: col, on: squishy.colour === i, pick: () => ((squishy = squishyWith({ colour: i })), changed()) })) },
      {
        id: 'colour2',
        icon: (c, s) => palette(c, s, [PASTELS[1], PASTELS[6]]),
        choices: () => [
          { swatch: '#ffffff', on: squishy.colour2 < 0, pick: () => ((squishy = squishyWith({ colour2: -1 })), changed()) },
          ...PASTELS.map((col, i) => ({ swatch: col, on: squishy.colour2 === i, pick: () => ((squishy = squishyWith({ colour2: i })), changed()) })),
        ],
      },
      { id: 'face', icon: (c, s) => fit(c, s, { x: 160, y: 250, w: 240, h: 200 }, (cc) => drawSquishy(cc, squishyWith({ shape: 'bun', face: squishy.face === 'none' ? 'happy' : squishy.face }))), choices: () => squishyChoice('face', FACES) },
      { id: 'topping', icon: (c, s) => fit(c, s, AREA.squishy, (cc) => drawSquishy(cc, squishyWith({ shape: 'bun', topping: 'sprinkles', face: 'none' }))), choices: () => squishyChoice('topping', TOPPINGS) },
    ],
    person: [
      { id: 'age', icon: (c, s) => fit(c, s, AREA.person, (cc) => drawPerson(cc, person)), choices: () => personChoice('age', AGES, () => AREA.person) },
      { id: 'build', icon: (c, s) => fit(c, s, AREA.person, (cc) => drawPerson(cc, personWith({ build: 'big' }))), choices: () => personChoice('build', BUILDS, () => AREA.person) },
      { id: 'skin', icon: (c, s) => palette(c, s, [SKINS[0], SKINS[2], SKINS[4]]), choices: () => personSwatches('skin', SKINS) },
      { id: 'hair', icon: (c, s) => fit(c, s, headArea(), (cc) => drawPerson(cc, person)), choices: () => personChoice('hair', HAIRS, headArea) },
      { id: 'hairColour', icon: (c, s) => palette(c, s, [HAIR_COLOURS[1], HAIR_COLOURS[4], HAIR_COLOURS[6]]), choices: () => personSwatches('hairColour', HAIR_COLOURS) },
      { id: 'eyes', icon: (c, s) => palette(c, s, [EYE_COLOURS[0], EYE_COLOURS[2], EYE_COLOURS[3]]), choices: () => personSwatches('eyes', EYE_COLOURS) },
      { id: 'glasses', icon: (c, s) => fit(c, s, headArea(), (cc) => drawPerson(cc, personWith({ glasses: 'round' }))), choices: () => personChoice('glasses', GLASSES, headArea) },
      { id: 'face', icon: (c, s) => fit(c, s, headArea(), (cc) => drawPerson(cc, personWith({ face: 'freckles' }))), choices: () => personChoice('face', FACE_BITS, headArea) },
      { id: 'top', icon: (c, s) => fit(c, s, bodyArea(), (cc) => drawPerson(cc, person)), choices: () => personChoice('top', TOPS, bodyArea) },
      { id: 'topColour', icon: (c, s) => palette(c, s, [TOP_COLOURS[0], TOP_COLOURS[6], TOP_COLOURS[9]]), choices: () => personSwatches('topColour', TOP_COLOURS) },
      { id: 'bottoms', icon: (c, s) => fit(c, s, legsArea(), (cc) => drawPerson(cc, person)), choices: () => personChoice('bottoms', BOTTOMS, legsArea) },
      { id: 'bottomColour', icon: (c, s) => palette(c, s, [BOTTOM_COLOURS[0], BOTTOM_COLOURS[4], BOTTOM_COLOURS[5]]), choices: () => personSwatches('bottomColour', BOTTOM_COLOURS) },
      { id: 'shoes', icon: (c, s) => palette(c, s, [SHOES[0], SHOES[2], SHOES[4]]), choices: () => personSwatches('shoes', SHOES) },
      { id: 'neck', icon: (c, s) => fit(c, s, bodyArea(), (cc) => drawPerson(cc, personWith({ neck: 'pearls', top: 'dress' }))), choices: () => personChoice('neck', NECKS, bodyArea) },
      { id: 'wrist', icon: (c, s) => fit(c, s, bodyArea(), (cc) => drawPerson(cc, personWith({ wrist: 'watch' }))), choices: () => personChoice('wrist', WRISTS, bodyArea) },
      { id: 'extra', icon: (c, s) => fit(c, s, AREA.person, (cc) => drawPerson(cc, personWith({ extra: 'balloon' }))), choices: () => personChoice('extra', PERSON_EXTRAS, () => AREA.person) },
      { id: 'name', icon: pencil, choices: () => [] },
    ],
    glow: [
      { id: 'shape', icon: (c, s) => fit(c, s, AREA.glow, (cc) => drawGlow(cc, glow, 'glow')), choices: () => glowChoice('shape', GLOW_SHAPES) },
      { id: 'colour', icon: (c, s) => palette(c, s, [GLOW_COLOURS[0], GLOW_COLOURS[3], GLOW_COLOURS[6]]), choices: () => GLOW_COLOURS.map((col, i) => ({ swatch: col, on: glow.colour === i, pick: () => ((glow = glowWith({ colour: i, colour2: glow.colour2 === i ? ONE_COLOUR : glow.colour2 })), changed()) })) },
      { id: 'colour2', icon: (c, s) => palette(c, s, GLOW_RAINBOW.slice(0, 5)), choices: stripeSwatches },
      { id: 'charm', icon: (c, s) => fit(c, s, AREA.glow, (cc) => drawGlow(cc, { shape: 'wand', colour: 3, colour2: ONE_COLOUR, charm: 'star' }, 'glow')), choices: () => glowChoice('charm', GLOW_CHARMS) },
      { id: 'crack', icon: crack, choices: () => [] },
    ],
  };

  // --- drawing the page ---
  function renderTabs() {
    tabsEl.replaceChildren(
      ...TABS[mode].map((t) => {
        const b = document.createElement('button');
        b.className = t.id === tab ? 'mk-tab on' : 'mk-tab';
        const c = makeCanvas(52);
        paint(c, t.icon);
        b.append(c);
        b.addEventListener('click', () => {
          if (tab === t.id) return;
          tab = t.id;
          sfx.click();
          renderTabs();
          renderOptions();
        });
        return b;
      }),
    );
    for (const b of modeButtons) {
      b.classList.toggle('on', b.dataset.mode === mode);
      const c = b.querySelector('canvas')!;
      paint(c, (cc, s) =>
        b.dataset.mode === 'bear'
          ? fit(cc, s, HEAD, (x) => drawBear(x, bear, 1))
          : b.dataset.mode === 'squishy'
            ? fit(cc, s, AREA.squishy, (x) => drawSquishy(x, squishy))
            : b.dataset.mode === 'glow'
              ? fit(cc, s, AREA.glow, (x) => drawGlowing(x, glow, 1))
              : fit(cc, s, headArea(), (x) => drawPerson(x, person)),
      );
    }
  }
  function renderOptions() {
    optionsEl.classList.toggle('stuffing', tab === 'stuff' || tab === 'crack');
    optionsEl.classList.toggle('naming', tab === 'name');
    if (tab === 'name') {
      // a name, typed on the iPad (shown when they're tapped)
      const input = document.createElement('input');
      input.className = 'mk-name';
      input.maxLength = 20;
      input.autocomplete = 'off';
      input.value = person.name;
      input.addEventListener('input', () => (person = personWith({ name: input.value.slice(0, 20) })));
      optionsEl.replaceChildren(input);
      return;
    }
    if (tab === 'crack') {
      // crack the glow stick (again and again: it flashes each time)
      const crackBtn = document.createElement('button');
      crackBtn.className = 'mk-big';
      crackBtn.style.background = cracked ? '#2d2766' : '#fff';
      const cc = makeCanvas(96);
      paint(cc, crack);
      crackBtn.append(cc);
      crackBtn.addEventListener('click', () => {
        snap();
        crackBtn.style.background = '#2d2766';
      });
      optionsEl.replaceChildren(crackBtn);
      return;
    }
    if (tab === 'stuff') {
      // the stuffing pedal and the heart
      const pedalBtn = document.createElement('button');
      pedalBtn.className = 'mk-big';
      pedalBtn.style.background = '#fff';
      const pc = makeCanvas(96);
      paint(pc, pedal);
      pedalBtn.append(pc);
      pedalBtn.addEventListener('click', stuff);
      const heartBtn = document.createElement('button');
      heartBtn.className = 'mk-big';
      heartBtn.style.background = bear.heart ? '#ffd1dc' : '#fff';
      const hc = makeCanvas(96);
      paint(hc, (c, s) => {
        // one big heart, to put inside the teddy
        const x = s / 2, y = s * 0.5, hs = s * 0.36;
        c.beginPath();
        c.moveTo(x, y + hs * 0.55);
        c.bezierCurveTo(x - hs * 1.1, y - hs * 0.1, x - hs * 0.5, y - hs * 0.85, x, y - hs * 0.25);
        c.bezierCurveTo(x + hs * 0.5, y - hs * 0.85, x + hs * 1.1, y - hs * 0.1, x, y + hs * 0.55);
        c.fillStyle = '#ff4d6d';
        c.fill();
        c.lineWidth = s * 0.05;
        c.strokeStyle = '#3a3a3a';
        c.stroke();
      });
      heartBtn.append(hc);
      heartBtn.addEventListener('click', addHeart);
      optionsEl.replaceChildren(pedalBtn, heartBtn);
      return;
    }
    const t = TABS[mode].find((x) => x.id === tab) ?? TABS[mode][0];
    optionsEl.replaceChildren(
      ...t.choices().map((ch) => {
        const b = document.createElement('button');
        b.className = `mk-opt${ch.swatch ? ' swatch' : ''}${ch.on ? ' on' : ''}`;
        if (ch.swatch) b.style.background = ch.swatch;
        else {
          const c = makeCanvas(84);
          paint(c, ch.draw!);
          b.append(c);
        }
        b.addEventListener('click', () => {
          ch.pick();
          if (mode === 'glow') sfx.tinkle();
          else (mode === 'squishy' ? sfx.squish : sfx.pop)(1.2);
        });
        return b;
      }),
    );
  }
  function changed() {
    pulse = 1;
    renderTabs();
    renderOptions();
  }

  // --- stuffing ---
  function stageBox() {
    const r = preview.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }
  function stuff() {
    if (mode !== 'bear') return;
    sfx.whoosh();
    setTimeout(() => sfx.puff(1.2), 200);
    const { w, h } = stageBox();
    for (let i = 0; i < 14; i++) {
      particles.push({ x: -20, y: h * (0.5 + Math.random() * 0.4), vx: 0, vy: 0, life: 0, kind: 'fluff', tx: w * 0.5 + (Math.random() - 0.5) * w * 0.2, ty: h * 0.62 + (Math.random() - 0.5) * h * 0.15 });
    }
    plump = Math.min(1, plump + 0.25);
    pulse = 1;
  }
  function addHeart() {
    if (mode !== 'bear') return;
    sfx.twinkle();
    const { w, h } = stageBox();
    particles.push({ x: w * 0.9, y: h * 0.1, vx: 0, vy: 0, life: 0, kind: 'heart', tx: w * 0.56, ty: h * 0.58 });
    setTimeout(() => {
      bear = bearWith({ heart: true });
      pulse = 1;
      renderOptions();
    }, 700);
  }

  /** Crack the glow stick: snap! and it lights up (with a flash of stars). */
  function snap() {
    if (mode !== 'glow') return;
    sfx.crack();
    cracked = true;
    glowShown = Math.max(glowShown, 0.6);
    pulse = 1;
    const { w, h } = stageBox();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      particles.push({ x: w / 2, y: h * 0.5, vx: Math.cos(a) * 0.3, vy: Math.sin(a) * 0.3 - 0.1, life: 0, kind: 'star' });
    }
  }

  // --- the preview, animated ---
  let raf = 0;
  let last = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, now - (last || now));
    last = now;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = stageBox();
    if (preview.width !== Math.round(w * dpr) || preview.height !== Math.round(h * dpr)) {
      preview.width = Math.round(w * dpr);
      preview.height = Math.round(h * dpr);
    }
    const c = preview.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    pulse = Math.max(0, pulse - dt / 500);
    plumpShown += (plump - plumpShown) * Math.min(1, dt / 200);
    // a cracked glow stick glows (and gently pulses); before that, only a little
    glowShown += ((cracked ? 0.85 + Math.sin(now * 0.004) * 0.15 : 0.2) - glowShown) * Math.min(1, dt / 300);
    // a soft spotlight (a dim purple one for glow sticks)
    const g = c.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, Math.min(w, h) * 0.55);
    g.addColorStop(0, mode === 'glow' ? 'rgba(120,90,255,0.35)' : 'rgba(255,255,255,0.9)');
    g.addColorStop(1, mode === 'glow' ? 'rgba(120,90,255,0)' : 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // the toy, with a wiggle when it changes (and a spin into its box when finished)
    const area = AREA[mode];
    const s = Math.min((w * 0.92) / area.w, (h * 0.92) / area.h);
    const wig = Math.sin(pulse * Math.PI * 3) * pulse;
    c.save();
    c.translate(w / 2, h / 2 + (area.h * s) / 2);
    let fs = 1, rot = 0;
    if (finishing) {
      finishT += dt / 900;
      fs = Math.max(0.01, 1 - finishT * finishT);
      rot = finishT * Math.PI * 2;
    }
    c.rotate(rot);
    c.scale(s * fs * (1 + 0.06 * wig), s * fs * (1 - 0.06 * wig));
    c.translate(-(area.x + area.w / 2), -(area.y + area.h));
    drawToy(c, mode === 'bear' ? 0.35 + 0.65 * plumpShown : 1);
    c.restore();
    // fluff, hearts and stars flying about
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt / 700;
      if (p.tx !== undefined && p.ty !== undefined) {
        p.x += (p.tx - p.x) * Math.min(1, dt / 160);
        p.y += (p.ty - p.y) * Math.min(1, dt / 160) - Math.sin(p.life * Math.PI) * 3;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.0008 * dt;
      }
      c.globalAlpha = Math.max(0, 1 - p.life * p.life);
      c.beginPath();
      if (p.kind === 'fluff') {
        c.arc(p.x, p.y, 12, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = '#ddd';
        c.stroke();
      } else if (p.kind === 'heart') {
        const hs = 30;
        c.moveTo(p.x, p.y + hs * 0.35);
        c.bezierCurveTo(p.x - hs * 1.1, p.y - hs * 0.3, p.x - hs * 0.5, p.y - hs * 1.05, p.x, p.y - hs * 0.45);
        c.bezierCurveTo(p.x + hs * 0.5, p.y - hs * 1.05, p.x + hs * 1.1, p.y - hs * 0.3, p.x, p.y + hs * 0.35);
        c.fillStyle = '#ff4d6d';
        c.fill();
      } else {
        c.arc(p.x, p.y, 6, 0, Math.PI * 2);
        c.fillStyle = ['#ffd43b', '#ff8fab', '#4dabf7', '#69db7c'][i % 4];
        c.fill();
      }
      c.globalAlpha = 1;
      if (p.life >= 1) particles.splice(i, 1);
    }
  }

  // --- buttons ---
  function setMode(m: MakerMode) {
    mode = m;
    root.classList.toggle('glow', m === 'glow');
    tab = TABS[m][0].id;
    pulse = 1;
    renderTabs();
    renderOptions();
  }
  for (const b of modeButtons) {
    b.addEventListener('click', () => {
      if (b.dataset.mode === mode) return;
      sfx.pop(1.1);
      setMode(b.dataset.mode as MakerMode);
    });
  }
  root.querySelector('[data-dice]')!.addEventListener('click', () => {
    sfx.boing(1.2);
    if (mode === 'bear') bear = { ...randomBear(), heart: bear.heart };
    else if (mode === 'squishy') squishy = randomSquishy();
    else if (mode === 'glow') glow = randomGlow();
    else person = { ...randomPerson(), name: person.name };
    changed();
  });
  root.querySelector('[data-close]')!.addEventListener('click', () => {
    sfx.shelfClose();
    close();
  });
  root.querySelector('.mk-done')!.addEventListener('click', () => {
    if (finishing) return;
    // not stuffed yet? stuff it all the way first (and a heart, of course)
    let wait = mode === 'bear' && plump < 1 ? 900 : 0;
    if (wait) {
      while (plump < 1) stuff();
      if (!bear.heart) addHeart();
    }
    // a glow stick that hasn't been cracked yet: crack it first, so it glows
    if (mode === 'glow' && !cracked) {
      snap();
      wait = 700;
    }
    setTimeout(() => {
      finishing = true;
      finishT = 0;
      sfx.tada();
      const { w, h } = stageBox();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        particles.push({ x: w / 2, y: h * 0.55, vx: Math.cos(a) * 0.35, vy: Math.sin(a) * 0.35 - 0.2, life: 0, kind: 'star' });
      }
      setTimeout(() => {
        const kind = mode;
        const recipe: MakerRecipe = mode === 'bear' ? { ...bear, heart: true } : mode === 'squishy' ? { ...squishy } : mode === 'glow' ? { ...glow } : { ...person, name: person.name.trim() };
        const picture =
          kind === 'person' ? renderPerson(recipe as PersonRecipe)
          : kind === 'glow' ? renderGlow(recipe as GlowRecipe).picture
          : renderToy(kind, recipe as BearRecipe | SquishyRecipe);
        close();
        opts.onDone(kind, picture, recipe);
      }, 950);
    }, wait + (mode === 'bear' && !bear.heart ? 700 : 0));
  });

  function close() {
    root.hidden = true;
    cancelAnimationFrame(raf);
    finishing = false;
  }

  return {
    get isOpen() {
      return !root.hidden;
    },
    /** Open the maker (a fresh teddy or squishy each time). */
    open(m: MakerMode) {
      if (!root.hidden) return;
      bear = newBear();
      squishy = newSquishy();
      person = newPerson();
      glow = newGlow();
      cracked = false;
      glowShown = 0;
      plump = plumpShown = 0;
      particles.length = 0;
      finishing = false;
      root.hidden = false;
      sfx.shelfOpen();
      setMode(m);
      last = 0;
      raf = requestAnimationFrame(frame);
    },
  };
}
