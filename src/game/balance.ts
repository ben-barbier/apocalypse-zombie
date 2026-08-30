/**
 * The balance constants, in domain terms — blocks, seconds, sword hits,
 * shambler hits, coins — never in per-step terms: converting belongs to the
 * simulation. (spec 10-16)
 *
 * This object is injected, never imported by a rules module: `createGame(BALANCE)`
 * stores it in `game.balance`. That is what lets the bench replay a hundred
 * variants without touching a line of rules. (spec 10-15)
 *
 * It is not authority against the spec. `docs/spec/` decides; the test beside
 * this file is what turns a disagreement into a red error. Every number here is
 * quoted there, and a retouch touches the spec, this file, the tests and
 * `bench/reference.json` in one PR. (spec 11-47)
 */

// ------------------------------------------------------------------ the loop

export interface LoopBalance {
  /** How many simulation steps make one second — 60 Hz. (spec 10-21) */
  readonly hz: number;
  /** How far apart two frames may be before the gap is clamped, in seconds. */
  readonly frameClamp: number;
  /** How many steps one frame may catch up on, at most. (spec 10-23) */
  readonly maxCatchUp: number;
  /** How long the picture holds on a fatal blow, in seconds — never caught up. */
  readonly fatalBlowFreeze: number;
}

/** The fixed-size pools, allocated at load. (spec 10-13) */
export interface PoolBalance {
  readonly zombies: number;
  readonly projectiles: number;
  readonly shards: number;
  readonly events: number;
  readonly cannons: number;
  /** The coins lying in the city, and it is derived rather than settled. */
  readonly coins: number;
}

// ------------------------------------------------------------------ the game

export interface PaceBalance {
  /** Waves of the main game; wave 11 and beyond are overtime. (spec 01-10) */
  readonly mainWaves: number;
  /** Prep before waves 2 to 4, in seconds. (spec 01-15) */
  readonly earlyPrep: number;
  /** Prep before wave 5 and beyond, overtime included, in seconds. */
  readonly latePrep: number;
  /** The last wave whose prep is the long one. (spec 01-15) */
  readonly lastEarlyPrepWave: number;
  /** How long the end of a game fades, in seconds. (spec 01-29) */
  readonly fadeOut: number;
}

// ------------------------------------------------------------------ the city

export interface StreetBalance {
  /** Length clear of the square, in blocks. (spec 02-12) */
  readonly length: number;
  /** Width, in blocks. */
  readonly width: number;
  /** The rail, from the street mouth to the face of the town hall. (spec 02-13) */
  readonly rail: number;
  /** How deep a frontage runs back from the street, in blocks. (spec 02-14) */
  readonly frontageDepth: number;
  /** The facade module, in blocks. (spec 02-17) */
  readonly bay: number;
  /** Bays per edge. (spec 02-17) */
  readonly baysPerEdge: number;
  /** How far one edge is shifted against the other, in blocks. (spec 02-18) */
  readonly edgeShift: number;
  /** Gateway height at the mouth, in blocks. (spec 02-27) */
  readonly gatewayHeight: number;
  /** Where the four shamblers of the first assault stand. (spec 02-30) */
  readonly firstPackAt: number;
}

export interface CityBalance {
  /** The side of the whole city, in blocks. (spec 02-1) */
  readonly side: number;
  /** The apothem of the hexagonal square, in blocks. (spec 02-6) */
  readonly apothem: number;
  /** The town hall footprint and height, in blocks. (spec 02-7) */
  readonly townHallSide: number;
  readonly townHallHeight: number;
  /** The base shed, in blocks. (spec 02-8) */
  readonly baseLength: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  /** From a street mouth to the face of the town hall, in blocks. (spec 02-7) */
  readonly mouthToTownHall: number;
  /** Perimeter buildings, and the one height they all share. (spec 02-10, 02-11) */
  readonly perimeterCount: number;
  readonly perimeterHeight: number;
  /** How far the outskirts run past the end of a street, in blocks. (spec 02) */
  readonly outskirts: number;
  /** How far the halo reaches from the base, in horizontal blocks. (spec 02-31) */
  readonly halo: number;
  readonly street: StreetBalance;
  /** Bay widths and heights, mouth to far end, for the two edges. (spec 02-19 to 02-25) */
  readonly alignedBays: readonly number[];
  readonly alignedHeights: readonly number[];
  readonly shiftedBays: readonly number[];
  readonly shiftedHeights: readonly number[];
}

// --------------------------------------------------------------- the zombies

export interface ZombieBalance {
  /** Blocks per second — nothing in the game goes faster. (spec 03) */
  readonly speed: number;
  /** How much it takes before a fatal blow, in sword hits. (spec 03-3) */
  readonly hp: number;
  /** What it costs a construction, in shambler hits per second. (spec 03-3) */
  readonly shamblerHits: number;
  /** Body scale — the fourteen boxes never change silhouette. (spec 03-2) */
  readonly scale: number;
  /** The first wave it walks in. */
  readonly appears: number;
}

export interface AssaultBalance {
  /** Seconds between two packs entering an active street. (spec 03-22) */
  readonly cadence: number;
  /** Zombies in a pack, all of one kind. (spec 03-22, 03-23) */
  readonly packSize: number;
  /** Seconds between the starts of two streets carrying the wave. (spec 03-25) */
  readonly streetStagger: number;
  /** How far a zombie sits off its rail, either way, in blocks. (spec 03-7) */
  readonly lateralSpread: number;
  /** Seconds of frozen progress before a zombie is pushed along. (spec 03-11) */
  readonly unstickAfter: number;
  /** Seconds between two blows against a construction. (spec 03-4) */
  readonly blowPeriod: number;
  /** How close a passing zombie grazes a ground cannon, in blocks. (spec 03-15) */
  readonly grazeRange: number;
  /** How long the shards of a fatal blow last, in seconds. (spec 03-19) */
  readonly shardsLast: number;
  /** Bruisers massed around a colossus, and how close they hold. (spec 03-34) */
  readonly escortCount: number;
  readonly escortRadius: number;
  /** The three end-of-assault nets. (spec 03-38, 03-39) */
  readonly beaconsAt: number;
  readonly rushAfter: number;
  readonly rushSpeed: number;
  /**
   * The moan of an assault, which belongs to no zombie at all: how often the
   * assault may moan, and the head count one whole moan is worth. Both are
   * rules and not a setting of the sound — the pitch is the sound's business,
   * the cadence is not. (spec 09-24, 09-25)
   */
  readonly moanPeriod: number;
  readonly moanCrowd: number;
}

/** One line of the wave table, written out in full — nothing is computed. (spec 03-41) */
export interface WaveRow {
  readonly wave: number;
  readonly shamblers: number;
  readonly sprinters: number;
  readonly bruisers: number;
  readonly colossi: number;
  readonly streets: number;
}

// ---------------------------------------------------------------- the player

export interface PlayerBalance {
  /** The one pace, in blocks per second, whatever it carries. (spec 04-6, 04-7) */
  readonly runSpeed: number;
  /** What a jump clears, in blocks. (spec 04-10) */
  readonly jumpRise: number;
  readonly jumpGap: number;
  /** Seconds to climb or come down a ladder. (spec 04-13) */
  readonly ladderTime: number;
  /** What a fall costs. It is zero, and it stays zero. (spec 04-12) */
  readonly fallCost: number;
  /** Hp, and what one contact takes, whatever the kind. (spec 04-37) */
  readonly hp: number;
  readonly contactCost: number;
  /** Seconds staggered, then seconds untouchable, after a contact. (spec 04-39) */
  readonly stagger: number;
  readonly invulnerable: number;
  /** Seconds per hp regained; every contact resets the count. (spec 04-41) */
  readonly regenPeriod: number;
  /** Seconds on the ground after a collapse, then untouchable. (spec 04-42) */
  readonly collapseTime: number;
  readonly riseInvulnerable: number;
  /** Firebombs carried at once — exactly one magazine. (spec 04-47) */
  readonly armful: number;
}

export interface CameraBalance {
  /** Blocks behind the player, and above the ground it stands on. (spec 04-15) */
  readonly back: number;
  readonly above: number;
  /** Blocks of recoil it never goes under, and how high it climbs. (spec 04-18) */
  readonly minBack: number;
  readonly climb: number;
  /** Radians per second of recentring, and seconds frozen after a blow. */
  readonly recentre: number;
  readonly freezeAfterBlow: number;
}

export interface SwordBalance {
  /** The sector swept in front of the player, in degrees. (spec 04-22) */
  readonly arc: number;
  /** Reach, to the edge of the zombie box, in blocks. */
  readonly range: number;
  /** How far the sweep reaches above and below the player, in blocks. */
  readonly height: number;
  /** Blows per second, and the seconds between two of them. (spec 04-24) */
  readonly rate: number;
  readonly interval: number;
  /** What one blow costs each target it touches, in sword hits. (spec 04-33) */
  readonly swordHits: number;
  /** The grace, in seconds — neither announced nor visible. (spec 04-25) */
  readonly grace: number;
}

/** Sideways only: progress never decreases. (spec 04-34, 03-8) */
export interface KnockbackBalance {
  /** Blocks shifted in the direction of the blow. (spec 04-35) */
  readonly shift: number;
  /** Seconds of paused progress. */
  readonly paused: number;
}

// --------------------------------------------------------------- the cannons

export interface CannonballBalance {
  /** Range at ground height, in horizontal blocks. (spec 05-22) */
  readonly range: number;
  /** Extra blocks of range per block of roof height. */
  readonly perHeight: number;
  /** Seconds between two shots, at every tier. (spec 05-23) */
  readonly period: number;
  /** Seconds of flight, constant whatever the distance. (spec 05-25) */
  readonly flight: number;
  /** What one ball costs its single target, in sword hits. (spec 05-24) */
  readonly swordHits: number;
}

export interface FlameBalance {
  /** The cone, in degrees, and its reach in real blocks. (spec 05-30, 05-31) */
  readonly arc: number;
  readonly range: number;
  /** Sword hits per second, fed and dry. It never goes out. (spec 05-34) */
  readonly fed: number;
  readonly dry: number;
  /** Seconds of fed flame per firebomb burnt. (spec 05-35) */
  readonly perFirebomb: number;
}

export interface CannonBalance {
  /** Tiers, linear and without a branch. (spec 05-2) */
  readonly tiers: number;
  /** Seconds to put one down, roof or ground. (spec 05-7) */
  readonly placeTime: number;
  /** Blocks between two cannons — the same distance upgrades one. (spec 05-11, 05-13) */
  readonly spacing: number;
  /** What a ground cannon takes before it goes, in shambler hits. (spec 05-44) */
  readonly hp: number;
  /** Firebombs a magazine holds. (spec 04-47) */
  readonly magazine: number;
  /** Blocks within which an armful pours, and how long it takes. (spec 04-49) */
  readonly pourRange: number;
  readonly pourTime: number;
  /** Seconds per firebomb the conveyor brings, and its retraction. (spec 04-54, 04-55) */
  readonly conveyorPeriod: number;
  readonly conveyorRetract: number;
  readonly ball: CannonballBalance;
  readonly flame: FlameBalance;
}

// ----------------------------------------------------------------- the money

export interface CoinBalance {
  readonly shambler: number;
  readonly sprinter: number;
  readonly bruiser: number;
  readonly colossus: number;
}

export interface PriceBalance {
  readonly cannon: number;
  /** Moving up to tier two, then to tier three. (spec 06-18) */
  readonly tierTwo: number;
  readonly tierThree: number;
  readonly firebomb: number;
  /** The three notches of reinforcement, then the price it is bought back at. */
  readonly reinforcements: readonly number[];
  readonly reinforcementAgain: number;
}

export interface EconomyBalance {
  /** What a zombie pays when a cannon lands the fatal blow. (spec 06-2) */
  readonly coins: CoinBalance;
  /** What the bravery bonus multiplies it by, sword only. (spec 06-3) */
  readonly braveryFactor: number;
  /** What the town hall pays when the last zombie falls. (spec 06-13) */
  readonly assaultBonus: number;
  /** How close the player has to pass for a coin to fly to it. (spec 06-7) */
  readonly magnet: number;
  readonly prices: PriceBalance;
  /** The town hall, in shambler hits, and the caps a reinforcement buys. */
  readonly townHallHp: number;
  readonly townHallCaps: readonly number[];
  /** Segments of the bar, whatever the notch of reinforcement. (spec 08-13) */
  readonly townHallSegments: number;
}

// ---------------------------------------------------------------- the whole

export interface Balance {
  readonly loop: LoopBalance;
  readonly pools: PoolBalance;
  readonly pace: PaceBalance;
  readonly city: CityBalance;
  readonly shambler: ZombieBalance;
  readonly sprinter: ZombieBalance;
  readonly bruiser: ZombieBalance;
  readonly colossus: ZombieBalance;
  readonly assault: AssaultBalance;
  readonly waves: readonly WaveRow[];
  /** Past this wave, every wave is a copy of it. (spec 03-44) */
  readonly plateauWave: number;
  readonly player: PlayerBalance;
  readonly camera: CameraBalance;
  readonly sword: SwordBalance;
  readonly knockback: {
    readonly shambler: KnockbackBalance;
    readonly sprinter: KnockbackBalance;
    readonly bruiser: KnockbackBalance;
    readonly colossus: KnockbackBalance;
  };
  readonly cannon: CannonBalance;
  readonly economy: EconomyBalance;
}

/** Freezes the whole tree, so nothing edits a constant while a game runs. */
function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const BALANCE: Balance = freeze({
  loop: {
    hz: 60,
    frameClamp: 0.1,
    maxCatchUp: 6,
    fatalBlowFreeze: 0.06,
  },

  pools: {
    zombies: 60,
    projectiles: 96,
    shards: 600,
    events: 256,
    cannons: 24,

    // No chapter gives the coins a pool, so this one is **derived** and not
    // chosen, and the derivation is written out here rather than guessed at:
    //   - exactly one coin springs from every zombie felled (spec 06-2);
    //   - it lies where it fell until the player walks past it (spec 06-8), so
    //     an assault where he never walks past one leaves every one of them
    //     lying at once;
    //   - the end of an assault pays every one still lying, in the same
    //     movement, and a preparation opens on a city with none (spec 06-14,
    //     06-15) — so nothing ever carries over from one assault to the next;
    //   - what can lie at once is therefore what one assault can fell, which is
    //     the head count of its wave, and no line of the table — overtime
    //     included — walks more in than the sixty of the zombie pool
    //     (spec 03-42, 10-43).
    // Hence exactly the sixty of the zombies, and `checkWaveTotals` is already
    // what makes that binding: a table that grew past sixty would fail loudly
    // there before ever filling this. (spec 03-43)
    coins: 60,
  },

  pace: {
    mainWaves: 10,
    earlyPrep: 40,
    latePrep: 30,
    lastEarlyPrepWave: 3,
    fadeOut: 3,
  },

  city: {
    side: 216,
    apothem: 16,
    townHallSide: 8,
    townHallHeight: 7,
    baseLength: 6,
    baseWidth: 4,
    baseHeight: 3,
    mouthToTownHall: 12,
    perimeterCount: 9,
    perimeterHeight: 4,
    outskirts: 12,
    halo: 16,
    street: {
      length: 80,
      width: 6,
      rail: 92,
      frontageDepth: 8,
      bay: 6,
      baysPerEdge: 13,
      edgeShift: 3,
      gatewayHeight: 7,
      firstPackAt: 20,
    },
    // Twelve bays of six and one of eight, which soaks up what six does not
    // divide; the shifted edge opens on three and closes on eleven. (spec 02-19)
    alignedBays: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8],
    alignedHeights: [4, 6, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8, 8],
    shiftedBays: [3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11],
    shiftedHeights: [4, 6, 8, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8],
  },

  shambler: { speed: 1.5, hp: 1, shamblerHits: 1, scale: 1, appears: 1 },
  sprinter: { speed: 4, hp: 1, shamblerHits: 1, scale: 0.8, appears: 4 },
  bruiser: { speed: 1, hp: 5, shamblerHits: 3, scale: 1.4, appears: 7 },
  colossus: { speed: 0.8, hp: 25, shamblerHits: 10, scale: 2.2, appears: 10 },

  assault: {
    cadence: 6,
    packSize: 4,
    streetStagger: 8,
    lateralSpread: 2,
    unstickAfter: 3,
    blowPeriod: 1,
    grazeRange: 1.5,
    shardsLast: 0.6,
    escortCount: 6,
    escortRadius: 3,
    beaconsAt: 3,
    rushAfter: 15,
    rushSpeed: 4,
    moanPeriod: 0.14,
    moanCrowd: 40,
  },

  // The wave table, written out line by line: no wave is computed at run time,
  // and no wave is grown by a formula. (spec 03-41)
  waves: [
    { wave: 1, shamblers: 4, sprinters: 0, bruisers: 0, colossi: 0, streets: 1 },
    { wave: 2, shamblers: 8, sprinters: 0, bruisers: 0, colossi: 0, streets: 1 },
    { wave: 3, shamblers: 14, sprinters: 0, bruisers: 0, colossi: 0, streets: 1 },
    { wave: 4, shamblers: 12, sprinters: 4, bruisers: 0, colossi: 0, streets: 1 },
    { wave: 5, shamblers: 14, sprinters: 8, bruisers: 0, colossi: 0, streets: 2 },
    { wave: 6, shamblers: 16, sprinters: 14, bruisers: 0, colossi: 0, streets: 2 },
    { wave: 7, shamblers: 18, sprinters: 12, bruisers: 4, colossi: 0, streets: 2 },
    { wave: 8, shamblers: 18, sprinters: 16, bruisers: 6, colossi: 0, streets: 2 },
    { wave: 9, shamblers: 20, sprinters: 17, bruisers: 8, colossi: 0, streets: 2 },
    { wave: 10, shamblers: 20, sprinters: 14, bruisers: 6, colossi: 1, streets: 2 },
    { wave: 11, shamblers: 16, sprinters: 21, bruisers: 8, colossi: 0, streets: 3 },
    { wave: 12, shamblers: 18, sprinters: 25, bruisers: 6, colossi: 1, streets: 3 },
    { wave: 13, shamblers: 20, sprinters: 28, bruisers: 6, colossi: 1, streets: 3 },
    { wave: 14, shamblers: 22, sprinters: 31, bruisers: 6, colossi: 1, streets: 3 },
  ],
  plateauWave: 14,

  player: {
    runSpeed: 6,
    jumpRise: 2,
    jumpGap: 2,
    ladderTime: 0.8,
    fallCost: 0,
    hp: 5,
    contactCost: 1,
    stagger: 1,
    invulnerable: 1,
    regenPeriod: 6,
    collapseTime: 3,
    riseInvulnerable: 3,
    armful: 3,
  },

  camera: {
    back: 6.5,
    above: 5.5,
    minBack: 3.2,
    climb: 10,
    recentre: 2.4,
    freezeAfterBlow: 1.2,
  },

  sword: {
    arc: 120,
    range: 3,
    height: 1.5,
    rate: 2.5,
    interval: 0.4,
    swordHits: 1,
    grace: 0.15,
  },

  knockback: {
    shambler: { shift: 0.75, paused: 0.3 },
    sprinter: { shift: 0.75, paused: 0.3 },
    bruiser: { shift: 0, paused: 0.15 },
    colossus: { shift: 0, paused: 0 },
  },

  cannon: {
    tiers: 3,
    placeTime: 0.3,
    spacing: 3,
    hp: 20,
    magazine: 3,
    pourRange: 3,
    pourTime: 0.3,
    conveyorPeriod: 6,
    conveyorRetract: 1,
    ball: { range: 12, perHeight: 0.75, period: 2, flight: 0.6, swordHits: 1 },
    flame: { arc: 60, range: 6, fed: 2, dry: 0.5, perFirebomb: 6 },
  },

  economy: {
    coins: { shambler: 1, sprinter: 2, bruiser: 5, colossus: 50 },
    braveryFactor: 2,
    assaultBonus: 10,
    magnet: 4,
    prices: {
      cannon: 40,
      tierTwo: 60,
      tierThree: 120,
      firebomb: 1,
      reinforcements: [50, 80, 120],
      reinforcementAgain: 120,
    },
    townHallHp: 200,
    townHallCaps: [300, 400, 500],
    townHallSegments: 10,
  },
});
