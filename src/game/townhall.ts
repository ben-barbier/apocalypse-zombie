/**
 * The town hall: the one thing the whole game stands in front of. It takes the
 * blows of what got through, and what it loses it has lost — it never comes back
 * on its own. **The reinforcement is the one door that ever puts hp back**, and
 * it is the last function of this file. There is no mending, free or paid, no
 * armour, and nothing anywhere that heals a single hp with time.
 * (spec 01-19, 06-25, 06-29)
 *
 * Its hp are counted in shambler hits: 200 on a new one, which is exactly ten
 * ground cannons, and a blow is worth the column of the kind that lands it — one
 * for a shambler or a sprinter, three for a bruiser, ten for a colossus.
 * (spec 03-3, 06-26)
 *
 * Two things come off it, and the drawing learns both from the buffer instead of
 * comparing two states (spec 10-19): a **cube** comes away at every blow, and a
 * **piece** falls at every segment lost — a tenth of the ceiling, ten segments
 * whatever the notch. Neither comes back of itself, and the reinforcement is the
 * one thing that brings them back, all at once. (spec 03-18, 06-34, 06-35,
 * 06-36, 06-38)
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
 * It is therefore also where a game ends, and where the fact of it is said: the
 * town hall at nought is the one end there is. (spec 01-28)
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

  // A tenth of the ceiling is a segment, at every notch alike: a blow that
  // crosses one brings a piece of the building down for good, and the `value`
  // says how many segments are still standing. (spec 06-35, 06-38)
  const segment = hall.cap / game.balance.economy.townHallSegments;
  const standing = Math.ceil(hall.hp / segment);
  for (let left = Math.ceil(before / segment) - 1; left >= standing; left -= 1) {
    pushEvent(events, EVENT.TOWN_HALL_SEGMENT_LOST, from, x, y, z, left);
  }

  // And when the last of them has gone, the game has gone with it. The guard at
  // the head of this function is what makes it once and once only, however long
  // whatever stands at the face goes on hammering, and the number of the wave
  // reached rides in the `value` because it is the whole of what the end shows.
  // It says nothing of a victory already won: that one is won for good, and a
  // town hall falling in overtime never takes it back.
  // (spec 01-28, 01-26, 01-30, 10-19)
  if (hall.hp <= 0) pushEvent(events, EVENT.GAME_ENDED, 0, 0, 0, 0, game.snapshot.wave);
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

/**
 * Which **notch** the town hall stands at: nought on the one a game opens with,
 * then one, two and three as the ceiling is carried to 300, 400 and 500. It is
 * read off the ceiling itself and held nowhere, so there is no second fact to
 * hold beside it and nothing new crosses a wave boundary. (spec 06-27, 08-66)
 *
 * It stops at three and there is no fourth: past it the reinforcement is bought
 * back indefinitely at the last price and the ceiling stays where it is, so the
 * notch stays where it is too. (spec 06-28)
 */
export function reinforcementNotch(game: Game): number {
  const caps = game.balance.economy.townHallCaps;
  const cap = game.snapshot.townHall.cap;
  let notch = 0;
  while (notch < caps.length && cap >= caps[notch]) notch += 1;
  return notch;
}

/**
 * What the next reinforcement costs, in coins: 50, then 80, then 120, and 120
 * for ever after. **It reads the notch and nothing else.**
 *
 * It does not read what the town hall has taken, and no reading of it ever will:
 * a price worked out from the harm done is exactly what 06-32 forbids, and it
 * would take away the one decision this purchase exists to pose. The price is
 * fixed and the yield is not — the same 50 coins buy 100 on a full town hall and
 * 250 on one at a quarter — and **that gap is the arbitration between a cannon
 * and the town hall, never a fault to be put right**: the cannon is the purchase
 * of whoever is doing well, the reinforcement of whoever is doing badly.
 * (spec 06-19, 06-27, 06-28, 06-32, 06 "Pourquoi la barre arbitre seule")
 */
export function reinforcementPrice(game: Game): number {
  const prices = game.balance.economy.prices;
  const notch = reinforcementNotch(game);
  return notch < prices.reinforcements.length
    ? prices.reinforcements[notch]
    : prices.reinforcementAgain;
}

/**
 * Buys one, and it is **two things in one movement**: the ceiling moves up *and*
 * the town hall is whole again. It is the rule of the cannon one upgrades,
 * applied to a building — it mends by giving more, it never buys back what one
 * already had — and there is no gesture beside it: no mending of its own, no
 * armour, no reduction of what a blow takes. (spec 06-25, 06-29)
 *
 * Past the third notch the ceiling stays at 500 and this does nothing but make
 * it whole again, indefinitely. That is the valve: it is what keeps a maxed
 * player from being left with no recourse for the last waves, and it is a
 * deliberate leak of the money supply — the bottomless well that guarantees no
 * coin is ever stuck. (spec 06-28, 06 "Pourquoi le rachat indéfini à 120")
 *
 * **Nothing here reads how much is left.** Reinforcing a town hall that has
 * taken nothing at all wastes the making-whole, and that is wanted: it is the
 * whole of the arbitration. There is no refund, no part price and no warning
 * anywhere below. (spec 06-22, 06-32)
 *
 * Nothing about a notch changes anything else: not what a blow takes, not the
 * ten segments of the bar, not a zombie. (spec 06-33)
 */
export function reinforceTownHall(game: Game): void {
  const hall = game.snapshot.townHall;
  const caps = game.balance.economy.townHallCaps;
  const notch = reinforcementNotch(game);
  if (notch < caps.length) hall.cap = caps[notch];
  hall.hp = hall.cap;

  // From the town hall, which stands at the exact middle of the star, and the
  // notch it now stands at rides in the `value`: it is what says the stuff it is
  // built of, and the drawing rebuilds the whole of it off this one fact.
  // (spec 02-7, 06-36, 06-37, 10-19)
  pushEvent(
    game.assault.events,
    EVENT.REINFORCEMENT_BOUGHT,
    0,
    0,
    game.balance.city.townHallHeight,
    0,
    reinforcementNotch(game),
  );
}
