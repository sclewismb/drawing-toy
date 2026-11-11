// Runs the cutout in the background so the scene keeps animating while it works.
import { cutout, type CutoutOptions } from './cutout';

interface Job {
  id: number;
  data: Uint8ClampedArray;
  w: number;
  h: number;
  opts?: CutoutOptions;
}

const post = (msg: unknown, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = (e: MessageEvent<Job>) => {
  const { id, data, w, h, opts } = e.data;
  try {
    const result = cutout(data, w, h, opts);
    const transfer: Transferable[] = [];
    if (result) transfer.push(result.data.buffer as ArrayBuffer);
    if (result?.debug) transfer.push(result.debug.data.buffer as ArrayBuffer);
    post({ id, result }, transfer);
  } catch (err) {
    post({ id, error: String(err) });
  }
};
