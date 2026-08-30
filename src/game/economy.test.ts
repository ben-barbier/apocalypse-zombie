/**
 * The money read back against chapter 6. Every figure here is written out by
 * hand from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Three properties are what this file exists to make red when they break: the
 * bravery bonus **substitutes** instead of adding, **nothing** a zombie pays
 * depends on the wave, and a preparation opens on a city **with no coins in it**.
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { coinFor, dropCoin, payAssault, stepEconomy } from './economy';
import {
  EVENT,
  type EventBuffer,
  type Game,
  PHASE,
  ZOMBIE,
  type ZombieType,
  createGame,
  createInput,
} from './state';
import { step } from './step';
import { stepSword } from './sword';
import { beginAssault, stepWaves } from './waves';
import { fellZombie, spawnZombie } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** How many facts of one type the buffer holds. */
function counted(events: EventBuffer, type: number): number {
  let found = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found += 1;
  return found;
}

/** The last fact of one type the buffer holds. */
function lastOf(events: EventBuffer, type: number): number {
  let found = -1;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found = i;
  return found;
}

/** Puts one coin down where a test wants it, as a fatal blow would. */
function lay(game: Game, type: ZombieType, bySword: boolean, x: number, z: number): void {
  dropCoin(game, type, bySword, x, 0, z);
}

/** Stands him at a spot on the floor, which is the whole of what the magnet reads. */
function stand(game: Game, x: number, y: number, z: number): void {
  game.assault.player.x = x;
  game.assault.player.y = y;
  game.assault.player.z = z;
}

describe('what a zombie pays', () => {
  it('pays one, two, five and fifty to a cannon', () => {
    // spec 06-2.
    expect(coinFor(BALANCE, ZOMBIE.SHAMBLER, false)).toBe(1);
    expect(coinFor(BALANCE, ZOMBIE.SPRINTER, false)).toBe(2);
    expect(coinFor(BALANCE, ZOMBIE.BRUISER, false)).toBe(5);
    expect(coinFor(BALANCE, ZOMBIE.COLOSSUS, false)).toBe(50);
  });

  it('pays two, four, ten and a hundred to the sword', () => {
    // spec 06-3: the bravery bonus, and it doubles.
    expect(coinFor(BALANCE, ZOMBIE.SHAMBLER, true)).toBe(2);
    expect(coinFor(BALANCE, ZOMBIE.SPRINTER, true)).toBe(4);
    expect(coinFor(BALANCE, ZOMBIE.BRUISER, true)).toBe(10);
    expect(coinFor(BALANCE, ZOMBIE.COLOSSUS, true)).toBe(100);
  });

  it('substitutes the double instead of adding it', () => {
    // spec 06-3, 06 "Pourquoi la prime de bravoure tient tout le reste": it is
    // the *same* zombie, so the sword takes the place of the cannon and never
    // stands beside it. Twice, exactly — never a sum of the two.
    for (const type of [ZOMBIE.SHAMBLER, ZOMBIE.SPRINTER, ZOMBIE.BRUISER, ZOMBIE.COLOSSUS]) {
      const alone = coinFor(BALANCE, type, false);
      const brave = coinFor(BALANCE, type, true);
      expect(brave).toBe(alone * 2);
      expect(brave).not.toBe(alone + brave);
    }
  });

  it('lets the fatal blow decide, and nothing before it', () => {
    // spec 06-4: one entered by a cannon and finished by the sword pays double.
    const game = createGame(BALANCE, 1);
    const at = spawnZombie(game, ZOMBIE.BRUISER, 0, 40);
    game.assault.zombies.hp[at] = 1; // four ball hits already taken (spec 05-24)

    fellZombie(game, at, true);
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.value[0]).toBe(10); // and not 5, and not 5 + 10
  });

  it('pays the same whatever the wave, the street and the spot', () => {
    // spec 06-5: the table holds from wave one to the last wave of the overtime,
    // and no gain depends on the wave, the cannons, the street or the spot.
    const one = createGame(BALANCE, 2);
    const late = createGame(BALANCE, 2);
    late.snapshot.wave = 14; // the plateau of the overtime (spec 03-44)

    const early = spawnZombie(one, ZOMBIE.SPRINTER, 0, 10);
    fellZombie(one, early, true);
    const far = spawnZombie(late, ZOMBIE.SPRINTER, 2, 88);
    fellZombie(late, far, true);

    expect(one.assault.coins.value[0]).toBe(late.assault.coins.value[0]);
    expect(one.assault.coins.value[0]).toBe(4);
  });
});

describe('the coin', () => {
  it('springs one from every zombie felled, and one only', () => {
    // spec 06-2: one coin and one only, where the body stood.
    const game = createGame(BALANCE, 3);
    const at = spawnZombie(game, ZOMBIE.SHAMBLER, 0, 30);
    const x = game.assault.zombies.x[at];
    const z = game.assault.zombies.z[at];

    fellZombie(game, at, false);
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.x[0]).toBeCloseTo(x, 6);
    expect(game.assault.coins.z[0]).toBeCloseTo(z, 6);
    expect(game.assault.coins.value[0]).toBe(1);
  });

  it('flies to him the moment he passes within four blocks', () => {
    // spec 06-7: the magnet, and the one gathering of the game.
    const game = createGame(BALANCE, 4);
    lay(game, ZOMBIE.BRUISER, true, 10, 0);

    stand(game, 10 - 4.01, 0, 0); // a hair over four blocks away
    stepEconomy(game);
    expect(game.assault.coins.count).toBe(1);
    expect(game.snapshot.coins).toBe(0);

    stand(game, 10 - 3.99, 0, 0);
    stepEconomy(game);
    expect(game.assault.coins.count).toBe(0);
    expect(game.snapshot.coins).toBe(10);
  });

  it('measures those four blocks through the air, so a roof gathers nothing', () => {
    // spec 06-7, and the lowest roof of the city stands at four blocks (02-20):
    // what makes a roof a refuge makes it a bad place to be paid on. (spec 04-26)
    const game = createGame(BALANCE, 5);
    lay(game, ZOMBIE.SHAMBLER, false, 0, 0);
    stand(game, 0, 4, 0);
    stepEconomy(game);
    expect(game.assault.coins.count).toBe(1);
    expect(game.snapshot.coins).toBe(0);
  });

  it('says what it is worth in the fact it writes, and nothing else says it', () => {
    // spec 06-9, 06-10: the size of the coin is the one telling, so the drawing
    // is handed the spot and the worth and never a figure to write out.
    const game = createGame(BALANCE, 6);
    lay(game, ZOMBIE.COLOSSUS, true, 2, 0);
    stand(game, 0, 0, 0);
    stepEconomy(game);

    const events = game.assault.events;
    const at = lastOf(events, EVENT.COIN_TAKEN);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(events.value[at]).toBe(100);
    expect(events.x[at]).toBeCloseTo(2, 6);
  });

  it('never goes stale, however long an assault runs', () => {
    // spec 06-8: it lies where it fell, and nothing takes it away but him.
    const game = createGame(BALANCE, 7);
    lay(game, ZOMBIE.SHAMBLER, false, 40, 0);
    stand(game, 0, 0, 0);
    for (let i = 0; i < 60 * 300; i += 1) stepEconomy(game); // five minutes of steps
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.value[0]).toBe(1);
  });

  it('takes them all at once, and carries the pool down whole', () => {
    // spec 10-13: the living are [0, count), and taking one carries the last in.
    const game = createGame(BALANCE, 8);
    lay(game, ZOMBIE.SHAMBLER, false, 1, 0);
    lay(game, ZOMBIE.BRUISER, true, 40, 0);
    lay(game, ZOMBIE.SPRINTER, false, -1, 0);
    stand(game, 0, 0, 0);

    stepEconomy(game);
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.value[0]).toBe(10); // the bruiser's, still lying far off
    expect(game.snapshot.coins).toBe(3); // 1 + 2
  });
});

describe('the purse', () => {
  it('has no ceiling, no interest and no expiry', () => {
    // spec 06-23: accumulating earns nothing and costs nothing.
    const game = createGame(BALANCE, 9);
    game.snapshot.coins = 100_000;
    const input = createInput();
    for (let i = 0; i < 600; i += 1) step(game, input);
    expect(game.snapshot.coins).toBe(100_000);

    lay(game, ZOMBIE.COLOSSUS, true, 0, 0);
    stand(game, 0, 0, 0);
    stepEconomy(game);
    expect(game.snapshot.coins).toBe(100_100); // one addition, and never a ceiling
  });
});

describe('the payment that closes an assault', () => {
  it('pays ten, fixed, and everything still lying with them', () => {
    // spec 06-13, 06-14: one movement, and nothing to be gathered.
    const game = createGame(BALANCE, 10);
    lay(game, ZOMBIE.BRUISER, true, 40, 0); // 10
    lay(game, ZOMBIE.SHAMBLER, false, -40, 0); // 1
    stand(game, 0, 0, 0);

    payAssault(game);
    expect(game.snapshot.coins).toBe(21); // 10 + 10 + 1
    expect(game.assault.coins.count).toBe(0);
  });

  it('says the whole payment in one fact, from the town hall', () => {
    // spec 06-16, 07-37: a spray of shards from the town hall and the purse
    // going up — no screen, no tally, no text.
    const game = createGame(BALANCE, 11);
    lay(game, ZOMBIE.SPRINTER, true, 20, 0); // 4
    payAssault(game);

    const events = game.assault.events;
    expect(counted(events, EVENT.ASSAULT_BONUS)).toBe(1);
    const at = lastOf(events, EVENT.ASSAULT_BONUS);
    expect(events.value[at]).toBe(14);
    expect(events.x[at]).toBe(0);
    expect(events.z[at]).toBe(0);
    expect(events.y[at]).toBe(BALANCE.city.townHallHeight); // spec 02-7
    // Not one fact per coin swept: the payment is one movement. (spec 06-14)
    expect(counted(events, EVENT.COIN_TAKEN)).toBe(0);
  });

  it('pays the same ten whatever the wave, the overtime included', () => {
    // spec 06-13: fixed from one wave to the next, and it never indexes.
    for (const wave of [1, 10, 14, 30]) {
      const game = createGame(BALANCE, 12);
      game.snapshot.wave = wave;
      payAssault(game);
      expect(game.snapshot.coins).toBe(10);
    }
  });

  it('opens every preparation on a city with no coins in it', () => {
    // spec 06-15: no coin survives the assault that made it. Here it is run
    // through the whole of the waves rather than asserted on `payAssault`: the
    // fall of the last zombie is what closes an assault, and nothing else.
    // (spec 01-12)
    const game = createGame(BALANCE, 13);
    beginAssault(game);
    while (game.assault.toEnter > 0) stepWaves(game, SECONDS);

    const pool = game.assault.zombies;
    while (pool.count > 0) fellZombie(game, pool.count - 1, true);
    expect(game.assault.coins.count).toBeGreaterThan(0); // they lie where they fell

    stepWaves(game, SECONDS);
    expect(game.assault.phase).toBe(PHASE.PREP);
    expect(game.assault.coins.count).toBe(0);
    // The four shamblers of wave one at two coins each, and the ten. (spec 06-3, 06-13)
    expect(game.snapshot.coins).toBe(4 * 2 + 10);
  });
});

describe('the whole of it, in one step', () => {
  it('runs in the order of the step, after the sword and before the waves', () => {
    // spec 10-25: a zombie felled by the sword in this step has its coin laid
    // down and, if he stands over it, taken in the very same step — which is
    // what "having it straight away" is. (spec 06-12)
    const game = createGame(BALANCE, 14);
    const at = spawnZombie(game, ZOMBIE.SHAMBLER, 0, 40);
    const pool = game.assault.zombies;
    pool.offset[at] = 0;
    stand(game, pool.x[at], 0, pool.z[at]);
    game.assault.player.ang = pool.ang[at];

    const input = createInput();
    input.strike = true;
    stepSword(game, input, SECONDS);
    expect(pool.count).toBe(0);
    expect(game.assault.coins.count).toBe(1);

    stepEconomy(game);
    expect(game.assault.coins.count).toBe(0);
    expect(game.snapshot.coins).toBe(2); // spec 06-3
  });

  it('holds a pool of coins as large as an assault can fell', () => {
    // The derivation of the pool, made red: one coin per zombie felled (06-2),
    // lying until the end of the assault (06-8), the end of an assault paying
    // every one of them (06-14), and no line of the table walking more than the
    // zombie pool in (03-42, 10-43). So sixty, exactly.
    expect(BALANCE.pools.coins).toBe(BALANCE.pools.zombies);
    for (const row of BALANCE.waves) {
      const total = row.shamblers + row.sprinters + row.bruisers + row.colossi;
      expect(total).toBeLessThanOrEqual(BALANCE.pools.coins);
    }

    const game = createGame(BALANCE, 15);
    for (let i = 0; i < BALANCE.pools.coins; i += 1) lay(game, ZOMBIE.SHAMBLER, false, 60 + i, 0);
    expect(game.assault.coins.count).toBe(BALANCE.pools.coins);
    lay(game, ZOMBIE.SHAMBLER, false, 200, 0); // past it, nothing grows (spec 10-14)
    expect(game.assault.coins.count).toBe(BALANCE.pools.coins);
    expect(game.assault.coins.x.length).toBe(BALANCE.pools.coins);
  });
});

// --------------------------------------------------------- the one call to climb

describe('the one moment that says climb', () => {
  it('writes the fact the first time a cannon is payable, and writes it once', () => {
    // spec 08-87: the cannon costs 40, and it is the purse reaching it — never a
    // wave and never a calendar — that sets the ladders beating.
    const game = createGame(BALANCE, 20);
    expect(BALANCE.economy.prices.cannon).toBe(40); // spec 06, 08 "Les quatre vignettes"

    game.snapshot.coins = 39;
    stepEconomy(game);
    expect(counted(game.assault.events, EVENT.LADDERS_LIT)).toBe(0);

    game.snapshot.coins = 40;
    stepEconomy(game);
    expect(counted(game.assault.events, EVENT.LADDERS_LIT)).toBe(1);

    // And never a second time, whatever the purse does afterwards. (spec 08-88)
    game.snapshot.coins = 0;
    stepEconomy(game);
    game.snapshot.coins = 400;
    for (let i = 0; i < 200; i += 1) stepEconomy(game);
    expect(counted(game.assault.events, EVENT.LADDERS_LIT)).toBe(1);
  });

  it('says nothing at all when a cannon already stands', () => {
    // spec 08-87, 08-88: it says "climb", so it has nothing to say to a child
    // who has climbed — a page coming back from an Instantané with one up hears
    // nothing, and the beat ends for good at the first cannon anyway.
    const game = createGame(BALANCE, 21);
    game.snapshot.cannons.count = 1;
    game.snapshot.coins = 400;
    for (let i = 0; i < 60; i += 1) stepEconomy(game);
    expect(counted(game.assault.events, EVENT.LADDERS_LIT)).toBe(0);
  });

  it('falls at the end of the second assault, because that is where the money puts it', () => {
    // spec 08-87: no cannon can go down under 40 coins, so every zombie of the
    // first two waves falls to the sword and pays double. What the table pays is
    // fixed by that, and it crosses 40 at the end of the second assault and not
    // at the end of the first. (spec 06-2, 06-3, 06-13, 03 "La table des vagues")
    const paid = (wave: number): number => {
      const row = BALANCE.waves[wave - 1];
      const bySword = BALANCE.economy.coins.shambler * BALANCE.economy.braveryFactor;
      return row.shamblers * bySword + BALANCE.economy.assaultBonus;
    };
    expect(paid(1)).toBeLessThan(BALANCE.economy.prices.cannon);
    expect(paid(1) + paid(2)).toBeGreaterThanOrEqual(BALANCE.economy.prices.cannon);
  });
});
