/**
 * The assailants, and the one variable each of them holds.
 *
 * A zombie has a street, an advance along that street's rail and an offset
 * across it, and nothing else says where it stands. There is no way-finding of
 * any kind here — no A*, no navmesh, no field of flow — because the ground is
 * settled once and the frontages are unbroken: there is nothing to work out.
 * That poverty is exactly what is wanted. It makes the walk unbreakable (one
 * does not wedge oneself on a straight line), free in processor time, and above
 * all countable — a shambler crosses a street in 53,3 seconds once and for all,
 * so the table of the waves can be checked on paper.
 * (spec 03-6 to 03-13, 03 "Pourquoi des rails, et pas un calcul de chemin")
 *
 * Three guarantees hold the whole of it together, and each one is written below
 * as arithmetic rather than as a case:
 *   - the advance never decreases, which is the formal reason an assault always
 *     ends (spec 03-8);
 *   - nothing here reads the grid of the city, so no zombie can wedge itself,
 *     drop out of the city, or become unreachable (spec 03-9);
 *   - an advance held for three seconds is pushed along whatever holds it, which
 *     bounds the one thing that slows a zombie down: the sword (spec 03-11,
 *     03-13).
 *
 * The four kinds are told apart by their colour, their scale, their pace and
 * their behaviour, never by their shape (spec 03-1, 03-2): each is one line of
 * the balance, read through `balanceOf`, and there is no branch of code per kind
 * anywhere below.
 *
 * Three kinds of harm meet here, and not one of them is spelled as a single
 * number: hp in sword hits, what a blow costs a construction in shambler hits,
 * and what a touch costs the player, which is one contact. (spec 03-3)
 */
import type { Balance, ZombieBalance } from './balance';
import { isClimbing } from './player';
import { nextFloat } from './random';
import {
  EVENT,
  type Game,
  type RailPool,
  ZOMBIE,
  type ZombieType,
  pushEvent,
  railAng,
  railX,
  railZ,
} from './state';

/**
 * How wide and how tall a body stands, in blocks, at a scale of one.
 *
 * The spec settles the scale each kind wears (spec 03-2) and no measurement at
 * all, so these two are read off the city rather than chosen: everything in this
 * game is built of blocks, and a body of scale one is one block across and
 * stands one storey — two blocks. They say whether a body touches another one,
 * and they are the only two lengths of this file the spec does not write.
 */
const BODY_SIDE = 1;
const BODY_TALL = 2;

/** The one line of the balance a kind is. (spec 03-1, 03-2) */
export function balanceOf(balance: Balance, type: ZombieType): ZombieBalance {
  if (type === ZOMBIE.SPRINTER) return balance.sprinter;
  if (type === ZOMBIE.BRUISER) return balance.bruiser;
  if (type === ZOMBIE.COLOSSUS) return balance.colossus;
  return balance.shambler;
}

/** The kind of the one at that spot in the pool. */
function kindAt(game: Game, at: number): ZombieBalance {
  return balanceOf(game.balance, game.assault.zombies.type[at] as ZombieType);
}

/**
 * Where a zombie stands: its advance along its rail, and its offset across it.
 * Two numbers and a street, and that is the whole of a position. (spec 03-7)
 */
function place(game: Game, at: number): void {
  const pool = game.assault.zombies;
  const rails = game.assault.city.rails;
  const street = pool.street[at];
  const progress = pool.progress[at];
  const ang = railAng(rails, street, progress);
  pool.ang[at] = ang;
  pool.x[at] = railX(rails, street, progress) - Math.sin(ang) * pool.offset[at];
  pool.z[at] = railZ(rails, street, progress) + Math.cos(ang) * pool.offset[at];
}

/**
 * Walks one in, on a rail and at an advance, and hands back where it sits in the
 * pool — or -1 when the pool is full, which the table of the waves makes
 * unreachable and which nothing here defends against. (spec 03-42, 03-43, 10-13)
 *
 * Its offset is drawn in ±2 blocks off the rail, from the one generator of the
 * game, so a pack takes the width of a street instead of walking in single file.
 * (spec 03-7, 10-27)
 */
export function spawnZombie(
  game: Game,
  type: ZombieType,
  street: number,
  progress: number,
): number {
  const pool = game.assault.zombies;
  const at = pool.count;
  if (at >= pool.type.length) return -1;

  pool.type[at] = type;
  pool.street[at] = street;
  pool.progress[at] = progress;
  pool.offset[at] = (nextFloat(game.snapshot.random) * 2 - 1) * game.balance.assault.lateralSpread;
  pool.hp[at] = balanceOf(game.balance, type).hp; // in sword hits (spec 03-3)
  pool.knockedFor[at] = 0;
  pool.stuckFor[at] = 0;
  pool.blowLeft[at] = 0;
  pool.count = at + 1;

  place(game, at);
  // It walks in where it stands, so the drawing has nothing to cross. (spec 10-24)
  pool.xPrev[at] = pool.x[at];
  pool.zPrev[at] = pool.z[at];
  pool.angPrev[at] = pool.ang[at];
  return at;
}

/**
 * How fast one walks, in blocks a second: the pace of its kind, until the third
 * net of the end of an assault sends the last of them down at four blocks a
 * second — the pace of a sprinter, which is the ceiling of the game and not a
 * constant of its own. The colossus is left out of that net, and its pace never
 * changes. (spec 03-39, 03-40)
 */
export function speedOf(game: Game, at: number): number {
  const assault = game.balance.assault;
  const type = game.assault.zombies.type[at];
  if (game.assault.fewFor >= assault.rushAfter && type !== ZOMBIE.COLOSSUS) {
    return assault.rushSpeed;
  }
  return kindAt(game, at).speed;
}

/** Whether it has come to the face of the town hall, where it stops. (spec 03-6, 03-17) */
export function atTownHall(game: Game, at: number): boolean {
  return game.assault.zombies.progress[at] >= game.assault.city.rails.length;
}

/**
 * Carries one advance along. It is the only place an advance is written, and it
 * writes it upwards or not at all — never downwards. (spec 03-8)
 *
 * At the face of the town hall the advance stops for good and the zombie stays
 * exactly what it was: nothing takes it out of the pool, so it goes on being a
 * target for as long as the assault lasts. (spec 03-17)
 */
function advance(game: Game, at: number, seconds: number): void {
  const pool = game.assault.zombies;
  const end = game.assault.city.rails.length;
  if (pool.progress[at] >= end) {
    pool.stuckFor[at] = 0; // it stands where it means to stand
    return;
  }

  let stride = speedOf(game, at) * seconds;

  // A sword blow is the one thing in the game that holds an advance, and it
  // holds it without ever taking it back: the shift it gives is sideways.
  // (spec 03-13, 04-34, 04-35)
  if (pool.knockedFor[at] > 0) {
    pool.knockedFor[at] = Math.max(0, pool.knockedFor[at] - seconds);
    stride = 0;
  }

  if (stride > 0) {
    pool.stuckFor[at] = 0;
  } else {
    pool.stuckFor[at] += seconds;
    // Three seconds without moving and it is pushed along its rail, whatever was
    // holding it. Nothing else can hold one — there is no collision with the
    // ground and none between them — so this is what bounds the sword, and it is
    // why a player cannot hold a zombie in one spot for a whole assault.
    // (spec 03-11)
    if (pool.stuckFor[at] >= game.balance.assault.unstickAfter) {
      pool.knockedFor[at] = 0;
      pool.stuckFor[at] = 0;
      stride = speedOf(game, at) * seconds;
    }
  }

  const gone = pool.progress[at] + stride;
  pool.progress[at] = gone > end ? end : gone;
}

/**
 * How far along a rail a spot stands, in blocks. A street is straight and its
 * rail holds two stops, so it is one projection onto the heading of that street.
 * (spec 02-12, 02-16, 03-6)
 */
function alongRail(rails: RailPool, street: number, x: number, z: number): number {
  const ang = railAng(rails, street, 0);
  const fromX = x - railX(rails, street, 0);
  const fromZ = z - railZ(rails, street, 0);
  return fromX * Math.cos(ang) + fromZ * Math.sin(ang);
}

/**
 * The blow a zombie lands on a ground cannon as it goes by, worth the shambler
 * hits of its own kind — one for a shambler or a sprinter, three for a bruiser,
 * ten for a colossus. (spec 03-15, 05-45)
 *
 * It is one blow per cannon and no more, and it lands at the closest the two
 * ever come. An advance never decreases, so a zombie crosses the spot a cannon
 * stands at exactly once, and that crossing is the nearest the pass ever gets:
 * the one blow follows from the monotonic advance and needs nothing remembered.
 * (spec 03-8)
 *
 * Nothing here holds the zombie back by so much as a step. A cannon that stopped
 * one would be a barricade, and an assault could jam against a wall of them.
 * (spec 03-15)
 *
 * A cannon on a roof is out of reach for good, so it is never even measured
 * against. (spec 03-16, 05-46)
 */
function grazeCannons(game: Game, at: number, was: number): void {
  const pool = game.assault.zombies;
  const cannons = game.snapshot.cannons;
  const now = pool.progress[at];
  if (now <= was) return;

  const rails = game.assault.city.rails;
  const street = pool.street[at];
  const range = game.balance.assault.grazeRange;
  const takes = kindAt(game, at).shamblerHits;

  for (let c = 0; c < cannons.count; c += 1) {
    if (cannons.y[c] > 0) continue;
    const along = alongRail(rails, street, cannons.x[c], cannons.z[c]);
    if (along <= was || along > now) continue;
    const offX = cannons.x[c] - pool.x[at];
    const offZ = cannons.z[c] - pool.z[at];
    if (offX * offX + offZ * offZ >= range * range) continue;

    // A ground cannon wears out and is never mended: what it loses, it has lost.
    // What is left of it at nought belongs to chapter 5. (spec 05-44, 05-47, 05-50)
    cannons.hp[c] = Math.max(0, cannons.hp[c] - takes);
    pushEvent(
      game.assault.events,
      EVENT.CANNON_HIT,
      c,
      cannons.x[c],
      cannons.y[c],
      cannons.z[c],
      takes,
    );
  }
}

/**
 * What a touch costs, which is one hp of the player and nothing whatever to the
 * zombie: it does not stop, it does not swerve, it takes no harm and it never
 * takes what he carries. It is not a fight, it is a traffic accident.
 * (spec 03-14, 04-40)
 *
 * Chapter 4 holds what follows: staggered a second — no blow of his own
 * possible — and then untouchable a second. The two run one after the other, so
 * two seconds pass between two losses and a body pressed against a pack takes
 * ten seconds to fall; nothing touches him at all while he takes a ladder.
 * (spec 04-39, 04-13)
 *
 * A zombie walks the floor of its street, so a body standing a storey above it
 * is not touched: that is what keeps a roof a whole refuge. (spec 04-9)
 */
function touchPlayer(game: Game, at: number): void {
  const player = game.assault.player;
  if (player.invulnerableLeft > 0 || isClimbing(player)) return;

  const pool = game.assault.zombies;
  const scale = kindAt(game, at).scale;
  if (Math.abs(player.y) >= BODY_TALL * scale) return;
  const across = (BODY_SIDE * (1 + scale)) / 2;
  const offX = player.x - pool.x[at];
  const offZ = player.z - pool.z[at];
  if (offX * offX + offZ * offZ >= across * across) return;

  const balance = game.balance.player;
  game.snapshot.playerHp = Math.max(0, game.snapshot.playerHp - balance.contactCost);
  player.staggerLeft = balance.stagger;
  player.invulnerableLeft = balance.stagger + balance.invulnerable;
  pushEvent(game.assault.events, EVENT.CONTACT, at, pool.x[at], 0, pool.z[at], balance.contactCost);
}

/**
 * One step of the whole assault: every zombie walks its rail, grazes the ground
 * cannons it passes, and takes from the player what a touch takes. The blows
 * against the town hall are not here — they are the last thing a step does, in
 * `townhall.ts`, in the one order of chapter 10. (spec 10-25)
 */
export function stepZombies(game: Game, seconds: number): void {
  const pool = game.assault.zombies;
  const player = game.assault.player;

  // The two seconds a contact buys are counted down here, where the contact that
  // buys them is settled: one hp goes every two seconds and no faster.
  // (spec 04-39)
  if (player.staggerLeft > 0) player.staggerLeft = Math.max(0, player.staggerLeft - seconds);
  if (player.invulnerableLeft > 0) {
    player.invulnerableLeft = Math.max(0, player.invulnerableLeft - seconds);
  }

  for (let at = 0; at < pool.count; at += 1) {
    // Where it was, so the drawing has two steps to sit between. (spec 10-24)
    pool.xPrev[at] = pool.x[at];
    pool.zPrev[at] = pool.z[at];
    pool.angPrev[at] = pool.ang[at];

    const was = pool.progress[at];
    advance(game, at, seconds);
    place(game, at);
    grazeCannons(game, at, was);
    touchPlayer(game, at);
  }
}
