/**
 * The Instantané: the ten fields that cross a boundary of wave, the text they
 * are written as, and what a page that has been killed comes back to. It is the
 * one thing this game ever leaves on the machine — no medal, no figure kept, no
 * setting, not a notion of a first launch. (spec 08-70, 08-79)
 *
 * **It describes a boundary and never an assault.** (spec 08-69) So the volatile
 * branch of `Game` is not in it — not one zombie, not one ball, not one coin
 * lying in the city, no phase and no clock of a preparation — and neither is
 * where the player stands: he comes back exactly where a new game opens, on the
 * square in front of the base, because the camera has to open clear on a resumed
 * game as it does on a first screen. (spec 08-71)
 *
 * Two things are worth saying twice about what it is *for*:
 *
 *   - **Starting again from nought does not exist.** Losing the wave 7 of a
 *     child of eight is the dry punishment the frame of this game forbids, so a
 *     dead page comes back at the start of the preparation of the wave in hand,
 *     with a full bar, having lost at most one preparation and the assault that
 *     followed it. (spec 08-66, 08-67)
 *   - **The state of the one generator rides in it.** Without it the wave that
 *     comes back would not be the wave that had begun. (spec 10-27)
 *
 * This file never touches a disk and never could: `src/game/` names no store at
 * all, which is exactly why the ten fields are settled here and the key that
 * holds them is settled in `src/app/storage.ts`. (spec 10-1, 10-7)
 */
import { placePlayer } from './player';
import {
  DIAMOND,
  EVENT,
  type EventType,
  type Game,
  PHASE,
  SNAPSHOT_VERSION,
  STREETS,
} from './state';
import { prepFor } from './waves';

/**
 * A cannon as it crosses a boundary: where it stands, how high, which tier, what
 * its magazine holds — and what is left of it.
 *
 * The hp are here on purpose, and it is the one place this file goes past the
 * letter of the table of chapter 8, which lists four things and not five. A
 * ground cannon is worth twenty shambler hits and wears out for good: chapter 5
 * forbids a mending, free or paid, and the upgrade is the one thing that ever
 * puts one back whole. Dropping the hp would make a killed page exactly that
 * free mending, and would hand back a cannon the assault had all but taken.
 * (spec 05-44, 05-47, 08-70)
 *
 * What is not here is what an assault owns: where it aims, the seconds before
 * its next ball, the flame it is feeding, the belt of a third tier. A
 * preparation opens on none of them. (spec 08-69)
 */
export interface StoredCannons {
  count: number;
  x: number[];
  y: number[];
  z: number[];
  tier: number[];
  hp: number[];
  magazine: number[];
}

/** The ten fields, and not one more. (spec 08-70) */
export interface StoredSnapshot {
  /** The format, in the text and never in the key. (spec 10-32) */
  version: number;
  /** One and beyond, without a ceiling in overtime. (spec 08-77) */
  wave: number;
  /** Victory won: nothing that follows ever takes it back. (spec 01-26) */
  won: boolean;
  /** Its hp and its ceiling, in shambler hits. (spec 06-26, 06-27) */
  townHall: { hp: number; cap: number };
  coins: number;
  cannons: StoredCannons;
  playerHp: number;
  /** Firebombs carried, three at most. (spec 04-47) */
  armful: number;
  /** One flag a street, of the three. (spec 03-28) */
  streets: number[];
  /** The whole state of the one generator. (spec 10-27) */
  random: { seed: number; draws: number };
}

/** What a text that has just been parsed is, before a single field is believed. */
interface Loose {
  readonly [field: string]: unknown;
}

// ------------------------------------------------------------------ writing

function listOf(from: Readonly<Float32Array> | Readonly<Uint8Array>, count: number): number[] {
  const held: number[] = [];
  for (let i = 0; i < count; i += 1) held.push(from[i]);
  return held;
}

/**
 * The ten fields as compact text, about a kibibyte of it. It is asked for at a
 * boundary of wave and at a purchase of that preparation, thirty times or so in
 * a whole game — never in the path of a frame that is playing. (spec 08-72,
 * 08 "Ce que porte l'Instantané")
 */
export function encodeSnapshot(game: Readonly<Game>): string {
  const snapshot = game.snapshot;
  const pool = snapshot.cannons;
  const count = pool.count;
  const stored: StoredSnapshot = {
    version: SNAPSHOT_VERSION,
    wave: snapshot.wave,
    won: snapshot.won,
    townHall: { hp: snapshot.townHall.hp, cap: snapshot.townHall.cap },
    coins: snapshot.coins,
    cannons: {
      count,
      x: listOf(pool.x, count),
      y: listOf(pool.y, count),
      z: listOf(pool.z, count),
      tier: listOf(pool.tier, count),
      hp: listOf(pool.hp, count),
      magazine: listOf(pool.magazine, count),
    },
    playerHp: snapshot.playerHp,
    armful: snapshot.armful,
    streets: listOf(snapshot.streets, STREETS),
    random: { seed: snapshot.random.seed, draws: snapshot.random.draws },
  };
  return JSON.stringify(stored);
}

// ------------------------------------------------------------------ reading

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function objectOf(value: unknown): Loose | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Loose;
}

function numbersOf(value: unknown, count: number): number[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  for (const one of value) if (!isNumber(one)) return null;
  return value as number[];
}

function acceptCannons(value: unknown): StoredCannons | null {
  const held = objectOf(value);
  if (held === null || !isNumber(held.count) || held.count < 0) return null;
  const count = held.count;
  const x = numbersOf(held.x, count);
  const y = numbersOf(held.y, count);
  const z = numbersOf(held.z, count);
  const tier = numbersOf(held.tier, count);
  const hp = numbersOf(held.hp, count);
  const magazine = numbersOf(held.magazine, count);
  if (x === null || y === null || z === null) return null;
  if (tier === null || hp === null || magazine === null) return null;
  return { count, x, y, z, tier, hp, magazine };
}

/**
 * What a text off the disk turns into, or nothing at all. Unreadable, of another
 * format or a field short, it is nothing — and the caller throws it away without
 * a word: **there is no migration in this game and there never will be**, a
 * game lasts a quarter of an hour and nothing survives it. The Sas then opens on
 * the one door of a new game, with no message and no screen of error.
 * (spec 08-78, 10-35)
 */
export function decodeSnapshot(text: string | null): StoredSnapshot | null {
  if (text === null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const held = objectOf(raw);
  if (held === null || held.version !== SNAPSHOT_VERSION) return null;

  const hall = objectOf(held.townHall);
  const stream = objectOf(held.random);
  const cannons = acceptCannons(held.cannons);
  const streets = numbersOf(held.streets, STREETS);
  if (hall === null || stream === null || cannons === null || streets === null) return null;
  if (!isNumber(held.wave) || typeof held.won !== 'boolean') return null;
  if (!isNumber(hall.hp) || !isNumber(hall.cap)) return null;
  if (!isNumber(held.coins) || !isNumber(held.playerHp) || !isNumber(held.armful)) return null;
  if (!isNumber(stream.seed) || !isNumber(stream.draws)) return null;

  return {
    version: SNAPSHOT_VERSION,
    wave: held.wave,
    won: held.won,
    townHall: { hp: hall.hp, cap: hall.cap },
    coins: held.coins,
    cannons,
    playerHp: held.playerHp,
    armful: held.armful,
    streets,
    random: { seed: stream.seed, draws: stream.draws },
  };
}

// ----------------------------------------------------------------- resuming

/**
 * Puts a game back where the text left it: the ten fields into the branch that
 * crosses a boundary, and the whole volatile branch back to the opening of a
 * preparation — no zombie, no ball, no coin on the floor, and the bar full.
 * (spec 08-66, "Les deux reprises")
 *
 * The one preparation that does not run of itself is the one a victory opens: it
 * waits on the press that takes the overtime, and a resumed game may not take
 * that press in the child's place. (spec 01-17, 01-32)
 *
 * The `Game` is mutated in place, because there is one and it is never replaced.
 * (spec 10-10)
 */
export function applySnapshot(game: Game, stored: StoredSnapshot): void {
  const snapshot = game.snapshot;
  const assault = game.assault;

  snapshot.version = stored.version;
  snapshot.wave = stored.wave;
  snapshot.won = stored.won;
  snapshot.townHall.hp = stored.townHall.hp;
  snapshot.townHall.cap = stored.townHall.cap;
  snapshot.coins = stored.coins;
  snapshot.playerHp = stored.playerHp;
  snapshot.armful = stored.armful;
  for (let street = 0; street < STREETS; street += 1) {
    snapshot.streets[street] = stored.streets[street];
  }
  snapshot.random.seed = stored.random.seed;
  snapshot.random.draws = stored.random.draws;

  // The cannons, bounded by the pool: what a text says is never let past what
  // was allocated at load. (spec 10-13)
  const pool = snapshot.cannons;
  const count = Math.min(stored.cannons.count, pool.x.length);
  pool.count = count;
  for (let i = 0; i < count; i += 1) {
    pool.x[i] = stored.cannons.x[i];
    pool.y[i] = stored.cannons.y[i];
    pool.z[i] = stored.cannons.z[i];
    pool.tier[i] = stored.cannons.tier[i];
    pool.hp[i] = stored.cannons.hp[i];
    pool.magazine[i] = stored.cannons.magazine[i];
    // What an assault owned is opened again at nought: a preparation aims at
    // nothing, feeds no flame and owes no ball. (spec 08-69)
    pool.ang[i] = 0;
    pool.angPrev[i] = 0;
    pool.ballLeft[i] = 0;
    pool.burnLeft[i] = 0;
    pool.flameAng[i] = 0;
    pool.flameAngPrev[i] = 0;
    pool.flameLit[i] = 0;
    pool.conveyorLeft[i] = 0;
  }

  assault.phase = PHASE.PREP;
  assault.prepLeft = waitsOnOvertime(game) ? 0 : prepFor(game.balance, snapshot.wave);
  assault.toEnter = 0;
  assault.fewFor = 0;
  for (let street = 0; street < STREETS; street += 1) {
    assault.sent[street] = 0;
    assault.enterLeft[street] = 0;
  }
  assault.zombies.count = 0;
  assault.projectiles.count = 0;
  assault.coins.count = 0;

  // He stands where a new game opens him, and asks his question again from
  // there. (spec 08-71)
  placePlayer(game);
  const player = assault.player;
  player.staggerLeft = 0;
  player.invulnerableLeft = 0;
  player.regenLeft = 0;
  player.collapseLeft = 0;
  player.strikeLeft = 0;
  assault.diamond.shows = DIAMOND.NONE;
  assault.sword.aimAt = 0;
  assault.sword.graceLeft = 0;
  assault.sword.blow = 0;
}

/**
 * Whether the preparation this game comes back to is the one that waits on a
 * press: the victory is won and the tenth wave is still the wave in hand, which
 * covers both the halt the victory opens and the overtime already taken.
 * (spec 01-17, 01-25)
 */
function waitsOnOvertime(game: Readonly<Game>): boolean {
  return game.snapshot.won && game.snapshot.wave === game.balance.pace.mainWaves;
}

// ----------------------------------------------------------------- the moments

/**
 * The five facts that move the ten fields clear of an assault, and they are the whole
 * list: the entry into a preparation, and the four purchases of that preparation
 * — a cannon down, a cannon a tier up, an armful taken, a reinforcement bought.
 * (spec 08-72)
 */
const KEPT_ON: readonly EventType[] = [
  EVENT.ASSAULT_ENDED,
  EVENT.CANNON_PLACED,
  EVENT.CANNON_UPGRADED,
  EVENT.ARMFUL_TAKEN,
  EVENT.REINFORCEMENT_BOUGHT,
];

/**
 * Whether this frame owes a writing. **Nothing is ever written during an
 * assault**, so a purchase made in the middle of one and followed by a memory
 * purge is lost, and the money comes back into the pocket; and nothing is
 * written in a handler of interruption either — at the moments the browser stops
 * promising anything, the disk is already up to date. (spec 08-73, 08-74, 10-36)
 *
 * It reads the one buffer of events, like the drawing and the sounds, and never
 * compares two states. (spec 10-18, 10-19)
 */
export function owesSnapshot(game: Readonly<Game>): boolean {
  if (game.assault.phase !== PHASE.PREP) return false;
  const events = game.assault.events;
  for (let i = 0; i < events.count; i += 1) {
    const kind = events.type[i];
    for (const moment of KEPT_ON) if (kind === moment) return true;
  }
  return false;
}
