/**
 * The one object the whole game mutates in place. It is allocated once at load,
 * never replaced, never copied, never made immutable: the zero-allocation rule
 * of the loop is what forbids all three. (spec 10-10, 10-14)
 *
 * It has three branches and three only (spec 10-12):
 *   - `balance`  the constants, frozen, injected by `createGame` and never
 *                imported by a rules module. (spec 10-15)
 *   - `snapshot` the wave boundary that survives a dead page: the ten fields of
 *                the Instantané, and nothing else. (spec 08-70)
 *   - `assault`  the volatile pools, the player and the counters.
 *
 * Every pool is a structure of arrays — `zombies.x`, `zombies.type`, never an
 * array of objects — of a fixed size taken from the balance and driven by a
 * counter: entries `[0, count)` are live. (spec 10-11, 10-13)
 *
 * What moves also carries a `Prev` buffer, because the renderer interpolates
 * between the two last steps and never between two frames. (spec 10-24)
 *
 * Three pools of chapter 10 are here — the zombies, the projectiles and the
 * events — and the six hundred shards are not: one `InstancedMesh` carries them
 * all (spec 07-27), and the quality scale takes that pool from 600 down to 200
 * without ever touching the simulation (spec 10-39). They live in the renderer.
 */
import type { Balance, CityBalance } from './balance';
import { createRandom, type Random } from './random';

/** The three streets of the star, and there will never be a fourth. (spec 02-2) */
export const STREETS = 3;

/**
 * The one street the base watches, which is street one: the shed is adossed to
 * the face of the town hall that looks down it, so it is the one rail with
 * something in front of the town hall. (spec 02-8, 02-29)
 */
export const BASE_STREET = 0;

/** The format of the Instantané, written in the JSON and never in the key. (spec 10-32) */
export const SNAPSHOT_VERSION = 1;

// ------------------------------------------------------------ what a step says

/**
 * The one enumeration of what a step has just done — the only channel by which
 * the simulation announces itself, read once per frame by the renderer, the
 * audio and the tests. A chapter that adds a fact of the game adds its constant
 * here, and the size of the buffer does not move. (spec 10-17, 10-19, 10-20)
 *
 * It opens on the closed list of triggers of chapter 9, plus the two blows a
 * cannon takes and gives, which the shards of chapter 7 need. (spec 07-36)
 */
export const EVENT = {
  /** A sword blow that touches without felling. (spec 04-33) */
  SWORD_HIT: 0,
  /** A fatal blow, whatever landed it. (spec 03-19) */
  FATAL_BLOW: 1,
  /** A sword blow that touches nothing, which costs nothing. (spec 04-28) */
  SWORD_MISS: 2,
  /** The assault moans, through the zombie the `index` names. (spec 09-26) */
  MOAN: 3,
  /** The player loses one hp. (spec 04-37) */
  CONTACT: 4,
  /** The player falls where he stands. (spec 04-42) */
  COLLAPSE: 5,
  /** He gets back up, three seconds later. (spec 04-42) */
  RISE: 6,
  /** A cannon sends a ball. (spec 05-23) */
  CANNONBALL_FIRED: 7,
  /** A cone lights, because a zombie walked into it. (spec 05-33) */
  FLAME_LIT: 8,
  /** The cone goes out, because nothing is left in it. (spec 05-33) */
  FLAME_OUT: 9,
  /** A cannon goes down. (spec 05-7) */
  CANNON_PLACED: 10,
  /** A cannon moves up a tier. (spec 05-2) */
  CANNON_UPGRADED: 11,
  /** A cannon takes a blow, in passing or from the ground. (spec 05-45) */
  CANNON_HIT: 12,
  /** A ground cannon reaches zero and goes. (spec 05-50) */
  CANNON_LOST: 13,
  /** A breach strikes the town hall, and a cube comes off it. (spec 03-18, 06-34) */
  TOWN_HALL_HIT: 14,
  /**
   * A coin enters the purse, because he passed within four blocks of it. The
   * spot is where it lay and the `value` is what it was worth, which is what
   * says how large the drawing flies it in. (spec 06-7, 06-9, 07-35)
   */
  COIN_TAKEN: 15,
  /**
   * The town hall pays what closes an assault, and it is one movement: the ten
   * coins and every coin still lying in the city, so the `value` carries the
   * whole payment rather than the ten alone. (spec 06-13, 06-14)
   */
  ASSAULT_BONUS: 16,
  /**
   * A reinforcement is paid for, which is two things in one movement: the town
   * hall whole again and its ceiling moved up. The `value` carries the **notch**
   * it now stands at, because that is what says the stuff it is built of — and
   * the drawing rebuilds the whole of it off this one fact rather than off two
   * states compared. (spec 06-25, 06-36, 06-37, 10-19)
   */
  REINFORCEMENT_BOUGHT: 17,
  /** The armful fills at the base. (spec 04-45) */
  ARMFUL_TAKEN: 18,
  /** A gateway lights, because its street becomes active. (spec 03-29) */
  GATEWAY_LIT: 19,
  /** The assault opens, and the pulse with it. (spec 01-11) */
  ASSAULT_BEGAN: 20,
  /** The last zombie of the assault has fallen. (spec 01-12) */
  ASSAULT_ENDED: 21,
  /** A tenth of the ceiling is gone, so a piece of the town hall falls, and only
   * a reinforcement ever brings it back. The `value` is how many segments still
   * stand. (spec 06-35, 06-36) */
  TOWN_HALL_SEGMENT_LOST: 22,
  /**
   * The sweep goes out, touched or not — the one fact that stands for a blow of
   * his sword. The three that come before it speak of what a blow finds; this one
   * speaks of the blow itself, which is what the white arc is drawn on and what
   * freezes the recentring of the camera for 1,2 s. The `value` carries the
   * heading it went out on, because a blow leaves where it was launched and the
   * arc is drawn there and nowhere else. (spec 04-17, 04-22, 04-32, 07-31)
   */
  SWEEP: 23,
  /**
   * A ball lands its blow on a zombie without felling it — the second of the two
   * facts that say a body took a blow, and the reason it is not `SWORD_HIT`: the
   * "tchac" of chapter 9 is a blow of *his sword*, and there is no sound of a
   * ball landing at all. What this one carries is the white puff every chapter
   * owes to whatever takes a blow. (spec 05-24, 07-36, 09 "Ce qui déclenche
   * chacun")
   */
  CANNONBALL_HIT: 24,
  /**
   * An armful goes into a magazine, all at once. The `index` names the cannon and
   * the `value` carries what the magazine held **before**, because the cells fill
   * over the 0,3 second of the gesture and the drawing never compares two states
   * to find out that they did. Chapter 9 gives the pouring no sound at all — the
   * cells and the cubes over his head say it — so this fact is the drawing's
   * alone. (spec 04-49, 05-5, 10-19, 10-20)
   */
  ARMFUL_POURED: 25,
  /**
   * The town hall has reached nought, and the game is over with it. It is the
   * one end there is — the child himself never falls — and the `value` carries
   * the number of the wave reached, because that figure is the whole of what
   * the end shows: a figure reads without knowing how to read. There is no word
   * of text beside it, and nothing at all is tallied up. (spec 01-28, 01-30)
   */
  GAME_ENDED: 26,
  /**
   * The purse can pay for a cannon for the first time, and not one stands. It is
   * the one moment of the game that says **climb**, and the rules own it because
   * the moment is chosen by the money and never by a calendar: at the end of the
   * second assault the payment carries the purse to forty-three, which is the
   * first cannon it can pay for. The drawing hears it and every ladder of the
   * city starts to beat; the beat ends for good on the first `CANNON_PLACED`,
   * and this fact is never written a second time. (spec 08-87, 08-88)
   */
  LADDERS_LIT: 27,
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

/**
 * The pre-allocated buffer, in structures of arrays like every pool. It is
 * emptied at the start of a frame, filled by the steps of that frame, and read
 * once before the drawing. (spec 10-17, 10-18)
 */
export interface EventBuffer {
  /** Entries `[0, count)` were written by this frame. */
  count: number;
  readonly type: Uint8Array;
  /** Which zombie, cannon or street the fact is about. */
  readonly index: Uint16Array;
  /** Where it happened, which is what the audio pans on and the shards fly from. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** The one number the fact carries — coins paid, sword hits taken, tier reached. */
  readonly value: Float32Array;
}

/** Empties the buffer. The loop calls it once per frame, before its steps. (spec 10-18) */
export function clearEvents(events: EventBuffer): void {
  events.count = 0;
}

/**
 * Writes one fact. Past the capacity of the buffer the fact is dropped rather
 * than allocated: nothing in a step ever grows. (spec 10-14, 10-17)
 */
export function pushEvent(
  events: EventBuffer,
  type: EventType,
  index: number,
  x: number,
  y: number,
  z: number,
  value: number,
): void {
  const at = events.count;
  if (at >= events.type.length) return;
  events.type[at] = type;
  events.index[at] = index;
  events.x[at] = x;
  events.y[at] = y;
  events.z[at] = z;
  events.value[at] = value;
  events.count = at + 1;
}

function createEventBuffer(size: number): EventBuffer {
  return {
    count: 0,
    type: new Uint8Array(size),
    index: new Uint16Array(size),
    x: new Float32Array(size),
    y: new Float32Array(size),
    z: new Float32Array(size),
    value: new Float32Array(size),
  };
}

// ----------------------------------------------------------------- the entries

/**
 * The one shape of the entries, written indifferently by the gamepad, the touch
 * screen, the keyboard or the pilot of the bench. It is sampled at the step and
 * never on an event: the two edges are held by whoever fills it, and cleared by
 * the reading. (spec 10-30, 10-31)
 */
export interface InputState {
  /** The left stick, of norm at most 1. (spec 10-30) */
  dx: number;
  dz: number;
  /** Held, not an edge: the button loops the blows. (spec 04-24) */
  strike: boolean;
  /** Rising edges. (spec 10-30, 10-31) */
  action: boolean;
  jump: boolean;
  airlock: boolean;
}

/** The one entries object of a run, allocated at load like everything else. */
export function createInput(): InputState {
  return { dx: 0, dz: 0, strike: false, action: false, jump: false, airlock: false };
}

// ----------------------------------------------------------------- the zombies

/** The four kinds, and there will never be a fifth. (spec 03-1) */
export const ZOMBIE = {
  SHAMBLER: 0,
  SPRINTER: 1,
  BRUISER: 2,
  COLOSSUS: 3,
} as const;

export type ZombieType = (typeof ZOMBIE)[keyof typeof ZOMBIE];

/**
 * A zombie has one position — its progress along the rail of its street, plus a
 * lateral offset — and it never leaves that rail. Progress never decreases, and
 * that is the formal guarantee that an assault always ends. (spec 03-7, 03-8)
 */
export interface ZombiePool {
  /** Entries `[0, count)` are alive. (spec 10-13) */
  count: number;
  readonly x: Float32Array;
  readonly z: Float32Array;
  readonly ang: Float32Array;
  readonly xPrev: Float32Array;
  readonly zPrev: Float32Array;
  readonly angPrev: Float32Array;
  /** One of the four constants of `ZOMBIE`. (spec 10-11) */
  readonly type: Uint8Array;
  /** What is left before the fatal blow, in sword hits; the flame eats fractions. */
  readonly hp: Float32Array;
  /** Which of the three rails it walks. (spec 03-6) */
  readonly street: Uint8Array;
  /** How far along that rail, in blocks. (spec 03-7) */
  readonly progress: Float32Array;
  /** How far off the rail, in blocks, either way. (spec 03-7) */
  readonly offset: Float32Array;
  /** 1 for the six bruisers held to the pace of the colossus. (spec 03-34) */
  readonly escort: Uint8Array;
  /** Seconds of halted progress left after a sword blow. (spec 04-35) */
  readonly knockedFor: Float32Array;
  /** Seconds its progress has not moved, which pushes it along at three. (spec 03-11) */
  readonly stuckFor: Float32Array;
  /** Seconds before its next blow against a construction. (spec 03-4) */
  readonly blowLeft: Float32Array;
  /**
   * Which blow of the sword last touched it, counted from one. The grace of
   * 150 ms lets one blow go on touching what walks into it, and this is what
   * keeps that one blow from landing twice on the same body. (spec 04-25, 04-33)
   */
  readonly struckBy: Uint32Array;
}

function createZombiePool(size: number): ZombiePool {
  return {
    count: 0,
    x: new Float32Array(size),
    z: new Float32Array(size),
    ang: new Float32Array(size),
    xPrev: new Float32Array(size),
    zPrev: new Float32Array(size),
    angPrev: new Float32Array(size),
    type: new Uint8Array(size),
    hp: new Float32Array(size),
    street: new Uint8Array(size),
    progress: new Float32Array(size),
    offset: new Float32Array(size),
    escort: new Uint8Array(size),
    knockedFor: new Float32Array(size),
    stuckFor: new Float32Array(size),
    blowLeft: new Float32Array(size),
    struckBy: new Uint32Array(size),
  };
}

// ------------------------------------------------------------------- the coins

/**
 * The coins lying in the city. Exactly one springs from every zombie felled, and
 * it lies where the body stood until the player passes within four blocks of it
 * or the assault closes: it never goes stale and it is never mislaid, so what was
 * not walked past is paid whole at the end and a preparation always opens on a
 * city with none of them. (spec 06-2, 06-7, 06-8, 06-14, 06-15)
 *
 * What it is worth rides here beside where it lies, because that one number is
 * also what says how large it is drawn — and the size is the whole of what tells
 * a bruiser's coin from a shambler's, and one the sword earned from one a cannon
 * earned. There is no second telling anywhere, and there never will be.
 * (spec 06-9, 06-10)
 *
 * It carries no `Prev` buffer, because in the rules it never moves: it lies
 * still, and the pass of the player has it at that very instant. The flight the
 * eye sees is the drawing's, and no rule of the game knows of it.
 * (spec 06-12, 07-35, 10-24)
 */
export interface CoinPool {
  /** Entries `[0, count)` lie in the city. (spec 10-13) */
  count: number;
  /** Where it lies, in blocks. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** What it is worth, in coins, which is also how large it is drawn. (spec 06-9) */
  readonly value: Float32Array;
}

function createCoinPool(size: number): CoinPool {
  return {
    count: 0,
    x: new Float32Array(size),
    y: new Float32Array(size),
    z: new Float32Array(size),
    value: new Float32Array(size),
  };
}

// ------------------------------------------------------------------- the sword

/**
 * The blow that has gone out, and the one zombie the aim holds.
 *
 * A blow is not an instant: it sweeps what stood in the sector when it left
 * **and** what walks into it in the 150 ms that follow, and the sector it sweeps
 * is the one it was thrown with — a blow leaves where it was launched, and the
 * body that threw it may walk on. Hence the spot and the heading kept here rather
 * than read off the player. (spec 04-25, 04-32)
 *
 * Nothing here is a victim: the aim orients the body and designates no one, since
 * the blow sweeps the whole sector. (spec 04-29)
 */
export interface Sword {
  /** The zombie the aim holds, or -1 when nothing stands within a blow. (spec 04-31) */
  aimAt: number;
  /** Seconds of grace left on the blow that has gone out. (spec 04-25) */
  graceLeft: number;
  /** Where it left from, and which way it went. (spec 04-32) */
  x: number;
  y: number;
  z: number;
  ang: number;
  /** Which blow this is, counted from one. (spec 04-24) */
  blow: number;
}

function createSword(): Sword {
  return { aimAt: -1, graceLeft: 0, x: 0, y: 0, z: 0, ang: 0, blow: 0 };
}

// ------------------------------------------------------------- the projectiles

/**
 * What a ball holds instead of a target once the body it was booked for has
 * fallen. It is past every slot a pool of sixty ever has, so nothing can be
 * mistaken for it: a ball whose target has gone flies on to its date and crashes
 * where it was due, since a ball never runs out and there is nothing to
 * spare. (spec 05-28, 10-13)
 */
export const NO_TARGET = 0xffff;

/**
 * A ball in flight is an interpolation between two spots and a date: there is no
 * collision test and no line of sight, the blow lands where and when it was
 * booked, and it flies on even if its target falls first. (spec 05-25 to 05-28)
 */
export interface ProjectilePool {
  /** Entries `[0, count)` are in the air. (spec 10-13) */
  count: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly xPrev: Float32Array;
  readonly yPrev: Float32Array;
  readonly zPrev: Float32Array;
  /** Where it left from. (spec 05-26) */
  readonly fromX: Float32Array;
  readonly fromY: Float32Array;
  readonly fromZ: Float32Array;
  /** Where it is due, which is where its target was reckoned to be. (spec 05-25) */
  readonly toX: Float32Array;
  readonly toY: Float32Array;
  readonly toZ: Float32Array;
  /** Seconds before the blow lands, whatever the distance. (spec 05-25) */
  readonly left: Float32Array;
  /** The zombie the sword hits are booked for. (spec 05-27) */
  readonly target: Uint16Array;
}

function createProjectilePool(size: number): ProjectilePool {
  return {
    count: 0,
    x: new Float32Array(size),
    y: new Float32Array(size),
    z: new Float32Array(size),
    xPrev: new Float32Array(size),
    yPrev: new Float32Array(size),
    zPrev: new Float32Array(size),
    fromX: new Float32Array(size),
    fromY: new Float32Array(size),
    fromZ: new Float32Array(size),
    toX: new Float32Array(size),
    toY: new Float32Array(size),
    toZ: new Float32Array(size),
    left: new Float32Array(size),
    target: new Uint16Array(size),
  };
}

// ----------------------------------------------------------------- the cannons

/**
 * A cannon never moves once it is down, so it carries a `Prev` buffer for its
 * aim and for nothing else. It sits in the branch that crosses a wave boundary,
 * because the Instantané carries the cannons. (spec 08-70)
 */
export interface CannonPool {
  /** Entries `[0, count)` stand. The pool is a technical bound, never a rule of
   * the game: nothing in the code defends it. (spec 05-51, 05-52) */
  count: number;
  readonly x: Float32Array;
  /** The height it stands at — a roof is a taller cell, never a special case. (spec 04-9) */
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** Where it aims, at the zombie furthest along its rail. (spec 05-38) */
  readonly ang: Float32Array;
  readonly angPrev: Float32Array;
  /** One, two or three, linear and without a branch. (spec 05-2) */
  readonly tier: Uint8Array;
  /** What is left of it, in shambler hits; on a roof it never loses one. (spec 05-44, 05-46) */
  readonly hp: Float32Array;
  /** Firebombs it holds, three at most. (spec 04-47) */
  readonly magazine: Uint8Array;
  /** Seconds before its next ball. (spec 05-23) */
  readonly ballLeft: Float32Array;
  /** Seconds of fed flame left in the firebomb it is burning. (spec 05-35) */
  readonly burnLeft: Float32Array;
  /**
   * Where the cone is turned, which is **not** where the barrel is: the two arms
   * aim by the same one sentence and aim apart, so the ball may be sent to the
   * far end of a street while the cone burns what stands at the foot of the
   * cannon. Hence a heading of its own, and its own `Prev` for the drawing.
   * (spec 05-40, 10-24)
   */
  readonly flameAng: Float32Array;
  readonly flameAngPrev: Float32Array;
  /**
   * 1 while a zombie stands in the cone, and that is the whole of what lights it:
   * a lit flame says by itself that one is there, and it never lights over an
   * empty cone. (spec 05-33)
   */
  readonly flameLit: Uint8Array;
  /** Seconds before the conveyor of a third tier brings its next firebomb. (spec 04-54) */
  readonly conveyorLeft: Float32Array;
}

function createCannonPool(size: number): CannonPool {
  return {
    count: 0,
    x: new Float32Array(size),
    y: new Float32Array(size),
    z: new Float32Array(size),
    ang: new Float32Array(size),
    angPrev: new Float32Array(size),
    tier: new Uint8Array(size),
    hp: new Float32Array(size),
    magazine: new Uint8Array(size),
    ballLeft: new Float32Array(size),
    burnLeft: new Float32Array(size),
    flameAng: new Float32Array(size),
    flameAngPrev: new Float32Array(size),
    flameLit: new Uint8Array(size),
    conveyorLeft: new Float32Array(size),
  };
}

// ----------------------------------------------------------------- the diamond

/**
 * What the second button will do where he stands. The mark laid on the floor
 * under his feet has **three readings and no fourth** — **wide and white**, a
 * cannon goes down; **tight, white and pulsing**, one acts on what stands here;
 * **wide and black**, there is nothing left to do. No word, no figure.
 * (spec 05-17, 05-18)
 *
 * The button, though, has more senses than the mark has readings: taking
 * firebombs, pouring them, putting a cannon down, upgrading one, reinforcing the
 * town hall — **and never two at one spot**. That is why the constants below
 * count more than three: the mark says *that* something happens here, and the
 * picto of the action button says *which*. The tight, pulsing reading is
 * already shared by two gestures in the spec itself — upgrading a cannon and
 * reinforcing the town hall — so pouring and taking join it rather than asking
 * for a fourth shape. (spec 04-60, 05-17, 06-30, 08-48)
 *
 * `PLACE` and `UPGRADE` share **one** distance, which is what leaves no gap
 * between them: under three blocks one acts on the cannon there, at three blocks
 * and over one puts down a new one, and there is no reading at all in which a
 * press does nothing where something was possible. (spec 05-13)
 *
 * The numbers are an enumeration and never an order, and nothing persists one:
 * this rides in the volatile branch, so no stored byte depends on them.
 * (spec 05-20, 10-12)
 */
export const DIAMOND = {
  /** Wide and white: a cannon goes down under his feet. (spec 05-7, 05-17) */
  PLACE: 0,
  /** Tight, white and pulsing: the one within three blocks moves up. (spec 05-13, 05-17) */
  UPGRADE: 1,
  /** Wide and black: a third tier, or a second one beyond the halo. (spec 05-18) */
  NONE: 2,
  /**
   * Tight, white and pulsing: the armful goes into the magazine of the cannon
   * within three blocks. It comes **before** the upgrading at that same
   * distance. (spec 04-49, 04-50, 05-15)
   */
  POUR: 3,
  /**
   * Tight, white and pulsing: at the contact of the shed, the armful fills.
   * (spec 04-45, 04-46)
   */
  TAKE: 4,
  /**
   * Tight, white and pulsing: at the contact of one of the three free faces of
   * the town hall, the reinforcement — whole again and the ceiling up, bought in
   * the thick of an assault exactly as a cannon goes down. It is never black and
   * there is no notch at which it stops, since the buy-back runs indefinitely.
   * (spec 06-28, 06-30, 06-31)
   */
  REINFORCE: 5,
} as const;

export type DiamondType = (typeof DIAMOND)[keyof typeof DIAMOND];

/**
 * The question one is asking, settled once a step from where one stands. It is
 * **not the state of any cannon**: it follows the feet, so walking off a spot
 * takes it away, mark and reach together. That is why it rides in the volatile
 * branch and never crosses a wave boundary. (spec 05-20, 10-12)
 *
 * It answers "may I *here*?" and never "may I pay?" — the purse is the badge's
 * question, and the two never overlap. (spec 08-28)
 */
export interface Diamond {
  /** Which of the three it shows. (spec 05-17, 05-18) */
  shows: DiamondType;
  /** The cannon it names, or -1 when it names none. (spec 05-13) */
  at: number;
  /** The floor cell under his feet, which is where it is laid. (spec 05-17) */
  x: number;
  y: number;
  z: number;
  /**
   * How far a ball would carry from here, in horizontal blocks — the circle the
   * reach paints on the floor, in the colour of the mark above it. It is what
   * teaches that height carries: he climbs, and the circle grows.
   * (spec 05-19, 05-22)
   */
  reach: number;
}

function createDiamond(): Diamond {
  return { shows: DIAMOND.PLACE, at: -1, x: 0, y: 0, z: 0, reach: 0 };
}

// ------------------------------------------------------------------ the player

/**
 * The one body the child drives. Its hp and its armful are not here but in the
 * branch that crosses a wave boundary, and its spot is in neither: at a resume
 * he stands at the base, where a preparation begins. (spec 08-70, 08-71)
 */
export interface Player {
  x: number;
  y: number;
  z: number;
  ang: number;
  xPrev: number;
  yPrev: number;
  zPrev: number;
  angPrev: number;
  /** How fast he rises or falls, in blocks a second; nought on the floor. (spec 04-10, 04-12) */
  vy: number;
  /** Seconds left of a ladder, which is also the whole of its immunity. (spec 04-13) */
  climbLeft: number;
  /** The height it started from, and the cell it steps off onto. (spec 04-13) */
  climbFromY: number;
  climbToX: number;
  climbToY: number;
  climbToZ: number;
  /** Seconds staggered after a contact — no blow possible. (spec 04-39) */
  staggerLeft: number;
  /** Seconds untouchable, after a contact or after getting up. (spec 04-39, 04-42) */
  invulnerableLeft: number;
  /** Seconds before the next hp comes back; a contact puts it back to full. (spec 04-41) */
  regenLeft: number;
  /** Seconds left on the ground after a collapse. (spec 04-42) */
  collapseLeft: number;
  /** Seconds before the next blow of the held button. (spec 04-24) */
  strikeLeft: number;
}

function createPlayer(): Player {
  return {
    x: 0,
    y: 0,
    z: 0,
    ang: 0,
    xPrev: 0,
    yPrev: 0,
    zPrev: 0,
    angPrev: 0,
    vy: 0,
    climbLeft: 0,
    climbFromY: 0,
    climbToX: 0,
    climbToY: 0,
    climbToZ: 0,
    staggerLeft: 0,
    invulnerableLeft: 0,
    regenLeft: 0,
    collapseLeft: 0,
    strikeLeft: 0,
  };
}

// --------------------------------------------------------------------- the city

/**
 * The city, rebuilt at load from the rules of chapter 2 and never stored: the
 * star of three branches, the hexagonal square, the town hall, the base, the two
 * frontages of a street with their two height sequences, the ladders, the
 * gateways, the rails and the halo. The constants rebuild it exactly, whereas a
 * grid of 46 656 cells neither reads back nor compares, and goes stale at the
 * first retouch. (spec 02 "Pourquoi le plan est une règle et non une image")
 *
 * All of it comes down to a grid of heights, one cell per block, which says how
 * high what stands in it goes and whether one has the right to be there: it is
 * the one collision structure of the game. A roof is therefore never a case of
 * its own, only a taller cell — and the town hall and the shed are cells taller
 * still, with the right withheld. (spec 04-8, 04-9, 02-9)
 *
 * Chapter 10 lists no module for it, and its list is closed, so the plan is
 * engendered here beside the one object it belongs to.
 */

/** The eighty-seven buildings: seventy-eight along the streets, nine on the perimeter. (spec 02-17) */
export interface BuildingPool {
  /** Entries `[0, count)` stand — and all of them do, since nothing is built here. (spec 02-1) */
  count: number;
  /** The middle of the footprint, in blocks. */
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Four, six or eight blocks, and never anything else. (spec 02-20) */
  readonly height: Uint8Array;
  /** The street it fronts, or -1 for the nine of the perimeter. (spec 02-10) */
  readonly street: Int8Array;
  /** Which of the two edges: 0 the aligned one, 1 the shifted one. (spec 02-18) */
  readonly edge: Uint8Array;
  /** Its rank from the mouth of the street, or from one end of a square face. (spec 02-19) */
  readonly bay: Uint8Array;
  /** The middle of the one face that carries its one ladder. (spec 02-26) */
  readonly ladderX: Float32Array;
  readonly ladderZ: Float32Array;
  /** The heading one pushes towards to climb it, which is into the building. (spec 04-13) */
  readonly ladderAng: Float32Array;
  /** 1 where the halo reaches the roof, which is what a conveyor asks. (spec 02-33) */
  readonly haloed: Uint8Array;
}

function createBuildingPool(size: number): BuildingPool {
  return {
    count: 0,
    x: new Float32Array(size),
    z: new Float32Array(size),
    height: new Uint8Array(size),
    street: new Int8Array(size),
    edge: new Uint8Array(size),
    bay: new Uint8Array(size),
    ladderX: new Float32Array(size),
    ladderZ: new Float32Array(size),
    ladderAng: new Float32Array(size),
    haloed: new Uint8Array(size),
  };
}

/**
 * The three rails: one fixed polyline per street, traced once and for all from
 * the entrance of the street to the face of the town hall. A street is straight
 * and aims at the town hall, so a rail holds two stops and ninety-two blocks.
 * (spec 02-13, 03-6)
 */
export interface RailPool {
  /** Stops in one polyline. */
  readonly stops: number;
  /** `STREETS * stops` entries, one rail after the other. */
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** How far along its rail each stop sits, in blocks. (spec 03-7) */
  readonly at: Float32Array;
  /** From the entrance to the face of the town hall, in blocks. (spec 02-13) */
  readonly length: number;
  /**
   * How far along its rail a walk comes to a stop, in blocks, one entry a
   * street: the face of the **built** it meets. On the two free streets that is
   * the face of the town hall, at the very end of the rail; on the one the base
   * watches it is the face of the shed, which stands the depth of the shed short
   * of it — the shed is built for a zombie exactly as the town hall is.
   *
   * **The rail keeps its ninety-two blocks on all three.** What comes earlier on
   * street one is where a body stops, never the rail itself: the crossings and
   * the table of the waves are reckoned on the rail. (spec 02-8, 02-13, 03-17,
   * 03-45, 03-47)
   */
  readonly faceAt: Float32Array;
}

/** One gateway at the mouth of each street, on the square side. (spec 02-27) */
export interface GatewayPool {
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** The heading of the street it opens. (spec 02-16) */
  readonly ang: Float32Array;
}

/** The one terrain, engendered at load and only read from there on. (spec 04-8) */
export interface City {
  /** The side of the grid, in cells. (spec 02-1) */
  readonly side: number;
  /**
   * How high what stands in a cell goes, in blocks: the floor one walks at
   * wherever one may be, and the top of the town hall or of the shed where one
   * may not — the two builds nobody ever climbs, which a camera has to see all
   * the same. (spec 02-9, 04-8, 04-18)
   */
  readonly height: Uint8Array;
  /** 1 where one has the right to be, 0 everywhere else. (spec 02-4, 04-8) */
  readonly walkable: Uint8Array;
  /**
   * The middle of the base, which is what the halo is measured from, and how far
   * it carries in horizontal blocks — on the ground exactly as on a roof.
   * (spec 02-31)
   */
  readonly baseX: number;
  readonly baseZ: number;
  readonly halo: number;
  /**
   * The shed itself: the heading it faces — street one's, the one face of the
   * town hall it is adossed to — and half its footprint along that heading and
   * across it. It is what "at the contact of the shed" is measured against, and
   * it is the one place firebombs are ever taken. (spec 02-8, 04-45)
   */
  readonly baseAng: number;
  readonly baseAlong: number;
  readonly baseAcross: number;
  /**
   * Half the side of the town hall, which stands eight by eight at the exact
   * middle. It is what the contact of a face is measured against, and the shed
   * is adossed to one of the four. (spec 02-7, 02-8)
   */
  readonly townHallHalf: number;
  readonly buildings: BuildingPool;
  readonly rails: RailPool;
  readonly gateways: GatewayPool;
}

/** The one reading of the halo, which `createCity` takes before a `City` exists. */
function haloReaches(baseX: number, baseZ: number, halo: number, x: number, z: number): boolean {
  return Math.hypot(x - baseX, z - baseZ) < halo;
}

/**
 * Whether a spot lies in the halo: sixteen blocks of horizontal distance from
 * the base, on the ground as on the roofs. It is what a conveyor asks, and it is
 * therefore the one thing that says whether a cannon may ever reach its third
 * tier — nine roofs out of eighty-seven, plus the ground the halo covers.
 * (spec 02-31, 02-33, 05-16)
 */
export function inHalo(city: City, x: number, z: number): boolean {
  return haloReaches(city.baseX, city.baseZ, city.halo, x, z);
}

/**
 * Whether a spot stands within `reach` of the **shed** — not of the middle of
 * the base, but of the box itself, so all three free faces of it answer alike
 * and none is a case of its own. The fourth is against the town hall, and the
 * shed is precisely the face of the town hall that never reinforces: firebombs
 * there, the reinforcement on the other three. (spec 02-8, 04-45, 06-31)
 *
 * It is the whole of "at the contact of the hangar": the distance is taken to
 * the nearest point of the footprint, which is nought for a body pressed
 * against it and grows straight away as he walks off. (spec 04-45)
 */
export function atBase(city: City, x: number, z: number, reach: number): boolean {
  const offX = x - city.baseX;
  const offZ = z - city.baseZ;
  const cos = Math.cos(city.baseAng);
  const sin = Math.sin(city.baseAng);
  const along = Math.abs(offX * cos + offZ * sin) - city.baseAlong;
  const across = Math.abs(-offX * sin + offZ * cos) - city.baseAcross;
  const outAlong = along > 0 ? along : 0;
  const outAcross = across > 0 ? across : 0;
  return outAlong * outAlong + outAcross * outAcross < reach * reach;
}

/**
 * Whether a spot stands at the contact of one of the **three free faces** of the
 * town hall — the three that reinforce. The fourth is the one the shed of the
 * base is adossed to, and it **never** reinforces: there, one takes firebombs.
 * (spec 02-8, 06-31)
 *
 * Which of the four faces one stands at is settled by the two diagonals of the
 * square, in the frame the shed gives: past them on the shed's heading one is at
 * the shed's face and nowhere else, whatever the reach — so the corners belong
 * to it and not to its neighbours, and a press there can never reinforce. The
 * whole face is refused and not merely the width the shed covers, because 06-31
 * speaks of a **face** and the two blocks it leaves at either end are the same
 * face.
 *
 * Past that, it is the one reading of a contact this game has, the same
 * `atBase` takes: the distance to the nearest point of the footprint, nought for
 * a body pressed against it and growing as he walks off. (spec 03-14, 04-45)
 */
export function atFreeFace(city: City, x: number, z: number, reach: number): boolean {
  const cos = Math.cos(city.baseAng);
  const sin = Math.sin(city.baseAng);
  const along = x * cos + z * sin;
  const across = -x * sin + z * cos;
  if (along >= Math.abs(across)) return false; // the face the shed holds (spec 06-31)

  const half = city.townHallHalf;
  const offAlong = Math.abs(along) - half;
  const offAcross = Math.abs(across) - half;
  const outAlong = offAlong > 0 ? offAlong : 0;
  const outAcross = offAcross > 0 ? offAcross : 0;
  return outAlong * outAlong + outAcross * outAcross < reach * reach;
}

/** The cell a spot falls in, or -1 past the city. */
export function cellAt(city: City, x: number, z: number): number {
  const half = city.side / 2;
  const i = Math.floor(x + half);
  const j = Math.floor(z + half);
  if (i < 0 || j < 0 || i >= city.side || j >= city.side) return -1;
  return i * city.side + j;
}

/** Whether one has the right to be there. (spec 02-4, 04-8) */
export function walkableAt(city: City, x: number, z: number): boolean {
  const at = cellAt(city, x, z);
  return at >= 0 && city.walkable[at] === 1;
}

/**
 * How high what stands in a cell goes, in blocks: nought on the floor of a
 * street or of the square, the height of the building on a roof, and seven or
 * three inside the town hall and the shed — which one never walks on, and which
 * a line of sight has to stop against all the same. Whether one has the right to
 * be there is the other half of a cell, and `walkableAt` answers it; the two are
 * asked together wherever a body moves, and the height alone wherever a view is
 * traced. (spec 02-9, 04-8, 04-9, 04-18)
 */
export function heightAt(city: City, x: number, z: number): number {
  const at = cellAt(city, x, z);
  return at < 0 ? 0 : city.height[at];
}

/** Which segment of a polyline an advance falls in. (spec 03-7) */
function segmentAt(rails: RailPool, street: number, progress: number): number {
  const first = street * rails.stops;
  let k = 0;
  while (k < rails.stops - 2 && progress > rails.at[first + k + 1]) k += 1;
  return k;
}

function alongRail(
  coords: Float32Array,
  rails: RailPool,
  street: number,
  progress: number,
): number {
  const first = street * rails.stops;
  const k = segmentAt(rails, street, progress);
  const from = rails.at[first + k];
  const span = rails.at[first + k + 1] - from;
  let f = span === 0 ? 0 : (progress - from) / span;
  if (f < 0) f = 0;
  if (f > 1) f = 1;
  const a = coords[first + k];
  return a + (coords[first + k + 1] - a) * f;
}

/** Where a rail stands at a given advance, the entrance being nought. (spec 03-7, 03-8) */
export function railX(rails: RailPool, street: number, progress: number): number {
  return alongRail(rails.x, rails, street, progress);
}

export function railZ(rails: RailPool, street: number, progress: number): number {
  return alongRail(rails.z, rails, street, progress);
}

/**
 * Which way a rail runs at a given advance, in radians — from the entrance
 * towards the face of the town hall, which is the one way anything walks it.
 * It is what a lateral offset is measured across, and what a body faces.
 * (spec 03-7, 03-12)
 */
export function railAng(rails: RailPool, street: number, progress: number): number {
  const first = street * rails.stops;
  const k = segmentAt(rails, street, progress);
  return Math.atan2(
    rails.z[first + k + 1] - rails.z[first + k],
    rails.x[first + k + 1] - rails.x[first + k],
  );
}

/**
 * Engenders the whole plan. It runs once, at load, and allocates the two grids
 * and the three pools there and nowhere else. (spec 10-13, 10-14)
 *
 * The frame of a street: `along` counts from the middle of the city outwards,
 * `across` sideways. The three streets therefore carry one drawing turned by
 * 120°, and no street is a case of its own. (spec 02-16)
 */
export function createCity(balance: CityBalance): City {
  const side = balance.side;
  const half = side / 2;
  const height = new Uint8Array(side * side);
  const walkable = new Uint8Array(side * side);

  const perEdge = balance.street.baysPerEdge;
  const perSector = balance.perimeterCount / STREETS;
  const buildings = createBuildingPool(STREETS * 2 * perEdge + balance.perimeterCount);
  buildings.count = buildings.height.length;

  const mouth = balance.apothem; // the square ends where a street begins (spec 02-7)
  const far = mouth + balance.street.length; // and the street ends there (spec 02-12)
  const halfWidth = balance.street.width / 2;
  const frontage = halfWidth + balance.street.frontageDepth; // (spec 02-14)
  const townHall = balance.townHallSide / 2;

  const dirX = (k: number): number => Math.cos((k * 2 * Math.PI) / STREETS);
  const dirZ = (k: number): number => Math.sin((k * 2 * Math.PI) / STREETS);
  /** The heading of the square face the perimeter closes, between two streets. */
  const faceAng = (p: number): number => (Math.PI / STREETS) * (1 + 2 * p);

  /**
   * The perimeter is what closes the hub, and it is bounded by a disk and not by
   * a strip of even thickness: everything the square, the streets and their
   * frontages leave inside 26 blocks of the middle of the city — the apothem,
   * the depth of a frontage, and two blocks over. It therefore runs ten blocks
   * deep on the normal of a face and only seven and a half in a corner of the
   * hexagon, which is what the tally of chapter 2 counts. (spec 02-10)
   */
  const perimeterReach = balance.apothem + balance.street.frontageDepth + 2;
  /**
   * A sector holds one street and the three buildings that close the hub beside
   * it. The street and its two frontages take the angle their outer edge — eleven
   * blocks off the rail — subtends at the mouth, from either side; what is left
   * is cut in three. That cut is the one the tally of the chapter asks for: the
   * halo reaches the three buildings of each of the two sectors that flank street
   * one, which are the six of the perimeter eligible to a conveyor. (spec 02-33)
   */
  const sectorAng = (2 * Math.PI) / STREETS;
  const takenAng = Math.atan(frontage / balance.apothem);
  const freeAng = sectorAng - 2 * takenAng;
  const islandAng = (k: number, rank: number): number =>
    k * sectorAng + takenAng + ((rank + 0.5) * freeAng) / perSector;

  /** How far the boundary of the square stands at a heading. (spec 02-6) */
  const faceStep = Math.PI / STREETS; // sixty degrees from one face normal to the next
  function squareReach(ang: number): number {
    const off = (((ang + faceStep / 2) % faceStep) + faceStep) % faceStep - faceStep / 2;
    return balance.apothem / Math.cos(off);
  }

  const spotX = (ang: number, along: number, across: number): number =>
    Math.cos(ang) * along - Math.sin(ang) * across;
  const spotZ = (ang: number, along: number, across: number): number =>
    Math.sin(ang) * along + Math.cos(ang) * across;

  // The middle of the base, two blocks of shed out from the face of the town hall
  // that watches street one; the halo is measured from there. (spec 02-8, 02-31)
  const baseAt = townHall + balance.baseWidth / 2;
  // The heading of street one, which is the one the base watches. (spec 02-8, 02-29)
  const baseAng = Math.atan2(dirZ(BASE_STREET), dirX(BASE_STREET));
  const baseX = dirX(BASE_STREET) * baseAt;
  const baseZ = dirZ(BASE_STREET) * baseAt;

  const baysOf = (edge: number): readonly number[] =>
    edge === 0 ? balance.alignedBays : balance.shiftedBays;
  const heightsOf = (edge: number): readonly number[] =>
    edge === 0 ? balance.alignedHeights : balance.shiftedHeights;

  /** Which bay of an edge a distance from the mouth falls in. (spec 02-19) */
  function bayOf(edge: number, from: number): number {
    const bays = baysOf(edge);
    let start = 0;
    for (let b = 0; b < bays.length; b += 1) {
      start += bays[b];
      if (from < start) return b;
    }
    return bays.length - 1;
  }

  const streetBuilding = (k: number, edge: number, bay: number): number =>
    (k * 2 + edge) * perEdge + bay;
  const perimeterBuilding = (p: number, rank: number): number =>
    STREETS * 2 * perEdge + p * perSector + rank;

  // ---- the seventy-eight buildings of the streets, and their ladders
  for (let k = 0; k < STREETS; k += 1) {
    const ang = (k * 2 * Math.PI) / STREETS;
    for (let edge = 0; edge < 2; edge += 1) {
      // The two edges are told apart by their shift and by their cuts alone: which
      // of them lies left going down the street is not a decision. (spec 02
      // "Pourquoi le décalage d'un demi-module")
      const sign = edge === 0 ? 1 : -1;
      const bays = baysOf(edge);
      const heights = heightsOf(edge);
      let start = 0;
      for (let bay = 0; bay < perEdge; bay += 1) {
        const at = streetBuilding(k, edge, bay);
        const middle = mouth + start + bays[bay] / 2;
        start += bays[bay];
        buildings.height[at] = heights[bay];
        buildings.street[at] = k;
        buildings.edge[at] = edge;
        buildings.bay[at] = bay;
        buildings.x[at] = spotX(ang, middle, (sign * (halfWidth + frontage)) / 2);
        buildings.z[at] = spotZ(ang, middle, (sign * (halfWidth + frontage)) / 2);
        // The one ladder sits in the middle of the one face that gives onto
        // walkable ground, which for these is the street. (spec 02-26)
        buildings.ladderX[at] = spotX(ang, middle, sign * halfWidth);
        buildings.ladderZ[at] = spotZ(ang, middle, sign * halfWidth);
        buildings.ladderAng[at] = Math.atan2(sign * Math.cos(ang), -sign * Math.sin(ang));
      }
    }
  }

  // ---- the nine of the perimeter, three per sector, never astride a street
  for (let p = 0; p < STREETS; p += 1) {
    const wall = faceAng(p); // the face they all stand on, between two streets
    for (let rank = 0; rank < perSector; rank += 1) {
      const at = perimeterBuilding(p, rank);
      const ang = islandAng(p, rank);
      const reach = squareReach(ang);
      buildings.height[at] = balance.perimeterHeight; // all nine at four (spec 02-11)
      buildings.street[at] = -1;
      buildings.edge[at] = 0;
      buildings.bay[at] = rank;
      buildings.x[at] = Math.cos(ang) * (reach + balance.street.frontageDepth / 2);
      buildings.z[at] = Math.sin(ang) * (reach + balance.street.frontageDepth / 2);
      // Theirs gives onto the square, which is their one walkable face. (spec 02-26)
      buildings.ladderX[at] = Math.cos(ang) * reach;
      buildings.ladderZ[at] = Math.sin(ang) * reach;
      buildings.ladderAng[at] = wall;
    }
  }

  // ---- the grid, cell by cell
  /** How far a spot sits from the middle, on the three axes of the hexagon. */
  function hexAt(x: number, z: number): number {
    let most = 0;
    for (let s = 0; s < STREETS; s += 1) {
      const a = (s * Math.PI) / STREETS;
      const d = Math.abs(x * Math.cos(a) + z * Math.sin(a));
      if (d > most) most = d;
    }
    return most;
  }

  const haloed = (x: number, z: number): boolean =>
    haloReaches(baseX, baseZ, balance.halo, x, z);

  function walk(at: number, floor: number, owner: number, x: number, z: number): void {
    walkable[at] = 1;
    height[at] = floor;
    if (owner >= 0 && haloed(x, z)) buildings.haloed[owner] = 1;
  }

  /**
   * What stands in a cell nobody may be in: its height alone, and the right to
   * be there withheld. It is the second half of a cell filled in and never a
   * second telling — the grid says what a cell holds and whether one may stand
   * on it, and here it holds seven blocks of town hall or three of shed and one
   * may not. (spec 02-9, 04-8)
   */
  function stands(at: number, high: number): void {
    height[at] = high;
  }

  for (let i = 0; i < side; i += 1) {
    for (let j = 0; j < side; j += 1) {
      const x = i + 0.5 - half;
      const z = j + 0.5 - half;
      const at = i * side + j;
      let settled = false;

      for (let k = 0; k < STREETS && !settled; k += 1) {
        const ux = dirX(k);
        const uz = dirZ(k);
        const along = x * ux + z * uz;
        if (along <= mouth || along >= far) continue;
        const across = -x * uz + z * ux;
        const off = Math.abs(across);
        if (off < halfWidth) {
          // The whole floor of a street is street floor: no verge, no kerb. (spec 02-15)
          walk(at, 0, -1, x, z);
          settled = true;
        } else if (off < frontage) {
          const edge = across > 0 ? 0 : 1;
          const owner = streetBuilding(k, edge, bayOf(edge, along - mouth));
          walk(at, buildings.height[owner], owner, x, z);
          settled = true;
        }
      }
      if (settled) continue;

      if (hexAt(x, z) < balance.apothem) {
        // What is left of the hexagon is the floor of the square, less the town
        // hall and the shed of the base, whose roofs are never climbed and on
        // which nothing is ever put down. Neither is left blank, though: a cell
        // carries how high what stands in it goes, and the two of them go seven
        // and three. Nobody walks there — `stands` never opens the cell — but
        // the line of sight of a camera reads that height, and a build left at
        // nought is a build a camera walks straight through. (spec 02-6, 02-7,
        // 02-8, 02-9, 04-18)
        if (Math.abs(x) < townHall && Math.abs(z) < townHall) {
          stands(at, balance.townHallHeight);
          continue;
        }
        const shedAlong = x * dirX(BASE_STREET) + z * dirZ(BASE_STREET);
        const shedAcross = -x * dirZ(BASE_STREET) + z * dirX(BASE_STREET);
        if (
          shedAlong > townHall &&
          shedAlong < townHall + balance.baseWidth &&
          Math.abs(shedAcross) < balance.baseLength / 2
        ) {
          stands(at, balance.baseHeight);
          continue;
        }
        walk(at, 0, -1, x, z);
        continue;
      }

      // Past the square, and left over by the streets and their frontages: the
      // perimeter closes the hub inside its disk, three buildings per sector and
      // never one astride a street. (spec 02-10)
      if (Math.hypot(x, z) > perimeterReach) continue;
      let ang = Math.atan2(z, x);
      if (ang < 0) ang += 2 * Math.PI;
      const sector = Math.min(STREETS - 1, Math.floor(ang / sectorAng));
      const share = (ang - sector * sectorAng - takenAng) / freeAng;
      let rank = Math.floor(share * perSector);
      if (rank < 0) rank = 0;
      if (rank >= perSector) rank = perSector - 1;
      walk(at, balance.perimeterHeight, perimeterBuilding(sector, rank), x, z);
    }
  }

  // ---- the three rails and the three gateways
  const stops = 2;
  const rails: RailPool = {
    stops,
    x: new Float32Array(STREETS * stops),
    z: new Float32Array(STREETS * stops),
    at: new Float32Array(STREETS * stops),
    length: balance.street.rail,
    faceAt: new Float32Array(STREETS),
  };
  const gateways: GatewayPool = {
    x: new Float32Array(STREETS),
    z: new Float32Array(STREETS),
    ang: new Float32Array(STREETS),
  };
  for (let k = 0; k < STREETS; k += 1) {
    const ang = (k * 2 * Math.PI) / STREETS;
    const first = k * stops;
    rails.x[first] = spotX(ang, far, 0); // the entrance, out of sight (spec 03-32)
    rails.z[first] = spotZ(ang, far, 0);
    rails.at[first] = 0;
    rails.x[first + 1] = spotX(ang, townHall, 0); // the face of the town hall (spec 03-6)
    rails.z[first + 1] = spotZ(ang, townHall, 0);
    rails.at[first + 1] = balance.street.rail;
    // Where a walk down this rail stops: the face of the town hall, and the face
    // of the shed on the one street the base watches, the depth of the shed short
    // of it. It is a bound on the advance and nothing else — no collision, and
    // nothing that pushes anything back. (spec 02-8, 03-8, 03-17, 03-45)
    rails.faceAt[k] = balance.street.rail - (k === BASE_STREET ? balance.baseWidth : 0);
    gateways.x[k] = spotX(ang, mouth, 0); // at the mouth, never at the far end (spec 02-27)
    gateways.z[k] = spotZ(ang, mouth, 0);
    gateways.ang[k] = ang;
  }

  return {
    side,
    height,
    walkable,
    baseX,
    baseZ,
    halo: balance.halo,
    // The shed reaches from the face of the town hall out along street one, and
    // it is six blocks across it. (spec 02-8)
    baseAng,
    baseAlong: balance.baseWidth / 2,
    baseAcross: balance.baseLength / 2,
    townHallHalf: townHall,
    buildings,
    rails,
    gateways,
  };
}

// ----------------------------------------------------------- the three branches

/** A wave is a cycle in two times: an assault, then a preparation. (spec 01-11) */
export const PHASE = {
  ASSAULT: 0,
  PREP: 1,
} as const;

export type PhaseType = (typeof PHASE)[keyof typeof PHASE];

/** The town hall, which never heals: only a reinforcement lifts it. (spec 01-19, 06-25) */
export interface TownHall {
  /** What is left, in shambler hits. (spec 06-26) */
  hp: number;
  /** The ceiling a reinforcement moves to 300, 400 then 500. (spec 06-27) */
  cap: number;
}

/**
 * The wave boundary, and the ten fields of the Instantané — not one more. It
 * describes a boundary and never an assault, so a dead page comes back at the
 * start of the preparation of the wave in hand. (spec 08-66, 08-69, 08-70)
 */
export interface Snapshot {
  /** The format, which is written in the JSON and never in the key. (spec 10-32) */
  version: number;
  /** Numbered from one, and without a ceiling in overtime. (spec 01-10, 08-77) */
  wave: number;
  /** Victory is won: nothing that follows takes it back. (spec 01-26) */
  won: boolean;
  townHall: TownHall;
  /** The purse, which has no ceiling and no interest. (spec 06-23) */
  coins: number;
  readonly cannons: CannonPool;
  /** The five of the player. (spec 04-37) */
  playerHp: number;
  /** Firebombs carried, three at most. (spec 04-47) */
  armful: number;
  /** One flag per street: the schedule is settled and never drawn. (spec 03-28) */
  readonly streets: Uint8Array;
  /** The one generator, whose whole state rides here. (spec 10-27) */
  readonly random: Random;
}

/** The volatile pools, the player and the counters. (spec 10-12) */
export interface Assault {
  /** Which of the two times of the wave is running. (spec 01-11) */
  phase: PhaseType;
  /** Seconds left of a preparation, which nothing lengthens or shortens. (spec 01-14) */
  prepLeft: number;
  /** Zombies of this wave that have not walked in yet. (spec 08-39) */
  toEnter: number;
  /** Packs each street has already walked in this wave. (spec 03-22) */
  readonly sent: Uint8Array;
  /** Seconds before the next pack of each street, staggered at the start of an
   * assault so the streets carrying a wave open one after the other. (spec 03-25) */
  readonly enterLeft: Float32Array;
  /** Seconds spent at three left or fewer, which sends the last ones at four
   * blocks a second once it reaches fifteen. (spec 03-38, 03-39) */
  fewFor: number;
  /**
   * Whether the ladders have already been called, which is what keeps that one
   * fact to one writing. It rides in the volatile branch and not in the ten
   * fields that cross a wave boundary, because it needs no writing there: a page
   * that comes back with a cannon standing asks nothing, and one that comes back
   * with none and enough in the purse is a child who still has to be told to
   * climb. (spec 08-70, 08-87, 10-12)
   */
  laddersCalled: boolean;
  /**
   * The terrain, engendered at load from the rules of chapter 2. It rides here
   * because `Game` has three branches and three only: it is not the injected
   * balance, and it is not one of the ten fields that cross a wave boundary.
   * (spec 10-12, 10-15, 08-70)
   */
  readonly city: City;
  readonly zombies: ZombiePool;
  readonly projectiles: ProjectilePool;
  /**
   * What lies on the floor of the city waiting to be walked past. It sits in the
   * volatile branch and not in the one that crosses a wave boundary, because a
   * preparation opens on a city with no coins in it: the end of an assault pays
   * every one of them, so not one ever has to survive a dead page.
   * (spec 06-15, 08-70, 10-12)
   */
  readonly coins: CoinPool;
  readonly events: EventBuffer;
  readonly player: Player;
  /** The blow in the air, and the one the aim holds. (spec 04-25, 04-31) */
  readonly sword: Sword;
  /**
   * What the second button would do where he stands. It is a question and not a
   * state of anything, so it sits here rather than in the branch that crosses a
   * wave boundary. (spec 05-20, 08-70, 10-12)
   */
  readonly diamond: Diamond;
  /**
   * The moan of the assault, which is three numbers and belongs to no zombie:
   * the seconds left of the moment under way, what the living have piled up
   * since the last moan went out, and which of the living is owed the next one.
   *
   * It rides in the volatile branch because it says nothing a wave boundary has
   * to remember: an assault opens its own. (spec 09-24, 09-25, 09-26, 10-12)
   */
  moanLeft: number;
  moanOwed: number;
  moanNext: number;
}

/** The one object, allocated at load and mutated in place ever after. (spec 10-10) */
export interface Game {
  readonly balance: Balance;
  readonly snapshot: Snapshot;
  readonly assault: Assault;
}

/**
 * Allocates the one game. The balance is handed in and stored, never imported by
 * a rules module: that is what lets the bench replay a hundred variants without
 * touching a line of rules. (spec 10-15)
 *
 * The seed is handed in too, because nothing here may read a clock or draw a
 * free number; zero is what a test gets when it does not care. (spec 10-1, 10-27)
 */
export function createGame(balance: Balance, seed = 0): Game {
  const streets = new Uint8Array(STREETS);
  streets[0] = 1; // waves one to four walk down street one alone (spec 03-28)

  return {
    balance,
    snapshot: {
      version: SNAPSHOT_VERSION,
      wave: 1,
      won: false,
      townHall: { hp: balance.economy.townHallHp, cap: balance.economy.townHallHp },
      coins: 0,
      cannons: createCannonPool(balance.pools.cannons),
      playerHp: balance.player.hp,
      armful: 0,
      streets,
      random: createRandom(seed),
    },
    assault: {
      // A game opens on the assault of wave one: no preparation comes before it.
      // (spec 01-16)
      phase: PHASE.ASSAULT,
      prepLeft: 0,
      toEnter: 0,
      sent: new Uint8Array(STREETS),
      enterLeft: new Float32Array(STREETS),
      fewFor: 0,
      laddersCalled: false,
      city: createCity(balance.city),
      zombies: createZombiePool(balance.pools.zombies),
      projectiles: createProjectilePool(balance.pools.projectiles),
      coins: createCoinPool(balance.pools.coins),
      events: createEventBuffer(balance.pools.events),
      player: createPlayer(),
      sword: createSword(),
      diamond: createDiamond(),
      moanLeft: balance.assault.moanPeriod,
      moanOwed: 0,
      moanNext: 0,
    },
  };
}
