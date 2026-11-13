import { Application, Container, Graphics, Text, Ticker } from 'pixi.js';
import { Camera } from './camera';
import { Chalkboard, startingDoodles, type ChalkStroke } from './chalkboard';
import { drawClockHands } from './clock';
import { createEggs, createHouseEggs, createStreetEggs } from './eggs';
import { Character } from './character';
import { cutoutFromBlob } from './cutout';
import { FlipButton } from './flipButton';
import { burst, hearts } from './fx';
import { setupGallery, type GalleryPick } from './gallery';
import { GestureController } from './gestures';
import { Library } from './library';
import { loadImage } from './loadImage';
import { setupGrownUpShare } from './photoShare';
import { setupHouseSettings, upgradeHouseSettings, type HouseSettings } from './houseSettings';
import { NO_PLAYERS, PLAYER_IDS, setupPlayers, type PlayerId, type Players } from './players';
import { HouseView, ROOM_FURNITURE } from './houseView';
import { BUILTIN, FLOOR, PLACES, placeById, RESIDENTS, STREET, type PlaceId } from './places';
import { CRITTERS, DRAWN_FLY, DRAWN_HOP, DRAWN_WALK, Flyer, sayHellos, Wanderer } from './critters';
import { MOTIONS } from './library';
import { setupMaker, type MakerMode } from './maker';
import { setupAdopt } from './adopt';
import type { PetKind, PetRecipe } from './petArt';
import { PETS } from './pets';
import type { PersonRecipe } from './personArt';
import type { CritterKind } from './critters';
import { MoveButton } from './moveButton';
import { feetOf, furnitureSurface, Physics, SHELVES, type Surface, type World } from './physics';
import { BEAR_REACTIONS, SOUND_FOR, SQUISH_REACTIONS } from './reactions';
import { Bus, FOOD_FOR, TREASURES, type Lock, type SecretsApi } from './secrets';
import { audioState, setMuted, sfx, unlockAudio } from './sound';
import { storage, type SceneItem } from './storage';
import { SEASONS, Weather, type Season } from './seasons';
import { Sky } from './sky';
import { StreetView } from './street';
import { shelves } from './toyGroups';
import { WIDE } from './wideRooms';
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
//   world:    the place you're in. Its `room` holds the background, surprises
//             and characters, and slides sideways in the wide rooms; the
//             arrows and the flip button stay put on the screen.
//   street:   the neighbourhood map
//   sparkles: star bursts, on top of whichever is showing
//   fade:     white flash when moving between the street and a place
const world = new Container();
const camera = new Camera();
const room = camera.view;
const backdrop = new Graphics();
const characters = new Container();
const roomSparkles = new Container(); // star bursts from surprises (they slide with the room)
const ui = new Container();
const roomSky = new Sky(); // outdoors: the sky with drifting clouds, behind the picture
room.addChild(roomSky, backdrop, characters, roomSparkles);
world.addChild(room, camera.arrows, ui);
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

// A fresh start for the worlds (once): the house pets moved out so the
// kids' adopted pets can move in. Drawings, players and settings are kept.
if ((await storage.getSetting<number>('world-version').catch(() => 2)) !== 2) {
  await storage.resetWorlds().catch(() => {});
  await storage.setSetting('world-version', 2).catch(() => {});
}

/** A person made in the maker (their size and name), if this character is one. */
function personOf(ch: Character): PersonRecipe | null {
  if (ch.ref.kind !== 'photo') return null;
  const e = library.get(ch.ref.id);
  return e?.made === 'person' && e.recipe ? (e.recipe as PersonRecipe) : null;
}
/** How made people get about: grown-ups stroll and wave, kids skip and jump. */
const PEOPLE: Record<PersonRecipe['age'], CritterKind> = {
  grown: { url: '', size: 0.95, gait: 'walk', speed: 0.06, trick: 'wave', voice: () => sfx.yippee(0.85) },
  big: { url: '', size: 0.85, gait: 'walk', speed: 0.08, trick: 'jump', voice: () => sfx.giggle(1.2) },
  little: { url: '', size: 0.75, gait: 'walk', speed: 0.08, trick: 'jump', voice: () => sfx.giggle(1.4) },
};

/** An adopted pet's kind (and name), if this character is one. */
function petOf(ch: Character): PetRecipe | null {
  if (ch.ref.kind !== 'photo') return null;
  const e = library.get(ch.ref.id);
  return e?.made === 'pet' && e.recipe ? (e.recipe as PetRecipe) : null;
}
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

// --- The house number and room names: typed in on this iPad, saved only here ---
let houseSettings: HouseSettings = { number: '', rooms: {} };
try {
  const saved = await storage.getSetting<Partial<HouseSettings> & { sign?: string }>('house');
  if (saved) {
    const { settings, changed } = upgradeHouseSettings(saved);
    houseSettings = settings;
    // An older version saved a whole address: keep only the number, forget the rest.
    if (changed) await storage.setSetting('house', houseSettings);
  }
} catch {
  /* fine */
}
function applyHouseSettings() {
  street.setHouseNumber(houseSettings.number);
  houseView.setNames(houseSettings.rooms);
}
// --- Two players, each with their own world (names and codes saved on this iPad only) ---
let players: Players = NO_PLAYERS;
try {
  players = { ...NO_PLAYERS, ...((await storage.getSetting<Players>('players')) ?? {}) };
} catch {
  /* fine */
}
/** Who's playing right now (null until someone has picked). */
let player: PlayerId | null = null;

setupHouseSettings({
  get: () => houseSettings,
  save(s) {
    houseSettings = s;
    applyHouseSettings();
    void storage.setSetting('house', s).catch(() => {});
  },
  getPlayers: () => players,
  savePlayers(p) {
    players = p;
    void storage.setSetting('players', p).catch(() => {});
  },
  // press and hold the house; with a master code set, it's asked for first
  open: (fn) => (street.onHouseHold = () => picker.grownUp(fn)),
});

// --- Seasons: picked on the street; colours the street and the park, with
// blossom, butterflies, leaves or snow.
const savedSeason = await storage.getMine<Season>('season').catch(() => undefined);
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
  setupViewEggs();
  drawBackdrop();
  weather.set(s);
  if (withSound) sfx.season(s);
  void storage.setMine('season', s).catch(() => {});
}
for (const b of seasonButtons) b.addEventListener('click', () => setSeason(b.dataset.season as Season));

function drawFade(alpha: number) {
  fade.clear();
  if (alpha > 0) fade.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0xffffff, alpha });
}

// --- Room size. A place's main view is the size of the screen (a bit wider in
// the wide rooms when the iPad is upright, so they don't look squashed).
// The wide rooms carry on to the left (negative x) and right (beyond it).
// Saved positions are fractions of the main view, so older saves still fit.
let panel = 1; // width of the current place's main view
let roomH = 1; // and its height (the screen's)

function panelWidth(id: PlaceId) {
  const { width: w, height: h } = app.screen;
  return WIDE[id] ? Math.max(w, Math.round(h * 1.3)) : w;
}

function roomEdges(id: PlaceId, P = panelWidth(id)) {
  const wide = WIDE[id];
  return { x0: -(wide?.left ?? 0) * P, x1: (1 + (wide?.right ?? 0)) * P };
}

/** Fit the room to the screen (when opening a place, or when the iPad turns). */
function sizeRoom(id: PlaceId) {
  panel = panelWidth(id);
  roomH = app.screen.height;
  const { x0, x1 } = roomEdges(id, panel);
  camera.setRoom(x0, x1, app.screen.width, roomH);
}

function drawBackdrop() {
  backdrop.clear();
  if (current) {
    const place = placeById(current)!;
    roomSky.set(place.sky?.(panel, roomH, season) ?? null);
    place.drawBackdrop(backdrop, panel, roomH, season);
    WIDE[current]?.draw(backdrop, panel, roomH, season);
  }
  updateClocks();
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
  const items: SceneItem[] = [];
  for (const ch of characters.children as Character[]) {
    if (ch.destroyed || ch.eventMode === 'none') continue; // being put away
    if (ch.ref.kind === 'photo' && !ch.ref.id) continue; // still being saved
    items.push({
      ...ch.ref,
      x: ch.x / panel,
      y: ch.y / roomH,
      scale: ch.scale.x,
      rotation: ch.rotation,
      facing: ch.facing < 0 ? -1 : 1,
    });
  }
  try {
    await storage.saveScene(place, { version: 1, items, scroll: camera.x / panel, residents: true });
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

// The move button: only beside the kids' own drawings. Each tap picks the
// next way of getting about (still, walk, hop, fly). The drawing remembers.
const moveButton = new MoveButton(() => {
  const ch = gestures.selected;
  if (!ch || ch.ref.kind !== 'photo') return;
  const id = ch.ref.id;
  const next = MOTIONS[(MOTIONS.indexOf(library.motion(id)) + 1) % MOTIONS.length];
  library.setMotion(id, next);
  moveButton.draw(next);
  ({ still: () => sfx.poof(), walk: () => sfx.pickup(1.2), hop: () => sfx.boing(1.3), fly: () => sfx.buzz() })[next]();
  // every copy of this drawing here changes too
  for (const other of characters.children as Character[]) {
    if (other.ref.kind === 'photo' && other.ref.id === id) startMoving(other, true);
  }
});
ui.addChild(moveButton);

gestures.onSelect = (ch) => {
  if (ch) flipButton.show();
  else flipButton.hide();
  if (ch?.ref.kind === 'photo' && !petOf(ch) && !personOf(ch)) moveButton.show(library.motion(ch.ref.id)); // (pets and people move by themselves)
  else moveButton.hide();
};

// --- Sliding along the wide rooms: drag empty space, let go to glide; carry
// a character to the edge of the screen and the room slides along with it.
/** What a finger on empty space slides: the room (in a place) or the map (on the street). */
const slider = () => (screen === 'place' ? camera : screen === 'street' ? street.camera : null);
gestures.canPan = () => !!slider()?.scrolls;
gestures.onPanStart = () => {
  slider()?.hold();
  follow = null; // sliding the room yourself
};
gestures.onPan = (dx) => slider()?.drag(dx);
gestures.onPanEnd = (vx) => {
  slider()?.fling(vx);
  if (screen === 'place') saveSoon();
};
gestures.bounds = () => {
  if (screen !== 'place' || !current) return { x0: 0, x1: app.screen.width, y0: 0, y1: app.screen.height };
  const { x0, x1 } = roomEdges(current, panel);
  return { x0, x1, y0: 0, y1: roomH };
};
camera.onMove = () => gestures.refresh();
const EDGE = 90; // carrying a character this close to the edge slides the room
app.ticker.add((t) => {
  if (screen !== 'place') return;
  camera.update(t.deltaMS);
  roomSky.update(t.deltaMS);
  if (current && !switching) {
    physics.update(t.deltaMS, physicsWorld());
    // things riding on a furniture toy that's being carried go with it
    // keep a thrown thing (or the dog fetching it) in view
    if (follow) {
      const f = follow;
      const done = f.ch.destroyed || (f.dog ? !f.dog.isFetching : !physics.active(f.ch));
      if (done) follow = null;
      else if (camera.scrolls) {
        const W = app.screen.width, sx = f.ch.x - camera.x;
        const off = sx < W * 0.2 ? sx - W * 0.2 : sx > W * 0.8 ? sx - W * 0.8 : 0;
        if (off) camera.set(camera.x + off * Math.min(1, t.deltaMS * 0.006));
      }
    }
    for (const [furniture, list] of riders) {
      if (furniture.destroyed || !gestures.isHeld(furniture)) {
        riders.delete(furniture);
        continue;
      }
      for (const r of list) if (!r.ch.destroyed && !gestures.isHeld(r.ch)) r.ch.position.set(furniture.x + r.dx, furniture.y + r.dy);
    }
  }
  const p = gestures.dragPoint;
  if (!p || !camera.scrolls || gallery.isOver(p.x, p.y)) return;
  const W = app.screen.width;
  const k = p.x < EDGE ? -(1 - p.x / EDGE) : p.x > W - EDGE ? (p.x - (W - EDGE)) / EDGE : 0;
  if (k) camera.set(camera.x + k * 0.8 * t.deltaMS);
});

/** A point on the screen, in room coordinates. */
const toRoom = (x: number, y: number) => characters.toLocal({ x, y });

// --- Throwing, falling and bouncing (see physics.ts) ---
const physics = new Physics();
/** What each thing is resting on (a furniture toy), so it rides along when that's moved. */
const restingOn = new WeakMap<Character, Character>();
/** While a furniture toy is carried: what's riding on it, and where. */
const riders = new Map<Character, { ch: Character; dx: number; dy: number }[]>();
/** Balls that were thrown (for the dog to fetch): where they were let go. */
const thrownFrom = new WeakMap<Character, number>();
/** In the wide rooms, the room slides along to keep a thrown thing in view (then the dog fetching it). */
let follow: { ch: Character; dog?: Wanderer } | null = null;

/** The floor, walls and everything you can put things on, here and now. */
function physicsWorld(): World {
  const id = current!;
  const { x0, x1 } = roomEdges(id, panel);
  const surfaces: Surface[] = (SHELVES[id] ?? []).map(([a, b, y]) => ({ x0: a * panel, x1: b * panel, y: y * roomH }));
  for (const ch of characters.children as Character[]) {
    if (ch.destroyed || gestures.isHeld(ch) || physics.active(ch)) continue;
    const s = furnitureSurface(ch);
    if (s) surfaces.push(s);
  }
  return { x0, x1, floor: roomH * FLOOR[id], bottom: roomH, surfaces };
}

/** Flying drawings don't fall. */
const floats = (ch: Character) => wanderers.get(ch) instanceof Flyer;

/** Let go: falls if it's up in the air, flies if it was flicked. */
function letGo(ch: Character, vx = 0, vy = 0) {
  if (!current || ch.destroyed || ch.eventMode === 'none' || floats(ch)) return false;
  restingOn.delete(ch);
  return physics.release(ch, vx, vy, physicsWorld());
}

physics.onLand = (ch, speed, bounced, on) => {
  if (on?.bounce && on.bounce > 0.8) sfx.spring(voice(ch) * 1.2);
  else if (bounced && speed > 0.6) sfx.boing(voice(ch) * 1.15);
  else if (bounced) sfx.drop(voice(ch) * 1.2);
  if (speed > 0.9) ch.react('squish');
};
/** On the ice rink, things thrown along the ice keep gliding. */
const iceGlide = new WeakMap<Character, number>();
const glides = new WeakMap<Character, () => void>();
function glide(ch: Character, vx: number) {
  glides.get(ch)?.(); // hit again while still gliding: off it goes the new way
  const { x0, x1 } = roomEdges(current!, panel);
  const from = ch.x, to = Math.max(x0 + 40, Math.min(x1 - 40, from + vx * 800));
  sfx.whoosh();
  const stop = tween(1300, (t) => {
    if (!ch.destroyed) ch.x = from + (to - from) * ease.outCubic(t);
  }, () => {
    glides.delete(ch);
    if (!ch.destroyed && checkTargets(ch) !== 'used') saveSoon(); // into a net? goal!
  });
  glides.set(ch, stop);
}

// --- Hockey: swing the stick into the puck (or a ball) and it shoots off ---
const stickMoves = new WeakMap<Character, { x: number; y: number; t: number; vx: number; vy: number }>();
const lastHit = new WeakMap<Character, number>();
function swingStick(stick: Character, sx: number, sy: number) {
  const now = performance.now();
  const p = toRoom(sx, sy);
  const prev = stickMoves.get(stick);
  let vx = 0, vy = 0;
  if (prev && now - prev.t > 4) {
    vx = prev.vx * 0.4 + ((p.x - prev.x) / (now - prev.t)) * 0.6;
    vy = prev.vy * 0.4 + ((p.y - prev.y) / (now - prev.t)) * 0.6;
  }
  stickMoves.set(stick, { x: p.x, y: p.y, t: now, vx, vy });
  if (Math.hypot(vx, vy) < 0.2) return; // only a real swing hits
  const b = roomBox(stick);
  const blade = { x: b.x, y: b.y + b.h * 0.65, w: b.w, h: b.h * 0.35 }; // the bottom of the stick
  for (const o of characters.children as Character[]) {
    if (o === stick || o.destroyed || o.ref.kind !== 'sample' || (o.ref.name !== 'puck' && o.ref.name !== 'ball')) continue;
    if (now - (lastHit.get(o) ?? 0) < 350 || gestures.isHeld(o)) continue;
    if (!over(roomBox(o), blade, 0.7)) continue;
    lastHit.set(o, now);
    sfx.clack();
    o.react('squish');
    const hx = Math.sign(vx || 1) * Math.max(0.7, Math.min(2.2, Math.abs(vx) * 1.5));
    if (current === 'arena') glide(o, hx); // along the ice (into a net, with luck)
    else {
      thrownFrom.set(o, o.x); // a ball the dog might fetch
      letGo(o, hx, Math.min(-0.4, vy * 1.2)); // up it pops
    }
  }
}

physics.onSettle = (ch, on, spun) => {
  const iceVx = iceGlide.get(ch);
  iceGlide.delete(ch);
  if (current === 'arena' && !on && iceVx && Math.abs(iceVx) > 0.08) glide(ch, iceVx);
  // thrown onto a secret spot, or onto a hungry animal?
  if (aimed.has(ch)) {
    aimed.delete(ch);
    if (checkTargets(ch) === 'used') return;
  }
  sfx.drop(voice(ch));
  if (on?.owner) {
    restingOn.set(ch, on.owner);
    // sitting on the furniture, so in front of it
    if (characters.getChildIndex(ch) < characters.getChildIndex(on.owner)) characters.addChild(ch);
  }
  // stand back up after a spinning throw
  if (spun) {
    const from = ch.rotation;
    const to = Math.round(from / (Math.PI * 2)) * Math.PI * 2;
    tween(250, (t) => !ch.destroyed && (ch.rotation = from + (to - from) * t), () => !ch.destroyed && (ch.rotation = 0));
  }
  wanderers.get(ch)?.rest(900);
  const from = thrownFrom.get(ch);
  if (from !== undefined && !on) {
    thrownFrom.delete(ch);
    fetchBall(ch, from);
  }
  saveSoon();
};

/** A dog sees a ball land: off it goes to fetch it. */
function fetchBall(ball: Character, homeX: number) {
  let best: Wanderer | null = null;
  for (const ch of characters.children as Character[]) {
    const w = wanderers.get(ch);
    const pet = petOf(ch);
    const fetcher = (ch.ref.kind === 'sample' && ch.ref.name === 'dog') || (pet && PETS[pet.kind]?.fetches);
    if (!(w instanceof Wanderer) || !fetcher) continue;
    if (w.isFetching || gestures.isHeld(ch) || physics.active(ch) || feetOf(ch) < roomH * FLOOR[current!]) continue;
    if (!best || Math.abs(ch.x - ball.x) < Math.abs(best.ch.x - ball.x)) best = w;
  }
  if (!best) return;
  const dog = best;
  if (follow?.ch === ball) follow = { ch: ball, dog }; // keep watching the ball: the dog brings it back
  dog.fetch(
    ball,
    { x: homeX, y: dog.ch.y },
    () => !ball.destroyed && !gestures.isHeld(ball) && !physics.active(ball),
    () => letGo(ball, dog.ch.facing * 0.25, -0.5),
  );
}

// --- Animals, little people and the kids' drawings moving about by themselves (see critters.ts) ---
type Brain = Wanderer | Flyer;
const wanderers = new WeakMap<Character, Brain>();

/** Give a character the right "brain" for how it moves (or none if it stays still). */
function startMoving(ch: Character, justChanged = false) {
  ch.sprite.position.set(0, 0);
  ch.sprite.rotation = 0;
  wanderers.delete(ch);
  let brain: Brain | null = null;
  const pet = petOf(ch);
  if (ch.ref.kind === 'sample' && CRITTERS[ch.ref.name]) brain = new Wanderer(ch, CRITTERS[ch.ref.name]);
  else if (pet && PETS[pet.kind]) brain = PETS[pet.kind].fly ? new Flyer(ch, PETS[pet.kind]) : new Wanderer(ch, PETS[pet.kind]);
  else if (personOf(ch)) brain = new Wanderer(ch, PEOPLE[personOf(ch)!.age] ?? PEOPLE.big);
  else if (ch.ref.kind === 'photo') {
    const m = library.motion(ch.ref.id);
    if (m === 'walk') brain = new Wanderer(ch, DRAWN_WALK);
    else if (m === 'hop') brain = new Wanderer(ch, DRAWN_HOP);
    else if (m === 'fly') brain = new Flyer(ch, DRAWN_FLY);
    // just told to walk or hop while up in the air: jump down to the floor first
    if (justChanged && (m === 'walk' || m === 'hop') && current) dropToFloor(ch);
    if (justChanged && m === 'fly') brain?.rest(150);
  }
  if (!brain) return null;
  brain.onMoved = critterMoved;
  wanderers.set(ch, brain);
  return brain;
}

/** Hop down onto the floor (for a drawing that's just been told to walk). */
function dropToFloor(ch: Character) {
  if (!current) return;
  const floor = roomH * FLOOR[current];
  const feet = ch.y + ch.restY * ch.scale.y;
  if (feet >= floor + 8) return;
  const from = ch.y;
  const to = floor + (roomH - floor) * 0.4 - ch.restY * ch.scale.y;
  tween(450, (t) => {
    if (!ch.destroyed) ch.y = from + (to - from) * t * t;
  }, () => {
    if (ch.destroyed) return;
    ch.react('bounce');
    sfx.drop(voice(ch));
    saveSoon();
  });
}

let critterSaveTimer = 0;
/** They wander a lot, so save their spots now and then rather than every step. */
function critterMoved() {
  if (critterSaveTimer) return;
  critterSaveTimer = window.setTimeout(() => {
    critterSaveTimer = 0;
    void saveNow();
  }, 4000);
}
app.ticker.add((t) => {
  if (screen !== 'place' || !current || switching) return;
  const now = performance.now();
  const { x0, x1 } = roomEdges(current, panel);
  const area = { x0, x1, floor: roomH * FLOOR[current], bottom: roomH, screenW: app.screen.width };
  const list: Wanderer[] = [];
  const everyone = characters.children as Character[];
  for (const ch of everyone) {
    const w = wanderers.get(ch);
    if (!w || ch.destroyed || ch.eventMode === 'none') continue;
    const sx = ch.x - camera.x;
    w.update(Math.min(t.deltaMS, 50), area, gestures.isHeld(ch) || physics.active(ch), sx > 0 && sx < app.screen.width, now, everyone);
    if (w instanceof Wanderer) list.push(w);
  }
  sayHellos(list, now);
});

// Keep the flip button floating at the top-right corner of the selected character.
app.ticker.add(() => {
  const ch = gestures.selected;
  if (!ch || !flipButton.visible) return;
  const b = ch.getBounds();
  const r = FlipButton.SIZE / 2;
  const { width, height } = app.screen;
  flipButton.x = Math.min(width - r - 8, Math.max(r + 8, b.maxX + r * 0.3));
  flipButton.y = Math.min(height - r - 8 - MoveButton.SIZE - 12, Math.max(r + 8, b.minY - r * 0.3));
  // the move button sits just under it
  moveButton.position.set(flipButton.x, flipButton.y + FlipButton.SIZE + 12);
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
  // made in the workshop: squishies are small and squish, teddies hug
  const made = ref.kind === 'photo' ? library.get(ref.id)?.made : undefined;
  const petKind = made === 'pet' ? (library.get((ref as { id: string }).id)?.recipe as PetRecipe | undefined)?.kind : undefined;
  const personAge = made === 'person' ? (library.get((ref as { id: string }).id)?.recipe as PersonRecipe | undefined)?.age : undefined;
  const size =
    ref.kind === 'sample' ? (BUILTIN[ref.name]?.size ?? 1)
    : made === 'squishy' ? 0.5
    : made === 'bear' ? 0.7
    : petKind ? (PETS[petKind]?.size ?? 0.5)
    : personAge ? (PEOPLE[personAge]?.size ?? 0.85)
    : 1;
  const ch = new Character(picture, startSize() * size);
  ch.ref = ref;
  if (made === 'squishy') {
    ch.reactions = SQUISH_REACTIONS;
    ch.surprises = false;
  } else if (made === 'bear') ch.reactions = BEAR_REACTIONS;
  ch.position.set(at.x, at.y);
  if (at.scale) ch.scale.set(at.scale);
  if (at.rotation) ch.rotation = at.rotation;
  if (at.facing === -1) ch.setFacing(-1);
  characters.addChild(ch);
  gestures.keepOnScreen(ch);
  const brain = startMoving(ch);
  if (brain && tada) brain.rest(1500); // let it land before it moves off
  if (tada) {
    ch.popIn();
    const g = ch.getGlobalPosition();
    burst(sparkles, g.x, g.y);
    sfx.tada();
    gestures.select(ch);
  }
  saveSoon();
  return ch;
}

async function pictureFor(ref: Ref): Promise<HTMLCanvasElement | null> {
  if (ref.kind === 'sample') return BUILTIN[ref.name] ? svgPicture(builtinUrl(ref.name)) : null;
  // only drawings in this player's own toy box
  if (!library.mine().some((e) => e.id === ref.id)) return null;
  return library.picture(ref.id) ?? null;
}

// --- Clocks that show the real time (the classroom, and the school on the street) ---
const clockHands = new Graphics();
room.addChildAt(clockHands, room.getChildIndex(backdrop) + 1);
function updateClocks() {
  const now = new Date();
  street.updateClock(now);
  const c = current ? placeById(current)?.clock?.(panel, roomH) : undefined;
  if (c) drawClockHands(clockHands, c.x, c.y, c.r, now, true);
  else clockHands.clear();
}
setInterval(updateClocks, 1000);

// --- Hidden surprises in the rooms (tap things to find them) ---
const eggsUnder = new Container(); // on the walls and furniture, behind characters
const eggsOver = new Container(); // darkness, glows, things flying, in front of characters
room.addChildAt(eggsUnder, room.getChildIndex(characters));
room.addChildAt(eggsOver, room.getChildIndex(characters) + 1);
let eggsCleanup: (() => void) | null = null;

function teardownEggs() {
  eggsCleanup?.();
  eggsCleanup = null;
  locks = [];
  for (const layer of [eggsUnder, eggsOver, roomSparkles]) {
    for (const c of layer.removeChildren()) c.destroy({ children: true });
  }
}

function setupEggs(id: PlaceId) {
  teardownEggs();
  const { x0, x1 } = roomEdges(id, panel);
  events = new Bus();
  events.on('make', (what: MakerMode) => maker.open(what)); // the workshop's maker
  events.on('adopt', (kind: PetKind) => adopt.open(kind)); // the vet's adoption corner
  eggsCleanup = createEggs(id, { under: eggsUnder, over: eggsOver, sparkles: roomSparkles, w: panel, h: roomH, season, x0, x1, sky: roomSky, secrets, events });
}

// --- Secrets: deeper surprises (see secrets.ts and eggs/secrets.ts) ---
/** What this player has found ("toy:crown" = the crown is in their toy box now). */
let found = new Set<string>();
/** Spots in this place that something can be dropped onto. */
let locks: Lock[] = [];
/** This place's surprises tell its secrets what happened. */
let events = new Bus();

// --- Adopting a pet at the vet (see adopt.ts): it comes to say hello, and it's theirs ---
const adopt = setupAdopt({
  async onAdopt(recipe, picture) {
    const entry = await library.add(picture, { kind: 'pet', recipe });
    if (!current) return;
    const ch = addCharacter(picture, { kind: 'photo', id: entry.id }, toRoom(app.screen.width / 2, app.screen.height * 0.5), true);
    hearts(roomSparkles, ch.x, ch.y - ch.size / 2, 10);
    setTimeout(() => letGo(ch), 650);
    setTimeout(() => !ch.destroyed && nameBubble(ch, recipe.name), 900);
  },
});

// --- The workshop's maker: teddies and squishies (see maker.ts) ---
const maker = setupMaker({
  async onDone(kind, picture, recipe) {
    const entry = await library.add(picture, { kind, recipe, shared: kind === 'person' }); // people are everyone's
    if (!current) return;
    // here it comes! (and it's in the toy box now too)
    const ch = addCharacter(picture, { kind: 'photo', id: entry.id }, toRoom(app.screen.width / 2, app.screen.height * 0.45), true);
    setTimeout(() => letGo(ch), 650);
  },
});

async function loadSecrets() {
  found = new Set((await storage.getMine<string[]>('secrets').catch(() => undefined)) ?? []);
}

const secrets: SecretsApi = {
  has: (id) => found.has(id),
  find(id, toy, at) {
    const first = !found.has(id);
    found.add(id);
    if (toy) found.add(`toy:${toy}`);
    void storage.setMine('secrets', [...found]).catch(() => {});
    if (first) setTimeout(() => sfx.tune([784, 988, 1175, 1568], 0.11), 250);
    if (!toy || !current) return;
    const place = current;
    void pictureFor({ kind: 'sample', name: toy }).then((pic) => {
      if (!pic || current !== place) return;
      const p = at ?? toRoom(app.screen.width / 2, app.screen.height * 0.4);
      const ch = addCharacter(pic, { kind: 'sample', name: toy }, p, true);
      setTimeout(() => letGo(ch), 650);
    });
  },
  lock(l) {
    locks.push(l);
  },
};

/** A character's box in room coordinates. */
function roomBox(ch: Character) {
  const b = ch.getBounds();
  const a = toRoom(b.minX, b.minY), c = toRoom(b.maxX, b.maxY);
  return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
}
type Box = ReturnType<typeof roomBox>;
/** Is the middle of `box` over `r` (with a little slack)? */
function over(box: Box, r: Box, slack = 0.25) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const mx = box.w * slack, my = box.h * slack;
  return cx > r.x - mx && cx < r.x + r.w + mx && cy > r.y - my && cy < r.y + r.h + my;
}

/** Used up: it shrinks away into `to` (a lock, or an animal's mouth). */
function gobble(ch: Character, to: { x: number; y: number }, ms = 380) {
  gestures.release(ch);
  physics.stop(ch);
  ch.eventMode = 'none';
  const from = { x: ch.x, y: ch.y, s: ch.scale.x };
  tween(
    ms,
    (t) => {
      const e = ease.inOutSine(t);
      ch.x = from.x + (to.x - from.x) * e;
      ch.y = from.y + (to.y - from.y) * e;
      ch.scale.set(Math.max(0.01, from.s * (1 - e)));
    },
    () => {
      characters.removeChild(ch);
      ch.destroy({ children: true });
      saveSoon();
    },
  );
}

/** Food dropped onto an animal (or person) that likes it: munch munch, hearts. */
function feed(food: Character) {
  if (food.ref.kind !== 'sample') return false;
  const name = food.ref.name;
  const box = roomBox(food);
  const eater = (characters.children as Character[])
    .filter((o) => o !== food && !o.destroyed && (o.ref.kind === 'sample' ? FOOD_FOR[o.ref.name] : PETS[petOf(o)?.kind as PetKind]?.food)?.includes(name))
    .reverse()
    .find((o) => over(box, roomBox(o), 0.4));
  if (!eater) return false;
  const e = roomBox(eater);
  const mouth = { x: e.x + e.w * (eater.facing === 1 ? 0.65 : 0.35), y: e.y + e.h * 0.3 };
  gobble(food, mouth, 450);
  const brain = wanderers.get(eater);
  brain?.rest(2600);
  if (brain instanceof Wanderer) brain.face(food.x);
  [450, 620, 790].forEach((ms, i) => setTimeout(() => sfx.pop(1.6 - i * 0.15), ms));
  setTimeout(() => {
    if (eater.destroyed) return;
    hearts(roomSparkles, e.x + e.w / 2, e.y + e.h * 0.2);
    eater.react('super');
    if (brain instanceof Wanderer) {
      brain.kind.voice();
      brain.doTrick('jump');
    } else sfx.yippee(voice(eater));
    if (eater.ref.kind === 'sample') secrets.find(`fed:${eater.ref.name}`);
  }, 950);
  return true;
}

/** The magic wand dropped onto someone: a colour change, a grow, a shrink or a whirl. */
const WAND_COLOURS = [0xff9ecf, 0x9ad0ff, 0xa8f0a0, 0xffe066, 0xc9a7ff, 0xffb38a];
let spell = 0;
function wave(wand: Character) {
  if (wand.ref.kind !== 'sample' || wand.ref.name !== 'magic-wand') return false;
  const box = roomBox(wand);
  const target = (characters.children as Character[])
    .filter((o) => o !== wand && !o.destroyed && o.eventMode !== 'none')
    .reverse()
    .find((o) => over(box, roomBox(o), 0.3));
  if (!target) return false;
  sfx.twinkle();
  const p = target.getGlobalPosition();
  burst(sparkles, p.x, p.y, 20, 170);
  const kind = spell++ % 5;
  if (kind === 0 || kind === 3) {
    // a new colour (back to normal after the last one)
    const i = WAND_COLOURS.indexOf(target.sprite.tint as number);
    target.sprite.tint = i === WAND_COLOURS.length - 1 ? 0xffffff : WAND_COLOURS[(i + 1) % WAND_COLOURS.length];
    target.react('squish');
  } else if (kind === 1 || kind === 4) {
    // bigger or smaller
    const from = target.scale.x;
    const to = from > 1.3 ? from * 0.55 : from < 0.75 ? from * 1.6 : from * (Math.random() < 0.5 ? 1.5 : 0.65);
    sfx.slideWhistle(to > from ? 1.2 : 0.8);
    tween(500, (t) => !target.destroyed && target.scale.set(from + (to - from) * ease.outBack(t)), () => saveSoon());
  } else {
    sfx.yippee(voice(target));
    target.react('super');
  }
  return true;
}

/** Something was let go: is it on a secret spot, a hungry animal, or is it the wand? */
function checkTargets(ch: Character): 'used' | 'kept' | null {
  if (!current || ch.destroyed) return null;
  const name = ch.ref.kind === 'sample' ? ch.ref.name : '';
  const box = roomBox(ch);
  for (const l of [...locks].reverse()) {
    if (!l.accepts.includes(name) && !l.accepts.includes('*')) continue;
    const a = l.area();
    if (!over(box, a)) continue;
    let keep: boolean | void = false;
    try {
      keep = l.open(name, ch);
    } catch (err) {
      console.warn('Secret failed', err);
    }
    if (keep) return 'kept';
    gobble(ch, { x: a.x + a.w / 2, y: a.y + a.h / 2 });
    return 'used';
  }
  if (ch.ref.kind !== 'sample') return null;
  if (feed(ch)) return 'used';
  if (wave(ch)) return 'kept';
  return null;
}
/** Let go and missed: check again where it lands (thrown onto something). */
const aimed = new WeakSet<Character>();

// Surprises on the street and outside the house (rebuilt when they're laid out again).
let viewEggsCleanup: (() => void) | null = null;
function setupViewEggs() {
  viewEggsCleanup?.();
  for (const layer of [street.eggs, street.eggsFront, houseView.eggsBehind, houseView.eggs, houseView.eggsFront]) {
    for (const c of layer.removeChildren()) c.destroy({ children: true });
  }
  const { width: w, height: h } = app.screen;
  const a = createStreetEggs({ under: street.eggs, over: street.eggsFront, sparkles: street.sparkles, w: street.geom.w, h, season, sky: street.sky }, street.geom);
  const b = createHouseEggs({ under: houseView.eggs, over: houseView.eggsFront, sparkles, w, h, season, sky: houseView.sky }, houseView.eggsBehind, houseView.geom);
  viewEggsCleanup = () => (a(), b());
}

// --- Blackboards you can draw on (the school) ---
let chalk: Chalkboard | null = null;
let chalkPlace: PlaceId | null = null;
let chalkTimer = 0;
let lastScritch = 0;

function layoutChalk() {
  const place = chalkPlace && placeById(chalkPlace);
  if (!chalk || !place?.chalkboard) return;
  chalk.layout(place.chalkboard(panel, roomH), app.renderer.resolution);
}

async function saveChalk() {
  clearTimeout(chalkTimer);
  if (!chalk || !chalkPlace) return;
  try {
    await storage.setMine(`chalk:${chalkPlace}`, chalk.getStrokes());
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
  room.addChildAt(chalk, room.getChildIndex(backdrop) + 1);
  layoutChalk();
  const rect = place.chalkboard(panel, roomH);
  const saved = await storage.getMine<ChalkStroke[]>(`chalk:${id}`).catch(() => undefined);
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
  physics.clear();
  riders.clear();
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
  sizeRoom(id);
  drawBackdrop();
  await setupChalk(id);
  setupEggs(id);
  const saved = await storage.loadScene(id).catch(() => null);
  const W = panel, H = roomH;
  // Start where we were last time (or with the room's main view in the middle).
  camera.hold();
  camera.set(saved?.scroll !== undefined ? saved.scroll * W : (W - app.screen.width) / 2);
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
  // The animals and little people who live here move in (just once, even
  // into a scene that was saved before they existed).
  const newcomers = !saved?.residents;
  if (newcomers) {
    for (const s of RESIDENTS[id] ?? []) {
      const pic = await svgPicture(builtinUrl(s.name));
      addCharacter(pic, { kind: 'sample', name: s.name }, { x: s.x * W, y: s.y * H });
    }
  }
  // what's sitting on which furniture (so it rides along when that's moved)
  for (const ch of characters.children as Character[]) {
    const feet = feetOf(ch);
    for (const other of characters.children as Character[]) {
      const s = other !== ch ? furnitureSurface(other) : null;
      if (s && ch.x >= s.x0 && ch.x <= s.x1 && Math.abs(feet - s.y) < 4) restingOn.set(ch, other);
    }
  }
  restoring = false;
  if (!saved || newcomers) void saveNow();
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
  try {
    await open();
  } catch (err) {
    console.warn('Could not open that place', err); // still fade back in, never stay white
  }
  view?.setZoom(at, 0);
  await animate(300, (t) => drawFade(1 - t));
  drawFade(0);
}

/** Fade out, show the outer screen, and zoom back out from where we were. */
async function zoomOut(to: 'street' | 'house', at: () => { x: number; y: number }, before: () => void) {
  await animate(220, (t) => drawFade(t));
  try {
    before();
  } catch (err) {
    console.warn('Could not tidy up', err);
  }
  setScreen(to);
  const view = viewFor(to)!;
  const point = at();
  await animate(420, (t) => {
    view.setZoom(point, 1 - t);
    drawFade(1 - t);
  });
  view.setZoom(point, 0);
  drawFade(0);
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
  try {
    await zoomIn(at, async () => {
      await showPlace(id);
      setScreen('place');
    });
    rememberPlace(id);
  } finally {
    switching = false;
  }
}

/** From the street into the house: choose a room. */
async function enterHouse(at: { x: number; y: number }) {
  if (switching) return;
  switching = true;
  sfx.dingDong();
  try {
    await zoomIn(at, () => setScreen('house'));
  } finally {
    switching = false;
  }
}

/** The back button: a room goes back to the house, everything else to the street. */
async function goBack() {
  if (switching) return;
  switching = true;
  sfx.zoomOut();
  try {
    if (screen === 'place' && current) {
      await saveNow();
      const from = current;
      const toHouse = placeById(from)?.parent === 'house';
      await zoomOut(
        toHouse ? 'house' : 'street',
        () => (toHouse ? houseView.roomCentre(from) : street.buildingCentre(from)),
        () => {
          current = null;
          clearCharacters();
          removeChalk();
          teardownEggs();
          backdrop.clear();
        },
      );
      rememberPlace(null);
    } else if (screen === 'house') {
      await zoomOut('street', () => street.buildingCentre('house'), () => {});
    }
  } finally {
    switching = false;
  }
}

street.onBuildingTap = () => gallery.close();
street.onEnter = (id, at) => void (id === 'house' ? enterHouse(at) : enterPlace(id, at));
houseView.onEnter = (id, at) => void enterPlace(id, at);
document.getElementById('map-button')!.addEventListener('click', () => void goBack());

// --- The toy box: a shelf of every character and toy, and somewhere to put them away ---
const gallery = setupGallery({
  library,
  shelves() {
    const place = current ? placeById(current) : undefined;
    // this place's tab shows its building from the map (the house for its rooms and garden)
    const building = STREET.find((s) => s.id === (place?.parent ?? current))?.building ?? 'buildings/house.svg';
    const treasures = new Set(Object.keys(TREASURES).filter((t) => found.has(`toy:${t}`)));
    return shelves(place?.toys ?? [], treasures, builtinUrl, base + building);
  },
  async onPick(pick: GalleryPick) {
    if (!current) return;
    const pic = await pictureFor(pick);
    if (!pic) return;
    const { width: W, height: H } = app.screen;
    const jitter = () => (Math.random() - 0.5) * Math.min(W, H) * 0.25;
    const at = toRoom(W / 2 + jitter(), H * 0.42 + jitter() * 0.4);
    if (pick.kind === 'sample' && CRITTERS[pick.name]) {
      // animals and people arrive standing on the floor, ready to wander off
      const floor = roomH * FLOOR[current];
      const feet = floor + (roomH - floor) * (0.35 + Math.random() * 0.3);
      const halfHeight = (startSize() * CRITTERS[pick.name].size * pic.height) / Math.max(pic.width, pic.height) / 2;
      at.y = feet - halfHeight;
    }
    const ch = addCharacter(pic, pick, at, true);
    setTimeout(() => letGo(ch), 650); // pops in, then drops to the floor
  },
  onDelete(id: string) {
    // Out of this player's toy box: it goes from this place too, in a puff of
    // stars. (Their other places simply skip it next time they open.)
    for (const ch of [...characters.children] as Character[]) {
      if (ch.ref.kind === 'photo' && ch.ref.id === id) {
        const g = ch.getGlobalPosition();
        burst(sparkles, g.x, g.y, 10, 90);
        gestures.release(ch);
        characters.removeChild(ch);
        ch.destroy({ children: true });
      }
    }
    void library.removeMine(id);
    saveSoon();
  },
});

/** Shrink a character into the toy box and take it out of the scene. */
function putAway(ch: Character) {
  gestures.release(ch);
  ch.eventMode = 'none';
  sfx.putAway(voice(ch));
  gallery.gulp();
  const c = gallery.centre();
  const target = toRoom(c.x, c.y);
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
  const brain = wanderers.get(ch);
  brain?.rest(1600); // stop for a moment
  // the animals and people answer in their own voice; drawings make their usual sounds
  if (brain && ch.ref.kind === 'sample') brain.kind.voice();
  else sfx[SOUND_FOR[name]](voice(ch));
  if (name === 'super') {
    const p = ch.getGlobalPosition();
    burst(sparkles, p.x, p.y, 20, 220);
  }
  if (name === 'hug') hearts(roomSparkles, ch.x, ch.y - (ch.size * ch.scale.y) / 2, 5);
  // an adopted pet: its name pops up above it
  const pet = petOf(ch);
  const person = personOf(ch);
  if (pet || person) {
    brain?.kind.voice();
    const name = (pet ?? person)!.name;
    if (name) nameBubble(ch, name);
  }
};

/** A pet's name in a little bubble that floats up and fades. */
function nameBubble(ch: Character, name: string) {
  const bubble = new Container();
  const label = new Text({ text: name, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 26, fontWeight: '800', fill: 0x3a2a00 } });
  label.anchor.set(0.5);
  const bg = new Graphics().roundRect(-label.width / 2 - 16, -24, label.width + 32, 48, 24).fill(0xffd43b).stroke({ width: 4, color: 0x3a3a3a });
  bubble.addChild(bg, label);
  const y0 = ch.y - (ch.size * ch.scale.y) / 2 - 30;
  bubble.position.set(ch.x, y0);
  roomSparkles.addChild(bubble);
  tween(1800, (t) => {
    bubble.y = y0 - t * 40;
    bubble.alpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    bubble.scale.set(t < 0.15 ? t / 0.15 : 1);
  }, () => bubble.destroy({ children: true }));
}

// Squishies: press and hold still to squeeze; let go and it slowly puffs back up.
const squeezing = new Set<Character>();
app.ticker.add(() => {
  for (const ch of characters.children as Character[]) {
    if (ch.reactions !== SQUISH_REACTIONS) continue;
    const held = gestures.stillFor(ch);
    if (held === 0 && squeezing.delete(ch)) ch.unsqueeze(); // started carrying it instead
    if (held < 260) continue;
    if (!squeezing.has(ch)) {
      squeezing.add(ch);
      sfx.squish(voice(ch) * 0.8);
    }
    ch.squeeze(Math.min(1, (held - 260) / 900));
  }
});
gestures.onDragStart = (ch) => {
  sfx.pickup(voice(ch));
  gallery.hint(true);
};
gestures.onDragMove = (ch, x, y) => {
  gallery.highlight(gallery.isOver(x, y));
  if (ch.ref.kind === 'sample' && ch.ref.name === 'hockey-stick') swingStick(ch, x, y);
};
gestures.onGrab = (ch) => {
  follow = null;
  physics.stop(ch); // caught in mid-air
  restingOn.delete(ch);
  // picking up a furniture toy: whatever's on it comes too
  const list = (characters.children as Character[])
    .filter((o) => o !== ch && restingOn.get(o) === ch)
    .map((o) => ({ ch: o, dx: o.x - ch.x, dy: o.y - ch.y }));
  if (list.length) riders.set(ch, list);
  for (const r of list) characters.addChild(r.ch); // still in front of it
};
let justDropped: Character | null = null;
gestures.onDrop = (ch, x, y, vx, vy) => {
  justDropped = ch;
  gallery.highlight(false);
  gallery.hint(false);
  if (gallery.isOver(x, y)) return putAway(ch);
  const hit = checkTargets(ch);
  if (hit === 'used') return;
  if (!hit) aimed.add(ch);
  if (current === 'arena') iceGlide.set(ch, vx * 0.8);
  const speed = Math.hypot(vx, vy);
  if (speed > 0.7) sfx.whoosh();
  follow = speed > 0.7 ? { ch } : null;
  if (ch.ref.kind === 'sample' && ch.ref.name === 'ball' && speed > 0.5) thrownFrom.set(ch, toRoom(x, y).x);
  if (!letGo(ch, vx, vy)) sfx.drop(voice(ch)); // already standing on something
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
gestures.onGestureEnd = (ch) => {
  gallery.hint(false);
  if (squeezing.delete(ch) || ch.squeezed) {
    ch.unsqueeze();
    sfx.puff(voice(ch));
  }
  // let go up in the air (after a tap or a pinch too): down it comes
  if (ch !== justDropped && !physics.active(ch) && !gestures.isHeld(ch)) letGo(ch);
  justDropped = null;
  riders.delete(ch);
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
      const ch = addCharacter(result.canvas, { kind: 'photo', id: entry.id }, toRoom(app.screen.width / 2, app.screen.height * 0.5), true);
      setTimeout(() => letGo(ch), 650);
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
  setupViewEggs();
  weather.resize(app.screen.width, app.screen.height);
  if (current) {
    // Keep everyone in the same spot in the room, and the same part in view.
    const oldP = panel, oldH = roomH, oldX = camera.x;
    sizeRoom(current);
    for (const ch of characters.children as Character[]) ch.position.set((ch.x * panel) / oldP, (ch.y * roomH) / oldH);
    camera.set((oldX * panel) / oldP);
  }
  drawBackdrop();
  layoutChalk();
  if (current) setupEggs(current);
  for (const ch of characters.children as Character[]) gestures.keepOnScreen(ch);
  saveSoon();
});

// --- Who's playing? Each player has their own world: their own scenes,
// blackboards, season and toy box drawings. Choosing again needs their code.
const playerButton = document.getElementById('player-button')!;
const picker = setupPlayers({
  get: () => players,
  onChoose: (id) => void startAs(id),
});

/** Start playing as this player (and, after an update refresh, go back to where they were). */
async function startAs(id: PlayerId, resume = false) {
  player = id;
  storage.setProfile(id);
  library.player = id;
  await loadSecrets();
  try {
    sessionStorage.setItem('player', id);
  } catch {
    /* fine */
  }
  playerButton.innerHTML = document.querySelector(`#players [data-player="${id}"] svg`)?.outerHTML ?? '';
  const s = await storage.getMine<Season>('season').catch(() => undefined);
  setSeason(s && SEASONS.includes(s) ? s : 'spring', false);
  if (!resume) return;
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
}

// Change player (from the street): back to "who's playing?".
playerButton.addEventListener('click', () => {
  if (screen !== 'street' || switching) return;
  sfx.pling();
  picker.open();
});

// --- Start on the street, asking who's playing (or carry on as the same
// player after an update refresh) ---
weather.resize(app.screen.width, app.screen.height);
setSeason(season, false);
applyHouseSettings();
setScreen('street');
let resumePlayer: string | null = null;
try {
  resumePlayer = sessionStorage.getItem('player');
} catch {
  /* fine */
}
if (resumePlayer && PLAYER_IDS.includes(resumePlayer as PlayerId)) await startAs(resumePlayer as PlayerId, true);
else picker.open();

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
    app, gestures, characters, library, camera, storage, street, houseView, saveNow, enterPlace, enterHouse, goBack,
    screen: () => screen,
    chalk: () => chalk,
    eggsUnder,
    eggsOver,
    secrets: () => ({ found, locks, events, checkTargets }),
    place: () => current, setSeason, weather, setMuted, audioState, sfx, Ticker,
  });
}
