import { COLLARS, drawPet, PET_AREA, randomName, renderPet, type PetKind, type PetRecipe } from './petArt';
import { PETS } from './pets';
import { sfx } from './sound';

/**
 * Meeting a pet at the adoption corner: a big picture of it, collar colours
 * to choose from, a gold name tag with a random name (tap it for another),
 * and a big heart to adopt it. Then it's theirs: it comes to play, and it's
 * in their toy box from then on.
 */
const CSS = `
#adopt { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(40, 30, 60, 0.45); touch-action: none; -webkit-user-select: none; user-select: none; }
#adopt[hidden] { display: none; }
#adopt button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
#adopt .ad-card { position: relative; width: min(600px, calc(100vw - 32px)); max-height: calc(100vh - 32px); box-sizing: border-box; padding: 20px 22px 26px;
  background: radial-gradient(circle at 50% 30%, #fffdf5, #fff1c1); border: 5px solid #3a3a3a; border-radius: 30px; box-shadow: 0 10px 40px rgba(0,0,0,.3);
  display: flex; flex-direction: column; align-items: center; gap: 14px; }
#adopt .ad-pet { width: min(100%, 52vh); aspect-ratio: ${PET_AREA.w} / ${PET_AREA.h}; }
#adopt .ad-close { position: absolute; top: 12px; left: 12px; width: 60px; height: 60px; border-radius: 50%; border: 4px solid #3a3a3a; background: #fff; display: grid; place-items: center; }
#adopt .ad-collars { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
#adopt .ad-collar { width: 52px; height: 52px; border-radius: 50%; border: 4px solid #3a3a3a; }
#adopt .ad-collar.on { box-shadow: 0 0 0 5px #ffd1dc; transform: scale(1.12); }
#adopt .ad-row { display: flex; gap: 18px; align-items: center; }
#adopt .ad-tag { min-width: 180px; height: 74px; padding: 0 22px; border-radius: 37px; border: 4px solid #3a3a3a; background: #ffd43b;
  font: 800 26px/1 system-ui, -apple-system, sans-serif; color: #3a2a00; display: flex; align-items: center; gap: 10px; box-shadow: 0 5px 0 rgba(0,0,0,.15); }
#adopt .ad-heart { width: 96px; height: 96px; border-radius: 50%; border: 5px solid #3a3a3a; background: #ff8fab; display: grid; place-items: center; box-shadow: 0 6px 0 rgba(0,0,0,.2); }
#adopt .ad-heart:active, #adopt .ad-tag:active { transform: translateY(3px); }
`;
const CROSS = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round"/></svg>';
const HEART = '<svg viewBox="0 0 24 24" width="58" height="58"><path d="M12 21 C3 14 2 9 5 6 C8 3 11 5 12 7 C13 5 16 3 19 6 C22 9 21 14 12 21 Z" fill="#fff" stroke="#3a3a3a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const SHUFFLE = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 7 H9 L15 17 H20 M17 14 L20 17 L17 20 M4 17 H9 L10.5 14.5 M13.5 9.5 L15 7 H20 M17 4 L20 7 L17 10" fill="none" stroke="#3a2a00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function setupAdopt(opts: { onAdopt: (recipe: PetRecipe, picture: HTMLCanvasElement) => void }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const root = document.createElement('div');
  root.id = 'adopt';
  root.hidden = true;
  root.innerHTML = `
    <div class="ad-card">
      <button class="ad-close" aria-label="Close">${CROSS}</button>
      <canvas class="ad-pet"></canvas>
      <div class="ad-collars"></div>
      <div class="ad-row">
        <button class="ad-tag" aria-label="Name tag"><span></span>${SHUFFLE}</button>
        <button class="ad-heart" aria-label="Adopt">${HEART}</button>
      </div>
    </div>`;
  document.body.append(root);
  const canvas = root.querySelector<HTMLCanvasElement>('.ad-pet')!;
  const collarsEl = root.querySelector<HTMLElement>('.ad-collars')!;
  const tagText = root.querySelector<HTMLElement>('.ad-tag span')!;
  let pet: PetRecipe = { kind: 'ginger-kitten', collar: 0, name: '' };
  let wiggle = 0;
  let raf = 0;

  function draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    const c = canvas.getContext('2d')!;
    const s = Math.min(canvas.width / PET_AREA.w, canvas.height / PET_AREA.h);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.translate(canvas.width / 2, canvas.height);
    const k = Math.sin(wiggle * Math.PI * 3) * wiggle;
    c.scale(s * (1 + 0.05 * k), s * (1 - 0.06 * k));
    c.translate(-PET_AREA.w / 2, -PET_AREA.h);
    drawPet(c, pet);
    c.restore();
  }
  let last = 0;
  function frame(now: number) {
    const dt = Math.min(50, now - (last || now));
    last = now;
    if (wiggle > 0) {
      wiggle = Math.max(0, wiggle - dt / 500);
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function renderCollars() {
    collarsEl.replaceChildren(
      ...COLLARS.map((col, i) => {
        const b = document.createElement('button');
        b.className = i === pet.collar ? 'ad-collar on' : 'ad-collar';
        b.style.background = col;
        b.addEventListener('click', () => {
          pet = { ...pet, collar: i };
          sfx.pop(1.3);
          wiggle = 1;
          renderCollars();
          draw();
        });
        return b;
      }),
    );
  }
  root.querySelector('.ad-tag')!.addEventListener('click', () => {
    pet = { ...pet, name: randomName(pet.name) };
    tagText.textContent = pet.name;
    sfx.ding();
  });
  root.querySelector('.ad-close')!.addEventListener('click', () => {
    sfx.shelfClose();
    close();
  });
  root.querySelector('.ad-heart')!.addEventListener('click', () => {
    const recipe = { ...pet };
    sfx.tada();
    close();
    opts.onAdopt(recipe, renderPet(recipe));
  });
  function close() {
    root.hidden = true;
    cancelAnimationFrame(raf);
  }

  return {
    get isOpen() {
      return !root.hidden;
    },
    open(kind: PetKind) {
      if (!root.hidden) return;
      pet = { kind, collar: Math.floor(Math.random() * 6), name: randomName() };
      tagText.textContent = pet.name;
      root.hidden = false;
      renderCollars();
      requestAnimationFrame(() => {
        draw();
        wiggle = 1;
        PETS[kind].voice();
      });
      last = 0;
      raf = requestAnimationFrame(frame);
    },
  };
}
