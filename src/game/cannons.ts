/**
 * The cannon: **the one thing the child ever puts down**, and the whole of what
 * putting one down means.
 *
 * It goes down **where he stands**, under his feet, on a roof exactly as on the
 * ground. There is no list of allowed spots anywhere in this file, and there is
 * no table of spots anywhere in this project: the eighty-seven roofs are all of
 * them good, and so is every walkable cell of the ground. Should anyone ever be
 * tempted to write such a table, 05-7 to 05-9 and the "Pourquoi" of chapter 5
 * are what say why there is none. (spec 05-7, 05-8, 02-21)
 *
 * **No state of the game holds a placing back** — preparation or the thick of an
 * assault, a zombie a step away, it goes down all the same. (spec 05-9)
 *
 * **One distance, two consequences, and therefore no gap between them.** Three
 * blocks is at once the least two cannons may stand apart and the reach within
 * which the second button upgrades the one already there. Both readings below
 * come out of the one comparison in `nearestCannon`, so there is no patch of
 * ground where a press does nothing: under three blocks one upgrades, at three
 * and beyond one puts a new one down. A press that did nothing where something
 * was possible could not be explained without text to read, and this game has
 * none. (spec 05-11, 05-13)
 *
 * **Upgrading is the one mending there is.** It puts what is left of a cannon
 * back to full — a repair without a repair button — and there is no other, free
 * or paid. Nor is there a selling, a moving or a taking down: every one of those
 * would ask for a confirmation, which is text to read. (spec 05-14, 05-47,
 * 05-12)
 *
 * **A cannon on the ground wears out; one on a roof never does.** What takes its
 * hp is the blow a zombie lands going by, which chapter 3 lands in `zombies.ts`
 * and which never so much as slows the zombie down: nothing here stops anybody,
 * and a cannon is never a barricade. What this file does with that is the last
 * of it — at nought it is gone, its magazine with it, and the spot is free again
 * that same step. (spec 05-10, 05-44 to 05-46, 05-50)
 *
 * **The pool of twenty-four is a technical bound and never a rule.** Nothing
 * below counts cannons, refuses one, or raises a price because there are many:
 * what holds their number down is the price, and the economy puts twenty-four
 * out of reach by the substitution of the bravery bonus alone. **The code has
 * nothing to defend.** (spec 05-51, 05-52, 06-42)
 *
 * ---
 *
 * **The resupply, which is the loop of the whole game.** Firebombs are taken at
 * the shed and nowhere else, carried in an armful of three, and poured whole
 * into the magazine of a cannon. What is taken is paid for on the spot with no
 * dosing and nothing to choose from; what is poured never comes back out, and
 * nothing of it ever falls to the ground, so there is nothing to gather.
 * (spec 04-45, 04-46, 04-49, 04-51)
 *
 * **The flame is a cone and a test of belonging, never a projectile.** It burns
 * everything standing in it, at once, with no ceiling on the number; it lights
 * **only** when a zombie is in it, and it eats nothing at all while it burns
 * nobody — so a lit flame says by itself that one is there. Fed it lands two
 * sword hits a second, dry half of one, and **it never goes out**: running out of
 * firebombs weakens it, it does not put it out, so a cannon just upgraded is
 * never worse than the one before. There is no sputter here and no signal of
 * breakdown: a dry cannon is not a fault, it is a cannon nobody has fed yet.
 * (spec 05-30 to 05-37)
 *
 * **The conveyor is comfort and never power.** The third tier is the second one
 * fed by itself: not a block more of range, not a shot faster, not a sword hit
 * more. It brings one firebomb every six seconds, which is exactly what a fed
 * flame burns, so a cannon it serves never runs dry and never overflows; the
 * deliveries are free for good. Nothing below traces a route, asks the entries
 * for one, or holds a path of any kind: it is a countdown, and the drawing runs
 * a straight line from the base to the cannon. (spec 04-52 to 04-55, 05-4)
 *
 * **What the second button means at one spot, and the one place two gestures
 * meet.** 05-15 and 04-50 put the pouring **before** the upgrading at the same
 * three blocks, and 05-18 says the mark is black in front of a second-tier
 * cannon beyond the halo. Read as an order of questions the two agree and
 * neither is bent: 05-18 answers what the mark says **once the pouring is out of
 * the question**, since its own words are *there is nothing left to improve* —
 * it speaks of the upgrade and of nothing else. Taken the other way about, the
 * mark would be black while a press poured, which is the same fault as a dead
 * zone with the sign turned over: the floor would lie. `askDiamond` below is
 * where that order is written out. (spec 04-50, 05-15, 05-17, 05-18)
 */
import type { CannonBalance, FlameBalance } from './balance';
import {
  type CannonPool,
  DIAMOND,
  EVENT,
  type Game,
  type InputState,
  atBase,
  atFreeFace,
  heightAt,
  inHalo,
  pushEvent,
} from './state';
import { reinforceTownHall, reinforcementPrice } from './townhall';
import { BODY_SIDE, fellZombie } from './zombies';

/**
 * The tier the second arm arrives at. It is a rule and not a figure of the
 * balance — the chapter writes it in words, "the flame from the second tier on" —
 * so it is read here rather than added to a table of numbers. (spec 05-3)
 */
export const FLAME_TIER = 2;

/**
 * How close he stands to the shed for a press to fill his arms, in blocks: half
 * his own side. It is the one reading of a contact this game has — a zombie
 * touches him when the two half-sides of two boxes meet — with the shed as the
 * second box, so nothing new is settled here. (spec 03-14, 04-45)
 */
const SHED_CONTACT = BODY_SIDE / 2;

/**
 * How close he stands to a free face of the town hall for a press to reinforce.
 * It is **the same** reading, written as the same reading rather than as a
 * second number: the two builds at the middle of the city are asked for a
 * contact alike, and neither is a case of its own. (spec 04-45, 06-31)
 */
const HALL_CONTACT = SHED_CONTACT;

/** The shortest turn from one heading to another, in radians. */
function turnBetween(from: number, to: number): number {
  let gap = to - from;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  return gap;
}

/**
 * How far a ball carries from a spot at that height, in **horizontal** blocks:
 * twelve on the ground, and three quarters of a block more for every block of
 * roof under it — so 15, 16,5 and 18 from the three heights of the city. It is
 * the one range of this chapter measured flat rather than through the air, and
 * it is what the reach paints on the floor. (spec 05-19, 05-22)
 */
export function reachOf(rule: CannonBalance, y: number): number {
  return rule.ball.range + rule.ball.perHeight * y;
}

/**
 * The cannon standing within three blocks of a spot, or -1 when none does. It is
 * **the one comparison** of this file, and both halves of 05-13 come out of it,
 * which is what leaves no gap between them.
 *
 * The distance is taken **through the air** and not along the floor, because the
 * chapter says plainly which of its ranges are flat — the ball is, the flame is
 * not — and this one it leaves alone. Taken flat, a cannon on the lowest roof of
 * the city would be upgraded, and poured into, from the street four blocks below
 * it, which is the roof one is not allowed to reach into anywhere else in this
 * game. (spec 04-26, 05-13, 05-22, 05-31)
 *
 * The nearest wins, so a press is never ambiguous where two of them stand close
 * to one another.
 */
export function nearestCannon(game: Game, x: number, y: number, z: number): number {
  const cannons = game.snapshot.cannons;
  const apart = game.balance.cannon.spacing;
  let found = -1;
  let closest = apart * apart;

  for (let at = 0; at < cannons.count; at += 1) {
    const offX = cannons.x[at] - x;
    const offY = cannons.y[at] - y;
    const offZ = cannons.z[at] - z;
    const away = offX * offX + offY * offY + offZ * offZ;
    if (away >= closest) continue;
    closest = away;
    found = at;
  }
  return found;
}

/**
 * Whether that cannon has a tier left to reach. The run is linear and there is no
 * branch in it, so this is a count and a place and nothing else: the last tier is
 * the conveyor, and the conveyor only ever reaches into the halo — nine roofs out
 * of eighty-seven, plus the ground it covers. Beyond it the upgrading stops at
 * the second tier for good, and there is nothing here that lifts that.
 * (spec 05-2, 05-16, 02-33)
 */
export function mayUpgrade(game: Game, at: number): boolean {
  const cannons = game.snapshot.cannons;
  const tiers = game.balance.cannon.tiers;
  const tier = cannons.tier[at];
  if (tier >= tiers) return false;
  if (tier + 1 < tiers) return true;
  return inHalo(game.assault.city, cannons.x[at], cannons.z[at]);
}

/**
 * What the next tier of that cannon costs, in coins. Two steps, two prices, and
 * neither of them ever moves: not with the wave, not with how many cannons
 * stand, not with where this one is, not in the overtime. (spec 06-18, 06-19)
 */
export function upgradePrice(game: Game, at: number): number {
  const prices = game.balance.economy.prices;
  return game.snapshot.cannons.tier[at] === 1 ? prices.tierTwo : prices.tierThree;
}

/**
 * Puts one cannon down at a spot and hands back where it sits in the pool — or
 * -1 when the pool is full, exactly as a zombie walking in does. That bound is
 * arithmetic hygiene and not a rule of the game: the economy puts it out of
 * reach, no chapter gives cannons a ceiling, and nothing anywhere counts them.
 * (spec 05-51, 05-52, 10-13, 10-14)
 *
 * It opens at the first tier with its hp full, an empty magazine, and its cadence
 * to run down before its first ball: a cannon that has just gone down has not
 * fired yet. What its hp are worth is the same at all three tiers, and on a roof
 * nothing ever takes one. (spec 05-23, 05-44, 05-46)
 */
export function placeCannon(
  game: Game,
  x: number,
  y: number,
  z: number,
  ang: number,
): number {
  const cannons = game.snapshot.cannons;
  const at = cannons.count;
  if (at >= cannons.tier.length) return -1;

  const rule = game.balance.cannon;
  cannons.x[at] = x;
  cannons.y[at] = y;
  cannons.z[at] = z;
  cannons.ang[at] = ang;
  cannons.angPrev[at] = ang;
  cannons.tier[at] = 1;
  cannons.hp[at] = rule.hp; // in shambler hits (spec 05-44)
  cannons.magazine[at] = 0;
  cannons.ballLeft[at] = rule.ball.period;
  cannons.burnLeft[at] = 0;
  // It bears no cone at the first tier, so nothing of the flame is alight and
  // its heading is the one it was put down on. No conveyor either: that is the
  // third tier. (spec 05-3, 05-4)
  cannons.flameAng[at] = ang;
  cannons.flameAngPrev[at] = ang;
  cannons.flameLit[at] = 0;
  cannons.conveyorLeft[at] = 0;
  cannons.count = at + 1;

  // The tier rides in the `value`, because the drawing reads the silhouette off
  // it and never off a comparison of two states. (spec 05-5, 10-19)
  pushEvent(game.assault.events, EVENT.CANNON_PLACED, at, x, y, z, 1);
  return at;
}

/**
 * Moves one cannon up a tier, and **puts it back to full in the same movement**:
 * that is the whole of 05-14, and it is the only mending this game has. The
 * blocks it had lost come back with its hp, since the silhouette is read off
 * them. (spec 05-14, 05-48)
 *
 * Its magazine keeps exactly what it held: nothing is ever taken back out of one,
 * and nothing is ever given into one for free. (spec 04-51, 06-22)
 *
 * At the third tier the conveyor **appears at once** — nothing is traced, laid
 * or steered — and its count opens on a whole period, exactly as a cannon that
 * has just gone down has not fired yet: the first delivery is one period away
 * and never the same instant as the purchase. (spec 04-53, 04-54, 05-23)
 */
export function upgradeCannon(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  const rule = game.balance.cannon;
  cannons.tier[at] += 1;
  cannons.hp[at] = rule.hp;
  if (cannons.tier[at] >= rule.tiers) cannons.conveyorLeft[at] = rule.conveyorPeriod;
  pushEvent(
    game.assault.events,
    EVENT.CANNON_UPGRADED,
    at,
    cannons.x[at],
    cannons.y[at],
    cannons.z[at],
    cannons.tier[at],
  );
}

/** Carries one whole cannon, every column of it, from one slot of the pool to another. */
function carryCannon(cannons: CannonPool, from: number, to: number): void {
  cannons.x[to] = cannons.x[from];
  cannons.y[to] = cannons.y[from];
  cannons.z[to] = cannons.z[from];
  cannons.ang[to] = cannons.ang[from];
  cannons.angPrev[to] = cannons.angPrev[from];
  cannons.tier[to] = cannons.tier[from];
  cannons.hp[to] = cannons.hp[from];
  cannons.magazine[to] = cannons.magazine[from];
  cannons.ballLeft[to] = cannons.ballLeft[from];
  cannons.burnLeft[to] = cannons.burnLeft[from];
  cannons.flameAng[to] = cannons.flameAng[from];
  cannons.flameAngPrev[to] = cannons.flameAngPrev[from];
  cannons.flameLit[to] = cannons.flameLit[from];
  cannons.conveyorLeft[to] = cannons.conveyorLeft[from];
}

/**
 * At nought a cannon is gone: **its magazine is lost, nothing is left to gather,
 * and the spot is free again that same step.** No wreck stands there, and there
 * is nothing to mend, since mending does not exist. (spec 05-47, 05-50)
 *
 * The tier rides in the `value`, and a third one is what tells the drawing to
 * pull its conveyor back to the base over the one second of 04-55. The belt is
 * indestructible — nothing anywhere takes hp from one — so it never goes on its
 * own account: it goes because the cannon it served has. (spec 04-55, 05-50)
 *
 * The last of the pool is carried into the slot that comes free, so what stands
 * stays `[0, count)`. Nothing holds an index into this pool between two steps —
 * the question of the diamond is settled again just below, after this runs.
 * (spec 10-13)
 */
function loseCannon(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  // A cone alight goes with the cannon that bore it, and it is said so: a lit
  // flame holds a voice until it is told to stop, and a cannon that is gone
  // would hold one for ever. (spec 05-33, 09-13)
  douseFlame(game, at);
  pushEvent(
    game.assault.events,
    EVENT.CANNON_LOST,
    at,
    cannons.x[at],
    cannons.y[at],
    cannons.z[at],
    cannons.tier[at],
  );

  const last = cannons.count - 1;
  if (at !== last) carryCannon(cannons, last, at);
  cannons.count = last;
}

/**
 * Takes away the ones the passing zombies of this step brought to nought. It runs
 * downwards, because losing one carries the last of the pool into the slot that
 * comes free: coming down, what is carried in has already been looked at.
 * (spec 10-13)
 */
function reapCannons(game: Game): void {
  const cannons = game.snapshot.cannons;
  for (let at = cannons.count - 1; at >= 0; at -= 1) {
    if (cannons.hp[at] > 0) continue;
    loseCannon(game, at);
  }
}

/**
 * Whether an armful would go into that cannon: he carries at least one firebomb
 * **and** its magazine is not full. Both halves are what 05-15 writes, and both
 * are read in the world rather than anywhere else — the cubes over his head and
 * the three cells on the cannon — so what the button is about to do is already
 * on the screen before it is pressed. (spec 04-50, 05-15)
 */
export function mayPour(game: Game, at: number): boolean {
  if (game.snapshot.armful <= 0) return false;
  return game.snapshot.cannons.magazine[at] < game.balance.cannon.magazine;
}

/**
 * Fills his arms at the shed: **as many firebombs as he can carry, paid for on
 * the spot**, and what he cannot pay for he simply does not take. Nothing is
 * dosed, nothing is chosen from a list and nothing is confirmed — one press, and
 * what the shed holds never runs out. (spec 04-45, 04-46)
 *
 * The purse is asked here and never by the mark: the mark answers "may I
 * *here*?" and the badge answers "may I pay?", and the two do not overlap. So a
 * press with an empty purse takes nothing, exactly as a press on a cannon one
 * cannot afford puts nothing down. (spec 06-21, 08-28)
 */
export function takeArmful(game: Game): void {
  const player = game.assault.player;
  const price = game.balance.economy.prices.firebomb;
  const room = game.balance.cannon.magazine - game.snapshot.armful;
  if (room <= 0) return;

  // What he can pay for, in whole firebombs: there is no credit, no reservation
  // and no part payment anywhere in this game. (spec 06-21)
  const afforded = Math.floor(game.snapshot.coins / price);
  const taken = afforded < room ? afforded : room;
  if (taken <= 0) return;

  game.snapshot.coins -= taken * price;
  game.snapshot.armful += taken;
  // How many went into his arms rides in the `value`, because the cubes over his
  // head are drawn off this one fact rather than off two states compared.
  // (spec 04-47, 10-19)
  pushEvent(
    game.assault.events,
    EVENT.ARMFUL_TAKEN,
    0,
    player.x,
    player.y,
    player.z,
    taken,
  );
}

/**
 * Pours the whole armful into one magazine, **all at once and within the free
 * cells**: what does not fit stays in his arms, and nothing ever comes back out
 * of a cannon. Siphoning one's cannons to feed the good one would turn a game of
 * journeys into a game of book-keeping, and there is no gesture for it anywhere.
 * (spec 04-49, 04-51)
 *
 * The 0,3 second of the gesture is the drawing's, exactly as the 0,3 second of
 * putting a cannon down is: the rules pour on the instant of the press, and the
 * three cells fill over that span. (spec 04-49, 05-7)
 */
export function pourArmful(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  const room = game.balance.cannon.magazine - cannons.magazine[at];
  const carried = game.snapshot.armful;
  const poured = carried < room ? carried : room;
  if (poured <= 0) return;

  const was = cannons.magazine[at];
  cannons.magazine[at] += poured;
  game.snapshot.armful -= poured;
  // What the magazine held **before** rides in the `value`, and not what went
  // in: it is a count and never a slot, so it stays true however the pool is
  // shuffled between the step and the frame that reads it. (spec 10-13, 10-19)
  pushEvent(
    game.assault.events,
    EVENT.ARMFUL_POURED,
    at,
    cannons.x[at],
    cannons.y[at],
    cannons.z[at],
    was,
  );
}

/**
 * The conveyors of the third tier, which make the journey in his place — and
 * only for the cannons of the halo, since nothing else ever reaches a third
 * tier. (spec 04-52, 05-16)
 *
 * **One firebomb every six seconds, free for ever, and never one too many.** Six
 * seconds is exactly what a fed flame burns, which is the whole of "a cannon a
 * belt serves never runs dry and never overflows": the count runs whatever the
 * magazine holds, and a delivery that finds no free cell is simply not made. The
 * purse is not so much as read below — the deliveries are free, definitively.
 * (spec 04-54, 04-55)
 *
 * There is **no route here, and no way to ask for one**: a belt is this
 * countdown, and the line the eye follows is drawn straight from the base to the
 * cannon. Nothing traces it, nothing steers it, and nothing takes it down.
 * (spec 04-53, 04-55)
 */
function runConveyors(game: Game, seconds: number): void {
  const cannons = game.snapshot.cannons;
  const rule = game.balance.cannon;

  for (let at = 0; at < cannons.count; at += 1) {
    if (cannons.tier[at] < rule.tiers) continue;
    cannons.conveyorLeft[at] -= seconds;
    if (cannons.conveyorLeft[at] > 0) continue;
    // Adding rather than writing, so what a step overshoots by is carried and
    // six seconds stay six seconds. (spec 10-16)
    cannons.conveyorLeft[at] += rule.conveyorPeriod;
    if (cannons.magazine[at] >= rule.magazine) continue; // it never overflows
    cannons.magazine[at] += 1;
  }
}

/** Half the cone, in radians: the balance writes the opening in degrees. (spec 05-30, 10-16) */
function halfConeOf(flame: FlameBalance): number {
  return ((flame.arc / 2) * Math.PI) / 180;
}

/**
 * Whether a body stands within reach of a cone. The reach is **six blocks in
 * real distance, and the height is spent on the journey**: it is never made
 * longer by the roof under the cannon, which is the decision that makes the
 * ground-or-roof choice exist at all. From a roof of four it leaves four blocks
 * and a half at street height, from a roof of six exactly nought, and from a
 * roof of eight nothing whatever — the ball is the arm of the heights, the flame
 * the arm of the ground. A zombie walks the floor of its street, which stands at
 * nought. (spec 02-20, 05-30, 05-31)
 */
function withinFlame(game: Game, cannon: number, at: number): boolean {
  const cannons = game.snapshot.cannons;
  const pool = game.assault.zombies;
  const reach = game.balance.cannon.flame.range;
  const offX = pool.x[at] - cannons.x[cannon];
  const offY = cannons.y[cannon]; // floor to floor, and the floor of a street is nought
  const offZ = pool.z[at] - cannons.z[cannon];
  return offX * offX + offY * offY + offZ * offZ <= reach * reach;
}

/**
 * The body a cone is aimed at: **the one furthest along its rail among those
 * within reach, all three streets together** — the same one sentence the ball
 * aims by, and the two arms aim apart. Nothing is chosen by kind, nothing is
 * shown and nothing is commanded. (spec 05-38, 05-40, 05-41, 05-42)
 *
 * Nothing is booked here, and nothing needs to be: the reservation of 05-27
 * exists because a ball is spent before it lands, whereas a cone elects nobody —
 * it burns what walks into it. (spec 05-27, 05-32)
 */
export function flameTarget(game: Game, cannon: number): number {
  const pool = game.assault.zombies;
  let chosen = -1;
  let furthest = 0;

  for (let at = 0; at < pool.count; at += 1) {
    const gone = pool.progress[at];
    if (chosen >= 0 && gone <= furthest) continue;
    if (!withinFlame(game, cannon, at)) continue;
    chosen = at;
    furthest = gone;
  }
  return chosen;
}

/**
 * Takes the next firebomb out of the magazine when the one alight has burnt
 * through, and says whether the cone is fed this step.
 *
 * It is called only when a body stands in the cone, and that is the whole of
 * "it eats nothing while it burns nobody": there is no case written for an idle
 * cannon, because an idle cannon never reaches here. **Dry it goes on burning**
 * — a quarter as hard — so nothing below can ever put a flame out for want of
 * fuel. (spec 05-33, 05-34, 05-35)
 */
function feedFlame(game: Game, at: number, seconds: number): boolean {
  const cannons = game.snapshot.cannons;
  const flame = game.balance.cannon.flame;

  if (cannons.burnLeft[at] <= 0 && cannons.magazine[at] > 0) {
    cannons.magazine[at] -= 1;
    // Adding rather than writing, so a firebomb is six whole seconds of fed
    // flame however a step falls across it. (spec 05-35, 10-16)
    cannons.burnLeft[at] += flame.perFirebomb;
  }
  if (cannons.burnLeft[at] <= 0) return false;
  cannons.burnLeft[at] -= seconds;
  return true;
}

/**
 * Burns **everything** standing in the cone, at once and with no ceiling on the
 * number: the line below runs unconditionally, so there is no share to write and
 * no falling off to forget. The bruiser at one block a second and the sprinter
 * at four, caught in the same cone, both burn. (spec 05-32)
 *
 * The opening is measured on the heading, as every aim of this game is, and the
 * reach in real distance: every zombie of the city walks the same floor at
 * nought, so what the height changes is the same for all of them and it is
 * already spent by the reach. (spec 05-30, 05-31)
 *
 * **No fact is written for a body that burns and stands.** The white puff of
 * 07-36 answers a *blow*, and a flame is not a blow but a continuous burn: a
 * puff sixty times a second would be a strobe, and the buffer of 256 would be
 * full before a step ended. What the eye is given is the cone itself, which is
 * the whole of the signal. (spec 05-32, 07-36, 10-17)
 *
 * A fatal blow goes through the one door every fatal blow of this game goes
 * through, and as **not the sword**: the bravery bonus is paid for going in with
 * the sword, and standing in a cone is the opposite of going in. (spec 06-3,
 * 06-4)
 *
 * It walks the pool downwards, because felling one carries the last of the pool
 * into the slot that comes free: coming down, what is carried in has already
 * been burnt. (spec 10-13)
 */
function burnThrough(game: Game, cannon: number, hits: number): void {
  const cannons = game.snapshot.cannons;
  const pool = game.assault.zombies;
  const half = halfConeOf(game.balance.cannon.flame);
  const ang = cannons.flameAng[cannon];

  for (let at = pool.count - 1; at >= 0; at -= 1) {
    if (!withinFlame(game, cannon, at)) continue;
    const towards = Math.atan2(pool.z[at] - cannons.z[cannon], pool.x[at] - cannons.x[cannon]);
    if (Math.abs(turnBetween(ang, towards)) > half) continue;

    pool.hp[at] -= hits; // in sword hits, and a burn eats fractions of one
    if (pool.hp[at] > 0) continue;
    fellZombie(game, at, false);
  }
}

/** Lets a cone go out, because nothing is left standing in it. (spec 05-33) */
function douseFlame(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  if (cannons.flameLit[at] === 0) return;
  cannons.flameLit[at] = 0;
  pushEvent(
    game.assault.events,
    EVENT.FLAME_OUT,
    at,
    cannons.x[at],
    cannons.y[at],
    cannons.z[at],
    0,
  );
}

/**
 * One step of the cones. Every cannon from the second tier on turns its cone on
 * the body furthest along its rail within six blocks, and burns everything the
 * cone holds.
 *
 * **A cone lights only over a body, and never over an empty street.** That is
 * one line — no target, nothing lit — and it is what makes a lit flame a signal
 * of presence readable from the far side of the square. Nothing here sputters,
 * nothing warns, and nothing at all is alight without a zombie inside it.
 * (spec 05-33, 05-37)
 *
 * **What is fed and what is dry is told by the length of the flame and never by
 * its colour** — the fire of this game is white-blue throughout — and the two
 * numbers of 05-34 are the whole of the difference: a fed cone lands two sword
 * hits a second and a dry one half of one, a quarter of that, and neither of the
 * two is nought. (spec 05-34, 05-36, 07-39)
 *
 * The heading of the step before is carried here, in the one place the heading of
 * a cone is ever written, so the drawing has two steps to sit between.
 * (spec 10-24)
 */
function burnFlames(game: Game, seconds: number): void {
  const cannons = game.snapshot.cannons;
  const pool = game.assault.zombies;
  const flame = game.balance.cannon.flame;

  for (let at = 0; at < cannons.count; at += 1) {
    cannons.flameAngPrev[at] = cannons.flameAng[at];
    if (cannons.tier[at] < FLAME_TIER) continue; // one arm at the first tier (spec 05-3)

    const target = flameTarget(game, at);
    if (target < 0) {
      douseFlame(game, at);
      continue;
    }

    cannons.flameAng[at] = Math.atan2(
      pool.z[target] - cannons.z[at],
      pool.x[target] - cannons.x[at],
    );
    if (cannons.flameLit[at] === 0) {
      cannons.flameLit[at] = 1;
      pushEvent(
        game.assault.events,
        EVENT.FLAME_LIT,
        at,
        cannons.x[at],
        cannons.y[at],
        cannons.z[at],
        0,
      );
    }

    const fed = feedFlame(game, at, seconds);
    burnThrough(game, at, (fed ? flame.fed : flame.dry) * seconds);
  }
}

/**
 * Settles the question one is asking where one stands — the mark under the feet
 * and the circle it draws — and it is the **one** place that question is
 * answered: the second button below reads what this wrote, so what a press does
 * is never anything but what the floor said it would. (spec 05-17 to 05-20)
 *
 * It is asked at the **floor cell under his feet**, not at his feet: half way up
 * a jump or half way up a ladder, a cannon still goes down on the ground he is
 * over, and that is what keeps 05-9 true without a single case being written for
 * it. (spec 04-8, 04-9, 05-7, 05-9)
 *
 * It never looks at the purse. "May I here?" is the mark's question and "may I
 * pay?" is the badge's, and the two do not overlap anywhere. (spec 08-28)
 *
 * **The order of the questions, which is the whole of "one sense at one spot".**
 * The button has five senses across the city and never two at once, so what
 * settles them is an order, and never a screen to choose from:
 *
 *   1. **at the contact of the shed, with room in his arms, he takes.** It has
 *      to come first: firebombs are taken *there and nowhere else*, while a
 *      cannon goes down anywhere at all — were the placing to win, 04-45 would
 *      be unreachable and the child could never carry a bomb. Full arms leave
 *      the question to the ones below rather than spending a press on nothing.
 *      (spec 04-45, 04-46, 04-60);
 *   2. **at the contact of one of the three free faces of the town hall, he
 *      reinforces.** It goes here, above every question a cannon asks, and the
 *      argument is the one that put the shed first, word for word: the
 *      reinforcement happens at those three faces *and nowhere else*, while a
 *      cannon goes down anywhere at all — so the named place wins over the place
 *      that is everywhere, or the named place stops existing. It is not a matter
 *      of taste either. The reinforcement is the **valve**, and 06 "Pourquoi la
 *      spirale ne peut pas exister" turns on its being payable at the very
 *      moment it becomes needed; a cannon put down against the wall of the town
 *      hall would bury it exactly then, in the thick of an assault, which is
 *      when 06-30 says it is bought. It sits **below** the shed because 06-31
 *      settles the one place the two could ever meet: the face the shed holds
 *      never reinforces — there, one takes bombs — and `atFreeFace` refuses that
 *      whole face on its own, so the order and the reading agree twice over.
 *      It is never black: there is no notch at which there is nothing left to
 *      do, since the buy-back runs indefinitely. (spec 06-28, 06-30, 06-31,
 *      06-32);
 *   3. **within three blocks of a cannon, the pouring comes before the
 *      upgrading**, and that is written in as many words: one does not carry
 *      bombs up a street to walk off with them again. (spec 04-49, 04-50,
 *      05-15);
 *   4. then the **upgrading**, while a tier is left to reach (spec 05-13);
 *   5. **black** when none is — a third tier, or a second one beyond the halo.
 *      This is 05-18, and it lands *here*, after the pouring has been asked:
 *      its own words are "there is nothing left to improve", so it answers for
 *      the upgrade and never for the armful. Put above the pouring instead, the
 *      floor would say black while the press poured, and a mark that lies is
 *      worse than the dead zone the chapter already forbids. That reading is
 *      what this file settles, and it bends neither rule. (spec 05-15, 05-17,
 *      05-18);
 *   6. otherwise a cannon **goes down** where he stands (spec 05-7).
 *
 * Those are the five senses of the button and the three places that tell them
 * apart, which is the whole of why there will never be a second build: no place
 * is left for one. (spec 05-1, 05 "Pourquoi le canon est la seule construction")
 */
export function askDiamond(game: Game): void {
  const player = game.assault.player;
  const diamond = game.assault.diamond;
  const rule = game.balance.cannon;

  const x = player.x;
  const z = player.z;
  const y = heightAt(game.assault.city, x, z);
  diamond.x = x;
  diamond.y = y;
  diamond.z = z;
  diamond.reach = reachOf(rule, y);

  if (game.snapshot.armful < rule.magazine && atBase(game.assault.city, x, z, SHED_CONTACT)) {
    diamond.at = -1; // the shed is not a cannon, and it names none
    diamond.shows = DIAMOND.TAKE;
    return;
  }

  // The three free faces, and never the fourth. Nothing is read here of what the
  // town hall has taken: the mark is the same at a full bar and at a quarter of
  // one, because the price is the same and only the yield differs — which is the
  // arbitration itself. (spec 06-30, 06-31, 06-32)
  if (atFreeFace(game.assault.city, x, z, HALL_CONTACT)) {
    diamond.at = -1; // the town hall is not a cannon either
    diamond.shows = DIAMOND.REINFORCE;
    return;
  }

  // The one comparison of this file answers for all three of what follows: the
  // three blocks that space two cannons are the three the pouring is measured
  // in, and the balance is held to that equality by its own test. Were they ever
  // to part, a gap would open where a press did nothing. (spec 04-49, 05-11,
  // 05-13)
  const near = nearestCannon(game, x, y, z);
  diamond.at = near;
  if (near < 0) {
    diamond.shows = DIAMOND.PLACE;
    return;
  }
  if (mayPour(game, near)) {
    diamond.shows = DIAMOND.POUR;
    return;
  }
  diamond.shows = mayUpgrade(game, near) ? DIAMOND.UPGRADE : DIAMOND.NONE;
}

/**
 * One press of the second button, doing exactly what the mark under his feet
 * says it will. One press, one gesture: the entries hand rising edges over, so
 * a held button is one press and not sixty a second. (spec 10-30, 10-31)
 *
 * **One buys what one can pay for**, and nothing else happens: there is no
 * credit, no reservation and no part payment, and a purchase one cannot afford
 * is never offered — the badge of the purse is already dark. (spec 06-21)
 *
 * A press that finds a black mark does nothing, and that is not a gap: 05-18
 * says in as many words that there is nothing left to improve there, and the
 * mark says so before the press. (spec 05-18)
 */
function pressAction(game: Game): void {
  const diamond = game.assault.diamond;
  const prices = game.balance.economy.prices;

  // The two gestures of the resupply, in the order the mark has already read
  // out: nothing is arbitrated here, and there is nothing to arbitrate.
  // (spec 04-46, 04-50, 05-15)
  if (diamond.shows === DIAMOND.TAKE) {
    takeArmful(game);
    return;
  }
  if (diamond.shows === DIAMOND.POUR) {
    pourArmful(game, diamond.at);
    return;
  }

  // The valve. The price is asked of the notch alone and of nothing else — never
  // of what the bar has left — and what those coins buy back is therefore worth
  // 2 hp on a full town hall and 5 on one at a quarter. That is the decision, and
  // there is no refund below and no part price. (spec 06-25, 06-32)
  if (diamond.shows === DIAMOND.REINFORCE) {
    const owed = reinforcementPrice(game);
    if (game.snapshot.coins < owed) return;
    game.snapshot.coins -= owed;
    reinforceTownHall(game);
    return;
  }

  if (diamond.shows === DIAMOND.PLACE) {
    if (game.snapshot.coins < prices.cannon) return;
    const at = placeCannon(
      game,
      diamond.x,
      diamond.y,
      diamond.z,
      game.assault.player.ang,
    );
    if (at < 0) return; // the pool, which is a bound and not a rule (spec 05-52)
    game.snapshot.coins -= prices.cannon;
    return;
  }

  if (diamond.shows !== DIAMOND.UPGRADE) return;
  const price = upgradePrice(game, diamond.at);
  if (game.snapshot.coins < price) return;
  game.snapshot.coins -= price;
  upgradeCannon(game, diamond.at);
}

/**
 * One step of the cannons, in the order of chapter 10: it comes after the
 * zombies, which is what lets the ones they brought to nought go before anything
 * reads the pool again. (spec 10-25)
 *
 * Five movements, and they are in this order for a reason each:
 *   - the ones at nought go, so the question below never names one that is no
 *     longer there (spec 05-50);
 *   - the question is settled from where he stands (spec 05-17);
 *   - the button does what the question said — taking, reinforcing, pouring,
 *     putting one down or upgrading it (spec 04-46, 04-50, 05-13, 05-15, 06-30);
 *   - the belts of the third tier bring what they bring, before the cones burn,
 *     so a firebomb that lands this step is alight this step (spec 04-54);
 *   - the cones burn what stands in them (spec 05-32);
 *   - and the question is settled once more, so what the drawing lays under his
 *     feet is what the **next** press will do, magazines and armful included
 *     (spec 05-17, 05-20).
 *
 * Where the ball aims and what it costs is the projectiles', which run straight
 * after this in the one order of a step. (spec 05-38, 10-25)
 */
export function stepCannons(game: Game, input: Readonly<InputState>, seconds: number): void {
  reapCannons(game);
  askDiamond(game);
  if (input.action) pressAction(game);
  runConveyors(game, seconds);
  burnFlames(game, seconds);
  askDiamond(game);
}
