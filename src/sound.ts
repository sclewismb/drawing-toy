/**
 * Silly sound effects, made on the fly with the Web Audio API (no sound
 * files to download, so they work offline and cost nothing).
 *
 * iPad rule: sound can only start after the person touches the screen, so
 * unlockAudio() is called on the first touch. Note: like other web pages,
 * these sounds follow the iPad's silent mode and volume.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); // keeps loud moments from crackling
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(comp).connect(ctx.destination);
      // iOS: playing a tiny silent sound inside the touch fully wakes audio up.
      const silent = ctx.createBufferSource();
      silent.buffer = ctx.createBuffer(1, 1, 22050);
      silent.connect(ctx.destination);
      silent.start(0);
    }
    if (ctx.state !== 'running') void ctx.resume();
  } catch {
    // No audio available: the app still works, just quietly.
  }
}

/** For testing: 'none' until the first touch, then 'running' once sound works. */
export function audioState() {
  return ctx?.state ?? 'none';
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.7;
}

interface Tone {
  type?: OscillatorType;
  from: number; // start pitch (Hz)
  to?: number; // end pitch (Hz)
  dur: number; // seconds
  vol?: number;
  delay?: number;
  wobbleRate?: number; // vibrato speed (Hz)
  wobbleDepth?: number; // vibrato amount (Hz)
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

function tone(o: Tone) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (o.delay ?? 0) + 0.005;
  const end = t0 + o.dur;

  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, end);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, end);

  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.value = o.filter.freq;
    f.Q.value = o.filter.q ?? 1;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(master);

  if (o.wobbleRate) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = o.wobbleRate;
    depth.gain.value = o.wobbleDepth ?? 20;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(end + 0.05);
  }
  osc.start(t0);
  osc.stop(end + 0.05);
}

function hiss(o: { dur: number; vol?: number; from: number; to: number; q?: number; delay?: number }) {
  if (!ctx || !master) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + (o.delay ?? 0) + 0.005;
  const end = t0 + o.dur;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, t0);
  f.frequency.exponentialRampToValueAtTime(o.to, end);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + o.dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(end + 0.05);
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Every sound takes a pitch multiplier: bigger characters sound lower. */
export const sfx = {
  boing(p = 1) {
    tone({ from: 230 * p, to: 140 * p, dur: 0.55, vol: 0.35, wobbleRate: 14, wobbleDepth: 45 * p });
    tone({ from: 460 * p, to: 280 * p, dur: 0.3, vol: 0.08 });
  },
  spring(p = 1) {
    tone({ from: 160 * p, to: 650 * p, dur: 0.22, vol: 0.3, wobbleRate: 30, wobbleDepth: 20 });
    tone({ type: 'triangle', from: 650 * p, to: 900 * p, dur: 0.14, vol: 0.12, delay: 0.2 });
    tone({ from: 140 * p, to: 90 * p, dur: 0.12, vol: 0.2, delay: 0.5 }); // landing
  },
  slideWhistle(p = 1) {
    tone({ from: 500 * p, to: 1300 * p, dur: 0.35, vol: 0.22, wobbleRate: 6, wobbleDepth: 18 });
    tone({ from: 1300 * p, to: 600 * p, dur: 0.32, vol: 0.22, delay: 0.33, wobbleRate: 6, wobbleDepth: 18 });
  },
  squeak(p = 1) {
    const f = { type: 'bandpass' as BiquadFilterType, freq: 1500 * p, q: 3 };
    tone({ type: 'sawtooth', from: 1100 * p, to: 1750 * p, dur: 0.09, vol: 0.14, filter: f });
    tone({ type: 'sawtooth', from: 1550 * p, to: 1000 * p, dur: 0.12, vol: 0.14, delay: 0.1, filter: f });
  },
  brrr(p = 1) {
    tone({ type: 'square', from: 90 * p, to: 75 * p, dur: 0.5, vol: 0.13, wobbleRate: 28, wobbleDepth: 30, filter: { type: 'lowpass', freq: 900 } });
  },
  giggle(p = 1) {
    for (let i = 0; i < 5; i++) {
      tone({ from: rand(900, 1050) * p, to: rand(1250, 1450) * p, dur: 0.08, vol: 0.16, delay: i * 0.11, wobbleRate: 30, wobbleDepth: 40 });
    }
  },
  pop(p = 1) {
    tone({ type: 'triangle', from: 200 * p, to: 500 * p, dur: 0.3, vol: 0.12 }); // stretching...
    tone({ from: 900 * p, to: 170 * p, dur: 0.09, vol: 0.4, delay: 0.3 }); // ...pop!
    hiss({ dur: 0.05, vol: 0.12, from: 3000, to: 1500, delay: 0.3 });
  },
  dizzy(p = 1) {
    tone({ from: 650 * p, to: 300 * p, dur: 0.8, vol: 0.2, wobbleRate: 9, wobbleDepth: 120 * p });
  },
  yippee(p = 1) {
    tone({ from: 400 * p, to: 1600 * p, dur: 0.45, vol: 0.22, wobbleRate: 8, wobbleDepth: 25 });
    [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.2, vol: 0.14, delay: 0.5 + i * 0.07 }));
  },
  pickup(p = 1) {
    tone({ from: 330 * p, to: 560 * p, dur: 0.08, vol: 0.12 });
  },
  drop(p = 1) {
    tone({ from: 170 * p, to: 80 * p, dur: 0.13, vol: 0.2 });
  },
  whoosh() {
    hiss({ dur: 0.32, vol: 0.25, from: 400, to: 2600, q: 1.2 });
  },
  tada() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.28, vol: 0.16, delay: i * 0.08 }));
    for (let i = 0; i < 6; i++) tone({ from: rand(2000, 3500), dur: 0.12, vol: 0.05, delay: 0.3 + i * 0.05 });
  },
  nope() {
    tone({ type: 'triangle', from: 400, to: 340, dur: 0.18, vol: 0.2 });
    tone({ type: 'triangle', from: 330, to: 250, dur: 0.35, vol: 0.2, delay: 0.2 });
  },
  pling() {
    tone({ from: rand(1200, 1900), dur: 0.15, vol: 0.07 });
  },
  /** Sucked into the toy box. */
  putAway(p = 1) {
    tone({ from: 700 * p, to: 180 * p, dur: 0.28, vol: 0.25, wobbleRate: 20, wobbleDepth: 30 });
    tone({ type: 'triangle', from: 220, to: 160, dur: 0.12, vol: 0.18, delay: 0.27 });
  },
  shelfOpen() {
    tone({ type: 'triangle', from: 300, to: 600, dur: 0.15, vol: 0.12 });
    tone({ type: 'triangle', from: 600, to: 900, dur: 0.1, vol: 0.08, delay: 0.12 });
  },
  shelfClose() {
    tone({ type: 'triangle', from: 600, to: 280, dur: 0.18, vol: 0.12 });
  },
  poof() {
    hiss({ dur: 0.35, vol: 0.3, from: 2500, to: 300, q: 0.8 });
  },
  /** Chalk on the blackboard (very short and soft; plays while drawing). */
  chalk() {
    hiss({ dur: 0.06, vol: 0.05, from: 3500, to: 5500, q: 2.5 });
  },
  /** The duster wiping the board. */
  wipe() {
    hiss({ dur: 0.45, vol: 0.18, from: 1200, to: 2600, q: 0.9 });
  },
  /** Going into a building. */
  dingDong() {
    tone({ type: 'triangle', from: 880, dur: 0.35, vol: 0.18 });
    tone({ type: 'triangle', from: 698, dur: 0.5, vol: 0.18, delay: 0.25 });
  },
  /** Changing the season: birdsong, a bright chord, a gust, sleigh bells. */
  season(s: 'spring' | 'summer' | 'autumn' | 'winter') {
    if (s === 'spring') {
      for (let i = 0; i < 3; i++) tone({ from: 2400, to: 3200, dur: 0.07, vol: 0.08, delay: i * 0.12, wobbleRate: 40, wobbleDepth: 200 });
    } else if (s === 'summer') {
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', from: f, dur: 0.6, vol: 0.12 }));
    } else if (s === 'autumn') {
      hiss({ dur: 0.7, vol: 0.2, from: 400, to: 1200, q: 0.7 });
    } else {
      for (let i = 0; i < 6; i++) tone({ type: 'triangle', from: rand(2200, 2800), dur: 0.12, vol: 0.06, delay: i * 0.07 });
    }
  },
  /** Back out to the street. */
  zoomOut() {
    hiss({ dur: 0.3, vol: 0.18, from: 2200, to: 500, q: 1.2 });
    tone({ type: 'triangle', from: 700, to: 350, dur: 0.25, vol: 0.1 });
  },
};

export type SoundName = keyof typeof sfx;

/** Sounds that take a pitch (the character's "voice"). */
export type PitchedSound = {
  [K in SoundName]: (typeof sfx)[K] extends (p?: number) => void ? K : never;
}[SoundName];
