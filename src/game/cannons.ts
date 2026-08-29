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
 */
import type { CannonBalance } from './balance';
import {
  type CannonPool,
  DIAMOND,
  EVENT,
  type Game,
  type InputState,
  heightAt,
  inHalo,
  pushEvent,
} from './state';

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
 */
export function upgradeCannon(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
  cannons.tier[at] += 1;
  cannons.hp[at] = game.balance.cannon.hp;
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
}

/**
 * At nought a cannon is gone: **its magazine is lost, nothing is left to gather,
 * and the spot is free again that same step.** No wreck stands there, and there
 * is nothing to mend, since mending does not exist. (spec 05-47, 05-50)
 *
 * The last of the pool is carried into the slot that comes free, so what stands
 * stays `[0, count)`. Nothing holds an index into this pool between two steps —
 * the question of the diamond is settled again just below, after this runs.
 * (spec 10-13)
 */
function loseCannon(game: Game, at: number): void {
  const cannons = game.snapshot.cannons;
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
 */
export function askDiamond(game: Game): void {
  const player = game.assault.player;
  const diamond = game.assault.diamond;

  const x = player.x;
  const z = player.z;
  const y = heightAt(game.assault.city, x, z);
  diamond.x = x;
  diamond.y = y;
  diamond.z = z;
  diamond.reach = reachOf(game.balance.cannon, y);

  const near = nearestCannon(game, x, y, z);
  diamond.at = near;
  if (near < 0) diamond.shows = DIAMOND.PLACE;
  else diamond.shows = mayUpgrade(game, near) ? DIAMOND.UPGRADE : DIAMOND.NONE;
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
 * Three movements, and they are in this order for a reason each:
 *   - the ones at nought go, so the question below never names one that is no
 *     longer there (spec 05-50);
 *   - the question is settled from where he stands (spec 05-17);
 *   - the button does what the question said, and the question is settled once
 *     more, so what the drawing lays under his feet is what the **next** press
 *     will do (spec 05-17, 05-20).
 *
 * Where the ball and the flame aim, and what they cost, arrive with their own
 * chapters. So does the pouring of an armful, which comes **before** the
 * upgrading at the same three blocks. (spec 04-50, 05-15, 05-38)
 */
export function stepCannons(game: Game, input: Readonly<InputState>): void {
  reapCannons(game);
  askDiamond(game);
  if (!input.action) return;
  pressAction(game);
  askDiamond(game);
}
