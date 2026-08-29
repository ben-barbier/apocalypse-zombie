/**
 * The one body the child drives: one pace, one jump, ladders that climb
 * themselves, and a fall that costs nothing.
 *
 * Everything here resolves against the grid of heights — one cell per block of
 * the city, saying at what height one walks and whether one has the right to be
 * there. It is the one collision structure of the game, so a roof is never a
 * case of its own: it is a taller cell, and standing on it or walking off it
 * resolves exactly as at street height. (spec 04-8, 04-9)
 *
 * Three rules of chapter 4 hold the whole of it together, and each one is
 * written here as a cell test rather than as a case:
 *   - a cell whose floor stands above the feet is a wall (spec 04-11);
 *   - a cell whose floor stands below them is a fall, and it costs nothing
 *     (spec 04-12);
 *   - the ladder is the one climb from street height, and it takes itself
 *     (spec 04-13, 04-14).
 *
 * What the arc of a jump is worth is not written in the spec, and it is not
 * chosen here either: it is read off the two bounds of 04-10 and the one pace of
 * 04-6. See `gravityOf` below, which carries the derivation in full.
 */
import type { PlayerBalance } from './balance';
import { type City, type Game, type InputState, type Player, heightAt, walkableAt } from './state';

/**
 * How far above the feet a floor may stand and still be walked into.
 *
 * It is not a rule of the game but arithmetic hygiene: a jump touches its two
 * blocks of rise at the apex of its arc and nowhere else, and a step of a
 * sixtieth of a second samples that apex without ever landing on it exactly.
 * A sixty-fourth of a block lets through the three steps nearest the top of an
 * arc, and lets nothing at all through at three blocks of rise. (spec 04-10, 10-21)
 */
const LEEWAY = 1 / 64;

/**
 * How hard a body is pulled down, in blocks per second per second.
 *
 * The spec gives no such number, and none is invented: it falls out of the three
 * that are written. A jump clears **2 blocks of rise and 2 blocks of void, never
 * more** (spec 04-10) at the one pace of **6 blocks a second** (spec 04-6,
 * 04-7), and one always leaves from somewhere inside the cell one stands on —
 * so the ground a jump has to carry across is the block one leaves plus the two
 * of void, three blocks at six blocks a second, half a second in the air.
 *
 * An arc that lasts `T` and tops out at `rise` fixes both numbers at once:
 * `g = 8 · rise / T²` and the take-off at `g · T / 2`. With the balance of
 * chapter 4 that is 64 blocks per second per second and 16 blocks a second, an
 * arc topping out at exactly 2 blocks, half a second long, 3 blocks wide.
 *
 * The two bounds then hold on their own, which is what says the reading is the
 * right one: two blocks of void are crossed from anywhere in the cell one
 * leaves, three blocks of void from nowhere at all — one is already falling by
 * the time one gets to the far edge — and two blocks of rise are touched at the
 * top of the arc while four never are, which is the four-block drop chapter 2
 * cuts its stretches of roof with. (spec 02-22)
 */
export function gravityOf(balance: PlayerBalance): number {
  const across = balance.jumpGap + 1;
  return (8 * balance.jumpRise * balance.runSpeed * balance.runSpeed) / (across * across);
}

/** How fast a body leaves the ground, in blocks a second. (spec 04-10) */
export function takeOffOf(balance: PlayerBalance): number {
  return (4 * balance.jumpRise * balance.runSpeed) / (balance.jumpGap + 1);
}

/**
 * Whether he is on a ladder, which is the whole of the immunity: while he climbs
 * nothing touches him, his sword is stowed, and he comes out at the top ready to
 * strike. (spec 04-13)
 */
export function isClimbing(player: Readonly<Player>): boolean {
  return player.climbLeft > 0;
}

/** The floor he stands on, and whether he stands on it at all. (spec 04-8) */
function grounded(city: City, player: Readonly<Player>): boolean {
  return player.y <= heightAt(city, player.x, player.z);
}

/**
 * Moves him to a spot, or refuses it. A spot is refused when one has no right to
 * be there and when its floor stands above his feet — the second is what makes a
 * facade a wall from the street and a doorway at the top of a jump, without
 * either being written as a case. (spec 04-8, 04-9, 04-11)
 */
function slideTo(city: City, player: Player, x: number, z: number): void {
  if (!walkableAt(city, x, z)) return;
  if (heightAt(city, x, z) > player.y + LEEWAY) return;
  player.x = x;
  player.z = z;
}

/**
 * Takes the one ladder he is standing on, if he pushes the way it goes. Walking
 * onto it and pushing towards the building is the whole of the gesture: there is
 * no button, and coming down works the same way, pushing the other way from the
 * roof. (spec 04-13)
 *
 * A ladder is one block wide on the one face of its building that gives onto
 * walkable ground, so the cell at its foot and the cell at its top are the two
 * it can be taken from — which is what the two half-blocks below measure.
 * (spec 02-26)
 */
function takeLadder(game: Game, dx: number, dz: number): boolean {
  const player = game.assault.player;
  const city = game.assault.city;
  const buildings = city.buildings;

  for (let b = 0; b < buildings.count; b += 1) {
    const ox = player.x - buildings.ladderX[b];
    const oz = player.z - buildings.ladderZ[b];
    if (ox * ox + oz * oz > 1.25) continue; // the two cells and nothing beyond

    const into = buildings.ladderAng[b];
    const ix = Math.cos(into);
    const iz = Math.sin(into);
    const along = ox * ix + oz * iz; // below nought at the foot, above it on the roof
    const across = -ox * iz + oz * ix;
    if (Math.abs(across) >= 0.5 || Math.abs(along) >= 1) continue;

    const up = along < 0;
    const push = dx * ix + dz * iz;
    if (up ? push <= 0 : push >= 0) continue;

    const half = up ? 0.5 : -0.5;
    const toX = buildings.ladderX[b] + ix * half;
    const toZ = buildings.ladderZ[b] + iz * half;
    if (!walkableAt(city, toX, toZ)) continue;
    const toY = heightAt(city, toX, toZ);
    if (toY === player.y) continue;

    player.climbLeft = game.balance.player.ladderTime; // spec 04-13
    player.climbFromY = player.y;
    player.climbToX = toX;
    player.climbToZ = toZ;
    player.climbToY = toY;
    player.vy = 0;
    return true;
  }
  return false;
}

/** Carries a climb along, and steps him off at the end of it. (spec 04-13) */
function climb(player: Player, seconds: number, ladderTime: number): void {
  player.climbLeft -= seconds;
  if (player.climbLeft <= 0) {
    player.climbLeft = 0;
    player.x = player.climbToX;
    player.z = player.climbToZ;
    player.y = player.climbToY;
    return;
  }
  const done = 1 - player.climbLeft / ladderTime;
  player.y = player.climbFromY + (player.climbToY - player.climbFromY) * done;
}

/**
 * One step of the one body. The order inside it is the order of the chapter: he
 * takes a ladder before he takes a stride, and his height is settled before that
 * stride rather than after it, so the cells his feet clear are the ones he is
 * cleared for at the moment he crosses them. Settled after, a stride would buy
 * itself one step of ground it has not risen for, and a jump would carry three
 * blocks of void where the rule gives it two. (spec 04-10 to 04-13)
 */
export function stepPlayer(game: Game, input: Readonly<InputState>, seconds: number): void {
  const player = game.assault.player;
  const city = game.assault.city;
  const balance = game.balance.player;

  // Where he was, so the drawing has two steps to sit between. (spec 10-24)
  player.xPrev = player.x;
  player.yPrev = player.y;
  player.zPrev = player.z;
  player.angPrev = player.ang;

  if (isClimbing(player)) {
    climb(player, seconds, balance.ladderTime);
    return;
  }
  // He fell where he stood, and he gets up in that same spot. (spec 04-42)
  if (player.collapseLeft > 0) return;

  // The stick, held to a norm of at most one whatever hands it over. (spec 10-30)
  let dx = input.dx;
  let dz = input.dz;
  const push = Math.hypot(dx, dz);
  if (push > 1) {
    dx /= push;
    dz /= push;
  }
  if (push > 0) player.ang = Math.atan2(dz, dx);

  const onFloor = grounded(city, player);
  if (onFloor && push > 0 && takeLadder(game, dx, dz)) return;

  // The one climb from street height is the ladder, so a jump never starts one:
  // it starts from the ground and from nowhere else, once. (spec 04-11)
  if (input.jump && onFloor) player.vy = takeOffOf(balance);

  // The height, along the arc the two bounds fix. Walking off a roof is what
  // leaves the feet above the cell they are over, and the fall that follows
  // costs nothing, ever. (spec 04-10, 04-12)
  const floor = heightAt(city, player.x, player.z);
  if (player.vy !== 0 || player.y > floor) {
    const pull = gravityOf(balance);
    player.y += player.vy * seconds - (pull * seconds * seconds) / 2;
    player.vy -= pull * seconds;
    if (player.y <= floor) {
      player.y = floor;
      player.vy = 0;
    }
  } else {
    player.y = floor;
  }

  // Then the stride: one pace and one only — the same on the ground, in the air,
  // and carrying three firebombs. (spec 04-6, 04-7)
  const stride = balance.runSpeed * seconds;
  slideTo(city, player, player.x + dx * stride, player.z);
  slideTo(city, player, player.x, player.z + dz * stride);
}

/**
 * Stands him where a game opens and where a resumed one picks up: at the base,
 * in front of the town hall, facing down the one street the first assault walks
 * in from. The base is the shed against the face of the town hall that watches
 * street one, so the spot is read off the plan and not chosen.
 * (spec 01-22, 08-71, 02-8)
 */
export function placePlayer(game: Game): void {
  const player = game.assault.player;
  const city = game.assault.city;
  const plan = game.balance.city;

  const ang = city.gateways.ang[0];
  const along = plan.townHallSide / 2 + plan.baseWidth + 0.5;
  player.x = Math.cos(ang) * along;
  player.z = Math.sin(ang) * along;
  player.y = heightAt(city, player.x, player.z);
  player.ang = ang;
  player.vy = 0;
  player.climbLeft = 0;
  player.xPrev = player.x;
  player.yPrev = player.y;
  player.zPrev = player.z;
  player.angPrev = player.ang;
}
