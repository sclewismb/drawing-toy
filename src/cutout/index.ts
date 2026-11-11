import { loadImage } from '../loadImage';
import type { CutoutOptions, CutoutResult, CutoutStats } from './cutout';

/** Photos are shrunk to this many pixels on the long side before cutting out. */
const MAX_SIDE = 1024;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (r: CutoutResult | null) => void; reject: (e: Error) => void }
>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./cutout.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: CutoutResult | null; error?: string }>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.error) job.reject(new Error(e.data.error));
      else job.resolve(e.data.result ?? null);
    };
  }
  return worker;
}

async function loadBlobImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url); // browsers apply the photo's rotation (EXIF) for us
  } finally {
    // Safe to revoke once loaded; the image keeps its pixels.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Take a photo of a drawing and return just the drawing, on a transparent
 * canvas. Returns null if no drawing could be found.
 */
export async function cutoutFromBlob(
  blob: Blob,
  opts?: CutoutOptions,
): Promise<{ canvas: HTMLCanvasElement; stats: CutoutStats } | null> {
  const img = await loadBlobImage(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const id = nextId++;
  const result = await new Promise<CutoutResult | null>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, data, w, h, opts }, [data.buffer]);
  });
  if (!result) return null;

  const out = document.createElement('canvas');
  out.width = result.width;
  out.height = result.height;
  out
    .getContext('2d', { willReadFrequently: true })!
    .putImageData(new ImageData(result.data as Uint8ClampedArray<ArrayBuffer>, result.width, result.height), 0, 0);
  return { canvas: out, stats: result.stats };
}

export type { CutoutOptions, CutoutStats };
