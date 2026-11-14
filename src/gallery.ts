import type { Library } from './library';
import { sfx } from './sound';
import type { Shelf } from './toyGroups';

export type GalleryPick = { kind: 'sample'; name: string } | { kind: 'photo'; id: string };

const HOLD_TO_DELETE_MS = 900;
const DISARM_AFTER_MS = 5000;

/**
 * The toy box: a big button bottom-right that opens a shelf of every
 * character and toy, sorted under picture tabs (this place's toys, the
 * drawings, animals, toys, things that go, furniture, food, outdoors,
 * treasures). No words anywhere.
 *
 *  - Tap a tile: that character pops into the scene (copies are fine).
 *  - Drag a character onto the toy box: it's put away (main.ts does that).
 *  - Grown-ups: press and hold a drawing's tile until it wiggles and shows a
 *    red X, then tap the X to delete that drawing for good. Samples can't be
 *    deleted.
 */
export function setupGallery(opts: {
  library: Library;
  /** The built-in characters and toys, in tabs (see toyGroups.ts). The drawings tab is added here. */
  shelves: () => Shelf[];
  onPick: (pick: GalleryPick) => void;
  onDelete: (id: string) => void;
}) {
  const button = document.getElementById('toybox')!;
  const shelf = document.getElementById('shelf')!;
  const row = shelf.querySelector('.row')!;
  const tabBar = shelf.querySelector('.tabs')!;
  let thumbUrls: string[] = [];
  let open = false;
  /** The tab showing (kept while the app is open). */
  let tab: string | null = null;
  const LABELS: Record<string, string> = { here: 'Here', drawings: 'Drawings', made: 'Teddies and squishies', glow: 'Glow sticks', pets: 'My pets', people: 'People', animals: 'Friends', toys: 'Toys', go: 'Things that go', home: 'Furniture', food: 'Food', outside: 'Outside', treasure: 'Treasures' };

  function render() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = [];
    const tabs = opts.shelves()
      .filter((s) => s.items.length)
      .map((s) => ({ id: s.id as string, icon: s.icon, tiles: () => s.items.map((it) => makeTile({ kind: 'sample', name: it.name }, it.url, false)) }));
    // The drawings (newest first) get their own tab, second, with the newest
    // one as its picture; then what was made in the app: teddies and
    // squishies, glow sticks, adopted pets, people. Each tab's picture is its newest one.
    const mine = [...opts.library.mine()].reverse();
    const own: { id: string; entries: typeof mine }[] = [
      { id: 'drawings', entries: mine.filter((e) => !e.made) },
      { id: 'made', entries: mine.filter((e) => e.made === 'bear' || e.made === 'squishy') },
      { id: 'glow', entries: mine.filter((e) => e.made === 'glow') },
      { id: 'pets', entries: mine.filter((e) => e.made === 'pet') },
      { id: 'people', entries: mine.filter((e) => e.made === 'person') },
    ];
    let at = Math.min(1, tabs.length);
    for (const group of own) {
      if (!group.entries.length) continue;
      const urls = group.entries.map((e) => URL.createObjectURL(e.png));
      thumbUrls.push(...urls);
      tabs.splice(at++, 0, { id: group.id, icon: urls[0], tiles: () => group.entries.map((e, i) => makeTile({ kind: 'photo', id: e.id }, urls[i], true)) });
    }
    if (!tabs.length) return;
    if (!tab || !tabs.some((t) => t.id === tab)) tab = own[0].entries.length ? 'drawings' : tabs[0].id;
    tabBar.replaceChildren(
      ...tabs.map((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = t.id === tab ? 'tab on' : 'tab';
        b.setAttribute('aria-label', LABELS[t.id] ?? t.id);
        const img = new Image();
        img.src = t.icon;
        img.alt = '';
        img.draggable = false;
        b.append(img);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          if (tab === t.id) return;
          tab = t.id;
          sfx.click();
          render();
          row.scrollLeft = 0;
        });
        return b;
      }),
    );
    row.replaceChildren(...tabs.find((t) => t.id === tab)!.tiles());
  }

  function makeTile(pick: GalleryPick, src: string, deletable: boolean) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.draggable = false;
    tile.append(img);

    let justArmed = false;
    let disarmTimer = 0;
    const disarm = () => tile.classList.remove('armed');

    if (deletable && pick.kind === 'photo') {
      const del = document.createElement('span');
      del.className = 'delete';
      del.setAttribute('role', 'button');
      del.setAttribute('aria-label', 'Delete this drawing');
      del.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>';
      tile.append(del);

      let holdTimer = 0;
      tile.addEventListener('pointerdown', () => {
        clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
          justArmed = true;
          tile.classList.add('armed');
          clearTimeout(disarmTimer);
          disarmTimer = window.setTimeout(disarm, DISARM_AFTER_MS);
        }, HOLD_TO_DELETE_MS);
      });
      const cancel = () => clearTimeout(holdTimer);
      tile.addEventListener('pointerup', cancel);
      tile.addEventListener('pointerleave', cancel);
      tile.addEventListener('pointercancel', cancel); // e.g. started scrolling the shelf

      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!tile.classList.contains('armed')) return;
        tile.classList.add('gone');
        sfx.poof();
        setTimeout(() => tile.remove(), 300);
        opts.onDelete(pick.id);
      });
    }

    tile.addEventListener('contextmenu', (e) => e.preventDefault());
    tile.addEventListener('click', () => {
      if (justArmed) {
        justArmed = false; // the end of the press-and-hold, not a tap
        return;
      }
      if (tile.classList.contains('armed')) {
        disarm(); // tapping an armed tile (not its X) changes your mind
        return;
      }
      opts.onPick(pick);
      tile.classList.remove('picked');
      void tile.offsetWidth;
      tile.classList.add('picked');
    });
    return tile;
  }

  function setOpen(v: boolean) {
    open = v;
    shelf.classList.toggle('open', v);
    button.classList.toggle('open', v);
    if (v) render();
  }

  button.addEventListener('click', () => {
    setOpen(!open);
    if (open) sfx.shelfOpen();
    else sfx.shelfClose();
  });
  button.addEventListener('contextmenu', (e) => e.preventDefault());

  opts.library.onChange = () => {
    if (open) render();
  };

  return {
    close() {
      if (!open) return;
      setOpen(false);
      sfx.shelfClose();
    },
    /** Where the toy box is on screen, for dropping characters into it. */
    isOver(x: number, y: number) {
      const r = button.getBoundingClientRect();
      const m = 24; // a generous target for small fingers
      return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
    },
    centre() {
      const r = button.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    highlight(on: boolean) {
      button.classList.toggle('hover', on);
    },
    /** While something is being carried: "you can drop it in here". */
    hint(on: boolean) {
      button.classList.toggle('hint', on);
    },
    gulp() {
      button.classList.remove('gulp');
      void button.offsetWidth;
      button.classList.add('gulp');
    },
  };
}
