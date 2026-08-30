/**
 * **The one pilot**: what plays in the child's stead, and there is only ever one
 * of it. Three profiles are three sets of numbers handed to this file, never
 * three scripts written by hand — a script cannot be refuted, and it rots at the
 * first retouch of the game. (spec 11-10, 11-11)
 *
 * **It writes an `InputState` and nothing else.** It never moves a body, never
 * puts a cannon down, never touches a purse: it holds the one stick and presses
 * the two buttons, exactly as a pad or a screen does, and everything that
 * follows is the rules' own doing. A pilot that short-circuited the entries
 * would try a game nobody plays, and the gap would be invisible — so never
 * corrected. It therefore pays for the run down a street, the climb of a ladder,
 * the reach of a blow and the press of the action button just as the child does.
 * (spec 11-8, 11-11, and chapter 11 "Pourquoi le pilote passe par la structure
 * d'entrées")
 *
 * **Its chance comes from a second mulberry32, sown apart** from the one inside
 * `Game`. Were the two one stream, moving a comma here would shift every draw of
 * the world, two balances would stop being comparable, and the diff of
 * `reference.json` would stop meaning anything at all. Sown apart, one may
 * retouch the pilot and read what it changes, or retouch the balance and read
 * what *that* changes, and never the two mixed. (spec 10-28, 11-9)
 *
 * **It reads no clock and draws no free number.** Everything below counts steps
 * of a sixtieth of a second, and the one chance it has is the stream named here.
 * (spec 11-6, 11-7)
 *
 * ---
 *
 * **How the five settings become a way of playing**, since that is the whole of
 * this file and there is nothing else in it:
 *
 *   - `venture` is one spot along a street, read off its eighty blocks from the
 *     mouth. It says two things at once and they are the same thing: where he
 *     waits when nothing is coming, and **how far out he is willing to go** —
 *     what has come past that spot he goes for, what has not he waits for. That
 *     is why 0,05 keeps the watcher at the mouth striking what comes to him, why
 *     0,35 takes the child down to the third, and why 0,95 sends the racer to
 *     the far end letting nothing through. (spec 11-12 to 11-14)
 *   - the roofs he builds on are the **stretch** that spot falls in, tallest
 *     first: a stretch is what a jump carries one across, and its tall roof is
 *     the finest spot of its sector. One number therefore puts the watcher's
 *     cannons at the mouth and the racer's on the deep stretches, with nothing
 *     written for either. (spec 02-22, 04-10, and the glossary on *Tronçon*)
 *   - `spend` is read from the front: the first post that is due where he can
 *     get to it and that he can pay for. The saturation is the game's own —
 *     three blocks apart, a spot that already carries a cannon offers an upgrade
 *     and not a second cannon — so "one cannon until there is one per active
 *     street, then the second tier" needs no line of its own. (spec 05-11,
 *     05-13, 11 table of `spend`)
 *   - `resupply` says which cannons are worth the journey, and `care` at how few
 *     pips he breaks off. Breaking off means going up, since a blow does not
 *     reach a roof: the roof is the infirmary, and the chapter says so.
 *     (spec 04-26, 04-41)
 *   - `reflex` is how many steps he answers a fresh pack late, and it gates
 *     nothing but the fresh look: he goes on doing what he was doing.
 */
import type { Balance, CityBalance } from '../src/game/balance';
import {
  FLAME_TIER,
  mayUpgrade,
  nearestCannon,
} from '../src/game/cannons';
import { type Random, createRandom, nextFloat } from '../src/game/random';
import {
  type City,
  DIAMOND,
  type Game,
  type InputState,
  STREETS,
  heightAt,
  inHalo,
  railAng,
  railX,
  railZ,
} from '../src/game/state';
import { reinforcementPrice } from '../src/game/townhall';
import { rowFor } from '../src/game/waves';
import { BODY_SIDE } from '../src/game/zombies';
import { BUY, type BuyType, type Profile, RESUPPLY } from './profiles';

/**
 * What the run's seed is turned by before the pilot's own stream opens on it.
 *
 * The spec asks for a **second** generator sown apart and settles no figure, so
 * one is read off the shape of the requirement rather than picked for taste: an
 * odd constant of thirty-two bits, exclusive-ored into the seed, opens a stream
 * that shares no state with the world's whatever the seed — which is the whole
 * of "sown apart" — while leaving a run named by the one seed of its campaign.
 * The figure itself is the odd constant of the golden ratio, the usual one for
 * splitting a seed in two. (spec 10-28, 11-9, 11-37)
 */
const PILOT_SEED = 0x9e3779b9;

/**
 * How near the tall roof he means to build on he has to stand for a press, in
 * blocks: one body, which is the one reading of a contact this game has. It
 * keeps his cannons in the middle of their roofs, so the three blocks that space
 * two of them leave one to a roof. (spec 03-14, 05-11)
 */
const AT_THE_SPOT = BODY_SIDE;

/** One errand, which is the one thing he is walking towards this step. */
const ERRAND = {
  /** Hold the spot `venture` names, and strike what comes to it. */
  POST: 0,
  /** Go for what has come past that spot. (spec 11-12, 11-14) */
  INTERCEPT: 1,
  /** Break off onto the tall roof, at `care` pips left. (spec 04-26, 04-41) */
  REST: 2,
  /** Walk to a spot and press the second button there. */
  PRESS: 3,
} as const;

type ErrandType = (typeof ERRAND)[keyof typeof ERRAND];

/**
 * The whole of what a pilot holds between two steps. It is allocated once, at
 * the head of a run, and mutated in place from there on.
 */
export interface Pilot {
  readonly profile: Profile;
  /** The second stream, sown apart from the world's. (spec 10-28, 11-9) */
  readonly random: Random;
  /**
   * The post the reserve is kept for, or -1 when no post of the order carries
   * its figure. It is **read off the reserve** rather than settled a second
   * time, because chapter 11 writes the reserve of the watcher and of the child
   * as the price of the first reinforcement and that of the racer as the price
   * of an armful. (spec 11, table of `spend`)
   */
  readonly keptFor: number;
  /**
   * The buildings whose roofs make the stretch his venture falls in, one list
   * per street, tallest first. (spec 02-22, 11-13, 11-14)
   */
  readonly roofs: readonly (readonly number[])[];
  /** How far along a rail he holds his spot, in blocks. (spec 11) */
  readonly postAt: number;
  /** The street he holds. */
  street: number;
  /** Steps of `reflex` left before he looks again. */
  delayLeft: number;
  /** Whether a fresh look is owed once that runs out. */
  owed: boolean;
  /** How far off the rail he holds his spot, in blocks: drawn at every look. */
  offset: number;
  /** What was still to walk in, and which of the two times ran, at the last look. */
  toEnter: number;
  phase: number;
  /** Where he stood last step, and for how long he has pushed without moving. */
  wasX: number;
  wasZ: number;
  stuckFor: number;
  /** The turn his sidestep takes when he is wedged, and the steps it has left. */
  aside: number;
  asideLeft: number;
  /** Where this step is walking to, how high it stands, and the roof it is on. */
  toX: number;
  toY: number;
  toZ: number;
  toRoof: number;
  /** What the mark under his feet has to say before he presses, or -1. */
  mark: number;
  /** The cannon that mark has to name, or -1 when it names none. */
  markAt: number;
  errand: ErrandType;
}

// ------------------------------------------------------------------ the plan

function baysOf(plan: CityBalance, edge: number): readonly number[] {
  return edge === 0 ? plan.alignedBays : plan.shiftedBays;
}

function heightsOf(plan: CityBalance, edge: number): readonly number[] {
  return edge === 0 ? plan.alignedHeights : plan.shiftedHeights;
}

/** How high the building at that slot of the pool goes, in blocks. (spec 02-20) */
function roofHeightOf(plan: CityBalance, at: number): number {
  const perEdge = plan.street.baysPerEdge;
  const edge = Math.floor(at / perEdge) % 2;
  return heightsOf(plan, edge)[at % perEdge];
}

/**
 * The buildings of one edge whose roofs a jump still carries one across, around
 * the bay the venture spot falls in. A stretch is a run of heights that never
 * comes back down — 4, then 6, then 8 — because the fall of four blocks that
 * closes it is the one a jump does not clear. (spec 02-22, 04-10)
 */
function stretchOf(plan: CityBalance, street: number, edge: number, fromMouth: number): number[] {
  const bays = baysOf(plan, edge);
  const heights = heightsOf(plan, edge);
  const perEdge = plan.street.baysPerEdge;

  let held = bays.length - 1;
  let start = 0;
  for (let bay = 0; bay < bays.length; bay += 1) {
    start += bays[bay];
    if (fromMouth < start) {
      held = bay;
      break;
    }
  }

  let first = held;
  while (first > 0 && heights[first - 1] <= heights[first]) first -= 1;
  let last = held;
  while (last + 1 < bays.length && heights[last + 1] >= heights[last]) last += 1;

  const found: number[] = [];
  for (let bay = first; bay <= last; bay += 1) found.push((street * 2 + edge) * perEdge + bay);
  return found;
}

/**
 * The roofs of that stretch on each of the three streets, tallest first: the
 * tall one is the finest spot of its sector, and what stands under it is what is
 * left once the tall ones carry a cannon. Ties go to the bay nearest the mouth,
 * so nothing here ever depends on the order a sort happens to be stable in.
 */
function roofsOf(plan: CityBalance, venture: number): number[][] {
  const fromMouth = venture * plan.street.length;
  const found: number[][] = [];
  for (let street = 0; street < STREETS; street += 1) {
    const list = [
      ...stretchOf(plan, street, 0, fromMouth),
      ...stretchOf(plan, street, 1, fromMouth),
    ];
    list.sort((a, b) => roofHeightOf(plan, b) - roofHeightOf(plan, a) || a - b);
    found.push(list);
  }
  return found;
}

/** What one post of the order costs the first time it is ever bought, in coins. */
function openingPrice(balance: Balance, kind: BuyType): number {
  const prices = balance.economy.prices;
  if (kind === BUY.CANNON) return prices.cannon;
  if (kind === BUY.TIER_TWO) return prices.tierTwo;
  if (kind === BUY.TIER_THREE) return prices.tierThree;
  if (kind === BUY.ARMFUL) return prices.firebomb * balance.cannon.magazine;
  return prices.reinforcements[0];
}

/**
 * Allocates one pilot for one run. The balance is handed in and never imported,
 * exactly as `createGame` takes it, so a hundred variants are tried without a
 * line of this file moving. (spec 10-15)
 */
export function createPilot(balance: Balance, profile: Profile, seed: number): Pilot {
  let keptFor = -1;
  for (const kind of profile.spend.order) {
    if (openingPrice(balance, kind) === profile.spend.reserve) {
      keptFor = kind;
      break;
    }
  }

  return {
    profile,
    random: createRandom(seed ^ PILOT_SEED),
    keptFor,
    roofs: roofsOf(balance.city, profile.venture),
    // The mouth of a street stands at eighty along its rail and the face of the
    // town hall at ninety-two, so a venture of nought holds him at the mouth and
    // one of one at the far end. (spec 02-12, 02-13, 11 "Les cinq réglages")
    postAt: balance.city.street.length * (1 - profile.venture),
    street: 0,
    delayLeft: 0,
    owed: true, // he looks on the first step of a run
    offset: 0,
    toEnter: -1,
    phase: -1,
    wasX: 0,
    wasZ: 0,
    stuckFor: 0,
    aside: 1,
    asideLeft: 0,
    toX: 0,
    toY: 0,
    toZ: 0,
    toRoof: -1,
    mark: -1,
    markAt: -1,
    errand: ERRAND.POST,
  };
}

// ---------------------------------------------------------------- the reading

/** Which street a spot lies in, roofs of its frontage included, or -1. (spec 02-14) */
function streetOf(city: City, plan: CityBalance, x: number, z: number): number {
  const across = plan.street.width / 2 + plan.street.frontageDepth;
  for (let street = 0; street < STREETS; street += 1) {
    const ang = city.gateways.ang[street];
    const along = x * Math.cos(ang) + z * Math.sin(ang);
    const off = -x * Math.sin(ang) + z * Math.cos(ang);
    if (along > plan.apothem && Math.abs(off) <= across) return street;
  }
  return -1;
}

/** The building whose roof a spot stands on, or -1 when it stands on the floor. */
function roofUnder(city: City, x: number, z: number): number {
  if (heightAt(city, x, z) <= 0) return -1;
  const buildings = city.buildings;
  let found = -1;
  let nearest = 0;
  for (let at = 0; at < buildings.count; at += 1) {
    const offX = buildings.x[at] - x;
    const offZ = buildings.z[at] - z;
    const away = offX * offX + offZ * offZ;
    if (found >= 0 && away >= nearest) continue;
    found = at;
    nearest = away;
  }
  return found;
}

/**
 * The nearest living body that has come **past** the spot `venture` names — the
 * one he goes for. It is one rule and it makes three ways of playing: the
 * watcher, whose spot is at the mouth, only ever answers what has reached the
 * square; the child, at the third, answers what has got by him there; and the
 * racer, at the far end, answers everything, since everything walks past him on
 * its way in. What is not yet past that spot he waits for. (spec 11-12 to 11-14)
 *
 * It looks down **the street he holds and over the square**, and no further: one
 * cannot be in three places, so which street he answers is the business of the
 * fresh look — but whatever has already come out onto the square is on its way
 * to the town hall, and that he answers whichever street it came down.
 * (spec 01-35, 02-6)
 */
function nearestPast(pilot: Pilot, game: Game): number {
  const pool = game.assault.zombies;
  const player = game.assault.player;
  let found = -1;
  let nearest = 0;
  const mouth = game.balance.city.street.length;
  for (let at = 0; at < pool.count; at += 1) {
    if (pool.street[at] !== pilot.street && pool.progress[at] < mouth) continue;
    if (pool.progress[at] < pilot.postAt) continue;
    const offX = pool.x[at] - player.x;
    const offZ = pool.z[at] - player.z;
    const away = offX * offX + offZ * offZ;
    if (found >= 0 && away >= nearest) continue;
    found = at;
    nearest = away;
  }
  return found;
}

/** The living body furthest along its rail, or -1 when none walks. (spec 03-8) */
function leader(game: Game): number {
  const pool = game.assault.zombies;
  let found = -1;
  let furthest = 0;
  for (let at = 0; at < pool.count; at += 1) {
    if (found >= 0 && pool.progress[at] <= furthest) continue;
    found = at;
    furthest = pool.progress[at];
  }
  return found;
}

/**
 * The cannon nearest him that a journey with firebombs would serve: one at the
 * tier the second arm arrives at, with a cell free in its magazine. The third
 * tier is left out because its belt makes that journey in his place, and the
 * first bears no cone at all. (spec 04-52, 05-3, 05-16)
 */
function wantsFirebombs(pilot: Pilot, game: Game): number {
  if (pilot.profile.resupply === RESUPPLY.NEVER) return -1;
  const cannons = game.snapshot.cannons;
  const player = game.assault.player;
  const city = game.assault.city;
  let found = -1;
  let nearest = 0;

  for (let at = 0; at < cannons.count; at += 1) {
    if (cannons.tier[at] !== FLAME_TIER) continue;
    if (cannons.magazine[at] >= game.balance.cannon.magazine) continue;
    if (
      pilot.profile.resupply === RESUPPLY.HALO &&
      !inHalo(city, cannons.x[at], cannons.z[at])
    ) {
      continue;
    }
    const offX = cannons.x[at] - player.x;
    const offZ = cannons.z[at] - player.z;
    const away = offX * offX + offZ * offZ;
    if (found >= 0 && away >= nearest) continue;
    found = at;
    nearest = away;
  }
  return found;
}

/** The nearest cannon standing at that tier which a press would carry up. (spec 05-13) */
function upgradable(game: Game, tier: number): number {
  const cannons = game.snapshot.cannons;
  const player = game.assault.player;
  let found = -1;
  let nearest = 0;

  for (let at = 0; at < cannons.count; at += 1) {
    if (cannons.tier[at] !== tier || !mayUpgrade(game, at)) continue;
    const offX = cannons.x[at] - player.x;
    const offZ = cannons.z[at] - player.z;
    const away = offX * offX + offZ * offZ;
    if (found >= 0 && away >= nearest) continue;
    found = at;
    nearest = away;
  }
  return found;
}

/** The first roof of his stretch that carries no cannon yet, or -1. (spec 05-11) */
function freeRoof(pilot: Pilot, game: Game): number {
  const list = pilot.roofs[pilot.street];
  const city = game.assault.city;
  for (const at of list) {
    const x = city.buildings.x[at];
    const z = city.buildings.z[at];
    const y = heightAt(city, x, z);
    if (nearestCannon(game, x, y, z) < 0) return at;
  }
  return -1;
}

/**
 * Whether he may pay for that post. The reserve is coins held back from
 * everything but the post its own figure is the price of, and it is held only
 * from the wave the profile names. (spec 11, table of `spend`)
 */
function affordable(pilot: Pilot, game: Game, kind: BuyType, price: number): boolean {
  const coins = game.snapshot.coins;
  if (coins < price) return false;
  if (kind === pilot.keptFor) return true;
  if (game.snapshot.wave < pilot.profile.spend.reserveFromWave) return true;
  return coins - price >= pilot.profile.spend.reserve;
}

// ---------------------------------------------------------------- the errand

function aimAt(pilot: Pilot, x: number, y: number, z: number, roof: number): void {
  pilot.toX = x;
  pilot.toY = y;
  pilot.toZ = z;
  pilot.toRoof = roof;
}

function aimAtRoof(pilot: Pilot, game: Game, at: number): void {
  const city = game.assault.city;
  const x = city.buildings.x[at];
  const z = city.buildings.z[at];
  aimAt(pilot, x, heightAt(city, x, z), z, at);
}

function aimAtCannon(pilot: Pilot, game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  const x = cannons.x[at];
  const z = cannons.z[at];
  aimAt(pilot, x, cannons.y[at], z, roofUnder(game.assault.city, x, z));
}

/** The spot `venture` names, off the rail by what the last look drew. (spec 11) */
function aimAtPost(pilot: Pilot, game: Game): void {
  const rails = game.assault.city.rails;
  const at = pilot.postAt;
  const rx = railX(rails, pilot.street, at);
  const rz = railZ(rails, pilot.street, at);
  const ang = railAng(rails, pilot.street, at);
  aimAt(
    pilot,
    rx - Math.sin(ang) * pilot.offset,
    0,
    rz + Math.cos(ang) * pilot.offset,
    -1,
  );
}

/**
 * One free face of the town hall, which is where a reinforcement is bought. The
 * fourth face is the one the shed is against, and it never reinforces: the spot
 * below is taken across the shed's own heading, so it is one of the three by
 * construction. (spec 06-30, 06-31)
 */
function aimAtTownHall(pilot: Pilot, game: Game): void {
  const city = game.assault.city;
  const away = city.townHallHalf + BODY_SIDE / 4;
  aimAt(pilot, -Math.sin(city.baseAng) * away, 0, Math.cos(city.baseAng) * away, -1);
}

/** The one flank of the shed a press fills his arms at. (spec 04-45) */
function aimAtShed(pilot: Pilot, game: Game): void {
  const city = game.assault.city;
  const away = city.baseAcross + BODY_SIDE / 4;
  aimAt(
    pilot,
    city.baseX - Math.sin(city.baseAng) * away,
    0,
    city.baseZ + Math.cos(city.baseAng) * away,
    -1,
  );
}

/**
 * The one post of the order that is due, where he can get to it and where he can
 * pay for it — read from the front, and the first that answers wins. Hands back
 * whether one did. (spec 11-11)
 */
function takeOrder(pilot: Pilot, game: Game): boolean {
  const prices = game.balance.economy.prices;

  for (const kind of pilot.profile.spend.order) {
    if (kind === BUY.CANNON) {
      const roof = freeRoof(pilot, game);
      if (roof < 0 || !affordable(pilot, game, kind, prices.cannon)) continue;
      aimAtRoof(pilot, game, roof);
      pilot.mark = DIAMOND.PLACE;
      pilot.markAt = -1;
      return true;
    }
    if (kind === BUY.TIER_TWO || kind === BUY.TIER_THREE) {
      const from = kind === BUY.TIER_TWO ? 1 : FLAME_TIER;
      const price = kind === BUY.TIER_TWO ? prices.tierTwo : prices.tierThree;
      const at = upgradable(game, from);
      if (at < 0 || !affordable(pilot, game, kind, price)) continue;
      aimAtCannon(pilot, game, at);
      pilot.mark = DIAMOND.UPGRADE;
      pilot.markAt = at;
      return true;
    }
    if (kind === BUY.ARMFUL) {
      const room = game.balance.cannon.magazine - game.snapshot.armful;
      if (room <= 0 || !affordable(pilot, game, kind, prices.firebomb * room)) continue;
      aimAtShed(pilot, game);
      pilot.mark = DIAMOND.TAKE;
      pilot.markAt = -1;
      return true;
    }
    // The valve, and the one thing that ever lifts the bar of the town hall: he
    // buys it back the moment that bar goes under half. (spec 06-25, 11-12)
    const hall = game.snapshot.townHall;
    if (hall.hp * 2 >= hall.cap) continue;
    if (!affordable(pilot, game, kind, reinforcementPrice(game))) continue;
    aimAtTownHall(pilot, game);
    pilot.mark = DIAMOND.REINFORCE;
    pilot.markAt = -1;
    return true;
  }
  return false;
}

/**
 * What he is doing this step, settled once and in one order:
 *
 *   1. at `care` pips or fewer he breaks off onto the tall roof, since a blow
 *      does not reach up there and the regeneration is the one mending there is
 *      (spec 04-26, 04-41);
 *   2. what has come **past** the spot `venture` names he goes for, wherever it
 *      walks — that is the whole of "letting nothing through" and the whole of
 *      "striking what comes to him", from the one number (spec 11-12, 11-14);
 *   3. the journey with firebombs, for whichever cannon `resupply` says is
 *      worth it (spec 04-45, 04-49);
 *   4. the order of preference of `spend` (spec 11-11);
 *   5. failing all four, he holds his spot.
 */
function chooseErrand(pilot: Pilot, game: Game): void {
  pilot.mark = -1;
  pilot.markAt = -1;

  if (game.snapshot.playerHp <= pilot.profile.care) {
    pilot.errand = ERRAND.REST;
    aimAtRoof(pilot, game, pilot.roofs[pilot.street][0]);
    return;
  }

  const at = nearestPast(pilot, game);
  if (at >= 0) {
    pilot.errand = ERRAND.INTERCEPT;
    const pool = game.assault.zombies;
    aimAt(pilot, pool.x[at], 0, pool.z[at], -1);
    return;
  }

  const wants = wantsFirebombs(pilot, game);
  if (wants >= 0) {
    pilot.errand = ERRAND.PRESS;
    if (game.snapshot.armful <= 0) {
      const room = game.balance.cannon.magazine;
      if (affordable(pilot, game, BUY.ARMFUL, game.balance.economy.prices.firebomb * room)) {
        aimAtShed(pilot, game);
        pilot.mark = DIAMOND.TAKE;
        return;
      }
    } else {
      aimAtCannon(pilot, game, wants);
      pilot.mark = DIAMOND.POUR;
      pilot.markAt = wants;
      return;
    }
  }

  if (takeOrder(pilot, game)) {
    pilot.errand = ERRAND.PRESS;
    return;
  }

  pilot.errand = ERRAND.POST;
  aimAtPost(pilot, game);
}

// ---------------------------------------------------------------- the walking

function push(input: InputState, fromX: number, fromZ: number, toX: number, toZ: number): void {
  const offX = toX - fromX;
  const offZ = toZ - fromZ;
  const away = Math.hypot(offX, offZ);
  if (away <= 0) return;
  input.dx = offX / away;
  input.dz = offZ / away;
}

/**
 * Walks him towards the spot the errand named. There is no way-finding here and
 * there is none anywhere in this project: a street is straight and the square is
 * open, so what crosses from one street to another goes by the two gateways, and
 * the sliding along a wall is the rules' own. (spec 02-16, 03 "Jamais un calcul
 * de chemin")
 *
 * Going **up** is the ladder and nothing else, and it takes itself: he walks to
 * the cell at its foot and pushes into the building. Coming **down** is walking
 * off the edge, since a fall costs nothing — which is what the chapter says one
 * does. (spec 04-12, 04-13)
 */
function walk(pilot: Pilot, game: Game, input: InputState): void {
  const player = game.assault.player;
  const buildings = game.assault.city.buildings;

  // The climb, when the spot stands higher than his feet do.
  if (pilot.toRoof >= 0 && player.y < pilot.toY - BODY_SIDE / 2) {
    const at = pilot.toRoof;
    const into = buildings.ladderAng[at];
    const footX = buildings.ladderX[at] - Math.cos(into) / 2;
    const footZ = buildings.ladderZ[at] - Math.sin(into) / 2;
    const offX = footX - player.x;
    const offZ = footZ - player.z;
    if (offX * offX + offZ * offZ <= (BODY_SIDE / 2) * (BODY_SIDE / 2)) {
      input.dx = Math.cos(into);
      input.dz = Math.sin(into);
      return;
    }
    walkAcross(game, input, footX, footZ);
    return;
  }

  walkAcross(game, input, pilot.toX, pilot.toZ);
}

/** The two gateways a crossing from one street to another goes by. (spec 02-27) */
function walkAcross(game: Game, input: InputState, toX: number, toZ: number): void {
  const player = game.assault.player;
  const city = game.assault.city;
  const plan = game.balance.city;
  const here = streetOf(city, plan, player.x, player.z);
  const there = streetOf(city, plan, toX, toZ);

  if (here !== there) {
    const by = here >= 0 ? here : there;
    push(input, player.x, player.z, city.gateways.x[by], city.gateways.z[by]);
    return;
  }
  push(input, player.x, player.z, toX, toZ);
}

/**
 * A body that has pushed and not moved is wedged in a corner, and the sidestep
 * that frees it is the one draw of chance this pilot makes on its own account.
 * The two counts are the game's own reading of "frozen", which chapter 3 already
 * settles for a body that stops advancing — nothing new is settled here.
 * (spec 03-11, 11-9)
 */
function unwedge(pilot: Pilot, game: Game, input: InputState): void {
  const balance = game.balance;
  const held = balance.assault.unstickAfter * balance.loop.hz;

  if (pilot.asideLeft > 0) {
    pilot.asideLeft -= 1;
    const turn = (pilot.aside * Math.PI) / 2;
    const dx = input.dx;
    const dz = input.dz;
    input.dx = dx * Math.cos(turn) - dz * Math.sin(turn);
    input.dz = dx * Math.sin(turn) + dz * Math.cos(turn);
    return;
  }

  const player = game.assault.player;
  const stride = balance.player.runSpeed / balance.loop.hz;
  const moved = Math.hypot(player.x - pilot.wasX, player.z - pilot.wasZ);
  const pushing = input.dx !== 0 || input.dz !== 0;
  if (pushing && moved < stride / 4) pilot.stuckFor += 1;
  else pilot.stuckFor = 0;

  if (pilot.stuckFor < held) return;
  pilot.stuckFor = 0;
  pilot.aside = nextFloat(pilot.random) < 0.5 ? -1 : 1;
  pilot.asideLeft = held;
}

// ------------------------------------------------------------------ the look

/**
 * The reflex: a fresh pack, or the turn of one of the two times of a wave, buys
 * him a fresh look — and `reflex` is how many steps he takes to get to it. He
 * goes on doing what he was doing until then, which is the whole of a lateness.
 * (spec 11, "Les cinq réglages")
 */
function watch(pilot: Pilot, game: Game): void {
  const assault = game.assault;
  if (assault.toEnter < pilot.toEnter || assault.phase !== pilot.phase) {
    pilot.delayLeft = pilot.profile.reflex;
    pilot.owed = true;
  }
  pilot.toEnter = assault.toEnter;
  pilot.phase = assault.phase;

  if (pilot.delayLeft > 0) {
    pilot.delayLeft -= 1;
    return;
  }
  if (!pilot.owed) return;
  pilot.owed = false;

  // The street he holds is the one whose leader is furthest along: one cannot be
  // in three places, and that is exactly what the overtime is made of.
  // (spec 01-35)
  const pool = game.assault.zombies;
  const at = leader(game);
  const row = rowFor(game.balance, game.snapshot.wave);
  let street = at >= 0 ? pool.street[at] : -1;
  if (street < 0 || street >= row.streets) street = pilot.street < row.streets ? pilot.street : 0;
  pilot.street = street;

  // How far off the rail he holds his spot: drawn, and never further off than
  // the street is wide. It is what says who walks into him and what his blows
  // find, so it is a draw and not a constant. (spec 02-12, 11-9)
  const halfWidth = game.balance.city.street.width / 2 - BODY_SIDE / 2;
  pilot.offset = (nextFloat(pilot.random) * 2 - 1) * halfWidth;
}

// ------------------------------------------------------------------ the step

/**
 * One step of the pilot, and the one thing it ever writes: the `InputState` the
 * step about to run will read. It is filled from empty every step, exactly as
 * the app fills it from the pad and the keys, and its two rising edges are handed
 * over by that very writing. (spec 10-30, 10-31, 11-8)
 *
 * **He holds the strike the whole time.** A blow that touches nothing costs
 * nothing at all — the same 0,4 second as any other, with no dead time and no
 * penalty — so there is nothing to time and nothing to husband, and a held button
 * is what the chapter says the button is. (spec 04-24, 04-28)
 *
 * The second button goes down on one step and one only: when the mark under his
 * feet already says what the errand came to do. The mark is settled at the end of
 * every step for exactly this — to say what the **next** press will do — so
 * nothing here guesses. (spec 05-17, 05-20)
 */
export function flyPilot(pilot: Pilot, game: Game, input: InputState): void {
  const player = game.assault.player;

  input.dx = 0;
  input.dz = 0;
  input.strike = false;
  input.action = false;
  input.jump = false;
  input.airlock = false; // the Sas is no part of a bench run (spec 11-1)

  watch(pilot, game);

  // On a ladder or down on the floor the rules read no stick at all, and a press
  // would go to a spot he is not standing on yet. (spec 04-13, 04-42)
  if (player.climbLeft > 0 || player.collapseLeft > 0) {
    pilot.wasX = player.x;
    pilot.wasZ = player.z;
    return;
  }

  input.strike = true;
  chooseErrand(pilot, game);
  walk(pilot, game, input);
  unwedge(pilot, game, input);

  if (pilot.mark >= 0) {
    const diamond = game.assault.diamond;
    const named = pilot.markAt < 0 || diamond.at === pilot.markAt;
    const spot =
      pilot.mark !== DIAMOND.PLACE ||
      (Math.hypot(player.x - pilot.toX, player.z - pilot.toZ) < AT_THE_SPOT &&
        player.y >= pilot.toY - BODY_SIDE / 2);
    if (diamond.shows === pilot.mark && named && spot) input.action = true;
  }

  pilot.wasX = player.x;
  pilot.wasZ = player.z;
}
