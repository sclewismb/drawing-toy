import { Application, Container, Graphics, Ticker } from 'pixi.js';
import { Character } from './character';
import { cutoutFromBlob } from './cutout';
import { FlipButton } from './flipButton';
import { burst } from './fx';
import { GestureController } from './gestures';
import { loadImage } from './loadImage';
import { setupPhotoShare } from './photoShare';
import { SOUND_FOR } from './reactions';
import { audioState, setMuted, sfx, unlockAudio } from './sound';

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

// --- Gestures and the flip button ---
const gestures = new GestureController(app, characters);
const flipButton = new FlipButton(() => {
  gestures.selected?.flip();
  sfx.whoosh();
});
ui.addChild(flipButton);

gestures.onSelect = (ch) => (ch ? flipButton.show() : flipButton.hide());

// Every touch does something.
gestures.onTap = (ch) => {
  const name = ch.react();
  sfx[SOUND_FOR[name]](voice(ch));
  if (name === 'super') {
    const p = ch.getGlobalPosition();
    burst(ui, p.x, p.y, 20, 220);
  }
};
gestures.onDragStart = (ch) => sfx.pickup(voice(ch));
gestures.onDrop = (ch) => sfx.drop(voice(ch));
gestures.onShake = (ch) => {
  ch.react('dizzy');
  sfx.dizzy(voice(ch));
};
gestures.onTapEmpty = (x, y) => {
  burst(ui, x, y, 6, 50);
  sfx.pling();
};

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
const startSize = () => Math.min(app.screen.width, app.screen.height) * 0.3;

function addCharacter(picture: HTMLCanvasElement, x: number, y: number, tada = false) {
  const ch = new Character(picture, startSize());
  ch.position.set(x, y);
  characters.addChild(ch);
  if (tada) {
    ch.popIn();
    burst(ui, x, y);
    sfx.tada();
    gestures.select(ch);
  }
  return ch;
}

/** Load one of the sample SVG drawings into a canvas (same as a real cutout). */
async function loadSample(name: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(`${import.meta.env.BASE_URL}characters/${name}.svg`);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth * 2; // extra crisp
  c.height = img.naturalHeight * 2;
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const samples = await Promise.all(['monster', 'cat', 'robot'].map(loadSample));
samples.forEach((pic, i) => {
  addCharacter(pic, app.screen.width * ((i + 1) / (samples.length + 1)), app.screen.height * 0.68);
});

// --- Camera button: photo of a drawing -> new character ---
let addedFromPhoto = false; // until saving exists (milestone 6), don't auto-refresh after this
const cameraButton = document.getElementById('camera')!;
const fileInput = cameraButton.querySelector('input')!;
const photoShare = setupPhotoShare(cameraButton, document.getElementById('share-photo') as HTMLButtonElement);

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
    addCharacter(result.canvas, app.screen.width / 2, app.screen.height * 0.5, true);
    addedFromPhoto = true;
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

  // When a new version has taken over, refresh to show it - but only if
  // nobody has added a photo yet, so a new character is never lost.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOldVersion && !addedFromPhoto) location.reload();
  });
}

// Handy for testing in the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { app, gestures, characters, addCharacter, setMuted, audioState, sfx, Ticker });
