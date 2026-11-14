import { sfx } from '../sound';
import { CANVAS, CROP, drawFull, garmentPicture, loadLayers, type DressRecipe, type Layers } from './dress';
import { plan } from './figure';
import { GARMENTS, garment, SLOTS, type Outfit, type Slot } from './garments';

/**
 * The dress-up screen (opened from the wardrobe): a full-screen page of
 * pictures, no words. Pick someone at the top, then tap clothes: tops,
 * bottoms, shoes, costumes, scarves. The dice picks a surprise outfit, the
 * curly arrow puts their usual clothes back, the green tick keeps it.
 */
export interface Dressable {
  id: string;
  name: string;
  dress: DressRecipe;
}

const CSS = `
#dressup { position: fixed; inset: 0; z-index: 30; display: grid; grid-template-columns: 1fr 1.1fr; grid-template-rows: auto minmax(0, 1fr);
  background: radial-gradient(circle at 30% 40%, #fff8ee, #d9ecff 75%); touch-action: none; -webkit-user-select: none; user-select: none; }
#dressup[hidden] { display: none; }
#dressup button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
#dressup .du-top { grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left)); }
#dressup .du-people { display: flex; gap: 8px; overflow-x: auto; touch-action: pan-x; padding: 4px; }
#dressup .gap { flex: 1; }
#dressup .du-btn, #dressup .du-person { width: 68px; height: 68px; flex: none; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; display: grid; place-items: center; padding: 4px; box-shadow: 0 5px 0 rgba(0,0,0,.15); }
#dressup .du-person.on { background: #ffd166; transform: scale(1.08); }
#dressup .du-btn canvas, #dressup .du-person canvas, #dressup .du-tab canvas, #dressup .du-opt canvas { max-width: 100%; max-height: 100%; display: block; pointer-events: none; }
#dressup .du-stage { position: relative; min-height: 0; }
#dressup .du-preview { position: absolute; inset: 0; width: 100%; height: 100%; }
#dressup .du-panel { display: flex; flex-direction: column; gap: 12px; min-height: 0; padding: 10px max(16px, env(safe-area-inset-right)) 130px 0; }
#dressup .du-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
#dressup .du-tab { width: 60px; height: 60px; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; padding: 9px; display: grid; place-items: center; transition: transform .15s; }
#dressup .du-tab.on { background: #ffd166; transform: scale(1.1); }
#dressup .du-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 12px; overflow-y: auto; align-content: start; touch-action: pan-y; padding: 4px; }
#dressup .du-opt { aspect-ratio: 1; border-radius: 20px; border: 4px solid #3a3a3a; background: #fff; padding: 8px; display: grid; place-items: center; }
#dressup .du-opt.on { border-color: #ff4d6d; box-shadow: 0 0 0 5px #ffd1dc; }
#dressup .du-done { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); width: 104px; height: 104px;
  border-radius: 50%; border: 5px solid #3a3a3a; background: #7bd36b; display: grid; place-items: center; box-shadow: 0 6px 0 rgba(0,0,0,.2); }
#dressup .du-done:active, #dressup .du-btn:active, #dressup .du-person:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,.2); }
@media (orientation: portrait) {
  #dressup { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr) minmax(0, 0.9fr); }
  #dressup .du-panel { padding: 0 max(16px, env(safe-area-inset-right)) 130px max(16px, env(safe-area-inset-left)); }
}
`;
const TICK = '<svg viewBox="0 0 24 24" width="60" height="60"><path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round"/></svg>';
const DICE = '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#3a3a3a" stroke-width="2"/><circle cx="8" cy="8" r="1.7" fill="#e5383b"/><circle cx="12" cy="12" r="1.7" fill="#e5383b"/><circle cx="16" cy="16" r="1.7" fill="#e5383b"/><circle cx="16" cy="8" r="1.7" fill="#e5383b"/><circle cx="8" cy="16" r="1.7" fill="#e5383b"/></svg>';
/** Back to their usual clothes: a curly arrow round a heart. */
const USUAL = '<svg viewBox="0 0 24 24" width="42" height="42"><path d="M18.5 8.5 A7.5 7.5 0 1 0 19.5 13" fill="none" stroke="#3a3a3a" stroke-width="2.6" stroke-linecap="round"/><path d="M19.5 3.5 L18.8 8.8 L13.6 8" fill="none" stroke="#3a3a3a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16 C8 13 8.5 10.2 10.4 10 C11.3 9.9 11.8 10.5 12 11 C12.2 10.5 12.7 9.9 13.6 10 C15.5 10.2 16 13 12 16 Z" fill="#ff4d6d" stroke="#3a3a3a" stroke-width="1.2"/></svg>';
/** An empty hanger: no costume, or no scarf. */
function hanger(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!, s = size / 100;
  x.lineWidth = 6 * s;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = '#3a3a3a';
  x.beginPath();
  x.moveTo(50 * s, 38 * s);
  x.quadraticCurveTo(50 * s, 22 * s, 60 * s, 24 * s);
  x.quadraticCurveTo(68 * s, 28 * s, 62 * s, 36 * s);
  x.moveTo(50 * s, 38 * s);
  x.lineTo(14 * s, 64 * s);
  x.lineTo(86 * s, 64 * s);
  x.closePath();
  x.stroke();
  return c;
}

/** Fit a picture into a square canvas. */
function fitted(src: HTMLCanvasElement, size: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const s = Math.min(c.width / src.width, c.height / src.height);
  c.getContext('2d')!.drawImage(src, (c.width - src.width * s) / 2, (c.height - src.height * s) / 2, src.width * s, src.height * s);
  return c;
}

export function setupDressup(opts: { people: () => Dressable[]; onDone: (id: string, outfit: Outfit) => void }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const root = document.createElement('div');
  root.id = 'dressup';
  root.hidden = true;
  root.innerHTML = `
    <div class="du-top">
      <button class="du-btn" data-close aria-label="Close">${CROSS}</button>
      <div class="du-people"></div>
      <span class="gap"></span>
      <button class="du-btn" data-usual aria-label="Usual clothes">${USUAL}</button>
      <button class="du-btn" data-dice aria-label="Surprise outfit">${DICE}</button>
    </div>
    <div class="du-stage"><canvas class="du-preview"></canvas></div>
    <div class="du-panel"><div class="du-tabs"></div><div class="du-options"></div></div>
    <button class="du-done" aria-label="Keep it">${TICK}</button>`;
  document.body.append(root);
  const preview = root.querySelector<HTMLCanvasElement>('.du-preview')!;
  const peopleEl = root.querySelector<HTMLElement>('.du-people')!;
  const tabsEl = root.querySelector<HTMLElement>('.du-tabs')!;
  const optionsEl = root.querySelector<HTMLElement>('.du-options')!;

  let people: Dressable[] = [];
  let who: Dressable | null = null;
  /** Who was dressed last (the wardrobe opens with them again). */
  let lastId: string | undefined;
  let layers: Layers | null = null;
  let outfit: Outfit = { top: '', bottom: '', shoes: '' };
  let tab: Slot = 'top';
  let picture: HTMLCanvasElement | null = null;
  let twirl = 0;
  const sparkles: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];

  const redraw = () => {
    if (who && layers) picture = drawFull(who.dress, outfit, layers);
  };
  const changed = () => {
    redraw();
    twirl = 1;
    const r = preview.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      sparkles.push({ x: r.width / 2, y: r.height * 0.5, vx: Math.cos(a) * 0.32, vy: Math.sin(a) * 0.32 - 0.1, life: 0, col: ['#ffd43b', '#ff8fab', '#4dabf7', '#69db7c'][i % 4] });
    }
    renderOptions();
  };

  async function choose(p: Dressable) {
    who = p;
    lastId = p.id;
    outfit = { ...p.dress.outfit };
    layers = await loadLayers(p.dress);
    redraw();
    twirl = 1;
    renderPeople();
    renderTabs();
    renderOptions();
  }

  function renderPeople() {
    peopleEl.replaceChildren(
      ...people.map((p) => {
        const b = document.createElement('button');
        b.className = p === who ? 'du-person on' : 'du-person';
        b.setAttribute('aria-label', p.name || 'Someone');
        // their face: the top of their picture
        void loadLayers(p.dress).then((l) => {
          const P = plan(p.dress.plan);
          const full = drawFull(p.dress, p === who ? outfit : p.dress.outfit, l);
          const y0 = P.top + CANVAS.top - 40, h = P.chin - P.top + 70;
          const face = document.createElement('canvas');
          face.width = face.height = h;
          face.getContext('2d')!.drawImage(full, 210 - h / 2, y0, h, h, 0, 0, h, h);
          b.replaceChildren(fitted(face, 56));
        });
        b.addEventListener('click', () => {
          if (p === who) return;
          sfx.pop(1.1);
          void choose(p);
        });
        return b;
      }),
    );
  }
  function renderTabs() {
    const kind = who?.dress.plan ?? 'child';
    const ICON: Record<Slot, string> = { top: 'tee-red', bottom: 'jeans', dress: 'party-dress', shoes: 'trainers-rainbow', costume: 'unicorn-onesie', hat: 'crown', neck: 'scarf-red', face: 'heart-shades', back: 'fairy-wings' };
    tabsEl.replaceChildren(
      ...SLOTS.map((s) => {
        const b = document.createElement('button');
        b.className = s === tab ? 'du-tab on' : 'du-tab';
        b.append(fitted(garmentPicture(garment(ICON[s])!, kind), 40));
        b.addEventListener('click', () => {
          if (tab === s) return;
          tab = s;
          sfx.click();
          renderTabs();
          renderOptions();
        });
        return b;
      }),
    );
  }
  function renderOptions() {
    if (!who) return optionsEl.replaceChildren();
    const kind = who.dress.plan;
    const list = GARMENTS.filter((g) => g.slot === tab);
    const tiles: HTMLButtonElement[] = [];
    const current = outfit[tab];
    const covered = (tab === 'top' || tab === 'bottom') && (!!garment(outfit.costume)?.full || !!outfit.dress);
    if (tab !== 'top' && tab !== 'bottom' && tab !== 'shoes') {
      const b = document.createElement('button');
      b.className = !current ? 'du-opt on' : 'du-opt';
      b.append(hanger(80));
      b.addEventListener('click', () => {
        sfx.pop(1.2);
        const slot = tab as Exclude<Slot, 'top' | 'bottom' | 'shoes'>;
        outfit[slot] = undefined;
        changed();
      });
      tiles.push(b);
    }
    for (const g of list) {
      const b = document.createElement('button');
      const on = current === g.id && !covered;
      b.className = on ? 'du-opt on' : 'du-opt';
      b.append(fitted(garmentPicture(g, kind), 78));
      b.addEventListener('click', () => {
        sfx.pop(1.2);
        outfit[tab] = g.id;
        // a top or bottoms instead of a dress or a whole-outfit costume; a dress instead of a whole costume
        if (tab === 'top' || tab === 'bottom') {
          outfit.dress = undefined;
          if (garment(outfit.costume)?.full) outfit.costume = undefined;
        }
        if (tab === 'dress' && garment(outfit.costume)?.full) outfit.costume = undefined;
        changed();
      });
      tiles.push(b);
    }
    optionsEl.replaceChildren(...tiles);
  }

  // --- the preview: they sway a little, and twirl when they change ---
  let raf = 0, last = 0, time = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, now - (last || now));
    last = now;
    time += dt;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = preview.getBoundingClientRect();
    if (preview.width !== Math.round(r.width * dpr) || preview.height !== Math.round(r.height * dpr)) {
      preview.width = Math.round(r.width * dpr);
      preview.height = Math.round(r.height * dpr);
    }
    const c = preview.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, r.width, r.height);
    twirl = Math.max(0, twirl - dt / 700);
    // a soft spotlight
    const g = c.createRadialGradient(r.width / 2, r.height * 0.6, 10, r.width / 2, r.height * 0.6, Math.min(r.width, r.height) * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, r.width, r.height);
    if (picture) {
      const s = Math.min((r.width * 0.9) / CROP.w, (r.height * 0.94) / CROP.h);
      const sway = Math.sin(time * 0.002) * 0.015;
      const spin = Math.cos(twirl * Math.PI * 2); // squash through to the back and round again
      c.save();
      c.translate(r.width / 2, r.height * 0.97);
      c.rotate(sway);
      c.scale(s * (twirl > 0 ? spin : 1), s);
      c.drawImage(picture, CROP.x, CROP.y, CROP.w, CROP.h, -CROP.w / 2, -CROP.h, CROP.w, CROP.h);
      c.restore();
    }
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.life += dt / 700;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0006 * dt;
      c.globalAlpha = Math.max(0, 1 - p.life);
      c.beginPath();
      c.arc(p.x, p.y, 6, 0, Math.PI * 2);
      c.fillStyle = p.col;
      c.fill();
      c.globalAlpha = 1;
      if (p.life >= 1) sparkles.splice(i, 1);
    }
  }

  root.querySelector('[data-close]')!.addEventListener('click', () => {
    sfx.shelfClose();
    close();
  });
  root.querySelector('[data-usual]')!.addEventListener('click', () => {
    if (!who) return;
    sfx.twinkle();
    outfit = { ...who.dress.usual };
    changed();
  });
  root.querySelector('[data-dice]')!.addEventListener('click', () => {
    if (!who) return;
    sfx.boing(1.2);
    const any = (slot: Slot) => {
      const list = GARMENTS.filter((g) => g.slot === slot);
      return list[Math.floor(Math.random() * list.length)].id;
    };
    const maybe = (slot: Slot, chance: number) => (Math.random() < chance ? any(slot) : undefined);
    outfit = {
      top: any('top'),
      bottom: any('bottom'),
      shoes: any('shoes'),
      dress: maybe('dress', 0.3),
      costume: maybe('costume', 0.15),
      hat: maybe('hat', 0.4),
      neck: maybe('neck', 0.25),
      face: maybe('face', 0.2),
      back: maybe('back', 0.2),
    };
    changed();
  });
  root.querySelector('.du-done')!.addEventListener('click', () => {
    if (!who) return close();
    sfx.tada();
    const id = who.id, o = { ...outfit };
    close();
    opts.onDone(id, o);
  });

  function close() {
    root.hidden = true;
    cancelAnimationFrame(raf);
  }

  return {
    get isOpen() {
      return !root.hidden;
    },
    /** Open it (with this person, or the first one). False if there's nobody to dress. */
    open(id?: string): boolean {
      people = opts.people();
      if (!people.length) return false;
      if (root.hidden) {
        root.hidden = false;
        sfx.shelfOpen();
        last = 0;
        raf = requestAnimationFrame(frame);
      }
      tab = 'top';
      void choose(people.find((p) => p.id === (id ?? lastId)) ?? people[0]);
      return true;
    },
  };
}
