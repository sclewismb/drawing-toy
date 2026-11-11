import type { RoomId } from './places';

export interface HouseSettings {
  /** The house number painted on the house. */
  number: string;
  rooms: Partial<Record<RoomId, string>>;
}

/**
 * Grown-up box for the house number and the room names. Opened by pressing
 * and holding the house on the street. What's typed is saved on this iPad
 * only (never in the app's code, which is public).
 */
export function setupHouseSettings(opts: {
  get: () => HouseSettings;
  save: (s: HouseSettings) => void;
  open: (fn: () => void) => void;
}) {
  const dialog = document.getElementById('house-settings') as HTMLDialogElement;
  const form = dialog.querySelector('form')!;
  const number = form.elements.namedItem('number') as HTMLInputElement;
  const rooms = [...form.querySelectorAll<HTMLInputElement>('input[data-room]')];

  opts.open(() => {
    const s = opts.get();
    number.value = s.number ?? '';
    for (const r of rooms) r.value = s.rooms[r.dataset.room as RoomId] ?? '';
    dialog.showModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const names: Partial<Record<RoomId, string>> = {};
    for (const r of rooms) names[r.dataset.room as RoomId] = r.value.trim().slice(0, 30);
    opts.save({ number: number.value.trim().slice(0, 6), rooms: names });
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
