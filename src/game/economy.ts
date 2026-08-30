/**
 * The money: what a zombie pays, the bravery bonus that doubles it, the coin it
 * leaves lying, the magnet that hands it over, and the payment that closes an
 * assault.
 *
 * **The bravery bonus substitutes, it does not add.** A zombie the sword fells
 * pays twice what the same zombie pays when a cannon fells it — and it is the
 * *same* zombie. Every cannon put down therefore steals fatal blows from the
 * sword and shaves the takings that would have bought the next one, which is why
 * this file holds no ceiling, no rising price and no guard of any kind: the
 * economy regulates itself, and the twenty-four cannons of the budget of
 * chapter 10 are out of reach by that substitution alone. **There is nothing
 * here to defend.** (spec 06-3, 06-42, 06 "Pourquoi la prime de bravoure tient
 * tout le reste")
 *
 * **The fatal blow decides, and nothing else.** One entered by a cannon and
 * finished by the sword pays double, the other way about pays single, and no
 * body remembers a thing about who struck it before. That is why `fellZombie`
 * takes one flag and this file takes no history: a share worked out from the
 * harm done would be invisible, impossible to reckon in the head, and would make
 * every zombie carry a ledger. (spec 06-4)
 *
 * **Nothing here reads the wave, the cannons, the street or the spot.** The
 * table below is the whole of what a zombie pays, from wave one to the last wave
 * of the overtime; the payment that closes an assault is the same ten coins
 * whatever the wave. Not one line of this file so much as looks at
 * `snapshot.wave`. (spec 06-5, 06-13)
 *
 * The one exception proves it: `callLadders` asks whether a cannon stands, and
 * it asks nothing about the wave either — the moment the ladders start to beat
 * is chosen by the money, which is exactly why it lives here. (spec 08-87)
 *
 * **Nothing goes stale.** A coin lies where it fell for as long as the assault
 * lasts and is paid whole at the end; the purse has no ceiling, no interest and
 * no expiry, so it is one addition and never anything more. (spec 06-8, 06-14,
 * 06-23)
 *
 * There is no multiplier, no floating figure and no combo anywhere below: what a
 * coin is worth is read off its size and nowhere else. (spec 06-10)
 */
import type { Balance } from './balance';
import { type CoinPool, EVENT, type Game, ZOMBIE, type ZombieType, pushEvent } from './state';

/**
 * What one zombie pays: one for a shambler, two for a sprinter, five for a
 * bruiser, fifty for the colossus — doubled outright when the sword landed the
 * fatal blow, which is the bravery bonus and the whole of it. It is a table of
 * seconds of sword rather than one of danger: what is paid for is the
 * interception. (spec 06-2, 06-3, 06 "Pourquoi 1 / 2 / 5 / 50")
 *
 * The double is a **replacement** and not something laid on top: 2, 4, 10 and
 * 100 are what the sword is paid, in the place of 1, 2, 5 and 50.
 */
export function coinFor(balance: Balance, type: ZombieType, bySword: boolean): number {
  const table = balance.economy.coins;
  let worth = table.shambler;
  if (type === ZOMBIE.SPRINTER) worth = table.sprinter;
  else if (type === ZOMBIE.BRUISER) worth = table.bruiser;
  else if (type === ZOMBIE.COLOSSUS) worth = table.colossus;
  return bySword ? worth * balance.economy.braveryFactor : worth;
}

/**
 * Lays down the one coin a fatal blow leaves, at the spot the body stood at. One
 * coin and one only, whatever felled it. (spec 06-2, 06-7)
 *
 * Nothing here defends the pool: the size of it is derived from the table of the
 * waves — an assault fells at most the head count of its wave, and no line walks
 * more in than the zombie pool holds — and `checkWaveTotals` is what makes that
 * binding. Should a table ever go wrong it fails loudly there rather than
 * quietly losing a coin here, and nothing grows in a step either way.
 * (spec 03-42, 03-43, 10-13, 10-14)
 */
export function dropCoin(
  game: Game,
  type: ZombieType,
  bySword: boolean,
  x: number,
  y: number,
  z: number,
): void {
  const coins = game.assault.coins;
  const at = coins.count;
  if (at >= coins.value.length) return;
  coins.x[at] = x;
  coins.y[at] = y;
  coins.z[at] = z;
  coins.value[at] = coinFor(game.balance, type, bySword);
  coins.count = at + 1;
}

/** Carries one coin, whole, from one slot of the pool to another. */
function carryCoin(coins: CoinPool, from: number, to: number): void {
  coins.x[to] = coins.x[from];
  coins.y[to] = coins.y[from];
  coins.z[to] = coins.z[from];
  coins.value[to] = coins.value[from];
}

/**
 * Hands one coin to the purse and takes it out of the city. The purse has no
 * ceiling, no interest and no expiry, so this is one addition and there is
 * nothing else it could be. (spec 06-23)
 *
 * The last of the pool is carried into the slot that comes free, so what lies in
 * the city stays `[0, count)`; nothing anywhere holds an index into this pool
 * between two steps. (spec 10-13)
 */
function takeCoin(game: Game, at: number): void {
  const coins = game.assault.coins;
  const worth = coins.value[at];
  game.snapshot.coins += worth;
  pushEvent(
    game.assault.events,
    EVENT.COIN_TAKEN,
    at,
    coins.x[at],
    coins.y[at],
    coins.z[at],
    worth,
  );

  const last = coins.count - 1;
  if (at !== last) carryCoin(coins, last, at);
  coins.count = last;
}

/**
 * The one moment of the game that says **climb**, written once and never again.
 *
 * The diamond says "you may put one down" once he is up on a roof, but nothing
 * at all said to go up — so when the purse can pay for a cannon for the first
 * time and not one stands, the rules write the fact and the drawing sets every
 * ladder of the city beating. It ends for good when the first cannon goes down,
 * which is `CANNON_PLACED` and needs no fact of its own: a signal that never
 * ends stops being a signal. (spec 08-87, 08-88)
 *
 * **The moment is chosen by the money and never by a calendar.** Nothing here
 * reads the wave: it is at the end of the second assault that the payment
 * carries the purse to forty-three, and that is the first cannon it can pay for
 * — the figure is where it falls out, not where it is put. A child who has
 * gathered faster is told sooner, and one who has not is told when he can act on
 * it. (spec 06-5, 08-87, 08 "Pourquoi les échelles se mettent à pulser")
 *
 * It asks that no cannon stands, so a page that comes back from an Instantané
 * with one already up says nothing at all — and one that comes back with none
 * says it again, because the child still has to be told. (spec 08-70)
 */
function callLadders(game: Game): void {
  const assault = game.assault;
  if (assault.laddersCalled) return;
  if (game.snapshot.cannons.count > 0) return;
  if (game.snapshot.coins < game.balance.economy.prices.cannon) return;
  assault.laddersCalled = true;
  pushEvent(assault.events, EVENT.LADDERS_LIT, 0, 0, 0, 0, 0);
}

/**
 * The magnet, and the one gathering of the whole game: whatever he passes within
 * four blocks of is his, at that very instant. There is no button to press and
 * nothing to aim at — running after a coin is having it **straight away**,
 * which is what lets him buy in the middle of a fight, and not running costs him
 * nothing at all, since the end of the assault will pay it. (spec 06-7, 06-12)
 *
 * The four blocks are measured through the air and not along the floor, so a roof
 * gathers nothing from the street beneath it: the lowest roof of the city stands
 * at four blocks and the coins lie at nought. It is the same reading of a height
 * that makes a roof a refuge from the sword and from a zombie's reach.
 * (spec 02-20, 04-26)
 *
 * It looks at nothing but where he stands. Not the wave, not the cannons, not
 * the street, not the spot — and not what state he is in either: staggered, on a
 * ladder or down on the floor, a coin he passes is his all the same, because the
 * chapter grants no exception and an exception would be a coin mislaid.
 * (spec 06-5, 06-8)
 *
 * It walks the pool downwards, because taking one carries the last of the pool
 * into the slot that comes free: coming down, what is carried in has already
 * been looked at. (spec 10-13)
 */
export function stepEconomy(game: Game): void {
  const coins = game.assault.coins;
  const player = game.assault.player;
  const magnet = game.balance.economy.magnet;
  const within = magnet * magnet;

  for (let at = coins.count - 1; at >= 0; at -= 1) {
    const offX = coins.x[at] - player.x;
    const offY = coins.y[at] - player.y;
    const offZ = coins.z[at] - player.z;
    if (offX * offX + offY * offY + offZ * offZ >= within) continue;
    takeCoin(game, at);
  }

  // And the one question the purse is asked, once a step: may it pay for a first
  // cannon yet? It is asked here rather than at each of the places that raise the
  // purse, so no path — a coin walked past, the payment that closes an assault,
  // a page that comes back — can be the one that forgets to ask. (spec 08-87)
  callLadders(game);
}

/**
 * The payment that closes an assault, and it is **one movement**: the ten coins
 * of the town hall, fixed from one wave to the next and in the overtime too,
 * **plus everything still lying in the city**, paid without anything having to
 * be gathered. So a preparation always opens on a city with no coins in it, and
 * no coin ever outlives the assault that made it. (spec 06-13, 06-14, 06-15)
 *
 * The ten are fixed on purpose, and that fixity is the whole of the mechanism:
 * they are worth 125 % of what wave one brings in and 6 % of what wave ten
 * brings in, so the help puts itself exactly where it is wanted and fades away
 * afterwards without a single figure varying with the number of the wave.
 * (spec 06-13, 06 "Ce que la prime de fin d'assaut pèse")
 *
 * One fact is written for the whole payment and its `value` carries the whole of
 * it, because that is what it is: the spray of shards from the town hall and the
 * purse going up are the whole of what is seen — no screen, no tally, no text,
 * and above all no figure over anybody's head. (spec 06-10, 06-16, 07-37)
 */
export function payAssault(game: Game): void {
  const coins = game.assault.coins;
  let paid = game.balance.economy.assaultBonus;
  for (let at = 0; at < coins.count; at += 1) paid += coins.value[at];
  coins.count = 0;

  game.snapshot.coins += paid;
  // From the town hall, which stands in the middle of the star. (spec 02-7, 07-37)
  pushEvent(
    game.assault.events,
    EVENT.ASSAULT_BONUS,
    0,
    0,
    game.balance.city.townHallHeight,
    0,
    paid,
  );
}
