import type { PlaceId } from '../../places';
import type { Cleanups, EggKit } from '../common';
import { moreBackyard, moreBedroomA, moreBedroomB, moreKitchen, moreLounge } from './house';
import { moreFire, morePark, morePolice, moreSchool } from './town';
import { moreRestaurant, moreToyshop, moreVet, moreWorkshop } from './shops';
import { moreArena, moreConservatory, moreFair, moreNiagara, moreNinja, morePigs, moreZoo } from './away';

/**
 * Five more hidden things in every place, to find by looking around
 * (built from the pieces in eggs/hidden.ts). They're added after a place's
 * own surprises, so they sit in the empty spots between them.
 */
export const MORE_EGGS: Partial<Record<PlaceId, (kit: EggKit, cleanups: Cleanups) => void>> = {
  'bedroom-a': moreBedroomA,
  'bedroom-b': moreBedroomB,
  kitchen: moreKitchen,
  lounge: moreLounge,
  backyard: moreBackyard,
  fire: moreFire,
  police: morePolice,
  school: moreSchool,
  park: morePark,
  vet: moreVet,
  restaurant: moreRestaurant,
  toyshop: moreToyshop,
  workshop: moreWorkshop,
  zoo: moreZoo,
  fair: moreFair,
  niagara: moreNiagara,
  ninja: moreNinja,
  conservatory: moreConservatory,
  arena: moreArena,
  pigs: morePigs,
};
