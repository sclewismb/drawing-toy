import { sfx } from './sound';

/**
 * Two players, each with their own world. They're shown as pictures (a
 * rocket and a butterfly), with a name under each if a grown-up typed one in
 * the grown-up box. Names and codes are saved on this iPad only.
 *
 * A grown-up master code opens either world, and the grown-up box itself.
 * The codes are a "keep your brother/sister out" lock, not real security:
 * they're kept on the iPad like everything else.
 */
export type PlayerId = 'a' | 'b';
export const PLAYER_IDS: PlayerId[] = ['a', 'b'];
export interface PlayerInfo {
  name: string;
  code: string; // 4 digits, or empty for no code
}
export type Players = Record<PlayerId, PlayerInfo> & {
  /** The grown-up's code: opens either world and the grown-up box (empty = none). */
  master?: string;
};
export const NO_PLAYERS: Players = { a: { name: '', code: '' }, b: { name: '', code: '' }, master: '' };

export const isCode = (c: string | undefined) => /^\d{4}$/.test(c ?? '');

/** A key, for "grown-ups only". */
const KEY_ICON = `<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
  <g stroke="#3a3a3a" stroke-width="5" stroke-linejoin="round">
    <circle cx="40" cy="60" r="24" fill="#ffd166" />
    <circle cx="40" cy="60" r="9" fill="#fff" />
    <path d="M62 54 L108 54 L108 66 L98 66 L98 78 L88 78 L88 66 L62 66 Z" fill="#ffd166" />
  </g>
</svg>`;

/** The "who's playing?" screen, with a number pad for the codes. */
export function setupPlayers(opts: { get: () => Players; onChoose: (id: PlayerId) => void }) {
  const root = document.getElementById('players')!;
  const choose = root.querySelector<HTMLElement>('.choose')!;
  const pad = root.querySelector<HTMLElement>('.pad')!;
  const who = pad.querySelector<HTMLElement>('.who')!;
  const dots = [...pad.querySelectorAll<HTMLElement>('.dots i')];
  const buttons = [...choose.querySelectorAll<HTMLButtonElement>('[data-player]')];
  /** What the number pad is for right now. */
  let asking: { check: (code: string) => boolean; ok: () => void; back: () => void } | null = null;
  let typed = '';
  let checking = false;

  const drawDots = () => dots.forEach((d, i) => d.classList.toggle('on', i < typed.length));
  const master = () => opts.get().master;

  function showNames() {
    const players = opts.get();
    for (const b of buttons) b.querySelector('.name')!.textContent = players[b.dataset.player as PlayerId]?.name ?? '';
  }

  function showChoose() {
    asking = null;
    typed = '';
    drawDots();
    showNames();
    pad.hidden = true;
    choose.hidden = false;
  }

  function show() {
    root.hidden = false;
    document.body.classList.add('choosing');
  }

  function hide() {
    root.hidden = true;
    document.body.classList.remove('choosing');
  }

  function open() {
    show();
    showChoose();
  }

  /** Show the number pad (with a picture of who it's for). */
  function askCode(icon: string, check: (code: string) => boolean, ok: () => void, back: () => void) {
    asking = { check, ok, back };
    typed = '';
    drawDots();
    who.innerHTML = icon;
    choose.hidden = true;
    pad.hidden = false;
    sfx.pling();
  }

  function enter(id: PlayerId) {
    sfx.tada();
    hide();
    opts.onChoose(id);
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const id = b.dataset.player as PlayerId;
      const code = opts.get()[id]?.code;
      if (!isCode(code)) return enter(id); // no code set yet: straight in
      askCode(
        b.querySelector('svg')!.outerHTML,
        // their own code, or the grown-up's master code
        (typed) => typed === code || (isCode(master()) && typed === master()),
        () => enter(id),
        showChoose,
      );
    });
  }

  for (const key of pad.querySelectorAll<HTMLButtonElement>('[data-key]')) {
    key.addEventListener('click', () => {
      if (!asking || checking) return;
      const k = key.dataset.key!;
      if (k === 'back') {
        if (!typed) return asking.back();
        typed = typed.slice(0, -1);
        sfx.click();
        return drawDots();
      }
      if (typed.length >= 4) return;
      typed += k;
      sfx.click();
      drawDots();
      if (typed.length < 4) return;
      checking = true;
      setTimeout(() => {
        checking = false;
        if (asking?.check(typed)) return asking.ok();
        // not quite: wobble, and try again
        sfx.nope();
        pad.classList.remove('shake');
        void pad.offsetWidth;
        pad.classList.add('shake');
        typed = '';
        setTimeout(drawDots, 250);
      }, 180);
    });
  }

  return {
    open,
    refresh: showNames,
    isOpen: () => !root.hidden,
    /**
     * Grown-ups only: if there's a master code, ask for it first. (Without
     * one, the grown-up box just opens.)
     */
    grownUp(ok: () => void) {
      if (!isCode(master())) return ok();
      show();
      askCode(KEY_ICON, (typed) => typed === master(), () => {
        hide();
        sfx.pling();
        ok();
      }, hide);
    },
  };
}
