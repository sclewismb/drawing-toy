import type { CritterKind } from './critters';
import type { PetKind } from './petArt';
import { sfx } from './sound';

/**
 * How each kind of adopted pet gets about (the same walking "brain" as the
 * other animals; the parrot flies), what it says, and what it likes to eat.
 */
export interface PetKindInfo extends CritterKind {
  /** Flies about instead of walking. */
  fly?: boolean;
  /** Runs after a thrown ball and brings it back. */
  fetches?: boolean;
  /** Food it loves (drop it on the pet). */
  food: string[];
}

export const PETS: Record<PetKind, PetKindInfo> = {
  'ginger-kitten': { url: '', size: 0.42, gait: 'walk', speed: 0.07, trick: 'look', voice: () => sfx.meow(), food: ['fish'] },
  'tuxedo-cat': { url: '', size: 0.5, gait: 'walk', speed: 0.06, trick: 'look', voice: () => sfx.meow(), food: ['fish'] },
  'spotty-puppy': { url: '', size: 0.46, gait: 'trot', speed: 0.1, trick: 'jump', voice: () => sfx.woof(), fetches: true, food: ['bone', 'burger'] },
  'golden-dog': { url: '', size: 0.62, gait: 'trot', speed: 0.11, trick: 'jump', voice: () => sfx.woof(), fetches: true, food: ['bone', 'burger'] },
  bunny: { url: '', size: 0.42, gait: 'hop', speed: 0.09, trick: 'nibble', voice: () => sfx.squeak(1.7), food: ['carrot', 'apple'] },
  hamster: { url: '', size: 0.3, gait: 'scurry', speed: 0.09, trick: 'nibble', voice: () => sfx.squeak(2.4), food: ['carrot', 'apple', 'banana'] },
  parrot: { url: '', size: 0.4, gait: 'walk', speed: 0.14, trick: 'look', voice: () => sfx.chirp(), fly: true, food: ['apple', 'banana', 'watermelon'] },
  tortoise: { url: '', size: 0.42, gait: 'creep', speed: 0.02, trick: 'hide', voice: () => sfx.blub(), food: ['carrot', 'apple', 'watermelon'] },
  'green-snake': { url: '', size: 0.55, gait: 'slither', speed: 0.05, trick: 'look', voice: () => sfx.hiss(), food: [] },
  'stripy-snake': { url: '', size: 0.55, gait: 'slither', speed: 0.05, trick: 'look', voice: () => sfx.hiss(), food: [] },
};
