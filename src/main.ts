import { Application, Container, Graphics, Ticker } from 'pixi.js';
import { Chalkboard, startingDoodles, type ChalkStroke } from './chalkboard';
import { Character } from './character';
import { cutoutFromBlob } from './cutout';
import { FlipButton } from './flipButton';
import { burst } from './fx';
import { setupGallery, type GalleryPick } from './gallery';
import { GestureController } from './gestures';
import { Library } from './library';
import { loadImage } from './loadImage';
import { setupGrownUpShare } from './photoShare';
import { setupHouseSettings } from './houseSettings';
import { HouseView, ROOM_FURNITURE } from './houseView';
import { BUILTIN, PLACES, placeById, STREET, type PlaceId, type RoomId } from './places';
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

// --- The street, and the family house with its rooms ---
const buildingPictures = new Map<string, HTMLCanvasElement>();
await Promise.all(STREET.map(async (s) => buildingPictures.set(s.building, await svgPicture(base + s.building))));
const street = new StreetView(buildingPictures);
const furniturePictures = new Map<string, HTMLCanvasElement>();
const furnitureNames = [...new Set(Object.values(ROOM_FURNITURE).flat())];
await Promise.all(furnitureNames.map(async (n) => furniturePictures.set(n, await svgPicture(builtinUrl(n)))));
const houseView = new HouseView(furniturePictures);
const weather = new Weather();
app.stage.addChild(world, street, houseView, weather, sparkles, fade);

/** What's showing: the street, the house (choose a room), or a place. */
type Screen = 'street' | 'house' | 'place';
let screen: Screen = 'street';
/** Which place we're in (only when screen is 'place'). */
let current: PlaceId | null = null;

// --- The house's sign and room names: typed in on this iPad, saved only here ---
interface HouseSettings {
  sign: string;
  rooms: Partial<Record<RoomId, string>>;
}
let houseSettings: HouseSettings = { sign: '', rooms: {} };
try {
  houseSettings = { ...houseSettings, ...((await storage.getSetting<HouseSettings>('house')) ?? {}) };
} catch {
  /* fine */
}
function applyHouseSettings() {
  street.setHouseSign(houseSettings.sign);
  houseView.setNames(houseSettings.rooms);
}
setupHouseSettings({
  get: () => houseSettings,
  save(s) {
    houseSettings = s;
    applyHouseSettings();
    void storage.setSetting('house', s).catch(() => {});
  },
  open: (fn) => (street.onHouseHold = fn),
});

// --- Seasons: picked on the street; colours the street and the park, with
// blossom, butterflies, leaves or snow.
const savedSeason = await storage.getSetting<Season>('season').catch(() => undefined);
let season: Season = savedSeason && SEASONS.includes(savedSeason) ? savedSeason : 'spring';
const seasonButtons = [...document.querySelectorAll<HTMLButtonElement>('#seasons button')];

function showWeather() {
  weather.visible = screen !== 'place' || !!(current && placeById(current)?.outdoors);
}

function setSeason(s: Season, withSound = true) {
  season = s;
  for (const b of seasonButtons) b.classList.toggle('on', b.dataset.season === s);
  street.layout(app.screen.width, app.screen.height, season);
  houseView.layout(app.screen.width, app.screen.height, season);
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
  if (document.visibilityState === 'hidden') void saveNow().then(saveChalk);
});
window.addEventListener('pagehide', () => void saveNow().then(saveChalk));

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

// --- Blackboards you can draw on (the school) ---
let chalk: Chalkboard | null = null;
let chalkPlace: PlaceId | null = null;
let chalkTimer = 0;
let lastScritch = 0;

function layoutChalk() {
  const place = chalkPlace && placeById(chalkPlace);
  if (!chalk || !place?.chalkboard) return;
  chalk.layout(place.chalkboard(app.screen.width, app.screen.height), app.renderer.resolution);
}

async function saveChalk() {
  clearTimeout(chalkTimer);
  if (!chalk || !chalkPlace) return;
  try {
    await storage.setSetting(`chalk:${chalkPlace}`, chalk.getStrokes());
  } catch (err) {
    console.warn('Could not save the blackboard', err);
  }
}

async function setupChalk(id: PlaceId) {
  removeChalk();
  const place = placeById(id);
  if (!place?.chalkboard) return;
  chalk = new Chalkboard();
  chalkPlace = id;
  world.addChildAt(chalk, world.getChildIndex(backdrop) + 1);
  layoutChalk();
  const rect = place.chalkboard(app.screen.width, app.screen.height);
  const saved = await storage.getSetting<ChalkStroke[]>(`chalk:${id}`).catch(() => undefined);
  chalk.setStrokes(saved ?? startingDoodles(rect.w / rect.h));
  chalk.onChange = () => {
    clearTimeout(chalkTimer);
    chalkTimer = window.setTimeout(() => void saveChalk(), 600);
  };
  chalk.onScritch = () => {
    const now = performance.now();
    if (now - lastScritch > 110) (lastScritch = now), sfx.chalk();
  };
  chalk.onWipe = () => sfx.wipe();
  chalk.onPickChalk = () => sfx.pickup(1.5);
}

function removeChalk() {
  if (!chalk) return;
  void saveChalk();
  chalk.destroy({ children: true });
  chalk = null;
  chalkPlace = null;
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
  await setupChalk(id);
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

/** Show one screen (street, house or a place) and the right buttons for it. */
function setScreen(s: Screen) {
  screen = s;
  street.visible = s === 'street';
  houseView.visible = s === 'house';
  world.visible = s === 'place';
  showWeather();
  const inRoom = s === 'place' && !!current && placeById(current)?.parent === 'house';
  document.body.classList.toggle('on-street', s === 'street');
  document.body.classList.toggle('in-house', s === 'house');
  document.body.classList.toggle('in-room', inRoom);
  if (s !== 'place') {
    gallery.close();
    gestures.select(null);
  }
}

const animate = (ms: number, fn: (t: number) => void) => new Promise<void>((resolve) => tween(ms, fn, resolve));
let switching = false;

type Zoomable = { setZoom: (at: { x: number; y: number }, amount: number) => void };
const viewFor = (s: Screen): Zoomable | null => (s === 'street' ? street : s === 'house' ? houseView : null);

/** Zoom into something on this screen, then show the next screen. */
async function zoomIn(at: { x: number; y: number }, open: () => Promise<void> | void) {
  const view = viewFor(screen);
  await animate(380, (t) => {
    view?.setZoom(at, t);
    drawFade(ease.inOutSine(t));
  });
  await open();
  view?.setZoom(at, 0);
  await animate(300, (t) => drawFade(1 - t));
}

/** Fade out, show the outer screen, and zoom back out from where we were. */
async function zoomOut(to: 'street' | 'house', at: () => { x: number; y: number }, before: () => void) {
  await animate(220, (t) => drawFade(t));
  before();
  setScreen(to);
  const view = viewFor(to)!;
  const point = at();
  await animate(420, (t) => {
    view.setZoom(point, 1 - t);
    drawFade(1 - t);
  });
}

function rememberPlace(id: PlaceId | null) {
  try {
    if (id) sessionStorage.setItem('place', id);
    else sessionStorage.removeItem('place');
  } catch {
    /* fine */
  }
}

/** Open a place (from the street, or a room from the house). */
async function enterPlace(id: PlaceId, at: { x: number; y: number }) {
  if (switching) return;
  switching = true;
  sfx.dingDong();
  await zoomIn(at, async () => {
    await showPlace(id);
    setScreen('place');
  });
  rememberPlace(id);
  switching = false;
}

/** From the street into the house: choose a room. */
async function enterHouse(at: { x: number; y: number }) {
  if (switching) return;
  switching = true;
  sfx.dingDong();
  await zoomIn(at, () => setScreen('house'));
  switching = false;
}

/** The back button: a room goes back to the house, everything else to the street. */
async function goBack() {
  if (switching) return;
  switching = true;
  sfx.zoomOut();
  if (screen === 'place' && current) {
    await saveNow();
    const from = current;
    const toHouse = placeById(from)?.parent === 'house';
    await zoomOut(
      toHouse ? 'house' : 'street',
      () => (toHouse ? houseView.roomCentre(from as RoomId) : street.buildingCentre(from)),
      () => {
        clearCharacters();
        removeChalk();
        current = null;
        backdrop.clear();
      },
    );
    rememberPlace(null);
  } else if (screen === 'house') {
    await zoomOut('street', () => street.buildingCentre('house'), () => {});
  }
  switching = false;
}

street.onBuildingTap = () => gallery.close();
street.onEnter = (id, at) => void (id === 'house' ? enterHouse(at) : enterPlace(id, at));
houseView.onEnter = (id, at) => void enterPlace(id, at);
document.getElementById('map-button')!.addEventListener('click', () => void goBack());

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
  houseView.layout(app.screen.width, app.screen.height, season);
  weather.resize(app.screen.width, app.screen.height);
  drawBackdrop();
  layoutChalk();
  for (const ch of characters.children as Character[]) gestures.keepOnScreen(ch);
  saveSoon();
});

// --- Start on the street (or back in the same place after an update refresh) ---
weather.resize(app.screen.width, app.screen.height);
setSeason(season, false);
applyHouseSettings();
setScreen('street');
let resumePlace: string | null = null;
try {
  resumePlace = sessionStorage.getItem('place');
} catch {
  /* fine */
}
if (resumePlace && placeById(resumePlace)) {
  await showPlace(resumePlace as PlaceId);
  setScreen('place');
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
    app, gestures, characters, library, storage, street, houseView, saveNow, enterPlace, enterHouse, goBack,
    screen: () => screen,
    chalk: () => chalk,
    place: () => current, setSeason, weather, setMuted, audioState, sfx, Ticker,
  });
}
