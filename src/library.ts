import { loadImage } from './loadImage';
import { PLAYER_IDS } from './players';
import { storage } from './storage';

/** One character made from a photo, kept forever (until a grown-up deletes it). */
export interface LibraryEntry {
  id: string;
  createdAt: number;
  png: Blob;
  /** Whose drawing it is (none = from before there were players: everyone's). */
  owner?: string;
}

/** How a drawing gets about by itself (chosen with the move button). */
export type Motion = 'still' | 'walk' | 'hop' | 'fly';
export const MOTIONS: Motion[] = ['still', 'walk', 'hop', 'fly'];

const newId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Every character ever made from a photo, kept in memory for quick access
 * and saved on the device.
 *
 * Each player has their own toy box: the drawings they made, plus (each
 * their own copy of) the drawings from before there were players. Taking a
 * drawing out of one toy box leaves the other alone; a drawing is only gone
 * for good once nobody has it.
 */
export class Library {
  private constructor(
    readonly entries: LibraryEntry[],
    /** How each drawing moves, per player (key "player:id"; plain "id" from before players). */
    private motions: Record<string, Motion>,
    /** Older shared drawings each player has taken out of their toy box. */
    private removed: Record<string, string[]>,
  ) {}
  private pictures = new Map<string, Promise<HTMLCanvasElement>>();
  onChange: () => void = () => {};
  /** Who's playing: new drawings are theirs, and their toy box shows only theirs. */
  player: string | null = null;

  /** The drawings in this player's toy box. */
  mine(): LibraryEntry[] {
    const gone = this.removed[this.player ?? ''] ?? [];
    return this.entries.filter((e) => (e.owner ? e.owner === this.player : !gone.includes(e.id)));
  }

  static async load(): Promise<Library> {
    let motions: Record<string, Motion> = {};
    let removed: Record<string, string[]> = {};
    try {
      motions = (await storage.getSetting<Record<string, Motion>>('motions')) ?? {};
      removed = (await storage.getSetting<Record<string, string[]>>('removed-drawings')) ?? {};
    } catch {
      /* fine: everything stays still, nothing taken out */
    }
    try {
      const stored = await storage.allCharacters();
      return new Library(
        stored.map((s) => ({ id: s.id, createdAt: s.createdAt, owner: s.owner, png: new Blob([s.png], { type: 'image/png' }) })),
        motions,
        removed,
      );
    } catch (err) {
      console.warn('Could not load saved characters', err);
      return new Library([], motions, removed);
    }
  }

  get(id: string) {
    return this.entries.find((e) => e.id === id);
  }

  /** How this drawing moves by itself for this player (it stays still unless they pick otherwise). */
  motion(id: string): Motion {
    return this.motions[`${this.player}:${id}`] ?? this.motions[id] ?? 'still';
  }

  setMotion(id: string, m: Motion) {
    this.motions[`${this.player}:${id}`] = m;
    delete this.motions[id]; // (an old shared choice: now each player has their own)
    void storage.setSetting('motions', { ...this.motions }).catch(() => {});
  }

  /**
   * Take a drawing out of this player's toy box. Their own drawing is gone
   * for good; an older shared one is only gone for good once every player
   * has taken it out.
   */
  async removeMine(id: string) {
    const entry = this.get(id);
    if (!entry) return;
    if (entry.owner || !this.player) return this.remove(id);
    const gone = new Set(this.removed[this.player] ?? []);
    gone.add(id);
    this.removed[this.player] = [...gone];
    if (PLAYER_IDS.every((p) => this.removed[p]?.includes(id))) {
      for (const p of PLAYER_IDS) this.removed[p] = this.removed[p].filter((x) => x !== id);
      await this.remove(id);
    } else {
      this.onChange();
    }
    void storage.setSetting('removed-drawings', { ...this.removed }).catch(() => {});
  }

  /** Save a new cut-out drawing. */
  async add(picture: HTMLCanvasElement): Promise<LibraryEntry> {
    const png = await new Promise<Blob>((resolve) => picture.toBlob((b) => resolve(b!), 'image/png'));
    const entry: LibraryEntry = { id: newId(), createdAt: Date.now(), png, owner: this.player ?? undefined };
    this.entries.push(entry);
    this.pictures.set(entry.id, Promise.resolve(picture));
    try {
      await storage.addCharacter({ id: entry.id, createdAt: entry.createdAt, owner: entry.owner, png: await png.arrayBuffer() });
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
    for (const key of Object.keys(this.motions)) if (key === id || key.endsWith(`:${id}`)) delete this.motions[key];
    void storage.setSetting('motions', { ...this.motions }).catch(() => {});
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
