import { Application, Assets, Container, Graphics, Texture } from 'pixi.js';
import { Character } from './character';
import { FlipButton } from './flipButton';
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

// --- Sample characters (stand-ins until Matilda's drawings arrive) ---
const names = ['monster', 'cat', 'robot'];
const textures: Texture[] = await Promise.all(
  names.map((n) =>
    Assets.load<Texture>({
      src: `${import.meta.env.BASE_URL}characters/${n}.svg`,
      data: { resolution: 2 }, // render the drawing extra crisp
    }),
  ),
);

const startSize = Math.min(app.screen.width, app.screen.height) * 0.28;
textures.forEach((tex, i) => {
  const ch = new Character(tex, startSize);
  ch.x = app.screen.width * ((i + 1) / (textures.length + 1));
  ch.y = app.screen.height * 0.68;
  characters.addChild(ch);
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
if (import.meta.env.DEV) Object.assign(window, { app, gestures, characters });
