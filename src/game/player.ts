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
 *
 * His five hp are here too, and what they really are is written in chapter 4:
 * **a converter**. He never falls for good — at nought he goes down where he
 * stands, gets up three seconds later in that same spot and whole — so what a
 * contact takes from him is time, and time is already priced in hp of the town
 * hall, which is the one bar whose fall ends a game. The chain runs one way and
 * one way only: *he is touched → he goes down → he fells nobody → the town hall
 * takes the blows*. Anything that pointed that arrow the other way would be wrong.
 * (spec 04-5, 04-42, and the "Pourquoi" of chapter 4 on what his hp are for)
 */
import type { PlayerBalance } from './balance';
import {
  EVENT,
  type City,
  type Game,
  type InputState,
  type Player,
  heightAt,
  pushEvent,
  walkableAt,
} from './state';

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

/**
 * He goes down where he stands, at nought hp.
 *
 * **On the spot, and nowhere else.** Getting up at the base would cost three
 * seconds where walking back from the far end of a street costs fifteen: going
 * down would become the fastest way across the city, and losing his hp while
 * defending would *earn* him hp of the town hall. On the spot, what a collapse
 * costs grows with how far out he was — three seconds on the floor **plus** the
 * walk he owed anyway, while the column keeps coming down.
 * (spec 04-42, and the "Pourquoi" of chapter 4 on the collapse being on the spot)
 *
 * **His armful goes with him**, and that is the one place in the whole game
 * where firebombs are lost: none of them ever falls to the ground, and none is
 * ever picked up off it. (spec 04-43, 04-48)
 *
 * Nothing here is an end. There is no state of being gone, no screen, no walking
 * back in: the one end of a game is the fall of the town hall. (spec 04-5, 01)
 */
export function collapsePlayer(game: Game): void {
  const player = game.assault.player;
  const balance = game.balance.player;

  // What the armful held rides in the `value`, because the cubes over his head
  // go out on this one fact and the drawing never compares two states.
  // (spec 04-47, 10-19)
  const carried = game.snapshot.armful;
  game.snapshot.armful = 0; // spec 04-43

  player.collapseLeft = balance.collapseTime; // spec 04-42
  // He is on the floor: nothing holds him there but the floor itself, and the
  // three seconds of being untouchable begin when he gets up, not now. (spec 04-42)
  player.staggerLeft = 0;
  player.invulnerableLeft = 0;
  pushEvent(game.assault.events, EVENT.COLLAPSE, 0, player.x, player.y, player.z, carried);
}

/**
 * He gets up, three seconds later, in the very spot he went down in and at full
 * hp — with three seconds of being untouchable, which is the one exception to
 * the second the rest of the chapter runs on: without them he would get up
 * inside the pack that had just put him down, over and over. (spec 04-42)
 */
function risePlayer(game: Game): void {
  const player = game.assault.player;
  const balance = game.balance.player;

  player.collapseLeft = 0;
  game.snapshot.playerHp = balance.hp; // spec 04-42
  player.staggerLeft = 0;
  player.invulnerableLeft = balance.riseInvulnerable; // spec 04-42
  player.regenLeft = balance.regenPeriod;
  pushEvent(game.assault.events, EVENT.RISE, 0, player.x, player.y, player.z, balance.hp);
}

/**
 * What his hp do in one step: the two counts a contact bought, the one thing
 * that ever gives one back, and getting him up off the floor.
 *
 * The two counts run one after the other — staggered a second, then untouchable
 * a second — so two seconds stand between two losses whatever walks into him,
 * and five hp are ten seconds of a body pressed against a pack. They are counted
 * down here, in the phase of the step that is his, and the contact that buys them
 * is settled in the phase of the zombies, which comes after it. (spec 04-39, 10-25)
 *
 * **The regeneration is the one mending of the game** — no potion, no pick-up,
 * nothing made whole between two waves — and **every contact starts its count
 * over**, which is what makes six seconds the number it is: six is longer than
 * the two of the loss ceiling, so one never comes back at close quarters. One
 * has to break off, and since the sweep does not go up, breaking off means going
 * up: the roof is the infirmary, and it is paid for in the bravery bonus one is
 * not earning up there. The same six covers the second need without a second
 * rule — thirty seconds of preparation are five hp, so a preparation refills him
 * whole. (spec 04-41, and the "Pourquoi" of chapter 4 on the six seconds)
 */
function carryHp(game: Game, seconds: number): void {
  const player = game.assault.player;
  const balance = game.balance.player;

  if (player.staggerLeft > 0) player.staggerLeft = Math.max(0, player.staggerLeft - seconds);
  if (player.invulnerableLeft > 0) {
    player.invulnerableLeft = Math.max(0, player.invulnerableLeft - seconds);
  }

  if (player.collapseLeft > 0) {
    player.collapseLeft -= seconds;
    if (player.collapseLeft <= 0) risePlayer(game);
    return; // nothing comes back to a body on the floor: he gets up whole
  }

  if (game.snapshot.playerHp >= balance.hp) {
    player.regenLeft = balance.regenPeriod;
    return;
  }
  player.regenLeft -= seconds;
  if (player.regenLeft > 0) return;
  // One hp, and the count starts over; what a step overshoots by is carried, so
  // six seconds stay six seconds instead of drifting to a whole number of steps.
  // (spec 04-41, 10-16)
  player.regenLeft += balance.regenPeriod;
  game.snapshot.playerHp = Math.min(balance.hp, game.snapshot.playerHp + 1);
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
 *
 * His hp are carried first of all, and before either of the two ways out below:
 * the counts a contact bought run down while he climbs and while he lies there,
 * which is what makes the three seconds on the floor three seconds and not the
 * length of whatever he does next. (spec 04-39, 04-42)
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

  carryHp(game, seconds);

  if (isClimbing(player)) {
    climb(player, seconds, balance.ladderTime);
    return;
  }
  // He fell where he stood, and he gets up in that same spot. (spec 04-42)
  if (player.collapseLeft > 0) return;

  // The stick, held to a norm of at most one whatever hands it over, and already
  // a heading **of the world**: a pad pushes in the frame of the screen, and
  // whoever holds the camera turns it before a step is ever run. These rules
  // import nothing and know of no camera, so they could not do it and they do
  // not try; a pilot with no screen writes the world straight in. (spec 10-30,
  // 10-1, and `app/input.ts` for the seam itself)
  let dx = input.dx;
  let dz = input.dz;
  const push = Math.hypot(dx, dz);
  if (push > 1) {
    dx /= push;
    dz /= push;
  }
  // He faces where he runs. `ang` is the heading of the vector `(cos, sin)` —
  // the one the sword reads towards a zombie and the one the camera seats itself
  // along — and not the turn a mesh is given, which is the drawing's own affair
  // and is worked out where a body is seated. (spec 04-29)
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
