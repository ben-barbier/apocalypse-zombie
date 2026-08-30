/**
 * The three profiles, and there will never be a fourth: the economy has three
 * bounds to hold — a floor, a reference and a ceiling — and a fourth would only
 * interpolate between two already held. (spec 11-10, 11-15)
 *
 * **A profile is five numbers**, never a script written by hand. That is what
 * makes the three of them readings of one space, comparable term by term, and it
 * is what makes the gradient scan of chapter 11 possible at all, since that scan
 * does nothing but move one of the five. A script written by hand cannot be
 * refuted — one could not say in what the watcher differs from the child without
 * reading two hundred lines — and it rots at the first retouch of the game.
 * (spec 11-11, and chapter 11 "Pourquoi un pilote à cinq boutons")
 *
 * Nothing here is a rule of how to play: the five numbers are handed to the one
 * pilot of `pilot.ts`, which is what turns them into an `InputState`.
 */

/** When the pilot goes and fetches firebombs. (spec 11, "Les cinq réglages") */
export const RESUPPLY = {
  /** Never — the watcher, who stays where he is. (spec 11-12) */
  NEVER: 0,
  /** Only for the cannons the halo covers — the child. (spec 11-13) */
  HALO: 1,
  /** Whatever cannon wants them — the racer. (spec 11-14) */
  ALWAYS: 2,
} as const;

export type ResupplyType = (typeof RESUPPLY)[keyof typeof RESUPPLY];

/**
 * The five posts a coin ever goes to, and there is no sixth: chapter 6 closes
 * that list, and this enumeration is that list and nothing more. They are what
 * an order of preference is written in. (spec 06, 11-11)
 */
export const BUY = {
  /** One cannon, where he stands. (spec 05-7) */
  CANNON: 0,
  /** The second tier of the cannon he stands on. (spec 05-2) */
  TIER_TWO: 1,
  /** The third, which only ever reaches into the halo. (spec 05-16) */
  TIER_THREE: 2,
  /** An armful of firebombs, at the shed and nowhere else. (spec 04-45) */
  ARMFUL: 3,
  /** One reinforcement of the town hall, at one of its three free faces. (spec 06-30) */
  REINFORCEMENT: 4,
} as const;

export type BuyType = (typeof BUY)[keyof typeof BUY];

/**
 * The second of the five settings: **the order of preference and the reserve
 * kept**, and those two things alone. (spec 11-11)
 *
 * The order is read from the front: the first post that is due where he can get
 * to it and that he can pay for is the one he walks to. What makes it an order
 * of preference and not a script is that nothing in it says *when* — the state
 * of the game says that, alike for the three profiles.
 *
 * The reserve is coins held back from everything **but the post its own figure
 * is the price of**: chapter 11 writes the reserve of the watcher and of the
 * child as the price of the first reinforcement and that of the racer as the
 * price of an armful, so which post a reserve is kept for is read off that
 * figure rather than settled a second time. `keptFor` in `pilot.ts` is that
 * reading. (spec 11, table of `spend`)
 */
export interface Spend {
  readonly order: readonly BuyType[];
  /** Coins held back, in coins. (spec 11, table of `spend`) */
  readonly reserve: number;
  /** The first wave the reserve is held from. (spec 11, table of `spend`) */
  readonly reserveFromWave: number;
}

/** One profile: five settings of the one pilot, and nothing else. (spec 11-11) */
export interface Profile {
  /** What the tables of chapter 11 call it, in the one word ADR-0002 gives it. */
  readonly name: string;
  /** How far he ventures, in fractions of a street of eighty blocks. (spec 11) */
  readonly venture: number;
  readonly spend: Spend;
  readonly resupply: ResupplyType;
  /** The pips left at which he falls back. (spec 11) */
  readonly care: number;
  /** His lateness answering a fresh pack, in steps of a sixtieth of a second. */
  readonly reflex: number;
}

/**
 * The watcher, who bounds the **floor**: he leaves neither the square nor the
 * roofs that close it, strikes what comes to him, puts a cannon down where he
 * stands, never resupplies, and buys a reinforcement back the moment the bar of
 * the town hall goes under half. He is the one profile allowed to let the
 * colossus reach the town hall, because he is the one test the valve of chapter
 * 6 ever gets. (spec 11-12, 11-24)
 */
export const WATCHER: Profile = {
  name: 'watcher',
  venture: 0.05, // spec 11, "Les cinq réglages"
  spend: {
    order: [BUY.REINFORCEMENT, BUY.CANNON],
    reserve: 50, // the price of the first reinforcement (spec 11, `spend`)
    reserveFromWave: 1,
  },
  resupply: RESUPPLY.NEVER,
  care: 0,
  reflex: 60, // one second (spec 11, "Les cinq réglages")
};

/**
 * The child, the **reference** profile, and the one the thresholds bind: he goes
 * down to the third of a street, puts his cannons on the tall roofs there,
 * resupplies only within the halo, and takes the contacts rather than running
 * from them. (spec 11-13)
 *
 * His order is the one that gives back the landmarks of the reference run: a
 * first cannon at the end of assault two, the cannon of the second street in
 * preparation four, a first second tier at wave six, a first third tier at wave
 * eight. (spec 11, table of `spend`)
 */
export const CHILD: Profile = {
  name: 'child',
  venture: 0.35,
  spend: {
    order: [BUY.CANNON, BUY.TIER_TWO, BUY.TIER_THREE, BUY.REINFORCEMENT],
    reserve: 50,
    reserveFromWave: 7, // held only from wave seven on (spec 11, `spend`)
  },
  resupply: RESUPPLY.HALO,
  care: 2,
  reflex: 30, // half a second
};

/**
 * The racer, who bounds the **ceiling**: he goes to the far end of the active
 * street, builds on the deep stretches, resupplies always and lets nothing
 * through — and he never buys a reinforcement, which is why his reserve is the
 * price of an armful and not that of one. (spec 11-14, table of `spend`)
 */
export const RACER: Profile = {
  name: 'racer',
  venture: 0.95,
  spend: {
    order: [BUY.CANNON, BUY.TIER_TWO, BUY.TIER_THREE, BUY.ARMFUL],
    reserve: 3, // the price of an armful: three firebombs at one coin
    reserveFromWave: 1,
  },
  resupply: RESUPPLY.ALWAYS,
  care: 4,
  reflex: 0,
};

/** The three, in the order the tables of chapter 11 read them. (spec 11-10) */
export const PROFILES: readonly Profile[] = [WATCHER, CHILD, RACER];
