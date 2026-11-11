/**
 * Cut a drawing out of a photo of paper.
 *
 * Pure image maths, no browser APIs, so it can run in a Web Worker.
 *
 * The steps:
 *  1. Work out the paper colour everywhere in the photo. Lighting is never
 *     even (shadows, warm lamps, darker corners), so we estimate it in a grid
 *     of small blocks, and fill in blocks that are covered by drawing or by
 *     the table from their paper neighbours.
 *  2. Divide every pixel by its local paper colour. Paper becomes pure white,
 *     shadows disappear, and "ink" is how far a pixel is from white.
 *  3. Pick the ink: definitely-ink pixels, plus fainter ones touching them
 *     (so light pencil lines survive but paper texture doesn't).
 *  4. Fatten the ink slightly so small gaps in outlines close, then flood-fill
 *     the paper from the photo's edges. Whatever the flood can't reach is the
 *     character, including white areas inside it like eyes and faces.
 *     Anything dark touching the photo's edge (table, fingers) is treated as
 *     background too.
 *  5. Shrink back to the true outline, soften the edge using the ink strength,
 *     throw away specks, and crop.
 */

export interface CutoutOptions {
  /** Ink strength (0..1) that definitely counts as drawing. */
  high?: number;
  /** Fainter ink (0..1) that counts if it touches definite drawing. */
  low?: number;
  /** Gaps in outlines up to about twice this many pixels get closed (at 1024px). */
  closeRadius?: number;
  /**
   * Parts further from the main drawing than this fraction of its size are
   * left out. 0 = keep every part.
   */
  nearFraction?: number;
  /** Development: also return a picture of what was detected as ink. */
  debug?: boolean;
}

export interface CutoutStats {
  ms: number;
  parts: number;
  coverage: number;
  width: number;
  height: number;
  lenient: boolean;
}

export interface CutoutResult {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  stats: CutoutStats;
  /** Only with options.debug: full-size picture of the ink detection. */
  debug?: { width: number; height: number; data: Uint8ClampedArray };
}

export const DEFAULT_OPTIONS: Required<CutoutOptions> = {
  high: 0.25,
  low: 0.16, // lower picks up paper creases (tuned on a real folded drawing)
  closeRadius: 6,
  nearFraction: 0.2,
  debug: false,
};

const luma = (r: number, g: number, b: number) => (r * 77 + g * 150 + b * 29) >> 8;

export function cutout(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  options: CutoutOptions = {},
): CutoutResult | null {
  const t0 = performance.now();
  const o = { ...DEFAULT_OPTIONS, ...options };
  const n = w * h;
  const r = Math.max(1, Math.round((o.closeRadius * Math.max(w, h)) / 1024));
  const hi = o.high * 255;
  const lo = o.low * 255;

  // --- 1 & 2: flatten the lighting and measure ink -------------------------
  const { col, gw, gh, bs } = paperGrid(src, w, h);
  const ink = new Uint8Array(n);
  const flat = new Uint8ClampedArray(n * 4);

  const xi0 = new Int32Array(w);
  const xi1 = new Int32Array(w);
  const xt = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const f = (x + 0.5) / bs - 0.5;
    let i0 = Math.floor(f);
    let t = f - i0;
    if (i0 < 0) (i0 = 0), (t = 0);
    if (i0 >= gw - 1) (i0 = gw - 1), (t = 0);
    xi0[x] = i0;
    xi1[x] = Math.min(i0 + 1, gw - 1);
    xt[x] = t;
  }

  for (let y = 0; y < h; y++) {
    const f = (y + 0.5) / bs - 0.5;
    let j0 = Math.floor(f);
    let ty = f - j0;
    if (j0 < 0) (j0 = 0), (ty = 0);
    if (j0 >= gh - 1) (j0 = gh - 1), (ty = 0);
    const j1 = Math.min(j0 + 1, gh - 1);
    const row0 = j0 * gw;
    const row1 = j1 * gw;
    for (let x = 0; x < w; x++) {
      const tx = xt[x];
      const a = (row0 + xi0[x]) * 3;
      const b = (row0 + xi1[x]) * 3;
      const c = (row1 + xi0[x]) * 3;
      const d = (row1 + xi1[x]) * 3;
      const p = y * w + x;
      const i = p * 4;
      for (let k = 0; k < 3; k++) {
        const top = col[a + k] + (col[b + k] - col[a + k]) * tx;
        const bot = col[c + k] + (col[d + k] - col[c + k]) * tx;
        const paper = Math.max(24, top + (bot - top) * ty);
        flat[i + k] = (src[i + k] / paper) * 255;
      }
      flat[i + 3] = 255;
    }
  }

  // Ink = how much darker a pixel is than the paper right around it.
  // We use the darkest colour channel, so yellow marker (low blue) counts.
  // "Paper right around it" = the brightest value nearby, smoothed. Lines and
  // edges are much thinner than that neighbourhood so they stand out, while
  // soft shadows fade too gradually to register.
  const darkest = new Uint8Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    darkest[p] = Math.min(flat[i], flat[i + 1], flat[i + 2]);
  }
  const R = Math.max(3, Math.round((12 * Math.max(w, h)) / 1024));
  const local = boxBlur(maxFilter(darkest, w, h, R), w, h, R);
  for (let p = 0; p < n; p++) {
    const v = 1 - darkest[p] / Math.max(1, local[p]);
    ink[p] = v <= 0 ? 0 : v * 255;
  }

  // --- 3: definite ink, plus faint ink close to it ------------------------
  // Faint ink only counts within a few pixels of definite ink: enough for
  // the soft edges of real lines, not enough to follow a paper crease that
  // happens to touch the drawing.
  const maxReach = Math.max(2, Math.round((6 * Math.max(w, h)) / 1024));
  const mask = new Uint8Array(n);
  const reachDist = new Uint8Array(n);
  const q = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  for (let p = 0; p < n; p++) {
    if (ink[p] >= hi) {
      mask[p] = 1;
      q[qt++] = p;
    }
  }
  while (qh < qt) {
    const p = q[qh++];
    const d = reachDist[p] + 1;
    if (d > maxReach) continue;
    const x = p % w;
    const y = (p - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        const j = yy * w + xx;
        if (!mask[j] && ink[j] >= lo) {
          mask[j] = 1;
          reachDist[j] = d;
          q[qt++] = j;
        }
      }
    }
  }

  // --- 4: close small gaps, then flood the paper from the edges ------------
  const fat = morph(mask, w, h, r, true);

  const border = new Int32Array(2 * w + 2 * h);
  let nb = 0;
  for (let x = 0; x < w; x++) (border[nb++] = x), (border[nb++] = (h - 1) * w + x);
  for (let y = 0; y < h; y++) (border[nb++] = y * w), (border[nb++] = y * w + w - 1);

  const attempt = (lenient: boolean): CutoutResult | null => {
    const bg = new Uint8Array(n);
    qh = 0;
    qt = 0;

    if (!lenient) {
      // Ink touching the photo edge (table, fingers, paper edge) is background.
      for (let k = 0; k < nb; k++) {
        const p = border[k];
        if (fat[p] && !bg[p]) (bg[p] = 1), (q[qt++] = p);
      }
      while (qh < qt) {
        const p = q[qh++];
        const x = p % w;
        const y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (fat[j] && !bg[j]) (bg[j] = 1), (q[qt++] = j);
          }
        }
      }
    }

    // Paper reachable from the edge (or from that edge ink) is background.
    for (let k = 0; k < nb; k++) {
      const p = border[k];
      if (!fat[p] && !bg[p]) (bg[p] = 1), (q[qt++] = p);
    }
    qh = 0;
    while (qh < qt) {
      const p = q[qh++];
      const x = p % w;
      if (x > 0 && !fat[p - 1] && !bg[p - 1]) (bg[p - 1] = 1), (q[qt++] = p - 1);
      if (x < w - 1 && !fat[p + 1] && !bg[p + 1]) (bg[p + 1] = 1), (q[qt++] = p + 1);
      if (p >= w && !fat[p - w] && !bg[p - w]) (bg[p - w] = 1), (q[qt++] = p - w);
      if (p < n - w && !fat[p + w] && !bg[p + w]) (bg[p + w] = 1), (q[qt++] = p + w);
    }

    // Shrink back to the true outline.
    const filled = new Uint8Array(n);
    for (let p = 0; p < n; p++) filled[p] = bg[p] ? 0 : 1;
    const shape = morph(filled, w, h, r, false);

    // Closing gaps also seals off paper in corners and pockets (between an
    // arm and a body, between antennae). Find paper inside the shape that was
    // only sealed by the fattening: flood again using the thin lines.
    const reach = bg.slice();
    qh = 0;
    qt = 0;
    for (let p = 0; p < n; p++) if (reach[p]) q[qt++] = p;
    while (qh < qt) {
      const p = q[qh++];
      const x = p % w;
      if (x > 0 && !mask[p - 1] && !reach[p - 1]) (reach[p - 1] = 1), (q[qt++] = p - 1);
      if (x < w - 1 && !mask[p + 1] && !reach[p + 1]) (reach[p + 1] = 1), (q[qt++] = p + 1);
      if (p >= w && !mask[p - w] && !reach[p - w]) (reach[p - w] = 1), (q[qt++] = p - w);
      if (p < n - w && !mask[p + w] && !reach[p + w]) (reach[p + w] = 1), (q[qt++] = p + w);
    }
    const sealed = new Uint8Array(n);
    for (let p = 0; p < n; p++) sealed[p] = shape[p] && reach[p] ? 1 : 0;

    // Judge each sealed pocket on its own. Keep it filled only if it's mostly
    // closed: a big area behind a small opening, like a face with a little gap
    // in its outline. Open pockets (the corner between an antenna and a head)
    // go back to see-through.
    const minPocket = 4 * r * r;
    const keepSealed = new Uint8Array(n);
    const seen = new Uint8Array(n);
    const isOut = (j: number) => !shape[j];
    for (let s = 0; s < n; s++) {
      if (!sealed[s] || seen[s]) continue;
      qh = 0;
      qt = 0;
      q[qt++] = s;
      seen[s] = 1;
      let opening = 0;
      while (qh < qt) {
        const p = q[qh++];
        const x = p % w;
        const left = x > 0 ? p - 1 : -1;
        const right = x < w - 1 ? p + 1 : -1;
        const up = p >= w ? p - w : -1;
        const down = p < n - w ? p + w : -1;
        // Does this pixel sit on the opening to the outside?
        if (left < 0 || right < 0 || up < 0 || down < 0 || isOut(left) || isOut(right) || isOut(up) || isOut(down)) {
          opening++;
        }
        if (left >= 0 && sealed[left] && !seen[left]) (seen[left] = 1), (q[qt++] = left);
        if (right >= 0 && sealed[right] && !seen[right]) (seen[right] = 1), (q[qt++] = right);
        if (up >= 0 && sealed[up] && !seen[up]) (seen[up] = 1), (q[qt++] = up);
        if (down >= 0 && sealed[down] && !seen[down]) (seen[down] = 1), (q[qt++] = down);
      }
      const area = qt;
      if (area >= minPocket && opening * opening * 4 < area) {
        for (let k = 0; k < qt; k++) keepSealed[q[k]] = 1;
      }
    }

    // --- 5: soft edge, specks, crop ----------------------------------------
    const outside = new Uint8Array(n);
    for (let p = 0; p < n; p++) outside[p] = shape[p] ? 0 : 1;
    const nearEdge = morph(outside, w, h, 2, true);

    const alpha = new Uint8Array(n);
    const edgeLo = lo * 0.6;
    for (let p = 0; p < n; p++) {
      if (!shape[p]) continue;
      // At the outer edge, and in open sealed pockets, only real ink is
      // solid; paper there becomes see-through.
      if (nearEdge[p] || (sealed[p] && !keepSealed[p])) {
        const t = (ink[p] - edgeLo) / (hi - edgeLo);
        alpha[p] = t <= 0 ? 0 : t >= 1 ? 255 : t * 255;
      } else {
        alpha[p] = 255;
      }
    }

    // Separate parts (8-connected). Keep real parts, drop specks.
    const label = new Int32Array(n);
    const area: number[] = [0];
    const touches: boolean[] = [false];
    const partSize: number[] = [0];
    let count = 0;
    for (let s = 0; s < n; s++) {
      if (!alpha[s] || label[s]) continue;
      count++;
      let a = 0;
      let touch = false;
      qh = 0;
      qt = 0;
      q[qt++] = s;
      label[s] = count;
      let cx0 = w, cy0 = h, cx1 = 0, cy1 = 0;
      while (qh < qt) {
        const p = q[qh++];
        a++;
        const x = p % w;
        const y = (p - x) / w;
        if (x < cx0) cx0 = x;
        if (x > cx1) cx1 = x;
        if (y < cy0) cy0 = y;
        if (y > cy1) cy1 = y;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touch = true;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (alpha[j] && !label[j]) (label[j] = count), (q[qt++] = j);
          }
        }
      }
      area.push(a);
      touches.push(touch);
      partSize.push(Math.max(cx1 - cx0, cy1 - cy0) + 1);
    }

    let largest = 0;
    let main = 0;
    for (let c = 1; c <= count; c++) {
      if ((lenient || !touches[c]) && area[c] > largest) (largest = area[c]), (main = c);
    }
    if (largest === 0) return null;
    const minArea = Math.max(n * 0.00008, largest * 0.003);
    const candidate = new Uint8Array(count + 1);
    for (let c = 1; c <= count; c++) {
      if ((lenient || !touches[c]) && area[c] >= minArea) candidate[c] = 1;
    }

    // Keep the main drawing (the biggest part) and whatever is drawn close
    // to it - little bees beside a big bee, a sun's rays - but not separate
    // things further away on the page, like a heart in the corner.
    // "Close" is measured from ink to ink, and grows as parts join (ray by
    // ray around a sun).
    const keep = new Uint8Array(count + 1);
    keep[main] = 1;
    if (o.nearFraction <= 0) keep.set(candidate);
    const near = Math.max(4, Math.round(o.nearFraction * partSize[main]));
    const dist = new Uint16Array(n);
    for (; o.nearFraction > 0; ) {
      dist.fill(0xffff);
      qh = 0;
      qt = 0;
      for (let p = 0; p < n; p++) {
        if (keep[label[p]] && label[p]) (dist[p] = 0), (q[qt++] = p);
      }
      let joined = false;
      while (qh < qt) {
        const p = q[qh++];
        const d = dist[p] + 1;
        if (d > near) continue;
        const x = p % w;
        const y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (dist[j] <= d) continue;
            dist[j] = d;
            q[qt++] = j;
            const l = label[j];
            if (l && candidate[l] && !keep[l]) (keep[l] = 1), (joined = true);
          }
        }
      }
      if (!joined) break;
    }

    let parts = 0;
    let kept = 0;
    for (let c = 1; c <= count; c++) {
      if (keep[c]) {
        parts++;
        kept += area[c];
      }
    }
    // A "character" covering almost the whole photo means we found no paper.
    if (kept > n * 0.92) return null;

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let p = 0; p < n; p++) {
      if (!keep[label[p]]) continue;
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pad = 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const ow = maxX - minX + 1;
    const oh = maxY - minY + 1;
    const out = new Uint8ClampedArray(ow * oh * 4);

    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const p = (y + minY) * w + (x + minX);
        if (!keep[label[p]]) continue;
        const a = alpha[p];
        const i = p * 4;
        const k = (y * ow + x) * 4;
        if (a >= 250) {
          out[k] = flat[i];
          out[k + 1] = flat[i + 1];
          out[k + 2] = flat[i + 2];
        } else {
          // Edge pixel: part ink, part white paper. Un-mix the white so the
          // outline doesn't get a pale halo.
          const af = Math.max(a / 255, 0.15);
          out[k] = (flat[i] - 255 * (1 - af)) / af;
          out[k + 1] = (flat[i + 1] - 255 * (1 - af)) / af;
          out[k + 2] = (flat[i + 2] - 255 * (1 - af)) / af;
        }
        out[k + 3] = a;
      }
    }

    return {
      width: ow,
      height: oh,
      data: out,
      stats: {
        ms: Math.round(performance.now() - t0),
        parts,
        coverage: kept / n,
        width: ow,
        height: oh,
        lenient,
      },
    };
  };

  // Normal rules first. If that finds nothing (say, the drawing runs off the
  // edge of the photo), try again without throwing away edge-touching parts.
  const result = attempt(false) ?? attempt(true);

  if (result && o.debug) {
    // Ink strength as darkness (white = paper). Picked-up ink is tinted:
    // red = strong ink, orange = faint ink joined on to strong ink.
    const dbg = new Uint8ClampedArray(n * 4);
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      const v = 255 - Math.min(255, ink[p] * 2.5); // exaggerate so faint ink shows
      if (mask[p] && ink[p] >= hi) (dbg[i] = 230), (dbg[i + 1] = v * 0.25), (dbg[i + 2] = v * 0.25);
      else if (mask[p]) (dbg[i] = 255), (dbg[i + 1] = 150 + v * 0.3), (dbg[i + 2] = v * 0.2);
      else (dbg[i] = v), (dbg[i + 1] = v), (dbg[i + 2] = v);
      dbg[i + 3] = 255;
    }
    result.debug = { width: w, height: h, data: dbg };
  }
  return result;
}

/**
 * Estimate the paper colour on a coarse grid of blocks.
 * Returns RGB per block (paper colour, with drawing/table blocks filled in).
 */
function paperGrid(src: Uint8ClampedArray, w: number, h: number) {
  const bs = Math.max(8, Math.round(Math.max(w, h) / 32));
  const gw = Math.ceil(w / bs);
  const gh = Math.ceil(h / bs);
  const g = gw * gh;
  let col = new Float32Array(g * 3);
  const lum = new Float32Array(g);
  const hist = new Uint32Array(256);

  // Each block's paper candidate: the average of its brightest 15% of pixels.
  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      const x0 = bx * bs;
      const y0 = by * bs;
      const x1 = Math.min(w, x0 + bs);
      const y1 = Math.min(h, y0 + bs);
      hist.fill(0);
      let cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          hist[luma(src[i], src[i + 1], src[i + 2])]++;
          cnt++;
        }
      }
      const need = Math.max(1, Math.round(cnt * 0.15));
      let acc = 0;
      let cut = 255;
      for (; cut > 0; cut--) {
        acc += hist[cut];
        if (acc >= need) break;
      }
      let sr = 0, sg = 0, sb = 0, k = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          if (luma(src[i], src[i + 1], src[i + 2]) >= cut) {
            sr += src[i];
            sg += src[i + 1];
            sb += src[i + 2];
            k++;
          }
        }
      }
      const bi = by * gw + bx;
      col[bi * 3] = sr / k;
      col[bi * 3 + 1] = sg / k;
      col[bi * 3 + 2] = sb / k;
      lum[bi] = luma(sr / k, sg / k, sb / k);
    }
  }

  // What does "paper" look like overall? Bright, and a consistent tint.
  const sorted = Float32Array.from(lum).sort();
  const refL = sorted[Math.floor((g - 1) * 0.75)];
  let cr = 0, cg = 0, cn = 0;
  for (let bi = 0; bi < g; bi++) {
    if (lum[bi] < refL * 0.9) continue;
    const s = col[bi * 3] + col[bi * 3 + 1] + col[bi * 3 + 2] + 1;
    cr += col[bi * 3] / s;
    cg += col[bi * 3 + 1] / s;
    cn++;
  }
  cr /= cn;
  cg /= cn;

  const valid = new Uint8Array(g);
  let nValid = 0;
  for (let bi = 0; bi < g; bi++) {
    const s = col[bi * 3] + col[bi * 3 + 1] + col[bi * 3 + 2] + 1;
    const dist = Math.hypot(col[bi * 3] / s - cr, col[bi * 3 + 1] / s - cg);
    if (lum[bi] >= refL * 0.5 && dist <= 0.045) {
      valid[bi] = 1;
      nValid++;
    }
  }
  if (nValid === 0) valid.fill(1), (nValid = g);

  // Blocks that aren't paper (solid colouring, table) borrow from neighbours.
  for (let iter = 0; iter < gw + gh && nValid < g; iter++) {
    const fills: number[] = [];
    const vals: number[] = [];
    for (let by = 0; by < gh; by++) {
      for (let bx = 0; bx < gw; bx++) {
        const bi = by * gw + bx;
        if (valid[bi]) continue;
        let sr = 0, sg = 0, sb = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = bx + dx, y = by + dy;
            if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
            const j = y * gw + x;
            if (!valid[j]) continue;
            sr += col[j * 3];
            sg += col[j * 3 + 1];
            sb += col[j * 3 + 2];
            k++;
          }
        }
        if (k) fills.push(bi), vals.push(sr / k, sg / k, sb / k);
      }
    }
    fills.forEach((bi, m) => {
      col[bi * 3] = vals[m * 3];
      col[bi * 3 + 1] = vals[m * 3 + 1];
      col[bi * 3 + 2] = vals[m * 3 + 2];
      valid[bi] = 1;
      nValid++;
    });
  }

  // One gentle smoothing pass so block edges don't show.
  const sm = new Float32Array(g * 3);
  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      let k = 0;
      const acc = [0, 0, 0];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = bx + dx, y = by + dy;
          if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
          const j = (y * gw + x) * 3;
          acc[0] += col[j];
          acc[1] += col[j + 1];
          acc[2] += col[j + 2];
          k++;
        }
      }
      const bi = (by * gw + bx) * 3;
      sm[bi] = acc[0] / k;
      sm[bi + 1] = acc[1] / k;
      sm[bi + 2] = acc[2] / k;
    }
  }
  col = sm;

  return { col, gw, gh, bs };
}

/** Brightest value within a square of radius r (separable). */
function maxFilter(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 0;
      const x1 = Math.min(w - 1, x + r);
      for (let k = Math.max(0, x - r); k <= x1; k++) if (src[row + k] > m) m = src[row + k];
      tmp[row + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      const y1 = Math.min(h - 1, y + r);
      for (let k = Math.max(0, y - r); k <= y1; k++) if (tmp[k * w + x] > m) m = tmp[k * w + x];
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Average over a square of radius r (separable, edges use what's available). */
function boxBlur(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Float32Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    let cnt = 0;
    for (let x = 0; x < Math.min(r, w); x++) sum += src[row + x], cnt++;
    for (let x = 0; x < w; x++) {
      if (x + r < w) sum += src[row + x + r], cnt++;
      if (x - r - 1 >= 0) sum -= src[row + x - r - 1], cnt--;
      tmp[row + x] = sum / cnt;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let cnt = 0;
    for (let y = 0; y < Math.min(r, h); y++) sum += tmp[y * w + x], cnt++;
    for (let y = 0; y < h; y++) {
      if (y + r < h) sum += tmp[(y + r) * w + x], cnt++;
      if (y - r - 1 >= 0) sum -= tmp[(y - r - 1) * w + x], cnt--;
      out[y * w + x] = sum / cnt;
    }
  }
  return out;
}

/** Square dilate (grow) or erode (shrink) a 0/1 mask by radius r. */
function morph(m: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const tmp = new Uint8Array(m.length);
  const out = new Uint8Array(m.length);
  const full = 2 * r + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = 0; x < Math.min(r, w); x++) sum += m[row + x];
    for (let x = 0; x < w; x++) {
      if (x + r < w) sum += m[row + x + r];
      if (x - r - 1 >= 0) sum -= m[row + x - r - 1];
      tmp[row + x] = dilate ? (sum > 0 ? 1 : 0) : sum === full ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < Math.min(r, h); y++) sum += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      if (y + r < h) sum += tmp[(y + r) * w + x];
      if (y - r - 1 >= 0) sum -= tmp[(y - r - 1) * w + x];
      out[y * w + x] = dilate ? (sum > 0 ? 1 : 0) : sum === full ? 1 : 0;
    }
  }
  return out;
}
