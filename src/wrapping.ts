import { BOWS, bowSwatch, DONE, drawGift, giftGeom, PAPERS, paperSwatch, randomWrap, RIBBONS, ribbonSwatch, tabIcon, type WrapRecipe, type WrapStage } from './giftArt';
import { sfx } from './sound';
import { ease } from './tween';

/**
 * The wrapping screen (the Christmas wrapping shop): a full-screen page of
 * pictures, no words. The thing sits in an open box; tap a paper and the
 * lid goes on and the paper wraps round it. Then pick a ribbon, a bow and
 * who it's for (the tag). The dice wraps it a surprise way, the cross takes
 * it back out, the green tick sends it off to the Christmas tree.
 */
const CSS = `
#wrapping { position: fixed; inset: 0; z-index: 30; display: grid; grid-template-columns: 1fr 1.1fr; grid-template-rows: auto minmax(0, 1fr);
  background: radial-gradient(circle at 30% 45%, #fffaf0, #ffd8d8 55%, #c3e6cb 100%); touch-action: none; -webkit-user-select: none; user-select: none; }
#wrapping[hidden] { display: none; }
#wrapping button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
#wrapping .wr-top { grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left)); }
#wrapping .gap { flex: 1; }
#wrapping .wr-btn { width: 68px; height: 68px; flex: none; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; display: grid; place-items: center; padding: 4px; box-shadow: 0 5px 0 rgba(0,0,0,.15); }
#wrapping canvas { max-width: 100%; max-height: 100%; display: block; pointer-events: none; }
#wrapping .wr-stage { position: relative; min-height: 0; }
#wrapping .wr-preview { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; }
#wrapping .wr-panel { display: flex; flex-direction: column; gap: 12px; min-height: 0; padding: 10px max(16px, env(safe-area-inset-right)) 130px 0; }
#wrapping .wr-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
#wrapping .wr-tab { width: 64px; height: 64px; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; padding: 6px; display: grid; place-items: center; transition: transform .15s; }
#wrapping .wr-tab.on { background: #ffd166; transform: scale(1.1); }
#wrapping .wr-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 12px; overflow-y: auto; align-content: start; touch-action: pan-y; padding: 4px; }
#wrapping .wr-opt { aspect-ratio: 1; border-radius: 20px; border: 4px solid #3a3a3a; background: #fff; padding: 6px; display: grid; place-items: center; }
#wrapping .wr-opt.on { border-color: #ff4d6d; box-shadow: 0 0 0 5px #ffd1dc; }
#wrapping .wr-done { position: absolute; right: max(24px, env(safe-area-inset-right)); bottom: max(24px, env(safe-area-inset-bottom)); width: 104px; height: 104px;
  border-radius: 50%; border: 5px solid #3a3a3a; background: #7bd36b; display: grid; place-items: center; box-shadow: 0 6px 0 rgba(0,0,0,.2); }
#wrapping .wr-done:active, #wrapping .wr-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,.2); }
@media (orientation: portrait) {
  #wrapping { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr) minmax(0, 0.9fr); }
  #wrapping .wr-panel { padding: 0 max(16px, env(safe-area-inset-right)) 130px max(16px, env(safe-area-inset-left)); }
}
`;
const TICK = '<svg viewBox="0 0 24 24" width="60" height="60"><path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round"/></svg>';
const DICE = '<svg viewBox="0 0 24 24" width="40" height="40"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#3a3a3a" stroke-width="2"/><circle cx="8" cy="8" r="1.7" fill="#e5383b"/><circle cx="12" cy="12" r="1.7" fill="#e5383b"/><circle cx="16" cy="16" r="1.7" fill="#e5383b"/><circle cx="16" cy="8" r="1.7" fill="#e5383b"/><circle cx="8" cy="16" r="1.7" fill="#e5383b"/></svg>';

type Tab = 'paper' | 'ribbon' | 'bow' | 'tag';
const TABS: Tab[] = ['paper', 'ribbon', 'bow', 'tag'];

export interface WrapRequest {
  /** The thing being wrapped. */
  picture: HTMLCanvasElement;
  /** Who's playing (the tag starts with them on it). */
  me: string;
  /** Everyone it could be for, with their pictures (the players' stuffies). */
  faces: Record<string, HTMLCanvasElement>;
}

function fitted(src: HTMLCanvasElement, size: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const s = Math.min(c.width / src.width, c.height / src.height);
  c.getContext('2d')!.drawImage(src, (c.width - src.width * s) / 2, (c.height - src.height * s) / 2, src.width * s, src.height * s);
  return c;
}

export function setupWrapping() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const root = document.createElement('div');
  root.id = 'wrapping';
  root.hidden = true;
  root.innerHTML = `
    <div class="wr-top">
      <button class="wr-btn" data-close aria-label="Take it out">${CROSS}</button>
      <span class="gap"></span>
      <button class="wr-btn" data-dice aria-label="Surprise wrapping">${DICE}</button>
    </div>
    <div class="wr-stage"><canvas class="wr-preview"></canvas></div>
    <div class="wr-panel"><div class="wr-tabs"></div><div class="wr-options"></div></div>
    <button class="wr-done" aria-label="Wrap it">${TICK}</button>`;
  document.body.append(root);
  const preview = root.querySelector<HTMLCanvasElement>('.wr-preview')!;
  const tabsEl = root.querySelector<HTMLElement>('.wr-tabs')!;
  const optionsEl = root.querySelector<HTMLElement>('.wr-options')!;

  let req: WrapRequest | null = null;
  let recipe: WrapRecipe = randomWrap(1);
  /** Wrapped yet? (The first paper puts the lid on and wraps it.) */
  let wrapped = false;
  /** The wrapping, as it happens: 0 = in the open box, 1 = all wrapped. */
  let wrapT = 0;
  let wrapping = false;
  let tab: Tab = 'paper';
  let bounce = 0;
  let onClose: ((r: WrapRecipe | null) => void) | undefined;
  let sending = false;
  const sparkles: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = [];

  /** The wrapping, step by step, from how far along it is. */
  const stage = (): WrapStage => {
    if (!wrapped) return { lid: 0, paper: 0, ribbon: 0, bow: 0, tag: 0 };
    if (wrapT >= 1) return DONE;
    const part = (a: number, b: number) => Math.max(0, Math.min(1, (wrapT - a) / (b - a)));
    return { lid: ease.inOutSine(part(0, 0.28)), paper: part(0.3, 0.6), ribbon: part(0.6, 0.78), bow: part(0.78, 1), tag: part(0.85, 1) };
  };

  function sparkle() {
    const r = preview.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      // from the middle of the present (it stands at the bottom of the stage)
      sparkles.push({ x: r.width / 2, y: r.height * 0.7, vx: Math.cos(a) * 0.34, vy: Math.sin(a) * 0.34 - 0.1, life: 0, col: ['#ffd43b', '#ff8fab', '#4dabf7', '#69db7c'][i % 4] });
    }
  }

  /** Put the lid on and wrap it (the first time anything's picked). */
  function wrapUp(then?: () => void) {
    if (wrapped) return then?.();
    wrapped = true;
    wrapping = true;
    wrapT = 0;
    sfx.drawer();
    setTimeout(() => sfx.zip(), 300);
    setTimeout(() => sfx.pop(1.3), 760);
    const t0 = performance.now();
    const step = () => {
      wrapT = Math.min(1, (performance.now() - t0) / 1300);
      if (wrapT < 1) return void requestAnimationFrame(step);
      wrapping = false;
      sparkle();
      sfx.twinkle();
      renderTabs();
      renderOptions();
      then?.();
    };
    requestAnimationFrame(step);
  }

  function changed() {
    bounce = 1;
    sparkle();
    renderTabs();
    renderOptions();
  }

  function renderTabs() {
    const face = req?.faces[recipe.for ?? ''];
    tabsEl.replaceChildren(
      ...TABS.map((t) => {
        const b = document.createElement('button');
        b.className = t === tab ? 'wr-tab on' : 'wr-tab';
        b.append(fitted(tabIcon(t, recipe, face), 46));
        b.addEventListener('click', () => {
          if (tab === t) return;
          tab = t;
          sfx.click();
          renderTabs();
          renderOptions();
        });
        return b;
      }),
    );
  }

  function option(pic: HTMLCanvasElement, on: boolean, choose: () => void) {
    const b = document.createElement('button');
    b.className = on ? 'wr-opt on' : 'wr-opt';
    b.append(fitted(pic, 80));
    b.addEventListener('click', () => {
      if (wrapping) return;
      sfx.pop(1.2);
      choose();
      if (!wrapped) wrapUp();
      else changed();
    });
    return b;
  }

  function renderOptions() {
    const tiles: HTMLButtonElement[] = [];
    const on = (yes: boolean) => wrapped && yes;
    if (tab === 'paper') for (const p of PAPERS) tiles.push(option(paperSwatch(p.id), on(recipe.paper === p.id), () => (recipe.paper = p.id)));
    if (tab === 'ribbon') for (const r of RIBBONS) tiles.push(option(ribbonSwatch(r.id), on(recipe.ribbon === r.id), () => (recipe.ribbon = r.id)));
    if (tab === 'bow') for (const b of BOWS) tiles.push(option(bowSwatch(b, recipe.ribbon), on(recipe.bow === b), () => (recipe.bow = b)));
    if (tab === 'tag') {
      for (const [who, face] of Object.entries(req?.faces ?? {})) {
        tiles.push(option(face, on(recipe.for === who), () => {
          recipe.for = who;
          sfx.giggle(1.4);
        }));
      }
    }
    optionsEl.replaceChildren(...tiles);
  }

  // --- the preview: the present, bobbing a little, bouncing when it changes ---
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
    bounce = Math.max(0, bounce - dt / 600);
    // a soft spotlight and a table to stand on
    const g = c.createRadialGradient(r.width / 2, r.height * 0.6, 10, r.width / 2, r.height * 0.6, Math.min(r.width, r.height) * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, r.width, r.height);
    if (req) {
      const geom = giftGeom(recipe.shape);
      // room above for the thing sticking out of the open box
      const extra = geom.bh * 0.9;
      const s = Math.min((r.width * 0.86) / geom.w, (r.height * 0.9) / (geom.h + extra));
      const squash = bounce > 0 ? Math.sin(bounce * Math.PI * 3) * 0.08 * bounce : 0;
      c.save();
      c.translate(r.width / 2, r.height * 0.95);
      c.rotate(Math.sin(time * 0.002) * 0.015);
      c.scale(s * (1 + squash), s * (1 - squash));
      c.translate(-geom.w / 2, -geom.h);
      // its shadow
      c.beginPath();
      c.ellipse(geom.x0 + geom.bw / 2 + geom.ox * 0.3, geom.y0 + geom.bh, geom.bw * 0.62, 14, 0, 0, Math.PI * 2);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fill();
      drawGift(c, geom, recipe, stage(), req.picture, req.faces[recipe.for ?? '']);
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

  function close(result: WrapRecipe | null) {
    root.hidden = true;
    cancelAnimationFrame(raf);
    const then = onClose;
    onClose = undefined;
    req = null;
    then?.(result);
  }

  root.querySelector('[data-close]')!.addEventListener('click', () => {
    if (sending) return;
    sfx.shelfClose();
    close(null);
  });
  root.querySelector('[data-dice]')!.addEventListener('click', () => {
    if (wrapping || sending) return;
    sfx.boing(1.2);
    recipe = { ...randomWrap(recipe.shape, recipe.for) };
    if (!wrapped) wrapUp();
    else changed();
  });
  root.querySelector('.wr-done')!.addEventListener('click', () => {
    if (sending || !req) return;
    sending = true;
    // not wrapped yet: wrap it a surprise way first
    if (!wrapped) {
      const forWho = recipe.for;
      recipe = randomWrap(recipe.shape, forWho);
    }
    const finish = () => {
      sfx.tada();
      sparkle();
      bounce = 1;
      setTimeout(() => {
        sending = false;
        close({ ...recipe });
      }, 450);
    };
    if (!wrapped || wrapping) wrapUp(finish);
    else finish();
  });

  return {
    get isOpen() {
      return !root.hidden;
    },
    /** Open it with a thing to wrap. `done` gets how it was wrapped, or null if it was taken back out. */
    open(r: WrapRequest, done: (wrap: WrapRecipe | null) => void): boolean {
      if (!root.hidden) return false;
      req = r;
      onClose = done;
      // a tall box for a tall thing, a long one for a long thing
      const shape = Math.max(0.72, Math.min(1.55, r.picture.width / r.picture.height));
      recipe = { ...randomWrap(shape, r.me) };
      wrapped = false;
      wrapping = false;
      sending = false;
      wrapT = 0;
      tab = 'paper';
      bounce = 1;
      root.hidden = false;
      sfx.shelfOpen();
      renderTabs();
      renderOptions();
      last = 0;
      raf = requestAnimationFrame(frame);
      return true;
    },
  };
}
