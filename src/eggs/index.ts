import type { Container } from 'pixi.js';
import type { PlaceId } from '../places';
import { backyard } from './backyard';
import { bedroomA, bedroomB } from './bedrooms';
import { conservatory } from './conservatory';
import { fair } from './fair';
import { restaurant, toyshop, vet } from './shops';
import { zoo } from './zoo';
import { niagara, ninjaGym } from './destinations';
import type { Cleanups, EggKit } from './common';
import { kitchen, lounge } from './house';
import { fireStation, park, policeStation, school } from './town';
import { SECRET_EGGS } from './secrets';
import { houseEggs, streetEggs, type HouseGeom, type StreetGeom } from './views';
import { WIDE_EGGS } from './wide';

/**
 * Hidden surprises ("Easter eggs"), Toca Boca style: tap the right thing
 * and something fun happens. No goals, no scores.
 */
const PLACE_EGGS: Record<PlaceId, (kit: EggKit, cleanups: Cleanups) => void> = {
  'bedroom-a': bedroomA,
  'bedroom-b': bedroomB,
  kitchen,
  lounge,
  fire: fireStation,
  police: policeStation,
  school,
  park,
  backyard,
  fair,
  vet,
  restaurant,
  toyshop,
  zoo,
  ninja: ninjaGym,
  niagara,
  conservatory,
};

const run = (build: (cleanups: Cleanups) => void) => {
  const cleanups: Cleanups = [];
  build(cleanups);
  return () => cleanups.forEach((fn) => fn());
};

/** Set up a place's surprises. Returns a clean-up function. */
export function createEggs(id: PlaceId, kit: EggKit): () => void {
  return run((c) => {
    PLACE_EGGS[id](kit, c);
    WIDE_EGGS[id]?.(kit, c); // the new parts either side of the wide rooms
    SECRET_EGGS[id]?.(kit, c); // deeper secrets, on top of everything else
  });
}

export function createStreetEggs(kit: EggKit, geom: StreetGeom) {
  return run((c) => streetEggs(kit, geom, c));
}

export function createHouseEggs(kit: EggKit, behind: Container, geom: HouseGeom) {
  return run((c) => houseEggs(kit, behind, geom, c));
}

export type { EggKit, HouseGeom, StreetGeom };
