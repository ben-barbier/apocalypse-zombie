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
import { dropCoin } from './economy';
import { collapsePlayer, isClimbing } from './player';
import { nextFloat } from './random';
import {
  EVENT,
  type Game,
  NO_TARGET,
  type RailPool,
  ZOMBIE,
  type ZombieType,
  type ZombiePool,
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
 * and they are the only two lengths of this file the spec does not write. The
 * width goes out to the sword as well, because a sweep is measured to the edge of
 * a box rather than to its middle. (spec 04-22)
 */
export const BODY_SIDE = 1;
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
  pool.escort[at] = 0;
  pool.knockedFor[at] = 0;
  pool.stuckFor[at] = 0;
  pool.blowLeft[at] = 0;
  pool.struckBy[at] = 0; // no blow has ever touched it, and blows count from one
  pool.count = at + 1;

  place(game, at);
  // It walks in where it stands, so the drawing has nothing to cross. (spec 10-24)
  pool.xPrev[at] = pool.x[at];
  pool.zPrev[at] = pool.z[at];
  pool.angPrev[at] = pool.ang[at];
  return at;
}

/**
 * Masses one on another, within the blocks the escort of the colossus holds. It
 * is the offset that gives way, never the advance: the six bruisers walk in at
 * the advance he walks in at, and they are held to his pace, so what is measured
 * here once holds for the whole of the descent. (spec 03-34, 03-8)
 */
export function massZombie(game: Game, at: number, onto: number, blocks: number): void {
  const pool = game.assault.zombies;
  const near = pool.offset[onto];
  let off = pool.offset[at];
  if (off < near - blocks) off = near - blocks;
  if (off > near + blocks) off = near + blocks;
  pool.offset[at] = off;
  place(game, at);
  pool.xPrev[at] = pool.x[at];
  pool.zPrev[at] = pool.z[at];
  pool.angPrev[at] = pool.ang[at];
}

/** Carries one whole zombie, every column of it, from one slot of the pool to another. */
function carryZombie(pool: ZombiePool, from: number, to: number): void {
  pool.x[to] = pool.x[from];
  pool.z[to] = pool.z[from];
  pool.ang[to] = pool.ang[from];
  pool.xPrev[to] = pool.xPrev[from];
  pool.zPrev[to] = pool.zPrev[from];
  pool.angPrev[to] = pool.angPrev[from];
  pool.type[to] = pool.type[from];
  pool.hp[to] = pool.hp[from];
  pool.street[to] = pool.street[from];
  pool.progress[to] = pool.progress[from];
  pool.offset[to] = pool.offset[from];
  pool.escort[to] = pool.escort[from];
  pool.knockedFor[to] = pool.knockedFor[from];
  pool.stuckFor[to] = pool.stuckFor[from];
  pool.blowLeft[to] = pool.blowLeft[from];
  pool.struckBy[to] = pool.struckBy[from];
}

/**
 * The fatal blow, and `bySword` is who landed it — the pool cares in one respect
 * and one only, which is what the coin is worth: **the fatal blow decides, and
 * nothing else**. One entered by a cannon and finished by the sword pays double,
 * the other way about pays single, and nothing here remembers who struck it
 * before, because nothing here has to. (spec 06-3, 06-4)
 *
 * The head goes off spinning and the rest of the body comes apart in about ten
 * shards of the colour of its kind, gone in 0,6 second. (spec 03-19, 03-20,
 * 07-30)
 *
 * **Nothing at all of the body is left on the ground** — no corpse, no mark, no
 * blood — and that is not an omission but the whole of the rule: it is written
 * here as the body simply leaving the pool, so there is no object anywhere for a
 * floor to hold. The one thing it does leave is its coin, which is chapter 6's
 * and is what the whole game is played for. (spec 03-21, 06-2)
 *
 * The picture holds 60 ms on it and those milliseconds are never caught up; the
 * loop arms that from this one fact of the buffer and from nothing else, so
 * nothing here reads a clock. (spec 10-26)
 *
 * The last of the pool is carried into the slot that comes free, so the living
 * stay `[0, count)`. Whatever holds an index into the pool follows that move —
 * the aim of the sword and the balls in the air are the two such things, and both
 * are settled here rather than left to be rediscovered. (spec 04-31, 05-27,
 * 10-13)
 */
export function fellZombie(game: Game, at: number, bySword: boolean): void {
  const pool = game.assault.zombies;
  // The kind rides in the `value`, because the shards of a fatal blow fly in the
  // colour of the kind and the drawing never compares two states. (spec 07-30, 10-19)
  pushEvent(game.assault.events, EVENT.FATAL_BLOW, at, pool.x[at], 0, pool.z[at], pool.type[at]);

  // One coin springs from it, worth what its kind pays and twice that when the
  // sword landed this blow. It is laid down here, at the one door every fatal
  // blow of the game goes through, so no killer that arrives later can forget
  // it. (spec 06-2, 06-3, 06-4)
  dropCoin(game, pool.type[at] as ZombieType, bySword, pool.x[at], 0, pool.z[at]);

  const last = pool.count - 1;
  if (at !== last) carryZombie(pool, last, at);
  pool.count = last;

  const sword = game.assault.sword;
  if (sword.aimAt === at) sword.aimAt = -1;
  else if (sword.aimAt === last) sword.aimAt = at;

  // The balls in the air hold an index into this pool as well, and a booked blow
  // stays booked for the body it was booked for: what was carried in is followed,
  // and what has just fallen leaves its ball nothing to land on. Without this the
  // reservation of 05-27 would go on holding a slot that now belongs to somebody
  // else, and a cannon would refuse to fire at a body that nothing is aimed at.
  // (spec 05-27, 05-28, 10-13)
  const balls = game.assault.projectiles;
  for (let i = 0; i < balls.count; i += 1) {
    if (balls.target[i] === at) balls.target[i] = NO_TARGET;
    else if (balls.target[i] === last) balls.target[i] = at;
  }
}

/**
 * How fast one walks, in blocks a second: the pace of its kind, until the third
 * net of the end of an assault sends the last of them down at four blocks a
 * second — the pace of a sprinter, which is the ceiling of the game and not a
 * constant of its own. The colossus is left out of that net, and its pace never
 * changes. (spec 03-39, 03-40)
 *
 * The six bruisers of an escort are held to the pace of the colossus they walk
 * with, which is what keeps them massed around him the whole way down; the third
 * net picks them up like anything else, since only the colossus is left out of
 * it. (spec 03-34, 03-40)
 */
export function speedOf(game: Game, at: number): number {
  const assault = game.balance.assault;
  const type = game.assault.zombies.type[at];
  if (game.assault.fewFor >= assault.rushAfter && type !== ZOMBIE.COLOSSUS) {
    return assault.rushSpeed;
  }
  if (game.assault.zombies.escort[at] === 1) return game.balance.colossus.speed;
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
 * **One hp, whatever kind walked into him**, and a touch is the one thing in the
 * whole game that costs him one: not a fall, not the flame of a cannon, not
 * anything else. A colossus worth three would turn every pack into a sum, when
 * what the child needs is to watch a row of pips come down at one rate.
 * (spec 04-37, 04-38)
 *
 * Chapter 4 holds what follows: staggered a second — no blow of his own
 * possible — and then untouchable a second. The two counts are run down in the
 * phase of the step that is his, which comes before this one; here they are only
 * armed. So two seconds stand between two losses and a body pressed against a
 * pack has ten seconds before it goes down. (spec 04-39, 10-25)
 *
 * Three states are out of reach and each one for its own reason: untouchable
 * after the last touch, on a ladder, where the climb is the whole of the
 * immunity, and down on the floor, where he has no hp left to give and will get
 * up whole in any case. (spec 04-13, 04-39, 04-42)
 *
 * **The height is taken floor to floor, and it does not grow with the kind.** A
 * zombie walks the floor of its street, which stands at nought, and its reach is
 * one storey — the height of the one body that can be touched, which is his.
 * Taken with the scale of the kind instead, a colossus at 2,2 would reach 4,4
 * blocks and take an hp off a body standing on the lowest roof of the city,
 * which is four: 04-26 says in as many words that up there nothing touches us,
 * and a refuge that the biggest of them reached into would not be one.
 * (spec 02-20, 04-9, 04-26)
 */
function touchPlayer(game: Game, at: number): void {
  const player = game.assault.player;
  if (player.invulnerableLeft > 0 || player.collapseLeft > 0 || isClimbing(player)) return;
  if (Math.abs(player.y) >= BODY_TALL) return;

  const pool = game.assault.zombies;
  const across = (BODY_SIDE * (1 + kindAt(game, at).scale)) / 2;
  const offX = player.x - pool.x[at];
  const offZ = player.z - pool.z[at];
  if (offX * offX + offZ * offZ >= across * across) return;

  const balance = game.balance.player;
  game.snapshot.playerHp = Math.max(0, game.snapshot.playerHp - balance.contactCost);
  player.staggerLeft = balance.stagger;
  player.invulnerableLeft = balance.stagger + balance.invulnerable;
  player.regenLeft = balance.regenPeriod; // every touch starts the count over (spec 04-41)
  pushEvent(game.assault.events, EVENT.CONTACT, at, pool.x[at], 0, pool.z[at], balance.contactCost);

  // At nought he goes down where he stands — and gets up there, whole, three
  // seconds later. He is never gone: what a contact takes from him is time.
  // (spec 04-5, 04-42)
  if (game.snapshot.playerHp <= 0) collapsePlayer(game);
}

/**
 * One step of the whole assault: every zombie walks its rail, grazes the ground
 * cannons it passes, and takes from the player what a touch takes. The blows
 * against the town hall are not here — they are the last thing a step does, in
 * `townhall.ts`, in the one order of chapter 10. (spec 10-25)
 */
export function stepZombies(game: Game, seconds: number): void {
  const pool = game.assault.zombies;

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
