import { loadImage } from './loadImage';
import { storage } from './storage';

/** One character made from a photo, kept forever (until a grown-up deletes it). */
export interface LibraryEntry {
  id: string;
  createdAt: number;
  png: Blob;
}

/** How a drawing gets about by itself (chosen with the move button). */
export type Motion = 'still' | 'walk' | 'hop' | 'fly';
export const MOTIONS: Motion[] = ['still', 'walk', 'hop', 'fly'];

const newId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Every character ever made from a photo, kept in memory for quick access
 * and saved on the device.
 */
export class Library {
  private constructor(
    readonly entries: LibraryEntry[],
    private motions: Record<string, Motion>,
  ) {}
  private pictures = new Map<string, Promise<HTMLCanvasElement>>();
  onChange: () => void = () => {};

  static async load(): Promise<Library> {
    let motions: Record<string, Motion> = {};
    try {
      motions = (await storage.getSetting<Record<string, Motion>>('motions')) ?? {};
    } catch {
      /* fine: everything stays still */
    }
    try {
      const stored = await storage.allCharacters();
      return new Library(
        stored.map((s) => ({ id: s.id, createdAt: s.createdAt, png: new Blob([s.png], { type: 'image/png' }) })),
        motions,
      );
    } catch (err) {
      console.warn('Could not load saved characters', err);
      return new Library([], motions);
    }
  }

  get(id: string) {
    return this.entries.find((e) => e.id === id);
  }

  /** How this drawing moves by itself (it stays still unless someone picks otherwise). */
  motion(id: string): Motion {
    return this.motions[id] ?? 'still';
  }

  setMotion(id: string, m: Motion) {
    if (m === 'still') delete this.motions[id];
    else this.motions[id] = m;
    void storage.setSetting('motions', { ...this.motions }).catch(() => {});
  }

  /** Save a new cut-out drawing. */
  async add(picture: HTMLCanvasElement): Promise<LibraryEntry> {
    const png = await new Promise<Blob>((resolve) => picture.toBlob((b) => resolve(b!), 'image/png'));
    const entry: LibraryEntry = { id: newId(), createdAt: Date.now(), png };
    this.entries.push(entry);
    this.pictures.set(entry.id, Promise.resolve(picture));
    try {
      await storage.addCharacter({ id: entry.id, createdAt: entry.createdAt, png: await png.arrayBuffer() });
    } catch (err) {
      console.warn('Could not save character', err);
    }
    this.onChange();
    return entry;
  }

  async remove(id: string) {
    const i = this.entries.findIndex((e) => e.id === id);
    if (i >= 0) this.entries.splice(i, 1);
    this.pictures.delete(id);
    if (this.motions[id]) this.setMotion(id, 'still');
    try {
      await storage.deleteCharacter(id);
    } catch (err) {
      console.warn('Could not delete character', err);
    }
    this.onChange();
  }

  /** The drawing as a canvas, ready to become a character. */
  picture(id: string): Promise<HTMLCanvasElement> | null {
    const entry = this.get(id);
    if (!entry) return null;
    let p = this.pictures.get(id);
    if (!p) {
      p = (async () => {
        const url = URL.createObjectURL(entry.png);
        try {
          const img = await loadImage(url);
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0);
          return c;
        } finally {
          URL.revokeObjectURL(url);
        }
      })();
      this.pictures.set(id, p);
    }
    return p;
  }
}
