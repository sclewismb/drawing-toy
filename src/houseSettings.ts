import type { RoomId } from './places';
import { isCode, PLAYER_IDS, type PlayerId, type Players } from './players';

export interface HouseSettings {
  /** The house number painted on the house. */
  number: string;
  rooms: Partial<Record<RoomId, string>>;
}

/**
 * Grown-up box for the house number, the room names, and the two players'
 * names and codes. Opened by pressing and holding the house on the street.
 * What's typed is saved on this iPad only (never in the app's code, which is
 * public).
 */
export function setupHouseSettings(opts: {
  get: () => HouseSettings;
  save: (s: HouseSettings) => void;
  getPlayers: () => Players;
  savePlayers: (p: Players) => void;
  open: (fn: () => void) => void;
}) {
  const dialog = document.getElementById('house-settings') as HTMLDialogElement;
  const form = dialog.querySelector('form')!;
  const number = form.elements.namedItem('number') as HTMLInputElement;
  const rooms = [...form.querySelectorAll<HTMLInputElement>('input[data-room]')];
  const nameOf = (p: PlayerId) => form.querySelector<HTMLInputElement>(`input[data-player-name="${p}"]`)!;
  const codeOf = (p: PlayerId) => form.querySelector<HTMLInputElement>(`input[data-player-code="${p}"]`)!;
  const master = form.querySelector<HTMLInputElement>('input[data-master-code]')!;

  opts.open(() => {
    const s = opts.get();
    number.value = s.number ?? '';
    for (const r of rooms) r.value = s.rooms[r.dataset.room as RoomId] ?? '';
    const players = opts.getPlayers();
    for (const p of PLAYER_IDS) {
      nameOf(p).value = players[p]?.name ?? '';
      codeOf(p).value = players[p]?.code ?? '';
    }
    master.value = players.master ?? '';
    dialog.showModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const names: Partial<Record<RoomId, string>> = {};
    for (const r of rooms) names[r.dataset.room as RoomId] = r.value.trim().slice(0, 30);
    opts.save({ number: number.value.trim().slice(0, 6), rooms: names });
    const players = {} as Players;
    for (const p of PLAYER_IDS) {
      const code = codeOf(p).value.trim();
      players[p] = { name: nameOf(p).value.trim().slice(0, 20), code: isCode(code) ? code : '' };
    }
    players.master = isCode(master.value.trim()) ? master.value.trim() : '';
    opts.savePlayers(players);
    dialog.close();
  });
  dialog.querySelector('[data-cancel]')!.addEventListener('click', () => dialog.close());
}

/**
 * Earlier versions saved a whole address for a sign in front of the house.
 * Keep just the house number from it, and forget the rest.
 */
export function upgradeHouseSettings(saved: Partial<HouseSettings> & { sign?: string }): { settings: HouseSettings; changed: boolean } {
  const settings: HouseSettings = { number: saved.number ?? '', rooms: saved.rooms ?? {} };
  let changed = false;
  if (saved.sign !== undefined) {
    if (!settings.number) settings.number = saved.sign.match(/^\s*(\d+[A-Za-z]?)/)?.[1] ?? '';
    changed = true; // the address is dropped when this is saved back
  }
  return { settings, changed };
}
