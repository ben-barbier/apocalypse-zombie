/**
 * The cannons read back against chapter 5. Every figure here is written out by
 * hand from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Four properties are what this file exists to make red when they break:
 *
 *   - **there is no gap between putting one down and upgrading one** — one
 *     distance, two consequences, and no reading of the ground where a press
 *     does nothing (spec 05-13);
 *   - **a cannon on the ground never holds a zombie back** by so much as a step
 *     (spec 05-10);
 *   - **nothing mends a cannon but an upgrade**, which puts it back whole
 *     (spec 05-14, 05-47);
 *   - **the pool of twenty-four is a bound and never a rule**: nothing counts
 *     cannons, refuses one, or raises a price because there are many
 *     (spec 05-51, 05-52).
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import {
  askDiamond,
  mayUpgrade,
  nearestCannon,
  placeCannon,
  reachOf,
  stepCannons,
  upgradeCannon,
  upgradePrice,
} from './cannons';
import {
  DIAMOND,
  type EventBuffer,
  EVENT,
  type Game,
  type InputState,
  PHASE,
  ZOMBIE,
  type ZombieType,
  clearEvents,
  createGame,
  createInput,
  inHalo,
} from './state';
import { step } from './step';
import { spawnZombie, stepZombies } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/**
 * Spots the plan of chapter 2 puts exactly where this file needs them, worked
 * out from the constants of the balance and never guessed:
 *   - street one heads along `+x`, its mouth at the apothem of 16 and its far
 *     end at 96 (spec 02-6, 02-12);
 *   - the base sits at 6 on that heading, and the halo carries 16 blocks from
 *     it (spec 02-8, 02-31);
 *   - the aligned edge of street one opens on a bay of four blocks high
 *     (spec 02-19, 02-23).
 */
const ON_SQUARE = { x: 10, y: 0, z: 0 }; // square floor, in the halo
const IN_STREET = { x: 60, y: 0, z: 0 }; // street one, well out of the halo
const LOW_ROOF = { x: 18, y: 4, z: 6 }; // a roof of four at the foot of street one
const FAR_ROOF = { x: 60, y: 6, z: 6 }; // a roof of six, out of the halo
const OFF_RAIL = { x: 0, y: 0, z: 12 }; // square floor, clear of all three rails

/** A game with a purse deep enough that no test below is ever about the money. */
function rich(): Game {
  const game = createGame(BALANCE, 20260829);
  game.snapshot.coins = 10_000;
  return game;
}

/** Stands him at a spot, which is the whole of what the question below reads. */
function stand(game: Game, x: number, y: number, z: number): void {
  game.assault.player.x = x;
  game.assault.player.y = y;
  game.assault.player.z = z;
}

/** One press of the second button, and one only: the entries hand over edges. */
function press(game: Game): void {
  const input: InputState = createInput();
  input.action = true;
  stepCannons(game, input);
}

/** A step with the button at rest. */
function idle(game: Game): void {
  stepCannons(game, createInput());
}

/** How many facts of one type the buffer holds. */
function counted(events: EventBuffer, type: number): number {
  let found = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found += 1;
  return found;
}

/** Puts one cannon down where a test wants it, without going through a press. */
function put(game: Game, spot: { x: number; y: number; z: number }): number {
  return placeCannon(game, spot.x, spot.y, spot.z, 0);
}

/** Walks one in on the rail of street one, dead on the middle of it. */
function walkIn(game: Game, type: ZombieType, progress: number): number {
  const at = spawnZombie(game, type, 0, progress);
  game.assault.zombies.offset[at] = 0; // dead on the rail, so the pass is settled
  return at;
}

describe('where a cannon goes down', () => {
  it('goes down where he stands, on the ground and on a roof alike', () => {
    // spec 05-7: under his feet, on a roof as on the ground.
    const game = rich();
    stand(game, ON_SQUARE.x, ON_SQUARE.y, ON_SQUARE.z);
    press(game);

    const cannons = game.snapshot.cannons;
    expect(cannons.count).toBe(1);
    expect(cannons.x[0]).toBe(ON_SQUARE.x);
    expect(cannons.y[0]).toBe(ON_SQUARE.y);
    expect(cannons.z[0]).toBe(ON_SQUARE.z);

    stand(game, LOW_ROOF.x, LOW_ROOF.y, LOW_ROOF.z);
    press(game);
    expect(cannons.count).toBe(2);
    expect(cannons.y[1]).toBe(LOW_ROOF.y); // spec 02-21, 05-8
  });

  it('opens at the first tier, whole, with an empty magazine', () => {
    // spec 05-2, 05-44, 04-47.
    const game = rich();
    const at = put(game, ON_SQUARE);
    expect(game.snapshot.cannons.tier[at]).toBe(1);
    expect(game.snapshot.cannons.hp[at]).toBe(20);
    expect(game.snapshot.cannons.magazine[at]).toBe(0);
  });

  it('goes down on the floor under his feet, half way up a jump', () => {
    // spec 05-9: no state of the game holds a placing back. He is over the
    // square, two blocks up; the cannon goes on the ground he is over.
    const game = rich();
    stand(game, ON_SQUARE.x, 2, ON_SQUARE.z);
    press(game);
    expect(game.snapshot.cannons.y[0]).toBe(0); // spec 04-8, 04-9
  });

  it('goes down in a preparation and in the thick of an assault alike', () => {
    // spec 05-9.
    for (const phase of [PHASE.PREP, PHASE.ASSAULT]) {
      const game = rich();
      game.assault.phase = phase;
      walkIn(game, ZOMBIE.SHAMBLER, 36); // one of them a step away
      stand(game, IN_STREET.x, IN_STREET.y, IN_STREET.z);
      press(game);
      expect(game.snapshot.cannons.count).toBe(1);
    }
  });

  it('takes no list of allowed spots: every walkable cell it is asked for', () => {
    // spec 05-8, 02-21: the eighty-seven roofs are all of them good, and so is
    // every walkable cell of the ground. A fresh game for each, so what is being
    // read is the answer and never the room left in the pool.
    let asked = 0;
    for (let x = -14; x <= 90; x += 8) {
      for (let z = -10; z <= 10; z += 5) {
        const game = rich();
        const city = game.assault.city;
        const cell = Math.floor(x + city.side / 2) * city.side + Math.floor(z + city.side / 2);
        if (city.walkable[cell] !== 1) continue;
        asked += 1;
        stand(game, x, city.height[cell], z);
        press(game);
        expect(game.snapshot.cannons.count).toBe(1);
        expect(game.snapshot.cannons.y[0]).toBe(city.height[cell]);
      }
    }
    expect(asked).toBeGreaterThan(10);
  });

  it('says so once, and the tier rides in the fact', () => {
    // spec 10-17, 10-19.
    const game = rich();
    clearEvents(game.assault.events);
    stand(game, ON_SQUARE.x, ON_SQUARE.y, ON_SQUARE.z);
    press(game);
    expect(counted(game.assault.events, EVENT.CANNON_PLACED)).toBe(1);
    const at = counted(game.assault.events, EVENT.CANNON_PLACED) - 1;
    expect(game.assault.events.value[at]).toBe(1);
  });
});

describe('the one distance, and the two things it settles', () => {
  it('keeps two cannons three blocks apart, and no less', () => {
    // spec 05-11: under that distance one never gets one more cannon.
    const game = rich();
    put(game, ON_SQUARE);

    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 2.99);
    press(game);
    expect(game.snapshot.cannons.count).toBe(1); // it upgraded instead

    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 3);
    press(game);
    expect(game.snapshot.cannons.count).toBe(2);
  });

  it('leaves no gap at all between putting one down and upgrading one', () => {
    // spec 05-13: the same three blocks serve both rules, so there is no
    // reading of the ground on which a press does nothing.
    const apart = BALANCE.cannon.spacing;
    expect(apart).toBe(3);

    for (let step128 = 0; step128 <= 640; step128 += 1) {
      const away = step128 / 128; // every 1/128 of a block, from 0 to 5
      const game = rich();
      put(game, ON_SQUARE);
      stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + away);
      askDiamond(game);

      const shows = game.assault.diamond.shows;
      // Under the distance it names the cannon; at it and beyond it names none.
      expect(shows === DIAMOND.UPGRADE).toBe(away < apart);
      expect(shows === DIAMOND.PLACE).toBe(away >= apart);
      // And the press changes the world at every one of those distances, which
      // is the whole of "no dead press".
      const before = `${game.snapshot.cannons.count}:${game.snapshot.cannons.tier[0]}`;
      press(game);
      expect(`${game.snapshot.cannons.count}:${game.snapshot.cannons.tier[0]}`).not.toBe(before);
    }
  });

  it('measures that distance through the air, so a street never reaches a roof', () => {
    // spec 05-13, and 04-26: up there nothing of the street reaches us. The
    // lowest roof of the city stands at four blocks. (spec 02-20)
    const game = rich();
    put(game, LOW_ROOF);
    expect(nearestCannon(game, LOW_ROOF.x, 0, LOW_ROOF.z)).toBe(-1);
    expect(nearestCannon(game, LOW_ROOF.x, LOW_ROOF.y, LOW_ROOF.z)).toBe(0);
  });

  it('names the nearer of two, so a press is never ambiguous', () => {
    // spec 05-13.
    const game = rich();
    put(game, ON_SQUARE);
    placeCannon(game, ON_SQUARE.x + 4, 0, ON_SQUARE.z, 0);
    expect(nearestCannon(game, ON_SQUARE.x + 3.5, 0, ON_SQUARE.z)).toBe(1);
    expect(nearestCannon(game, ON_SQUARE.x + 1, 0, ON_SQUARE.z)).toBe(0);
  });
});

describe('the mark under his feet', () => {
  it('is wide and white where a cannon goes down', () => {
    // spec 05-17.
    const game = rich();
    stand(game, IN_STREET.x, IN_STREET.y, IN_STREET.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.PLACE);
    expect(game.assault.diamond.at).toBe(-1);
  });

  it('is tight and white where one moves up a tier', () => {
    // spec 05-13, 05-17.
    const game = rich();
    put(game, ON_SQUARE);
    stand(game, ON_SQUARE.x + 1, 0, ON_SQUARE.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.UPGRADE);
    expect(game.assault.diamond.at).toBe(0);
  });

  it('is black at a third tier, and at a second one out of the halo', () => {
    // spec 05-18.
    const game = rich();
    const inside = put(game, ON_SQUARE);
    upgradeCannon(game, inside);
    upgradeCannon(game, inside);
    expect(game.snapshot.cannons.tier[inside]).toBe(3);
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.NONE);

    const far = rich();
    const beyond = put(far, IN_STREET);
    upgradeCannon(far, beyond);
    stand(far, IN_STREET.x, 0, IN_STREET.z);
    askDiamond(far);
    expect(far.assault.diamond.shows).toBe(DIAMOND.NONE);
  });

  it('is laid on the floor under his feet, never on his feet', () => {
    // spec 05-17, 04-8: half way up a jump the question is still the ground's.
    const game = rich();
    stand(game, ON_SQUARE.x, 1.7, ON_SQUARE.z);
    askDiamond(game);
    expect(game.assault.diamond.y).toBe(0);
    expect(game.assault.diamond.x).toBe(ON_SQUARE.x);
    expect(game.assault.diamond.z).toBe(ON_SQUARE.z);
  });

  it('follows the feet, so it is gone the moment he walks off the spot', () => {
    // spec 05-20: it is not the state of a cannon.
    const game = rich();
    put(game, ON_SQUARE);
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z);
    askDiamond(game);
    expect(game.assault.diamond.at).toBe(0);
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 4);
    askDiamond(game);
    expect(game.assault.diamond.at).toBe(-1);
    expect(game.assault.diamond.z).toBe(ON_SQUARE.z + 4);
  });

  it('never reads the purse: it answers "may I here", never "may I pay"', () => {
    // spec 08-28.
    const game = createGame(BALANCE, 1);
    game.snapshot.coins = 0;
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.PLACE);
    press(game);
    expect(game.snapshot.cannons.count).toBe(0); // one buys what one can pay for
  });
});

describe('the reach the mark draws', () => {
  it('carries twelve blocks on the ground, and 15, 16,5 and 18 off the three roofs', () => {
    // spec 05-22, and the table "La portée selon la hauteur".
    expect(reachOf(BALANCE.cannon, 0)).toBe(12);
    expect(reachOf(BALANCE.cannon, 4)).toBe(15);
    expect(reachOf(BALANCE.cannon, 6)).toBe(16.5);
    expect(reachOf(BALANCE.cannon, 8)).toBe(18);
  });

  it('grows as he climbs, which is the whole of what it teaches', () => {
    // spec 05-19: he climbs, and the circle grows.
    const game = rich();
    stand(game, IN_STREET.x, 0, IN_STREET.z);
    askDiamond(game);
    const below = game.assault.diamond.reach;
    stand(game, FAR_ROOF.x, FAR_ROOF.y, FAR_ROOF.z);
    askDiamond(game);
    expect(game.assault.diamond.reach).toBe(16.5); // a roof of six (spec 02-19)
    expect(game.assault.diamond.reach).toBeGreaterThan(below);
  });
});

describe('the tiers', () => {
  it('runs one, two, three, linear and without a branch', () => {
    // spec 05-2.
    expect(BALANCE.cannon.tiers).toBe(3);
    const game = rich();
    const at = put(game, ON_SQUARE);
    upgradeCannon(game, at);
    expect(game.snapshot.cannons.tier[at]).toBe(2);
    upgradeCannon(game, at);
    expect(game.snapshot.cannons.tier[at]).toBe(3);
    expect(mayUpgrade(game, at)).toBe(false);
  });

  it('costs sixty for the second and a hundred and twenty for the third', () => {
    // spec 06-18.
    const game = rich();
    const at = put(game, ON_SQUARE);
    expect(upgradePrice(game, at)).toBe(60);
    upgradeCannon(game, at);
    expect(upgradePrice(game, at)).toBe(120);

    const purse = rich();
    purse.snapshot.coins = 100;
    put(purse, ON_SQUARE);
    stand(purse, ON_SQUARE.x, 0, ON_SQUARE.z);
    press(purse);
    expect(purse.snapshot.coins).toBe(40); // spec 06-18, 06-21
    press(purse); // the third costs 120, and one buys what one can pay for
    expect(purse.snapshot.cannons.tier[0]).toBe(2);
    expect(purse.snapshot.coins).toBe(40);
  });

  it('costs forty to put one down, and the purse pays it once', () => {
    // spec 06-18, 06-21.
    const game = rich();
    game.snapshot.coins = 40;
    stand(game, IN_STREET.x, 0, IN_STREET.z);
    press(game);
    expect(game.snapshot.coins).toBe(0);
    expect(game.snapshot.cannons.count).toBe(1);
  });

  it('reaches the third tier in the halo alone, and stops at the second beyond it', () => {
    // spec 05-16, 02-33.
    const game = rich();
    expect(inHalo(game.assault.city, ON_SQUARE.x, ON_SQUARE.z)).toBe(true);
    expect(inHalo(game.assault.city, IN_STREET.x, IN_STREET.z)).toBe(false);

    const inside = put(game, ON_SQUARE);
    upgradeCannon(game, inside);
    expect(mayUpgrade(game, inside)).toBe(true);

    const beyond = put(game, IN_STREET);
    upgradeCannon(game, beyond);
    expect(mayUpgrade(game, beyond)).toBe(false);

    stand(game, IN_STREET.x, 0, IN_STREET.z);
    press(game);
    expect(game.snapshot.cannons.tier[beyond]).toBe(2); // for good (spec 05-16)
  });

  it('puts the cannon back whole, which is the one mending there is', () => {
    // spec 05-14, 05-47.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.hp[at] = 5;
    upgradeCannon(game, at);
    expect(game.snapshot.cannons.hp[at]).toBe(20);
    expect(game.snapshot.cannons.tier[at]).toBe(2);
  });

  it('gives nothing away with the tier: a magazine keeps what it held', () => {
    // spec 04-51, 06-22.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.magazine[at] = 1;
    upgradeCannon(game, at);
    expect(game.snapshot.cannons.magazine[at]).toBe(1);
  });
});

describe('wearing out on the ground', () => {
  it('takes twenty shambler blows, at all three tiers', () => {
    // spec 05-44: twenty, in shambler hits, whatever the tier.
    expect(BALANCE.cannon.hp).toBe(20);
    const game = rich();
    for (const tier of [1, 2, 3]) {
      const at = put(game, { x: ON_SQUARE.x + tier * 4, y: 0, z: 0 });
      game.snapshot.cannons.tier[at] = tier;
      expect(game.snapshot.cannons.hp[at]).toBe(20);
    }
  });

  it('takes one blow from a shambler going by, and never holds it up', () => {
    // spec 05-45, 05-10, 03-15: one blow at a block and a half, and not a step
    // of the walk is lost to it.
    const game = rich();
    put(game, IN_STREET); // on the rail of street one, at progress 36
    const at = walkIn(game, ZOMBIE.SHAMBLER, 30);

    const pace = BALANCE.shambler.speed;
    let was = 30;
    for (let n = 1; n <= 400; n += 1) {
      stepZombies(game, SECONDS);
      // Every single step carries the advance by exactly one stride — not one of
      // them is shortened, halted or given back. A cannon is never a barricade.
      // (spec 05-10, 03-8, 03-15)
      const now = game.assault.zombies.progress[at];
      expect(now - was).toBeCloseTo(pace * SECONDS, 4);
      was = now;
    }
    expect(was).toBeCloseTo(30 + pace * 400 * SECONDS, 3);
    expect(game.snapshot.cannons.hp[0]).toBe(19); // one blow, and one only
  });

  it('is worth the column of whoever lands it', () => {
    // spec 05-45 and the table: 1 / 1 / 3 / 10.
    const owed: [ZombieType, number][] = [
      [ZOMBIE.SHAMBLER, 1],
      [ZOMBIE.SPRINTER, 1],
      [ZOMBIE.BRUISER, 3],
      [ZOMBIE.COLOSSUS, 10],
    ];
    for (const [kind, takes] of owed) {
      const game = rich();
      put(game, IN_STREET);
      walkIn(game, kind, 34);
      for (let n = 0; n < 400; n += 1) stepZombies(game, SECONDS);
      expect(game.snapshot.cannons.hp[0]).toBe(20 - takes);
    }
  });

  it('never loses one on a roof, whatever walks the street below it', () => {
    // spec 05-46: a roof is out of reach, and it is out of reach for good.
    const game = rich();
    placeCannon(game, IN_STREET.x, 6, 0, 0); // right over the rail, six blocks up
    walkIn(game, ZOMBIE.SHAMBLER, 30);
    for (let n = 0; n < 600; n += 1) stepZombies(game, SECONDS);
    expect(game.snapshot.cannons.hp[0]).toBe(20);
  });

  it('is gone at nought, and the spot is free again that same step', () => {
    // spec 05-50.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.magazine[at] = 3;
    game.snapshot.cannons.hp[at] = 0;
    clearEvents(game.assault.events);
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z);
    idle(game);

    expect(game.snapshot.cannons.count).toBe(0);
    expect(counted(game.assault.events, EVENT.CANNON_LOST)).toBe(1);
    // Its magazine went with it, nothing was left to gather, and the very same
    // step the mark says a cannon goes down here again.
    expect(game.assault.diamond.shows).toBe(DIAMOND.PLACE);
  });

  it('lets go of the right one when several stand', () => {
    // spec 10-13: the last of the pool is carried into the slot that comes free.
    const game = rich();
    put(game, { x: 0, y: 0, z: 10 });
    put(game, { x: 0, y: 0, z: 14 });
    put(game, { x: 0, y: 0, z: -10 });
    game.snapshot.cannons.hp[1] = 0;
    idle(game);
    expect(game.snapshot.cannons.count).toBe(2);
    expect([...game.snapshot.cannons.z.slice(0, 2)].sort((a, b) => a - b)).toEqual([-10, 10]);
  });

  it('is never mended by anything at all, however long one waits', () => {
    // spec 05-47: no mending, free or paid; the one remaking is an upgrade.
    const game = rich();
    const at = put(game, OFF_RAIL); // clear of the rails, so nothing walks past it
    game.snapshot.cannons.hp[at] = 7;
    stand(game, IN_STREET.x, 0, IN_STREET.z); // away from it, so no press reaches it
    const input = createInput();
    for (let n = 0; n < 2_000; n += 1) step(game, input);
    expect(game.snapshot.cannons.hp[0]).toBe(7);
  });
});

describe('the pool of twenty-four', () => {
  it('is a technical bound, and there is nothing in the code that defends it', () => {
    // spec 05-51, 05-52: no ceiling, no reserved spot, no counter anywhere.
    expect(BALANCE.pools.cannons).toBe(24);
    const game = rich();
    for (let n = 0; n < 24; n += 1) {
      expect(placeCannon(game, n * 4, 0, 40, 0)).toBe(n);
    }
    expect(game.snapshot.cannons.count).toBe(24);
    // Past it a slot is simply not handed over, exactly as for a zombie walking
    // in — and no coin is taken for what did not go down. (spec 10-13, 10-14)
    expect(placeCannon(game, 200, 0, 40, 0)).toBe(-1);
    expect(game.snapshot.cannons.count).toBe(24);

    const purse = game.snapshot.coins;
    stand(game, 200, 0, 40);
    press(game);
    expect(game.snapshot.coins).toBe(purse);
  });

  it('never raises a price because many stand', () => {
    // spec 06-19, 06-24: one price, and one only.
    const game = rich();
    const first = game.snapshot.coins;
    stand(game, 0, 0, 40);
    press(game);
    const paid = first - game.snapshot.coins;
    for (let n = 1; n < 10; n += 1) {
      const before = game.snapshot.coins;
      stand(game, n * 4, 0, 40);
      press(game);
      expect(before - game.snapshot.coins).toBe(paid);
    }
    expect(paid).toBe(40);
  });
});

describe('what a cannon never does', () => {
  it('puts nothing into the grid the city walks on', () => {
    // spec 05-10, 03-16: a cannon is never a barricade, so it is never terrain.
    const game = rich();
    const city = game.assault.city;
    const height = Uint8Array.from(city.height);
    const walkable = Uint8Array.from(city.walkable);

    for (let n = 0; n < 20; n += 1) placeCannon(game, n * 4 - 10, 0, 0, 0);

    expect(city.height).toEqual(height);
    expect(city.walkable).toEqual(walkable);
  });

  it('is never sold, never moved and never taken down', () => {
    // spec 05-12, 06-22: the second button has one sense at a spot, and at the
    // spot of a cannon that sense is never anything but the next tier.
    const game = rich();
    const at = put(game, ON_SQUARE);
    const wasX = game.snapshot.cannons.x[at];
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z);
    const purse = game.snapshot.coins;
    for (let n = 0; n < 5; n += 1) press(game);
    // Five presses on the spot buy two tiers and nothing else: no refund, no
    // move, and the third press onwards finds a black mark. (spec 05-18, 06-22)
    expect(game.snapshot.cannons.count).toBe(1);
    expect(game.snapshot.cannons.x[at]).toBe(wasX);
    expect(game.snapshot.cannons.tier[at]).toBe(3);
    expect(purse - game.snapshot.coins).toBe(180);
  });
});
