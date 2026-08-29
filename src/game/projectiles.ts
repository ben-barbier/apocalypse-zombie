/**
 * The ball: the long arm of a cannon, borne at all three tiers, and it costs
 * nothing and never runs out. (spec 05-21)
 *
 * **A ball is two spots and a date.** It leaves a cannon towards where its target
 * is reckoned to stand when it is due, it is an interpolation between the two for
 * 0,6 second whatever the distance, and the blow lands on the date. There is
 * **no collision test and no line of sight anywhere in this file** — nothing here
 * asks what stands between a cannon and its target, nothing here asks what a ball
 * touches on the way, and a body walking under one takes nothing. The whole of
 * why is chapter 5's: a guaranteed blow does away with every such test at a
 * stroke, and the processor is the scarce resource of this game. (spec 05-25,
 * 05-26)
 *
 * **A cannon never misses**, which is what the reckoning ahead is for and nothing
 * else: a sprinter at four blocks a second would be missed by every cannon in the
 * city from the fourth wave on, and a cannon that misses cannot be explained to an
 * eight-year-old. So the shot is aimed where the body will be, and the blow lands
 * there whether or not it went. (spec 05-25)
 *
 * **One target, one sword hit, no spread.** A ball costs one target one sword hit
 * and touches nothing else: no cloud, no splash, no falling off with distance —
 * eight balls per shambler crossing, three per sprinter, and a table of waves one
 * can check on paper. (spec 05-24)
 *
 * **What is in the air is booked.** A cannon never fires at a body the balls
 * already gone will fell. Without it four cannons put four balls into the same
 * shambler at one sword hit and three are thrown away, which over a column is
 * half a battery lost. The flame needs nothing of the sort: it chooses nobody, it
 * burns what walks into the cone. (spec 05-27)
 *
 * **If the target falls first the ball flies on** and crashes where it was due.
 * A ball never runs out, so there is nothing to spare, and one that swerved
 * in the air would be a lie the eye can see. (spec 05-28)
 *
 * **The aim is not a setting.** It takes the body furthest along its rail within
 * reach, all three streets together, and there is nothing else to it: no aiming by
 * kind — never the bruiser rather than the shambler —, nothing shown, nothing to
 * command. The child places a cannon; he never aims one. (spec 05-38, 05-39,
 * 05-41, 05-42)
 *
 * The flame, which aims by the same one sentence and burns rather than fires,
 * arrives with its own chapter. (spec 05-30, 05-40)
 */
import { reachOf } from './cannons';
import {
  EVENT,
  type Game,
  NO_TARGET,
  type ProjectilePool,
  pushEvent,
  railAng,
  railX,
  railZ,
} from './state';
import { fellZombie, speedOf } from './zombies';

/**
 * The sword hits already on their way to that body. It is the whole of the
 * booking of 05-27: one loop over what is in the air, and no column of the pool
 * of zombies carries a count that would have to be kept true.
 *
 * At the most seven balls are ever in the air at once — twenty-four cannons at a
 * ball every two seconds over a flight of 0,6 second — so this is a handful of
 * comparisons and never the ninety-six of the pool. (spec 05-27, 05 "Le nombre
 * de canons")
 */
export function bookedOn(game: Game, zombie: number): number {
  const balls = game.assault.projectiles;
  const each = game.balance.cannon.ball.swordHits;
  let booked = 0;
  for (let i = 0; i < balls.count; i += 1) {
    if (balls.target[i] === zombie) booked += each;
  }
  return booked;
}

/**
 * Whether what is already in the air will fell it. A body so booked is invisible
 * to every cannon of the city from that instant, which is the whole of "a cannon
 * never fires at a zombie the balls already gone will fell". (spec 05-27)
 */
export function condemned(game: Game, zombie: number): boolean {
  return game.assault.zombies.hp[zombie] - bookedOn(game, zombie) <= 0;
}

/**
 * The body a cannon's ball takes: **the one furthest along its rail among those
 * within reach, all three streets together**. The three rails measure the same
 * 92 blocks, so one advance compares with another whatever street it walks, and
 * there is nothing else to settle — no nearest, no kind, no setting. The nearest
 * would let the one two steps from the town hall walk on, which is precisely the
 * one that costs, and it is the only rule a child can read off the street with
 * his own eyes. (spec 05-38, 05-39, 05-41, 05-42)
 *
 * Reach is measured **flat**: twelve blocks on the ground and three quarters of a
 * block more per block of roof, and the height of the cannon is spent on nothing.
 * That is what the circle on the floor paints, and what growing it teaches.
 * (spec 05-19, 05-22)
 *
 * **There is no least range.** A cannon on the ground that a zombie walks over
 * fires at arm's length, and the comparison below has no floor to it. (spec 05-29)
 *
 * What is booked is passed over, and it is asked last because it is the dearest
 * of the three questions: a body only reaches it when it stands further along
 * than everything kept so far. (spec 05-27)
 */
export function ballTarget(game: Game, cannon: number): number {
  const cannons = game.snapshot.cannons;
  const pool = game.assault.zombies;
  const reach = reachOf(game.balance.cannon, cannons.y[cannon]);
  const x = cannons.x[cannon];
  const z = cannons.z[cannon];
  let chosen = -1;
  let furthest = 0;

  for (let at = 0; at < pool.count; at += 1) {
    const gone = pool.progress[at];
    if (chosen >= 0 && gone <= furthest) continue;
    // Flat, and to the middle of the body: no height, no box, no line of sight.
    // (spec 05-22, 05-26)
    const offX = pool.x[at] - x;
    const offZ = pool.z[at] - z;
    if (offX * offX + offZ * offZ > reach * reach) continue;
    if (condemned(game, at)) continue;
    chosen = at;
    furthest = gone;
  }
  return chosen;
}

/**
 * Where its target is reckoned to stand when the ball is due: its own advance
 * carried on at its own pace for the 0,6 second of the flight, on its own rail
 * and at its own offset, and no further than the face of the town hall, where an
 * advance stops for good. It is the whole of "a cannon never misses" — the blow
 * lands on the date in any case, and this is what puts the ball, the mark on the
 * floor and the eye in the same place. (spec 03-17, 05-25)
 *
 * The two writes go straight into the slot the ball has just taken, because
 * handing two numbers back would mean making something, and a step makes nothing.
 * (spec 10-14)
 */
function reckonAhead(game: Game, at: number, target: number): void {
  const balls = game.assault.projectiles;
  const pool = game.assault.zombies;
  const rails = game.assault.city.rails;
  const street = pool.street[target];
  const offset = pool.offset[target];

  const carried = pool.progress[target] + speedOf(game, target) * game.balance.cannon.ball.flight;
  const ahead = carried > rails.length ? rails.length : carried;
  const along = railAng(rails, street, ahead);

  balls.toX[at] = railX(rails, street, ahead) - Math.sin(along) * offset;
  // A zombie walks the floor of its street, which stands at nought, and that is
  // where a ball comes down. (spec 02-20)
  balls.toY[at] = 0;
  balls.toZ[at] = railZ(rails, street, ahead) + Math.cos(along) * offset;
}

/**
 * Sends one ball, and books its sword hit on the body it is sent at. Past the
 * pool nothing goes out and the cadence is left where it stands, so the next step
 * tries again: ninety-six is a technical bound that seven balls in the air never
 * come near, and the code has nothing to defend. (spec 05-52, 10-13, 10-14)
 *
 * The cadence is put back by adding rather than by writing, so what a step
 * overshoots by is carried into the next count and a ball goes out every two
 * seconds rather than every whole number of steps. It never changes at any tier:
 * the third tier is the second one fed by itself, and it fires no faster.
 * (spec 05-4, 05-23, 10-16)
 */
function fire(game: Game, cannon: number, target: number): void {
  const balls = game.assault.projectiles;
  const at = balls.count;
  if (at >= balls.left.length) return;

  const cannons = game.snapshot.cannons;
  const rule = game.balance.cannon.ball;

  balls.fromX[at] = cannons.x[cannon];
  balls.fromY[at] = cannons.y[cannon];
  balls.fromZ[at] = cannons.z[cannon];
  reckonAhead(game, at, target);

  // It leaves where the cannon stands, so the drawing has nothing to cross on the
  // step it goes out. (spec 10-24)
  balls.x[at] = balls.fromX[at];
  balls.y[at] = balls.fromY[at];
  balls.z[at] = balls.fromZ[at];
  balls.xPrev[at] = balls.x[at];
  balls.yPrev[at] = balls.y[at];
  balls.zPrev[at] = balls.z[at];

  balls.left[at] = rule.flight;
  balls.target[at] = target; // the sword hit is booked from here on (spec 05-27)
  balls.count = at + 1;

  cannons.ballLeft[cannon] += rule.period;

  // The spot is the cannon's, because this is the sound of a shot going out and
  // it is one of the five that are panned. (spec 09-29)
  pushEvent(
    game.assault.events,
    EVENT.CANNONBALL_FIRED,
    cannon,
    cannons.x[cannon],
    cannons.y[cannon],
    cannons.z[cannon],
    rule.swordHits,
  );
}

/** Carries one whole ball, every column of it, from one slot of the pool to another. */
function carryBall(balls: ProjectilePool, from: number, to: number): void {
  balls.x[to] = balls.x[from];
  balls.y[to] = balls.y[from];
  balls.z[to] = balls.z[from];
  balls.xPrev[to] = balls.xPrev[from];
  balls.yPrev[to] = balls.yPrev[from];
  balls.zPrev[to] = balls.zPrev[from];
  balls.fromX[to] = balls.fromX[from];
  balls.fromY[to] = balls.fromY[from];
  balls.fromZ[to] = balls.fromZ[from];
  balls.toX[to] = balls.toX[from];
  balls.toY[to] = balls.toY[from];
  balls.toZ[to] = balls.toZ[from];
  balls.left[to] = balls.left[from];
  balls.target[to] = balls.target[from];
}

/**
 * The blow of one ball come to its date. It lands on the body it was booked for
 * **wherever that body now stands**: the shot was aimed where it would be, and
 * whether it went there or was shifted by a sweep changes nothing — a cannon does
 * not miss. (spec 05-25)
 *
 * A ball whose target has fallen simply crashes: nothing is landed, nothing is
 * paid, and it was in the air the whole 0,6 second all the same. (spec 05-28)
 *
 * A fatal blow goes through the one door every fatal blow of this game goes
 * through, and it goes through it as **not the sword**: the coin a cannon earns
 * is worth what the kind pays and no more. The bravery bonus is what is paid for
 * going in with the sword, and a ball is the opposite of going in. (spec 06-2 to
 * 06-4)
 */
function landBall(game: Game, at: number): void {
  const balls = game.assault.projectiles;
  const target = balls.target[at];
  if (target === NO_TARGET) return;

  const pool = game.assault.zombies;
  const hits = game.balance.cannon.ball.swordHits;
  pool.hp[target] -= hits; // in sword hits, to one body and one only (spec 05-24)

  if (pool.hp[target] > 0) {
    pushEvent(
      game.assault.events,
      EVENT.CANNONBALL_HIT,
      target,
      pool.x[target],
      0,
      pool.z[target],
      hits,
    );
    return;
  }
  fellZombie(game, target, false);
}

/**
 * Flies every ball of this step and lands the ones come to their date.
 *
 * The place a ball holds is the straight interpolation between the two spots and
 * nothing more — the bell is what the eye is given and the drawing owns every
 * figure of it, since no rule of the game reads how high a ball goes. What is
 * written here is what 05-26 says a ball is. (spec 05-26, 10-24)
 *
 * It walks the pool downwards, because a ball that lands hands its slot to the
 * last of the pool: coming down, what is carried in has already been flown.
 * (spec 10-13)
 */
function flyBalls(game: Game, seconds: number): void {
  const balls = game.assault.projectiles;
  const flight = game.balance.cannon.ball.flight;

  for (let at = balls.count - 1; at >= 0; at -= 1) {
    balls.xPrev[at] = balls.x[at];
    balls.yPrev[at] = balls.y[at];
    balls.zPrev[at] = balls.z[at];

    const left = balls.left[at] - seconds;
    balls.left[at] = left;

    if (left > 0) {
      const flown = 1 - left / flight;
      balls.x[at] = balls.fromX[at] + (balls.toX[at] - balls.fromX[at]) * flown;
      balls.y[at] = balls.fromY[at] + (balls.toY[at] - balls.fromY[at]) * flown;
      balls.z[at] = balls.fromZ[at] + (balls.toZ[at] - balls.fromZ[at]) * flown;
      continue;
    }

    landBall(game, at);
    const last = balls.count - 1;
    if (at !== last) carryBall(balls, last, at);
    balls.count = last;
  }
}

/**
 * Turns every cannon towards what its ball would take, runs its cadence down, and
 * sends a ball the moment the two agree.
 *
 * **A cannon faces what it would fire at**, and it is settled by the one
 * sentence of 05-38 rather than by a heading of its own: the barrel is the aim,
 * and the aim is never shown, never set and never commanded. With nothing within
 * reach it holds the heading it had, because a cannon that swung back to some
 * rest position would be reading something the child cannot see. (spec 05-38,
 * 05-42)
 *
 * The heading of the step before is carried here, in the one place the heading is
 * ever written, so the drawing has two steps to sit between. (spec 10-24)
 */
function aimCannons(game: Game, seconds: number): void {
  const cannons = game.snapshot.cannons;
  const pool = game.assault.zombies;

  for (let at = 0; at < cannons.count; at += 1) {
    cannons.angPrev[at] = cannons.ang[at];
    if (cannons.ballLeft[at] > 0) cannons.ballLeft[at] -= seconds;

    const target = ballTarget(game, at);
    if (target < 0) continue;

    cannons.ang[at] = Math.atan2(pool.z[target] - cannons.z[at], pool.x[target] - cannons.x[at]);
    if (cannons.ballLeft[at] > 0) continue;
    fire(game, at, target);
  }
}

/**
 * One step of the balls, in the order of chapter 10: it comes after the cannons,
 * which is what lets the ones brought to nought go before anything here reads
 * their pool. (spec 10-25)
 *
 * The landing goes first and the firing second, so a cannon reads a booking that
 * holds only what is still in the air: a ball that has just landed no longer
 * hides its target from anybody. (spec 05-27)
 *
 * Nothing here asks which of the two times of the wave is running. An assault
 * closes on the last zombie falling, so by then every ball in the air has lost
 * its target and there is nothing left for one to aim at: a preparation is silent
 * because there is nobody in the city, and not because a case says so.
 * (spec 01-12)
 */
export function stepProjectiles(game: Game, seconds: number): void {
  flyBalls(game, seconds);
  aimCannons(game, seconds);
}
