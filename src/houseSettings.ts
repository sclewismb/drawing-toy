import { makeBackup, readBackup, sendBackup } from './backup';
import type { RoomId } from './places';
import { isCode, PLAYER_IDS, type PlayerId, type Players } from './players';
import { storage } from './storage';

export interface HouseSettings {
  /** The house number painted on the house. */
  number: string;
  rooms: Partial<Record<RoomId, string>>;
}

/**
 * Grown-up box for the house number, the room names, the two players'
 * names and codes, and the backup file. Opened by pressing and holding the
 * house on the street.
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

  // --- Backup: everything into one file, and putting a file back ---
  const backupButton = form.querySelector<HTMLButtonElement>('[data-backup]')!;
  const restoreInput = form.querySelector<HTMLInputElement>('[data-restore]')!;
  const note = form.querySelector<HTMLElement>('[data-backup-note]')!;
  let backup: File | null = null;
  const say = (text: string) => {
    note.textContent = text;
    note.hidden = !text;
  };
  // Made ready when the box opens, so the tap on the button can share it straight away (iPads insist).
  const prepareBackup = () => {
    backup = null;
    backupButton.disabled = true;
    backupButton.textContent = 'Getting it ready...';
    makeBackup()
      .then((b) => {
        backup = b.file;
        backupButton.disabled = false;
        backupButton.textContent = `Save a backup (${b.drawings} drawing${b.drawings === 1 ? '' : 's'})`;
      })
      .catch((err) => {
        console.warn(err);
        backupButton.textContent = 'Backup not available';
      });
  };
  backupButton.addEventListener('click', () => {
    if (backup) sendBackup(backup);
  });
  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files?.[0];
    restoreInput.value = '';
    if (!file) return;
    try {
      const b = await readBackup(file);
      const when = b.made.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      if (!confirm(`Put back the backup from ${when} (${b.drawings} drawing${b.drawings === 1 ? '' : 's'})? Drawings, worlds and settings in it replace the ones here with the same name.`)) return;
      await storage.restoreAll(b.all);
      say('Backup put back. Opening it now...');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.warn(err);
      say('');
      alert('Sorry, that file could not be put back. Choose a file saved with "Save a backup".');
    }
  });

  opts.open(() => {
    say('');
    prepareBackup();
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
