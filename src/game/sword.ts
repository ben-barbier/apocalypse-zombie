/**
 * The sword, the sweep, and what one blow does to everything in front of him.
 *
 * This is the gesture of the whole game — the one an eight-year-old makes ten
 * thousand times — and every line of it is a decision of chapter 4 rather than a
 * choice made here.
 *
 * **The sweep is a sector, never a target.** A blow takes the 120° in front of
 * him, three blocks out to the edge of a body's box, one block and a half above
 * and below him, and it lands one sword hit on **everything** standing in it, at
 * once, without sharing it out and without falling off with the number. Ringed by
 * five shamblers, a child who had to strike five times while a routine chose for
 * him would be being punished. (spec 04-22, 04-23, 04-33)
 *
 * **The aim orients and designates nobody.** Since the blow sweeps, there is
 * nothing left to choose: turning him the right way is the whole of it. He turns
 * towards the nearest, ties settled by the highest advance, and holds that one
 * while it stands in the sweep so the view does not swing at every step. The rule
 * never changes — not by the town hall, not before the colossus — and the
 * orientation does not follow afterwards: the blow leaves where it was launched.
 * (spec 04-29 to 04-32)
 *
 * **The height is what makes a roof a whole refuge.** The sweep goes no more than
 * a block and a half up or down, measured floor to floor; the lowest roof of the
 * city stands at four. From a roof one touches nothing in the street — and that
 * is a refuge that costs dear, since the town hall goes on taking blows while one
 * waits up there. (spec 04-26, 02-20)
 *
 * **No friendly fire, in either direction.** Nothing but the pool of zombies is
 * ever looked at below: the town hall, a cannon and a conveyor are not in the one
 * loop of this file at all, so there is no case to write and none to forget. A
 * child who wore down his own defence by striking a zombie stuck to it would
 * never forgive it. (spec 04-27)
 *
 * **The recoil is sideways and never backwards.** An advance never decreases —
 * that is the formal reason an assault always ends — so all a blow can give is a
 * shift across the rail and a halted advance, both read off one table with no
 * branch per kind. The shift carries the body away from him, so striking early is
 * how one is not touched, and the defence gets learnt without ever being taught.
 * (spec 03-8, 04-34 to 04-36)
 *
 * Nothing here does anything but strike, wherever he stands. (spec 04-59)
 */
import type { Balance, KnockbackBalance, SwordBalance } from './balance';
import { isClimbing } from './player';
import {
  EVENT,
  type Game,
  type InputState,
  ZOMBIE,
  type ZombieType,
  pushEvent,
  railAng,
} from './state';
import { BODY_SIDE, balanceOf, fellZombie } from './zombies';

/** The one line of the recoil table a kind is. (spec 04-35) */
export function knockbackOf(balance: Balance, type: ZombieType): KnockbackBalance {
  if (type === ZOMBIE.SPRINTER) return balance.knockback.sprinter;
  if (type === ZOMBIE.BRUISER) return balance.knockback.bruiser;
  if (type === ZOMBIE.COLOSSUS) return balance.knockback.colossus;
  return balance.knockback.shambler;
}

/**
 * Half the sector, in radians. The balance writes the opening in degrees because
 * that is the term chapter 4 settles it in; turning it into what a step needs is
 * the business of the simulation. (spec 04-22, 10-16)
 */
function halfArcOf(sword: SwordBalance): number {
  return ((sword.arc / 2) * Math.PI) / 180;
}

/** The shortest turn from one heading to another, in radians. */
function turnBetween(from: number, to: number): number {
  let gap = to - from;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  return gap;
}

/**
 * Whether a body stands close enough to a spot to be swept, heading aside. Two
 * measurements, and the first of them is the whole of the roof:
 *
 *   - the **height**, a block and a half above and below the spot the blow left
 *     from, taken floor to floor. A zombie walks the floor of its street, which
 *     stands at nought, so this reads the height of the blow and nothing else —
 *     no scale, no kind and no head reaches any further. A roof is four blocks at
 *     the very lowest, so from a roof this is false for every zombie in the city.
 *     (spec 04-22, 04-26, 02-20)
 *   - the **range**, three blocks measured to the edge of the box of the zombie,
 *     which is why a wider body is caught from a little further out. (spec 04-22)
 */
function withinRange(game: Game, at: number, x: number, y: number, z: number): boolean {
  const sword = game.balance.sword;
  if (Math.abs(y) > sword.height) return false;

  const pool = game.assault.zombies;
  const scale = balanceOf(game.balance, pool.type[at] as ZombieType).scale;
  const far = sword.range + (BODY_SIDE * scale) / 2;
  const offX = pool.x[at] - x;
  const offZ = pool.z[at] - z;
  return offX * offX + offZ * offZ <= far * far;
}

/** Whether a body stands in a sweep thrown from a spot on a heading. (spec 04-22) */
function inSweep(game: Game, at: number, x: number, y: number, z: number, ang: number): boolean {
  if (!withinRange(game, at, x, y, z)) return false;
  const pool = game.assault.zombies;
  const towards = Math.atan2(pool.z[at] - z, pool.x[at] - x);
  return Math.abs(turnBetween(ang, towards)) <= halfArcOf(game.balance.sword);
}

/**
 * The nearest to him, ties settled by the highest advance along its rail. The
 * rule never changes — not near the town hall, not facing the colossus — and it
 * knows nothing of kinds: preferring a sprinter to a bruiser is unreadable at
 * eight years old, since one cannot see why one's own body turned elsewhere.
 * (spec 04-30, 04-32)
 *
 * What it looks over is what a blow could touch at all, in any heading: turning
 * him towards it is precisely what puts it inside the sector. So a blow thrown
 * with nothing within range turns him not at all, and goes out where he stood.
 * (spec 04-22, 04-28)
 */
function nearestTo(game: Game): number {
  const player = game.assault.player;
  const pool = game.assault.zombies;
  let chosen = -1;
  let nearest = 0;
  let furthest = 0;

  for (let at = 0; at < pool.count; at += 1) {
    if (!withinRange(game, at, player.x, player.y, player.z)) continue;
    const offX = pool.x[at] - player.x;
    const offZ = pool.z[at] - player.z;
    const away = offX * offX + offZ * offZ;
    const gone = pool.progress[at];
    if (chosen >= 0 && !(away < nearest || (away === nearest && gone > furthest))) continue;
    chosen = at;
    nearest = away;
    furthest = gone;
  }
  return chosen;
}

/**
 * Turns him at the instant of the press, and elects no victim: the blow sweeps,
 * so there is nothing to elect. The one he holds stays his for as long as it
 * stands in the sweep — that hysteresis is what keeps the view from swinging at
 * every step — and when it no longer does, the nearest takes its place.
 * (spec 04-29, 04-31)
 */
function aim(game: Game): void {
  const player = game.assault.player;
  const sword = game.assault.sword;
  const pool = game.assault.zombies;

  let at = sword.aimAt;
  const held =
    at >= 0 && at < pool.count && inSweep(game, at, player.x, player.y, player.z, player.ang);
  if (!held) at = nearestTo(game);

  sword.aimAt = at;
  if (at < 0) return; // nothing within a blow: he strikes where he already faces
  player.ang = Math.atan2(pool.z[at] - player.z, pool.x[at] - player.x);
}

/**
 * The recoil of one body that took a blow and stood. It is sideways and never
 * backwards: the advance is written upwards or not at all, so what a blow gives
 * is a shift across the rail plus a halted advance, and both come off the one
 * table of 04-35 — the colossus does not flinch and the bruiser is not shifted
 * because their lines say so, not because a branch here says so.
 * (spec 03-8, 04-34, 04-35)
 *
 * The shift is taken on the side the blow bears on, which is the side away from
 * him: striking early is how one is not touched. The spot the body is drawn at
 * follows from its offset and is settled by `stepZombies`, which runs straight
 * after the sword in the one order of a step. (spec 04-36, 10-25)
 */
function knockBack(game: Game, at: number): void {
  const pool = game.assault.zombies;
  const knock = knockbackOf(game.balance, pool.type[at] as ZombieType);
  pool.knockedFor[at] = knock.paused;
  if (knock.shift === 0) return;

  // An offset is measured across the rail — one step of it moves a body along
  // `(-sin, cos)` of the heading of the rail — so the side the blow bears on is
  // the whole of "sideways", and nothing here can ever touch an advance.
  // (spec 03-7, 03-8)
  const along = railAng(game.assault.city.rails, pool.street[at], pool.progress[at]);
  const sideways = Math.sin(game.assault.sword.ang - along);
  pool.offset[at] += sideways < 0 ? -knock.shift : knock.shift;
}

/**
 * Sweeps the sector, and hands back how many bodies it touched.
 *
 * **Every one of them takes the same one sword hit**, and it is the same one
 * whatever their number: the line below runs unconditionally, so there is no
 * sharing to write and no falling off to forget. The bruiser at one block a
 * second and the sprinter at four, caught in the same sweep, both take the blow.
 * (spec 04-23, 04-33)
 *
 * Nothing else in the game is looked at here. The town hall, a cannon and a
 * conveyor are not in this loop, which is the whole of the ban on friendly fire.
 * (spec 04-27)
 *
 * It walks the pool downwards, because felling one carries the last of the pool
 * into the slot that comes free: coming down, what is carried in has already been
 * swept. (spec 10-13)
 */
function sweepThrough(game: Game): number {
  const sword = game.assault.sword;
  const pool = game.assault.zombies;
  const balance = game.balance.sword;
  let touched = 0;

  for (let at = pool.count - 1; at >= 0; at -= 1) {
    // One blow touches a body once, however long its grace runs. (spec 04-25)
    if (pool.struckBy[at] === sword.blow) continue;
    if (!inSweep(game, at, sword.x, sword.y, sword.z, sword.ang)) continue;

    pool.struckBy[at] = sword.blow;
    pool.hp[at] -= balance.swordHits; // in sword hits, one to each (spec 04-33)
    touched += 1;

    if (pool.hp[at] > 0) {
      pushEvent(
        game.assault.events,
        EVENT.SWORD_HIT,
        at,
        pool.x[at],
        0,
        pool.z[at],
        balance.swordHits,
      );
      knockBack(game, at);
      continue;
    }
    // The sword landed it, so the coin it leaves is worth double: the bravery
    // bonus, which is a replacement and never something added — it is the same
    // zombie a cannon would have felled for half. (spec 06-3, 06-4)
    fellZombie(game, at, true);
  }
  return touched;
}

/**
 * One step of the sword: the blow already in the air goes on sweeping, and a held
 * button throws the next one the moment the cadence allows.
 *
 * **The cadence is 2,5 blows a second and the held button loops** — no combo, no
 * blocking animation, nothing to time. **Striking at nothing costs nothing**
 * either: a blow that touches thin air takes the same 0,4 second as any other, so
 * there is no dead time and no penalty to pay for missing. (spec 04-24, 04-28)
 *
 * **The grace is 150 ms**, and it is neither announced nor visible: a blow
 * touches what stood in the sweep when it left **or** what walks into it before
 * the grace runs out. A sprinter crosses the three blocks of a sweep in under a
 * second, so without that tolerance half the blows that "were on it" would find
 * nothing. It does not teach anything — it simply makes true what the child
 * already believed he saw. The sweep it goes on measuring is the one the blow was
 * thrown with, spot and heading both: the blow leaves where it was launched, or
 * the body would go chasing zombies. (spec 04-25, 04-32)
 *
 * The whiff is answered at the press and never 150 ms later: what the grace makes
 * generous is the blow, not the moment one hears it. (spec 04-28)
 */
export function stepSword(game: Game, input: Readonly<InputState>, seconds: number): void {
  const player = game.assault.player;
  const sword = game.assault.sword;
  const balance = game.balance.sword;

  // The count down to the next blow, and it is not clamped at nought: what a step
  // overshoots by is carried into the next count, so the cadence stays 2,5 blows a
  // second instead of drifting to a whole number of steps. (spec 04-24, 10-16)
  if (player.strikeLeft > 0) player.strikeLeft -= seconds;

  if (sword.graceLeft > 0) {
    sword.graceLeft = Math.max(0, sword.graceLeft - seconds);
    sweepThrough(game);
  }

  if (!input.strike || player.strikeLeft > 0) return;
  // Staggered by a contact, on a ladder with the sword stowed, or down on the
  // floor: no blow is possible, and the button still does nothing else whatever.
  // (spec 04-13, 04-39, 04-42, 04-59)
  if (player.staggerLeft > 0 || isClimbing(player) || player.collapseLeft > 0) return;

  aim(game);
  sword.blow += 1;
  sword.x = player.x;
  sword.y = player.y;
  sword.z = player.z;
  sword.ang = player.ang;
  sword.graceLeft = balance.grace;
  player.strikeLeft += balance.interval;

  // The one fact that stands for a blow, touched or not: the white arc is drawn
  // on it and the recentring of the camera freezes on it. (spec 04-17, 07-31)
  pushEvent(game.assault.events, EVENT.SWEEP, 0, sword.x, sword.y, sword.z, sword.ang);
  if (sweepThrough(game) === 0) {
    pushEvent(game.assault.events, EVENT.SWORD_MISS, 0, sword.x, sword.y, sword.z, 0);
  }
}
