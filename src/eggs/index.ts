import type { Container } from 'pixi.js';
import type { PlaceId } from '../places';
import { backyard } from './backyard';
import { bedroomA, bedroomB } from './bedrooms';
import type { Cleanups, EggKit } from './common';
import { kitchen, lounge } from './house';
import { fireStation, park, policeStation, school } from './town';
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
  });
}

export function createStreetEggs(kit: EggKit, geom: StreetGeom) {
  return run((c) => streetEggs(kit, geom, c));
}

export function createHouseEggs(kit: EggKit, behind: Container, geom: HouseGeom) {
  return run((c) => houseEggs(kit, behind, geom, c));
}

export type { EggKit, HouseGeom, StreetGeom };
