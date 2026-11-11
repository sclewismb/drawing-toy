/**
 * Saving on the iPad itself, with IndexedDB (the browser's built-in
 * database). Nothing ever leaves the device.
 *
 *  - "characters": every character made from a photo (its see-through PNG)
 *  - "scene": what's on screen right now and where
 *
 * Pictures are stored as plain bytes (ArrayBuffer) rather than Blobs, which
 * older iPad Safari versions handled unreliably.
 */

const DB_NAME = 'drawing-toy';
const DB_VERSION = 1;

export interface StoredCharacter {
  id: string;
  png: ArrayBuffer;
  createdAt: number;
}

export type SceneItem = ({ kind: 'photo'; id: string } | { kind: 'sample'; name: string }) & {
  x: number; // 0..1 across the screen
  y: number; // 0..1 down the screen
  scale: number;
  rotation: number;
  facing: 1 | -1;
};

export interface SavedScene {
  version: 1;
  items: SceneItem[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('characters')) d.createObjectStore('characters', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('scene')) d.createObjectStore('scene');
    };
    req.onsuccess = () => {
      const d = req.result;
      // If another copy of the app needs to upgrade or reset the database,
      // let go so it isn't stuck waiting; we reopen next time we need it.
      d.onversionchange = () => {
        d.close();
        dbPromise = null;
      };
      resolve(d);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => console.warn('Saved data is busy in another window');
  });
  return dbPromise;
}

async function run<T>(
  store: 'characters' | 'scene',
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = op(t.objectStore(store));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const storage = {
  /** Ask the browser not to clear our data when space runs low. */
  async askToKeep() {
    try {
      if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
        await navigator.storage.persist?.();
      }
    } catch {
      // Not supported: Home Screen apps are generally kept anyway.
    }
  },

  async allCharacters(): Promise<StoredCharacter[]> {
    const all = await run('characters', 'readonly', (s) => s.getAll() as IDBRequest<StoredCharacter[]>);
    return all.sort((a, b) => a.createdAt - b.createdAt);
  },

  async addCharacter(c: StoredCharacter) {
    await run('characters', 'readwrite', (s) => s.put(c));
  },

  async deleteCharacter(id: string) {
    await run('characters', 'readwrite', (s) => s.delete(id));
  },

  async loadScene(): Promise<SavedScene | null> {
    const scene = await run('scene', 'readonly', (s) => s.get('current') as IDBRequest<SavedScene | undefined>);
    return scene ?? null;
  },

  async saveScene(scene: SavedScene) {
    await run('scene', 'readwrite', (s) => s.put(scene, 'current'));
  },
};
