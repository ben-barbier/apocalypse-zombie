/**
 * The town hall: the one thing the whole game stands in front of. It takes the
 * blows of what got through, and what it loses it has lost — it never comes
 * back on its own, and only a reinforcement ever lifts its bar, which belongs to
 * chapter 6. There is no mending, free or paid. (spec 01-19, 06-25, 06-29)
 *
 * Its hp are counted in shambler hits: 200 on a new one, which is exactly ten
 * ground cannons, and a blow is worth the column of the kind that lands it — one
 * for a shambler or a sprinter, three for a bruiser, ten for a colossus.
 * (spec 03-3, 06-26)
 *
 * Two things come off it, and the drawing learns both from the buffer instead of
 * comparing two states (spec 10-19): a **cube** comes away at every blow, and a
 * **piece** falls at every segment lost — a tenth of the ceiling, ten segments
 * whatever the reinforcement step. Neither ever comes back. (spec 03-18, 06-34,
 * 06-35, 06-38)
 *
 * A zombie that arrives here stops and hammers, and it goes on being a target:
 * nothing in this file takes one out of the pool. (spec 03-17)
 */
import { EVENT, type Game, type ZombieType, pushEvent } from './state';
import { atTownHall, balanceOf } from './zombies';

/**
 * One blow against the town hall, in shambler hits. It is the one door its hp go
 * down through, and there is no door at all that puts one back. (spec 01-19)
 *
 * `from` is what struck, and the spot is where it struck, which is what the puff
 * of white shards springs from. (spec 06-34, 10-17)
 */
export function strikeTownHall(
  game: Game,
  shamblerHits: number,
  from: number,
  x: number,
  y: number,
  z: number,
): void {
  const hall = game.snapshot.townHall;
  if (hall.hp <= 0) return;

  const events = game.assault.events;
  const before = hall.hp;
  hall.hp = Math.max(0, before - shamblerHits);
  pushEvent(events, EVENT.TOWN_HALL_HIT, from, x, y, z, shamblerHits);

  // A tenth of the ceiling is a segment, at every reinforcement step: a blow that
  // crosses one brings a piece of the building down for good, and the `value`
  // says how many segments are still standing. (spec 06-35, 06-38)
  const segment = hall.cap / game.balance.economy.townHallSegments;
  const standing = Math.ceil(hall.hp / segment);
  for (let left = Math.ceil(before / segment) - 1; left >= standing; left -= 1) {
    pushEvent(events, EVENT.TOWN_HALL_SEGMENT_LOST, from, x, y, z, left);
  }
}

/**
 * The last thing a step does: the blows of everything standing at the face of
 * the town hall, one a second each, for as long as they stand there — which is
 * for as long as they are alive, since none of them ever goes away by arriving.
 * (spec 03-4, 03-17, 10-25)
 *
 * The count is held at nought for whoever is not there yet, so the first blow
 * lands the instant one arrives, and the ones after it fall exactly a second
 * apart.
 */
export function stepTownHall(game: Game, seconds: number): void {
  const pool = game.assault.zombies;
  const period = game.balance.assault.blowPeriod;

  for (let at = 0; at < pool.count; at += 1) {
    if (!atTownHall(game, at)) {
      pool.blowLeft[at] = 0;
      continue;
    }
    pool.blowLeft[at] -= seconds;
    if (pool.blowLeft[at] > 0) continue;
    pool.blowLeft[at] += period;
    const takes = balanceOf(game.balance, pool.type[at] as ZombieType).shamblerHits;
    strikeTownHall(game, takes, at, pool.x[at], 0, pool.z[at]);
  }
}
