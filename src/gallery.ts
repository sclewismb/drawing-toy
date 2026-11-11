import type { Library } from './library';
import { sfx } from './sound';

export type GalleryPick = { kind: 'sample'; name: string } | { kind: 'photo'; id: string };

const HOLD_TO_DELETE_MS = 900;
const DISARM_AFTER_MS = 5000;

/**
 * The toy box: a big button bottom-right that opens a shelf of every
 * character and toy (newest drawings first, then the built-in ones). No
 * words anywhere.
 *
 *  - Tap a tile: that character pops into the scene (copies are fine).
 *  - Drag a character onto the toy box: it's put away (main.ts does that).
 *  - Grown-ups: press and hold a drawing's tile until it wiggles and shows a
 *    red X, then tap the X to delete that drawing for good. Samples can't be
 *    deleted.
 */
export function setupGallery(opts: {
  library: Library;
  /** Built-in characters and toys to show after the drawings (this place's first). */
  builtins: () => { name: string; url: string }[];
  onPick: (pick: GalleryPick) => void;
  onDelete: (id: string) => void;
}) {
  const button = document.getElementById('toybox')!;
  const shelf = document.getElementById('shelf')!;
  const row = shelf.querySelector('.row')!;
  let thumbUrls: string[] = [];
  let open = false;

  function render() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = [];
    const tiles: HTMLElement[] = [];
    for (const e of [...opts.library.entries].reverse()) {
      const url = URL.createObjectURL(e.png);
      thumbUrls.push(url);
      tiles.push(makeTile({ kind: 'photo', id: e.id }, url, true));
    }
    for (const s of opts.builtins()) tiles.push(makeTile({ kind: 'sample', name: s.name }, s.url, false));
    row.replaceChildren(...tiles);
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
