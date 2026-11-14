/**
 * Secrets: deeper surprises, some of them two or three steps long.
 *
 * - Treasures: some secrets give a real toy (a golden key, a crown...). It
 *   pops into the scene, and from then on it's in that player's toy box.
 * - Locks: drop the right thing onto the right spot (the golden key onto the
 *   sandbox, a fish onto the penguins) and something happens.
 * - Feeding: drop food onto an animal that likes it and it has a treat.
 * - The magic wand: drop it onto anyone for a colourful change.
 *
 * What each player has found is remembered on the iPad (per player).
 */

export const TREASURES: Record<string, { url: string; size: number }> = {
  'golden-key': { url: 'treasures/golden-key.svg', size: 0.42 },
  crown: { url: 'treasures/crown.svg', size: 0.4 },
  carrot: { url: 'treasures/carrot.svg', size: 0.35 },
  fish: { url: 'treasures/fish.svg', size: 0.35 },
  bone: { url: 'treasures/bone.svg', size: 0.35 },
  'magic-wand': { url: 'treasures/magic-wand.svg', size: 0.4 },
  medal: { url: 'treasures/medal.svg', size: 0.35 },
  gem: { url: 'treasures/gem.svg', size: 0.3 },
  'gold-coin': { url: 'treasures/gold-coin.svg', size: 0.32 },
  trophy: { url: 'treasures/trophy.svg', size: 0.45 },
};

/** Which animals (and people) like which food. */
export const FOOD_FOR: Record<string, string[]> = {
  dog: ['bone', 'burger'],
  kitten: ['fish'],
  bunny: ['carrot', 'apple'],
  turtle: ['carrot', 'apple', 'watermelon'],
  hedgehog: ['carrot', 'apple'],
  chicken: ['carrot', 'watermelon'],
  duck: ['carrot'],
  reindeer: ['carrot', 'apple', 'candy-cane'],
  'kid-girl': ['pizza', 'burger', 'candy-floss', 'birthday-cake', 'ice-cream', 'cupcake', 'apple', 'watermelon', 'banana', 'candy-cane', 'gingerbread'],
  'kid-boy': ['pizza', 'burger', 'candy-floss', 'birthday-cake', 'ice-cream', 'cupcake', 'apple', 'watermelon', 'banana', 'candy-cane', 'gingerbread'],
  grandma: ['birthday-cake', 'pizza', 'cupcake', 'apple', 'gingerbread', 'candy-cane'],
  grownup: ['burger', 'pizza', 'birthday-cake', 'ice-cream', 'cupcake', 'gingerbread', 'candy-cane'],
};

/** A spot that something can be dropped onto (in room coordinates). */
export interface Lock {
  /** The toys it takes ('*' = anyone at all, drawings and made toys too). */
  accepts: string[];
  area: () => { x: number; y: number; w: number; h: number };
  /** Only these (anything else carries on to the other drop checks). */
  wants?: (ch: unknown) => boolean;
  /** It's been dropped on (`ch` is the character). Return true to keep the thing (otherwise it's used up). */
  open: (name: string, ch?: unknown) => boolean | void;
}

export interface SecretsApi {
  /** Has this player found this secret before? */
  has(id: string): boolean;
  /** Found it! Pops the treasure toy (if any) into the scene at `at` (room coordinates). */
  find(id: string, toy?: string, at?: { x: number; y: number }): void;
  lock(l: Lock): void;
}

/** A tiny noticeboard: surprises tell secrets what just happened ("the lights went off"). */
export class Bus {
  private handlers = new Map<string, ((...a: unknown[]) => void)[]>();
  on(name: string, fn: (...a: never[]) => void) {
    const list = this.handlers.get(name) ?? [];
    list.push(fn as (...a: unknown[]) => void);
    this.handlers.set(name, list);
  }
  emit(name: string, ...a: unknown[]) {
    for (const fn of this.handlers.get(name) ?? []) {
      try {
        fn(...a);
      } catch (err) {
        console.warn('Secret failed', err);
      }
    }
  }
}
