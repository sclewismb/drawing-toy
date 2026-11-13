import { CRITTERS } from './critters';
import { BUILTIN } from './places';
import { TREASURES } from './secrets';

/**
 * The toy box has picture tabs so there's less to scroll through:
 *   this place's toys | drawings | animals & people | toys | things that go |
 *   furniture | food | outdoors | treasures (once some are found)
 * Each tab's picture is one of its own toys (no words). The drawings tab
 * comes from the library, so the gallery adds that one itself.
 */
export type GroupId = 'here' | 'animals' | 'toys' | 'go' | 'home' | 'food' | 'outside' | 'treasure';

const GROUP: Record<string, GroupId> = {};
const put = (g: GroupId, names: string[]) => names.forEach((n) => (GROUP[n] = g));
put('animals', ['monster', 'cat', 'robot', ...Object.keys(CRITTERS)]);
put('go', ['fire-engine', 'police-car', 'ride-car', 'race-car', 'bicycle', 'scooter', 'digger', 'dump-truck', 'wheelbarrow', 'skateboard']);
put('home', ['bed', 'bed-tiedye', 'daybed', 'sofa', 'couch', 'armchair', 'fridge', 'table', 'stool', 'school-desk', 'lamp', 'piano', 'fishbowl', 'bookshelf', 'potted-plant']);
put('food', ['birthday-cake', 'candy-floss', 'pizza', 'burger', 'ice-cream', 'apple', 'cupcake', 'watermelon', 'banana', 'carrot', 'fish', 'bone']);
put('outside', ['bench', 'slide', 'trampoline', 'flower', 'hydrant', 'cone', 'helmet', 'police-hat', 'tent', 'snowman', 'soccer-goal', 'watering-can', 'butterfly-net', 'sand-bucket']);
put('treasure', ['golden-key', 'crown', 'magic-wand', 'medal', 'gem', 'gold-coin', 'trophy']);
// everything else is a toy (ball, teddy, kite, dinosaur, rocket, castle...)

export const groupOf = (name: string): GroupId => GROUP[name] ?? 'toys';

/** Animals only come into the toy box by being adopted at the vet (people, the monster and the robot stay). */
const ADOPT_ONLY = new Set(['dog', 'kitten', 'bunny', 'duck', 'chicken', 'hedgehog', 'turtle', 'cat', 'pig', 'piglet']);

/** Each tab's picture. */
const ICON: Record<Exclude<GroupId, 'here'>, string> = {
  animals: 'kid-girl',
  toys: 'teddy',
  go: 'race-car',
  home: 'couch',
  food: 'pizza',
  outside: 'flower',
  treasure: 'crown',
};

export interface Shelf {
  id: GroupId;
  icon: string;
  items: { name: string; url: string }[];
}

/**
 * The tabs and what's on each.
 *   here:     this place's own toys
 *   found:    treasures this player has found (the others stay hidden)
 *   hereIcon: a picture of this place (its building on the map)
 */
export function shelves(here: string[], found: Set<string>, url: (name: string) => string, hereIcon: string): Shelf[] {
  const hidden = (n: string) => !!TREASURES[n] && !found.has(n);
  const names = Object.keys(BUILTIN).filter((n) => !hidden(n));
  const item = (name: string) => ({ name, url: url(name) });
  const list: Shelf[] = [{ id: 'here', icon: hereIcon, items: here.filter((n) => BUILTIN[n] && !hidden(n)).map(item) }];
  for (const id of ['animals', 'toys', 'go', 'home', 'food', 'outside', 'treasure'] as const) {
    let items = names.filter((n) => groupOf(n) === id && !ADOPT_ONLY.has(n));
    // the treasure tab shows every treasure found, food ones too
    if (id === 'treasure') items = Object.keys(TREASURES).filter((n) => found.has(n));
    if (items.length) list.push({ id, icon: url(ICON[id]), items: items.map(item) });
  }
  return list;
}
