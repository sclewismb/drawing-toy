import type { RoomId } from './places';

interface HouseSettings {
  sign: string;
  rooms: Partial<Record<RoomId, string>>;
}

/**
 * Grown-up box for the house's sign and the room names. Opened by pressing
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
  const sign = form.elements.namedItem('sign') as HTMLInputElement;
  const rooms = [...form.querySelectorAll<HTMLInputElement>('input[data-room]')];

  opts.open(() => {
    const s = opts.get();
    sign.value = s.sign ?? '';
    for (const r of rooms) r.value = s.rooms[r.dataset.room as RoomId] ?? '';
    dialog.showModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const names: Partial<Record<RoomId, string>> = {};
    for (const r of rooms) names[r.dataset.room as RoomId] = r.value.trim().slice(0, 30);
    opts.save({ sign: sign.value.trim().slice(0, 40), rooms: names });
    dialog.close();
  });
  dialog.querySelector('[data-cancel]')!.addEventListener('click', () => dialog.close());
}
