// Development-only test bench for the cutout. Open /dev/cutout.html while
// `npm run dev` is running. Not part of the app that gets deployed.
import { cutoutFromBlob } from '../cutout';
import { DEFAULT_OPTIONS, type CutoutOptions } from '../cutout/cutout';
import { loadImage } from '../loadImage';

interface Sample {
  name: string;
  blob: Blob;
}

// ---- Real photos from the test-photos/ folder (git-ignored, stays on this PC)
const realPhotos = import.meta.glob('/test-photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// ---- Synthetic "photos of drawings" with the problems real photos have
const svg = (body: string, w = 400, h = 400) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`);

// A pencil girl: thin grey lines, white face and dress, a small gap in the head outline.
const GIRL = svg(`
  <g fill="none" stroke="#666" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M200 40 A55 55 0 1 1 188 41"/>
    <path d="M150 70 Q130 140 150 160 M250 70 Q270 140 250 160"/>
    <circle cx="180" cy="90" r="5" fill="#666"/><circle cx="220" cy="90" r="5" fill="#666"/>
    <path d="M178 118 Q200 134 222 118"/>
    <path d="M200 150 L200 175 M200 175 L130 330 L270 330 Z"/>
    <path d="M170 210 L110 250 M230 210 L290 180"/>
    <path d="M175 330 L170 385 L150 388 M225 330 L230 385 L250 388"/>
  </g>`);

// A yellow-marker sun: pale fill, rays not touching the circle.
const SUN = svg(`
  <circle cx="200" cy="200" r="90" fill="#fff59a" stroke="#ffd400" stroke-width="10"/>
  <g stroke="#ffc400" stroke-width="10" stroke-linecap="round">
    ${Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const p = (r: number) => `${200 + Math.cos(a) * r} ${200 + Math.sin(a) * r}`;
      return `<path d="M${p(115)} L${p(175)}"/>`;
    }).join('')}
  </g>
  <circle cx="170" cy="185" r="9" fill="#e0a000"/><circle cx="230" cy="185" r="9" fill="#e0a000"/>
  <path d="M165 225 Q200 255 235 225" fill="none" stroke="#e0a000" stroke-width="8" stroke-linecap="round"/>`);

interface Scene {
  name: string;
  src: string;
  table?: boolean;
  warm?: boolean;
  vignette?: boolean;
  shadow?: boolean;
  pencil?: boolean;
  rotate?: number;
  noise?: number;
}

const scenes: Scene[] = [
  { name: 'Monster, paper fills the photo', src: '/characters/monster.svg', noise: 6 },
  { name: 'Cat on a wooden table, warm lamp, dark corners', src: '/characters/cat.svg', table: true, warm: true, vignette: true, rotate: 0.05, noise: 8 },
  { name: 'Robot with a hand shadow across it', src: '/characters/robot.svg', shadow: true, noise: 8 },
  { name: 'Light pencil girl (gap in the head outline)', src: GIRL, pencil: true, vignette: true, noise: 7 },
  { name: 'Yellow marker sun on a table', src: SUN, table: true, vignette: true, rotate: -0.04, noise: 8 },
  { name: 'Monster in pencil, shadow and lamp', src: '/characters/monster.svg', pencil: true, shadow: true, warm: true, noise: 9 },
];

const loadImg = loadImage;

async function makePhoto(s: Scene): Promise<Blob> {
  const W = 1600, H = 1200;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const paper = '#f6f2ea';

  if (s.table) {
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(60,30,10,0.25)';
    for (let i = 0; i < 40; i++) {
      ctx.lineWidth = 2 + Math.random() * 4;
      const y = Math.random() * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + 20, W * 0.6, y - 20, W, y + 10);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(s.rotate ?? 0);
  const pw = s.table ? 1150 : W * 1.3;
  const ph = s.table ? 880 : H * 1.3;
  if (s.table) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
  }
  ctx.fillStyle = paper;
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.shadowColor = 'transparent';

  const img = await loadImg(s.src);
  const k = 620 / Math.max(img.naturalWidth, img.naturalHeight);
  if (s.pencil) ctx.filter = 'grayscale(1) contrast(0.6) brightness(1.3)';
  ctx.globalAlpha = s.pencil ? 0.75 : 0.95;
  ctx.globalCompositeOperation = 'multiply'; // ink on paper: white bits take the paper colour
  ctx.drawImage(img, (-img.naturalWidth * k) / 2, (-img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  ctx.restore();

  // Lighting
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  if (s.vignette) {
    const g = ctx.createRadialGradient(W * 0.4, H * 0.35, 100, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#8f857a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.warm) {
    ctx.fillStyle = '#ffe9c4';
    ctx.fillRect(0, 0, W, H);
  }
  if (s.shadow) {
    ctx.filter = 'blur(45px)';
    ctx.fillStyle = '#8a8a99';
    ctx.beginPath();
    ctx.ellipse(W * 0.72, H * 0.78, 460, 230, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Camera softness, sensor noise, JPEG
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d', { willReadFrequently: true })!;
  octx.filter = 'blur(0.8px)';
  octx.drawImage(c, 0, 0);
  const id = octx.getImageData(0, 0, W, H);
  const d = id.data;
  const amt = s.noise ?? 6;
  for (let i = 0; i < d.length; i += 4) {
    const nz = (Math.random() - 0.5) * 2 * amt;
    d[i] += nz + (Math.random() - 0.5) * amt;
    d[i + 1] += nz + (Math.random() - 0.5) * amt;
    d[i + 2] += nz + (Math.random() - 0.5) * amt;
  }
  octx.putImageData(id, 0, 0);
  return new Promise((res) => out.toBlob((b) => res(b!), 'image/jpeg', 0.8));
}

// ---- UI
const rows = document.getElementById('rows')!;
const sliders = {
  high: document.getElementById('high') as HTMLInputElement,
  low: document.getElementById('low') as HTMLInputElement,
  closeRadius: document.getElementById('close') as HTMLInputElement,
};
sliders.high.value = String(DEFAULT_OPTIONS.high);
sliders.low.value = String(DEFAULT_OPTIONS.low);
sliders.closeRadius.value = String(DEFAULT_OPTIONS.closeRadius);

const options = (): CutoutOptions => ({
  high: +sliders.high.value,
  low: +sliders.low.value,
  closeRadius: +sliders.closeRadius.value,
});

const samples: Sample[] = [];
let running = Promise.resolve();

async function runAll() {
  for (const s of Object.values(sliders)) s.nextElementSibling!.textContent = s.value;
  const opts = options();
  rows.replaceChildren();
  const sheet: { name: string; input: HTMLImageElement; output: HTMLCanvasElement | null; info: string }[] = [];
  for (const s of samples) {
    const row = document.createElement('div');
    row.className = 'row';
    const title = document.createElement('h2');
    title.textContent = s.name;
    const input = document.createElement('div');
    input.className = 'cell input';
    const im = new Image();
    im.src = URL.createObjectURL(s.blob);
    input.append(im);
    const output = document.createElement('div');
    output.className = 'cell output';
    row.append(title, input, output);
    rows.append(row);

    const res = await cutoutFromBlob(s.blob, opts);
    if (res) {
      output.append(res.canvas);
      const st = res.stats;
      const small = document.createElement('small');
      small.textContent = `${st.ms} ms · ${st.parts} part${st.parts === 1 ? '' : 's'} · ${st.width}×${st.height}px · ${(st.coverage * 100).toFixed(1)}% of photo${st.lenient ? ' · lenient' : ''}`;
      title.append(small);
      if (!im.complete) await new Promise((r) => (im.onload = r));
      sheet.push({ name: s.name, input: im, output: res.canvas, info: small.textContent });
    } else {
      output.classList.add('fail');
      output.textContent = 'Nothing found';
      if (!im.complete) await new Promise((r) => (im.onload = r));
      sheet.push({ name: s.name, input: im, output: null, info: 'NOTHING FOUND' });
    }
  }
  await saveContactSheet(sheet);
}

/** Save all results as one big image in test-output/ (dev server only). */
async function saveContactSheet(
  items: { name: string; input: HTMLImageElement; output: HTMLCanvasElement | null; info: string }[],
) {
  const cellW = 560, cellH = 420, labelH = 30, gap = 12;
  const c = document.createElement('canvas');
  c.width = cellW * 2 + gap * 3;
  c.height = items.length * (cellH + labelH + gap) + gap;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  const fit = (img: CanvasImageSource, iw: number, ih: number, x: number, y: number) => {
    const k = Math.min(cellW / iw, cellH / ih);
    ctx.drawImage(img, x + (cellW - iw * k) / 2, y + (cellH - ih * k) / 2, iw * k, ih * k);
  };
  items.forEach((it, i) => {
    const y = gap + i * (cellH + labelH + gap);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(`${it.name}   —   ${it.info}`, gap, y + 20);
    const cy = y + labelH;
    fit(it.input, it.input.naturalWidth, it.input.naturalHeight, gap, cy);
    // dark checkerboard so halos and holes are visible
    const ox = gap * 2 + cellW;
    for (let ty = 0; ty < cellH; ty += 20) {
      for (let tx = 0; tx < cellW; tx += 20) {
        ctx.fillStyle = (tx + ty) % 40 === 0 ? '#555' : '#6a6a6a';
        ctx.fillRect(ox + tx, cy + ty, 20, 20);
      }
    }
    if (it.output) fit(it.output, it.output.width, it.output.height, ox, cy);
  });
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));
  await fetch('/__save?name=contact-sheet.png', { method: 'POST', body: blob }).catch(() => {});
}

const rerun = () => (running = running.then(runAll));
for (const s of Object.values(sliders)) s.addEventListener('change', rerun);

function addFiles(files: FileList | File[]) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  samples.unshift(...list.map((f) => ({ name: `Dropped: ${f.name}`, blob: f as Blob })));
  rerun();
}
(document.getElementById('files') as HTMLInputElement).addEventListener('change', (e) => {
  addFiles((e.target as HTMLInputElement).files!);
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
});

for (const [path, url] of Object.entries(realPhotos)) {
  samples.push({ name: `Real: ${path.split('/').pop()}`, blob: await (await fetch(url)).blob() });
}
for (const sc of scenes) samples.push({ name: `Fake: ${sc.name}`, blob: await makePhoto(sc) });
rerun();
