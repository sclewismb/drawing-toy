import { Application, Container, Graphics } from 'pixi.js';
import { Character } from './character';
import { cutoutFromBlob } from './cutout';
import { FlipButton } from './flipButton';
import { burst } from './fx';
import { GestureController } from './gestures';

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

// --- Gestures and the flip button ---
const gestures = new GestureController(app, characters);
const flipButton = new FlipButton(() => gestures.selected?.flip());
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
const startSize = () => Math.min(app.screen.width, app.screen.height) * 0.3;

function addCharacter(picture: HTMLCanvasElement, x: number, y: number, tada = false) {
  const ch = new Character(picture, startSize());
  ch.position.set(x, y);
  characters.addChild(ch);
  if (tada) {
    ch.popIn();
    burst(ui, x, y);
    gestures.select(ch);
  }
  return ch;
}

/** Load one of the sample SVG drawings into a canvas (same as a real cutout). */
async function loadSample(name: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}characters/${name}.svg`;
  await img.decode();
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
const cameraButton = document.getElementById('camera')!;
const fileInput = cameraButton.querySelector('input')!;

function nope() {
  cameraButton.classList.remove('nope');
  void cameraButton.offsetWidth; // restart the animation
  cameraButton.classList.add('nope');
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  fileInput.value = ''; // so picking the same photo again still works
  if (!file) return;
  cameraButton.classList.add('busy');
  try {
    const result = await cutoutFromBlob(file);
    if (!result) throw new Error('No drawing found in the photo');
    addCharacter(result.canvas, app.screen.width / 2, app.screen.height * 0.5, true);
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

// Offline support. Only in the built app: during development it would
// keep serving old code and get confusing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
}

// Handy for testing in the browser console during development.
if (import.meta.env.DEV) Object.assign(window, { app, gestures, characters, addCharacter });
