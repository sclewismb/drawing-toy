import { storage, type Everything, type StoredCharacter } from './storage';

/**
 * A backup: every drawing, both players' worlds and all the settings, in one
 * file a grown-up can keep in the Files app. It's how to move to a fresh Home
 * Screen icon (an iPad keeps an icon's saved things with that icon) or to
 * another iPad. The file only goes where the grown-up sends it.
 */
const APP = 'lewis-world';

interface BackupFile {
  app: typeof APP;
  version: 1;
  made: string;
  drawings: (Omit<StoredCharacter, 'png'> & { png: string })[];
  saved: [IDBValidKey, unknown][];
}

function toBase64(bytes: ArrayBuffer | ArrayBufferView) {
  const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): ArrayBuffer {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

/** Bytes inside settings (if there ever are any) become text in the file, and back again. */
const BYTES = '__bytes';
const replacer = (_k: string, v: unknown) => (v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? { [BYTES]: toBase64(v as ArrayBuffer) } : v);
const reviver = (_k: string, v: unknown) => (v && typeof v === 'object' && BYTES in v ? fromBase64((v as Record<string, string>)[BYTES]) : v);

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Everything saved on this iPad, as a file (and how many drawings are in it). */
export async function makeBackup(): Promise<{ file: File; drawings: number }> {
  const all = await storage.dumpAll();
  const now = new Date();
  const data: BackupFile = {
    app: APP,
    version: 1,
    made: now.toISOString(),
    drawings: all.characters.map((c) => ({ ...c, png: toBase64(c.png) })),
    saved: all.entries,
  };
  const file = new File([JSON.stringify(data, replacer)], `lewis-world-backup-${day(now)}.json`, { type: 'application/json' });
  return { file, drawings: all.characters.length };
}

/** Read a backup file (throws if it isn't one). */
export async function readBackup(file: File): Promise<{ all: Everything; made: Date; drawings: number }> {
  const data = JSON.parse(await file.text(), reviver) as Partial<BackupFile>;
  if (data.app !== APP || data.version !== 1 || !Array.isArray(data.drawings) || !Array.isArray(data.saved)) {
    throw new Error('That file is not a Lewis World backup');
  }
  const characters = data.drawings.map((d) => ({ ...d, png: fromBase64(d.png) }));
  return { all: { characters, entries: data.saved }, made: new Date(data.made ?? 0), drawings: characters.length };
}

/** Share the backup (on the iPad: the share menu, with "Save to Files"); elsewhere, download it. */
export function sendBackup(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {
      // share menu closed without choosing anything: fine
    });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
