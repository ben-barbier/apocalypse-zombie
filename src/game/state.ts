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
import type { Balance } from './balance';
import { createRandom, type Random } from './random';

/** The three streets of the star, and there will never be a fourth. (spec 02-2) */
export const STREETS = 3;

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
  /** A breach strikes the town hall. (spec 03-17) */
  TOWN_HALL_HIT: 14,
  /** A coin enters the purse. (spec 06-7) */
  COIN_TAKEN: 15,
  /** The town hall pays the ten of the end of an assault. (spec 06-13) */
  ASSAULT_BONUS: 16,
  /** A reinforcement is paid for. (spec 06-25) */
  REINFORCEMENT_BOUGHT: 17,
  /** The armful fills at the base. (spec 04-45) */
  ARMFUL_TAKEN: 18,
  /** A gateway lights, because its street becomes active. (spec 03-29) */
  GATEWAY_LIT: 19,
  /** The assault opens, and the pulse with it. (spec 01-11) */
  ASSAULT_BEGAN: 20,
  /** The last zombie of the assault has fallen. (spec 01-12) */
  ASSAULT_ENDED: 21,
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
  /** Seconds of halted progress left after a sword blow. (spec 04-35) */
  readonly knockedFor: Float32Array;
  /** Seconds its progress has not moved, which pushes it along at three. (spec 03-11) */
  readonly stuckFor: Float32Array;
  /** Seconds before its next blow against a construction. (spec 03-4) */
  readonly blowLeft: Float32Array;
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
    knockedFor: new Float32Array(size),
    stuckFor: new Float32Array(size),
    blowLeft: new Float32Array(size),
  };
}

// ------------------------------------------------------------- the projectiles

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
  };
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
    staggerLeft: 0,
    invulnerableLeft: 0,
    regenLeft: 0,
    collapseLeft: 0,
    strikeLeft: 0,
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
  /** Seconds spent at three left or fewer, which sends the last ones at four
   * blocks a second once it reaches fifteen. (spec 03-38, 03-39) */
  fewFor: number;
  readonly zombies: ZombiePool;
  readonly projectiles: ProjectilePool;
  readonly events: EventBuffer;
  readonly player: Player;
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
      fewFor: 0,
      zombies: createZombiePool(balance.pools.zombies),
      projectiles: createProjectilePool(balance.pools.projectiles),
      events: createEventBuffer(balance.pools.events),
      player: createPlayer(),
    },
  };
}
