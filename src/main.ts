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
import { BUILTIN, PLACES, placeById, type PlaceId } from './places';
import { SOUND_FOR } from './reactions';
import { audioState, setMuted, sfx, unlockAudio } from './sound';
import { storage, type SceneItem } from './storage';
import { SEASONS, Weather, type Season } from './seasons';
import { StreetView } from './street';
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
//   world:    the place you're in (background, characters, flip button)
//   street:   the neighbourhood map
//   sparkles: star bursts, on top of whichever is showing
//   fade:     white flash when moving between the street and a place
const world = new Container();
const backdrop = new Graphics();
const characters = new Container();
const ui = new Container();
world.addChild(backdrop, characters, ui);
const sparkles = new Container();
const fade = new Graphics();
fade.eventMode = 'none';

// --- Sound: the iPad only allows it after a touch, so wake it on every touch
// (cheap once it's running; also recovers after the app was in the background).
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click']) {
  document.addEventListener(type, unlockAudio, { capture: true, passive: true });
}

/** Each character's "voice": bigger ones sound lower, with a little variety. */
const voice = (ch: Character) =>
  Math.min(1.6, Math.max(0.6, Math.pow(ch.scale.x, -0.35))) * (0.92 + Math.random() * 0.18);

// --- Pictures ---
const base = import.meta.env.BASE_URL;
const svgPictures = new Map<string, Promise<HTMLCanvasElement>>();
/** Load a built-in SVG picture into a canvas (same as a real cut-out). */
function svgPicture(url: string) {
  let p = svgPictures.get(url);
  if (!p) {
    p = loadImage(url).then((img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth * 2; // extra crisp
      c.height = img.naturalHeight * 2;
      c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
      return c;
    });
    svgPictures.set(url, p);
  }
  return p;
}
const builtinUrl = (name: string) => base + BUILTIN[name].url;

// --- Saved drawings (on this iPad only) ---
const library = await Library.load();
void storage.askToKeep();

// --- The street ---
const buildingPictures = new Map<string, HTMLCanvasElement>();
await Promise.all(PLACES.map(async (p) => buildingPictures.set(p.building, await svgPicture(base + p.building))));
const street = new StreetView(buildingPictures);
const weather = new Weather();
app.stage.addChild(world, street, weather, sparkles, fade);

/** Which place we're in; null = on the street. */
let current: PlaceId | null = null;

// --- Seasons: picked on the street; colours the street and the park, with
// blossom, butterflies, leaves or snow.
const savedSeason = await storage.getSetting<Season>('season').catch(() => undefined);
let season: Season = savedSeason && SEASONS.includes(savedSeason) ? savedSeason : 'spring';
const seasonButtons = [...document.querySelectorAll<HTMLButtonElement>('#seasons button')];

function showWeather() {
  weather.visible = current === null || !!placeById(current)?.outdoors;
}

function setSeason(s: Season, withSound = true) {
  season = s;
  for (const b of seasonButtons) b.classList.toggle('on', b.dataset.season === s);
  street.layout(app.screen.width, app.screen.height, season);
  drawBackdrop();
  weather.set(s);
  if (withSound) sfx.season(s);
  void storage.setSetting('season', s).catch(() => {});
}
for (const b of seasonButtons) b.addEventListener('click', () => setSeason(b.dataset.season as Season));

function drawFade(alpha: number) {
  fade.clear();
  if (alpha > 0) fade.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0xffffff, alpha });
}

function drawBackdrop() {
  backdrop.clear();
  if (current) placeById(current)!.drawBackdrop(backdrop, app.screen.width, app.screen.height, season);
}

// --- Saving: each place's scene, shortly after anything changes and when
// the app is put in the background.
let restoring = false;
let saveTimer = 0;
function saveSoon() {
  if (restoring || !current) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), 400);
}
async function saveNow() {
  clearTimeout(saveTimer);
  const place = current;
  if (restoring || !place) return;
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
    await storage.saveScene(place, { version: 1, items });
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

// --- Characters and toys ---
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
  const size = ref.kind === 'sample' ? (BUILTIN[ref.name]?.size ?? 1) : 1;
  const ch = new Character(picture, startSize() * size);
  ch.ref = ref;
  ch.position.set(at.x, at.y);
  if (at.scale) ch.scale.set(at.scale);
  if (at.rotation) ch.rotation = at.rotation;
  if (at.facing === -1) ch.setFacing(-1);
  characters.addChild(ch);
  gestures.keepOnScreen(ch);
  if (tada) {
    ch.popIn();
    burst(sparkles, ch.x, ch.y);
    sfx.tada();
    gestures.select(ch);
  }
  saveSoon();
  return ch;
}

async function pictureFor(ref: Ref): Promise<HTMLCanvasElement | null> {
  if (ref.kind === 'sample') return BUILTIN[ref.name] ? svgPicture(builtinUrl(ref.name)) : null;
  return library.picture(ref.id) ?? null;
}

function clearCharacters() {
  for (const ch of [...characters.children] as Character[]) {
    gestures.release(ch);
    characters.removeChild(ch);
    ch.destroy({ children: true });
  }
}

/** Load a place: its background and its saved scene (or its starting toys). */
async function showPlace(id: PlaceId) {
  const place = placeById(id)!;
  restoring = true;
  clearCharacters();
  current = id;
  drawBackdrop();
  const saved = await storage.loadScene(id).catch(() => null);
  const { width: W, height: H } = app.screen;
  if (saved) {
    for (const item of saved.items) {
      const ref: Ref = item.kind === 'sample' ? { kind: 'sample', name: item.name } : { kind: 'photo', id: item.id };
      const pic = await pictureFor(ref).catch(() => null);
      if (!pic) continue; // e.g. a drawing that was deleted
      addCharacter(pic, ref, { x: item.x * W, y: item.y * H, scale: item.scale, rotation: item.rotation, facing: item.facing });
    }
  } else {
    for (const s of place.start) {
      const pic = await svgPicture(builtinUrl(s.name));
      addCharacter(pic, { kind: 'sample', name: s.name }, { x: s.x * W, y: s.y * H });
    }
  }
  restoring = false;
  if (!saved) void saveNow();
}

/** Street or place: show the right things and buttons. */
function setOnStreet(onStreet: boolean) {
  street.visible = onStreet;
  world.visible = !onStreet;
  showWeather();
  document.body.classList.toggle('on-street', onStreet);
  if (onStreet) {
    gallery.close();
    gestures.select(null);
  }
}

const animate = (ms: number, fn: (t: number) => void) => new Promise<void>((resolve) => tween(ms, fn, resolve));
let switching = false;

/** Zoom into a building and open its place. */
async function enterPlace(id: PlaceId, at: { x: number; y: number }) {
  if (switching) return;
  switching = true;
  sfx.dingDong();
  await animate(380, (t) => {
    street.setZoom(at, t);
    drawFade(ease.inOutSine(t));
  });
  await showPlace(id);
  setOnStreet(false);
  street.setZoom(at, 0);
  try {
    sessionStorage.setItem('place', id);
  } catch {
    /* fine */
  }
  await animate(300, (t) => drawFade(1 - t));
  switching = false;
}

/** Save, then zoom back out to the street. */
async function goToStreet() {
  if (switching || !current) return;
  switching = true;
  sfx.zoomOut();
  await saveNow();
  await animate(220, (t) => drawFade(t));
  const at = street.buildingCentre(current);
  clearCharacters();
  current = null;
  backdrop.clear();
  setOnStreet(true);
  try {
    sessionStorage.removeItem('place');
  } catch {
    /* fine */
  }
  await animate(420, (t) => {
    street.setZoom(at, 1 - t);
    drawFade(1 - t);
  });
  switching = false;
}

street.onBuildingTap = () => gallery.close();
street.onEnter = (id, at) => void enterPlace(id, at);
document.getElementById('map-button')!.addEventListener('click', () => void goToStreet());

// --- The toy box: a shelf of every character and toy, and somewhere to put them away ---
const gallery = setupGallery({
  library,
  builtins() {
    const here = current ? placeById(current)!.toys : [];
    const names = [...new Set([...here, 'monster', 'cat', 'robot', ...PLACES.flatMap((p) => p.toys)])];
    return names.map((name) => ({ name, url: builtinUrl(name) }));
  },
  async onPick(pick: GalleryPick) {
    if (!current) return;
    const pic = await pictureFor(pick);
    if (!pic) return;
    const { width: W, height: H } = app.screen;
    const jitter = () => (Math.random() - 0.5) * Math.min(W, H) * 0.25;
    addCharacter(pic, pick, { x: W / 2 + jitter(), y: H * 0.42 + jitter() * 0.4 }, true);
  },
  onDelete(id: string) {
    // Gone for good: remove it from this place too, in a puff of stars.
    // (Other places simply skip it next time they open.)
    for (const ch of [...characters.children] as Character[]) {
      if (ch.ref.kind === 'photo' && ch.ref.id === id) {
        burst(sparkles, ch.x, ch.y, 10, 90);
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
    burst(sparkles, p.x, p.y, 20, 220);
  }
};
gestures.onDragStart = (ch) => {
  sfx.pickup(voice(ch));
  gallery.hint(true);
};
gestures.onDragMove = (_ch, x, y) => gallery.highlight(gallery.isOver(x, y));
gestures.onDrop = (ch, x, y) => {
  gallery.highlight(false);
  gallery.hint(false);
  if (gallery.isOver(x, y)) putAway(ch);
  else sfx.drop(voice(ch));
};
gestures.onShake = (ch) => {
  ch.react('dizzy');
  sfx.dizzy(voice(ch));
};
gestures.onTapEmpty = (x, y) => {
  gallery.close();
  burst(sparkles, x, y, 6, 50);
  sfx.pling();
};
gestures.onGestureEnd = () => {
  gallery.hint(false);
  saveSoon();
};

// --- Camera button: photo of a drawing -> new character in this place ---
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
    // Always keep the drawing; show it here if we're still in a place.
    const entry = await library.add(result.canvas);
    if (current) {
      addCharacter(result.canvas, { kind: 'photo', id: entry.id }, { x: app.screen.width / 2, y: app.screen.height * 0.5 }, true);
    }
  } catch (err) {
    console.warn(err);
    nope();
  } finally {
    cameraButton.classList.remove('busy');
  }
});

// When the iPad rotates: redraw, and pull everyone back on screen.
app.renderer.on('resize', () => {
  street.layout(app.screen.width, app.screen.height, season);
  weather.resize(app.screen.width, app.screen.height);
  drawBackdrop();
  for (const ch of characters.children as Character[]) gestures.keepOnScreen(ch);
  saveSoon();
});

// --- Start on the street (or back in the same place after an update refresh) ---
weather.resize(app.screen.width, app.screen.height);
setSeason(season, false);
setOnStreet(true);
let resumePlace: string | null = null;
try {
  resumePlace = sessionStorage.getItem('place');
} catch {
  /* fine */
}
if (resumePlace && placeById(resumePlace)) {
  await showPlace(resumePlace as PlaceId);
  setOnStreet(false);
}

// Offline support and updates. Only in the built app: during development it
// would keep serving old code and get confusing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOldVersion = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.register(`${base}sw.js`);

  // A Home Screen app on iPad is often just un-paused, not reopened, so
  // look for a new version whenever it comes back to the front.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reg.update().catch(() => {});
  });

  // When a new version has taken over: save, then refresh to show it (once
  // nobody is in the middle of dragging something or moving between places).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadOldVersion) return;
    const tryReload = async () => {
      if (gestures.busy || switching) return void setTimeout(tryReload, 500);
      await saveNow();
      location.reload();
    };
    void tryReload();
  });
}

// Handy for testing in the browser console during development.
if (import.meta.env.DEV) {
  Object.assign(window, {
    app, gestures, characters, library, storage, street, saveNow, enterPlace, goToStreet,
    place: () => current, setSeason, weather, setMuted, audioState, sfx, Ticker,
  });
}
