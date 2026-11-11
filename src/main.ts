import { Application, Container, Graphics, Ticker } from 'pixi.js';
import { Character } from './character';
import { cutoutFromBlob } from './cutout';
import { FlipButton } from './flipButton';
import { burst } from './fx';
import { setupGallery, type GalleryPick } from './gallery';
import { GestureController } from './gestures';
import { Library } from './library';
import { loadImage } from './loadImage';
import { setupGrownUpShare } from './photoShare';
import { SOUND_FOR } from './reactions';
import { audioState, setMuted, sfx, unlockAudio } from './sound';
import { storage, type SceneItem } from './storage';
import { ease, tween } from './tween';

// Stop iOS Safari's own pinch-to-zoom from fighting with ours.
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Create the PixiJS app. It draws everything onto one full-screen <canvas>.
const app = new Application();

await app.init({
  background: '#bfe8ff', // sky blue
  resizeTo: window, // fill the screen, and follow rotation between portrait and landscape
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1, // sharp on iPad Retina screens
});

document.body.appendChild(app.canvas);

// --- Layers, back to front ---
const backdrop = new Graphics();
const characters = new Container();
const ui = new Container();
app.stage.addChild(backdrop, characters, ui);

function drawBackdrop() {
  const { width: w, height: h } = app.screen;
  backdrop
    .clear()
    .rect(0, h * 0.7, w, h * 0.3)
    .fill('#8fd16a') // grass
    .circle(w * 0.85, h * 0.15, Math.min(w, h) * 0.08)
    .fill('#ffe066'); // sun
}
drawBackdrop();

// --- Sound: the iPad only allows it after a touch, so wake it on every touch
// (cheap once it's running; also recovers after the app was in the background).
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click']) {
  document.addEventListener(type, unlockAudio, { capture: true, passive: true });
}

/** Each character's "voice": bigger ones sound lower, with a little variety. */
const voice = (ch: Character) =>
  Math.min(1.6, Math.max(0.6, Math.pow(ch.scale.x, -0.35))) * (0.92 + Math.random() * 0.18);

// --- Saved drawings (on this iPad only) ---
const library = await Library.load();
void storage.askToKeep();

// --- Saving the scene: shortly after anything changes, and when the app is
// put in the background.
let restoring = true;
let saveTimer = 0;
function saveSoon() {
  if (restoring) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), 400);
}
async function saveNow() {
  clearTimeout(saveTimer);
  if (restoring) return;
  const { width: W, height: H } = app.screen;
  const items: SceneItem[] = [];
  for (const ch of characters.children as Character[]) {
    if (ch.destroyed || ch.eventMode === 'none') continue; // being put away
    if (ch.ref.kind === 'photo' && !ch.ref.id) continue; // still being saved
    items.push({
      ...ch.ref,
      x: ch.x / W,
      y: ch.y / H,
      scale: ch.scale.x,
      rotation: ch.rotation,
      facing: ch.facing < 0 ? -1 : 1,
    });
  }
  try {
    await storage.saveScene({ version: 1, items });
  } catch (err) {
    console.warn('Could not save the scene', err);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void saveNow();
});
window.addEventListener('pagehide', () => void saveNow());

// --- Gestures and the flip button ---
const gestures = new GestureController(app, characters);
const flipButton = new FlipButton(() => {
  gestures.selected?.flip();
  sfx.whoosh();
  saveSoon();
});
ui.addChild(flipButton);

gestures.onSelect = (ch) => (ch ? flipButton.show() : flipButton.hide());

// Keep the flip button floating at the top-right corner of the selected character.
app.ticker.add(() => {
  const ch = gestures.selected;
  if (!ch || !flipButton.visible) return;
  const b = ch.getBounds();
  const r = FlipButton.SIZE / 2;
  const { width, height } = app.screen;
  flipButton.x = Math.min(width - r - 8, Math.max(r + 8, b.maxX + r * 0.3));
  flipButton.y = Math.min(height - r - 8, Math.max(r + 8, b.minY - r * 0.3));
});

// --- Characters ---
const SAMPLES = ['monster', 'cat', 'robot'];
const sampleUrl = (name: string) => `${import.meta.env.BASE_URL}characters/${name}.svg`;
const startSize = () => Math.min(app.screen.width, app.screen.height) * 0.3;

type Ref = Character['ref'];
interface Placement {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  facing?: 1 | -1;
}

function addCharacter(picture: HTMLCanvasElement, ref: Ref, at: Placement, tada = false) {
  const ch = new Character(picture, startSize());
  ch.ref = ref;
  ch.position.set(at.x, at.y);
  if (at.scale) ch.scale.set(at.scale);
  if (at.rotation) ch.rotation = at.rotation;
  if (at.facing === -1) ch.setFacing(-1);
  characters.addChild(ch);
  gestures.keepOnScreen(ch);
  if (tada) {
    ch.popIn();
    burst(ui, ch.x, ch.y);
    sfx.tada();
    gestures.select(ch);
  }
  saveSoon();
  return ch;
}

/** Load one of the sample SVG drawings into a canvas (same as a real cutout). */
const samplePictures = new Map<string, Promise<HTMLCanvasElement>>();
function samplePicture(name: string) {
  let p = samplePictures.get(name);
  if (!p) {
    p = loadImage(sampleUrl(name)).then((img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth * 2; // extra crisp
      c.height = img.naturalHeight * 2;
      c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
      return c;
    });
    samplePictures.set(name, p);
  }
  return p;
}

async function pictureFor(ref: Ref): Promise<HTMLCanvasElement | null> {
  return ref.kind === 'sample' ? samplePicture(ref.name) : (library.picture(ref.id) ?? null);
}

// --- Bring back the saved scene (or start with the samples the first time) ---
const saved = await storage.loadScene().catch(() => null);
if (saved) {
  const { width: W, height: H } = app.screen;
  for (const item of saved.items) {
    const ref: Ref = item.kind === 'sample' ? { kind: 'sample', name: item.name } : { kind: 'photo', id: item.id };
    const pic = await pictureFor(ref).catch(() => null);
    if (!pic) continue; // e.g. a drawing that was deleted
    addCharacter(pic, ref, { x: item.x * W, y: item.y * H, scale: item.scale, rotation: item.rotation, facing: item.facing });
  }
} else {
  const pics = await Promise.all(SAMPLES.map(samplePicture));
  pics.forEach((pic, i) => {
    addCharacter(pic, { kind: 'sample', name: SAMPLES[i] }, {
      x: app.screen.width * ((i + 1) / (pics.length + 1)),
      y: app.screen.height * 0.68,
    });
  });
}
restoring = false;
void saveNow();

// --- The toy box: a shelf of every character, and somewhere to put them away ---
const gallery = setupGallery({
  library,
  samples: SAMPLES.map((name) => ({ name, url: sampleUrl(name) })),
  async onPick(pick: GalleryPick) {
    const pic = await pictureFor(pick);
    if (!pic) return;
    const { width: W, height: H } = app.screen;
    const jitter = () => (Math.random() - 0.5) * Math.min(W, H) * 0.25;
    addCharacter(pic, pick, { x: W / 2 + jitter(), y: H * 0.42 + jitter() * 0.4 }, true);
  },
  onDelete(id: string) {
    // Gone for good: remove it from the scene too, in a puff of stars.
    for (const ch of [...characters.children] as Character[]) {
      if (ch.ref.kind === 'photo' && ch.ref.id === id) {
        burst(ui, ch.x, ch.y, 10, 90);
        gestures.release(ch);
        characters.removeChild(ch);
        ch.destroy({ children: true });
      }
    }
    void library.remove(id);
    saveSoon();
  },
});

/** Shrink a character into the toy box and take it out of the scene. */
function putAway(ch: Character) {
  gestures.release(ch);
  ch.eventMode = 'none';
  sfx.putAway(voice(ch));
  gallery.gulp();
  const target = gallery.centre();
  const from = { x: ch.x, y: ch.y, s: ch.scale.x, r: ch.rotation };
  tween(
    300,
    (t) => {
      const e = ease.inOutSine(t);
      ch.x = from.x + (target.x - from.x) * e;
      ch.y = from.y + (target.y - from.y) * e;
      ch.scale.set(Math.max(0.01, from.s * (1 - e * 0.95)));
      ch.rotation = from.r + e * 3;
    },
    () => {
      characters.removeChild(ch);
      ch.destroy({ children: true });
      saveSoon();
    },
  );
}

// --- Every touch does something ---
gestures.onTap = (ch) => {
  const name = ch.react();
  sfx[SOUND_FOR[name]](voice(ch));
  if (name === 'super') {
    const p = ch.getGlobalPosition();
    burst(ui, p.x, p.y, 20, 220);
  }
};
gestures.onDragStart = (ch) => sfx.pickup(voice(ch));
gestures.onDragMove = (_ch, x, y) => gallery.highlight(gallery.isOver(x, y));
gestures.onDrop = (ch, x, y) => {
  gallery.highlight(false);
  if (gallery.isOver(x, y)) putAway(ch);
  else sfx.drop(voice(ch));
};
gestures.onShake = (ch) => {
  ch.react('dizzy');
  sfx.dizzy(voice(ch));
};
gestures.onTapEmpty = (x, y) => {
  gallery.close();
  burst(ui, x, y, 6, 50);
  sfx.pling();
};
gestures.onGestureEnd = () => saveSoon();

// --- Camera button: photo of a drawing -> new character ---
const cameraButton = document.getElementById('camera')!;
const fileInput = cameraButton.querySelector('input')!;
const photoShare = setupGrownUpShare(cameraButton, library);

function nope() {
  sfx.nope();
  cameraButton.classList.remove('nope');
  void cameraButton.offsetWidth; // restart the animation
  cameraButton.classList.add('nope');
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  fileInput.value = ''; // so picking the same photo again still works
  if (!file) return;
  photoShare.remember(file);
  cameraButton.classList.add('busy');
  try {
    const result = await cutoutFromBlob(file);
    if (!result) throw new Error('No drawing found in the photo');
    // Show it straight away, then save it.
    const ch = addCharacter(result.canvas, { kind: 'photo', id: '' }, { x: app.screen.width / 2, y: app.screen.height * 0.5 }, true);
    const entry = await library.add(result.canvas);
    ch.ref = { kind: 'photo', id: entry.id };
    saveSoon();
  } catch (err) {
    console.warn(err);
    nope();
  } finally {
    cameraButton.classList.remove('busy');
  }
});

// When the iPad rotates, redraw the backdrop and pull everyone back on screen.
app.renderer.on('resize', () => {
  drawBackdrop();
  for (const ch of characters.children as Character[]) gestures.keepOnScreen(ch);
  saveSoon();
});

// Offline support and updates. Only in the built app: during development it
// would keep serving old code and get confusing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOldVersion = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

  // A Home Screen app on iPad is often just un-paused, not reopened, so
  // look for a new version whenever it comes back to the front.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });

  // When a new version has taken over: save, then refresh to show it (once
  // nobody is in the middle of dragging something).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadOldVersion) return;
    const tryReload = async () => {
      if (gestures.busy) return void setTimeout(tryReload, 500);
      await saveNow();
      location.reload();
    };
    void tryReload();
  });
}

// Handy for testing in the browser console during development.
if (import.meta.env.DEV) {
  Object.assign(window, { app, gestures, characters, library, storage, saveNow, setMuted, audioState, sfx, Ticker });
}
