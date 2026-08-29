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
  FLAME_TIER,
  askDiamond,
  flameTarget,
  mayPour,
  mayUpgrade,
  nearestCannon,
  placeCannon,
  reachOf,
  stepCannons,
  upgradeCannon,
  upgradePrice,
} from './cannons';
import { ballTarget } from './projectiles';
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

/**
 * Pressed against the shed, which reaches from the face of the town hall at four
 * out to eight along street one and six blocks across it: half a block off its
 * near face is at the contact of it, and nothing else in the city is.
 * (spec 02-8, 04-45)
 */
const AT_SHED = { x: 8.4, y: 0, z: 0 };

/** Deep in the halo, and further out in it: fourteen blocks from the base. (spec 02-31) */
const FAR_IN_HALO = { x: 20, y: 0, z: 0 };

/** Where a body stands on the rail of street one at a given `x`. (spec 02-12, 03-6) */
const progressAt = (x: number): number => 96 - x;

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
  stepCannons(game, input, SECONDS);
}

/** A step with the button at rest. */
function idle(game: Game): void {
  stepCannons(game, createInput(), SECONDS);
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

// ---------------------------------------------------------------- the resupply

/** Runs the cones and the belts for so many seconds, with the button at rest. */
function run(game: Game, seconds: number): void {
  const steps = Math.round(seconds * 60); // spec 10-21
  for (let n = 0; n < steps; n += 1) idle(game);
}

/**
 * Stands one body on the rail of street one at an `x`, dead on the middle of it:
 * the offset a body walks in with is drawn, and every reach measured below is
 * measured from a known spot. (spec 03-7)
 */
function bodyAt(game: Game, x: number, hp = 1): number {
  const at = walkIn(game, ZOMBIE.SHAMBLER, progressAt(x));
  const pool = game.assault.zombies;
  pool.offset[at] = 0;
  pool.x[at] = x;
  pool.z[at] = 0;
  pool.xPrev[at] = x;
  pool.zPrev[at] = 0;
  pool.hp[at] = hp;
  return at;
}

describe('taking firebombs', () => {
  it('takes them at the shed and nowhere else in the city', () => {
    // spec 04-45: at the base, at the contact of the shed, and there alone.
    const game = rich();
    stand(game, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.TAKE);

    // Two blocks off the same face, a press puts a cannon down instead.
    const away = rich();
    stand(away, ON_SQUARE.x, ON_SQUARE.y, ON_SQUARE.z);
    askDiamond(away);
    expect(away.assault.diamond.shows).toBe(DIAMOND.PLACE);
    press(away);
    expect(away.snapshot.armful).toBe(0);
    expect(away.snapshot.cannons.count).toBe(1);
  });

  it('takes the whole of what he can carry, paid for on the spot', () => {
    // spec 04-46, 04-47: as many as he can carry, paid for automatically —
    // nothing dosed, nothing chosen from a list. Three at one coin. (spec 06-18)
    const game = rich();
    game.snapshot.coins = 100;
    stand(game, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    press(game);

    expect(game.snapshot.armful).toBe(3);
    expect(game.snapshot.coins).toBe(97);
    expect(counted(game.assault.events, EVENT.ARMFUL_TAKEN)).toBe(1);
  });

  it('takes what he can pay for when the money is short', () => {
    // spec 04-46: if the money is short, he takes what he can pay for.
    const game = rich();
    game.snapshot.coins = 2;
    stand(game, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    press(game);
    expect(game.snapshot.armful).toBe(2);
    expect(game.snapshot.coins).toBe(0);

    // And with nothing in the purse, nothing is taken and nothing is owed: the
    // mark answers "may I here?", the badge answers "may I pay?". (spec 06-21, 08-28)
    const broke = rich();
    broke.snapshot.coins = 0;
    stand(broke, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    press(broke);
    expect(broke.snapshot.armful).toBe(0);
    expect(broke.snapshot.coins).toBe(0);
  });

  it('never runs out, however many journeys are made', () => {
    // spec 04-45: what the shed holds never runs out.
    const game = rich();
    stand(game, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    for (let n = 0; n < 50; n += 1) {
      game.snapshot.armful = 0;
      press(game);
      expect(game.snapshot.armful).toBe(3);
    }
  });

  it('leaves the question to the rest once his arms are full', () => {
    // spec 04-60, and the ban on a press that does nothing where something is
    // possible: full arms are not a dead press, they are another question.
    const game = rich();
    game.snapshot.armful = 3;
    stand(game, AT_SHED.x, AT_SHED.y, AT_SHED.z);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.PLACE);
  });

  it('never lets a carried bomb fall, whatever walks into him', () => {
    // spec 04-48: a carried bomb never falls. The one loss of firebombs in the
    // whole game is a collapse, and it is chapter 4's. (spec 04-43)
    const game = rich();
    game.snapshot.armful = 3;
    stand(game, IN_STREET.x, 0, IN_STREET.z);
    bodyAt(game, IN_STREET.x);
    for (let n = 0; n < 60; n += 1) stepZombies(game, SECONDS);
    expect(game.snapshot.playerHp).toBeLessThan(BALANCE.player.hp); // he was walked into
    expect(game.snapshot.armful).toBe(3);
  });
});

describe('pouring an armful', () => {
  it('pours the whole armful at once, within the free cells', () => {
    // spec 04-49: all at once, within the free cells, and what does not fit
    // stays in his arms.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.tier[at] = 2;
    game.snapshot.cannons.magazine[at] = 1;
    game.snapshot.armful = 3;
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 1);
    press(game);

    expect(game.snapshot.cannons.magazine[at]).toBe(3);
    expect(game.snapshot.armful).toBe(1);
    expect(counted(game.assault.events, EVENT.ARMFUL_POURED)).toBe(1);
  });

  it('pours within the same three blocks that place and upgrade', () => {
    // spec 04-49, 05-13: one distance, and no gap anywhere in it.
    expect(BALANCE.cannon.pourRange).toBe(BALANCE.cannon.spacing);
    const game = rich();
    put(game, ON_SQUARE);
    game.snapshot.armful = 3;

    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 2.99);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.POUR);

    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 3);
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.PLACE);
  });

  it('pours before it upgrades, and upgrades the moment there is nothing to pour', () => {
    // spec 04-50, 05-15: the second button pours as long as he carries at least
    // one and the magazine is not full, and upgrades otherwise.
    const carrying = rich();
    const one = put(carrying, ON_SQUARE);
    carrying.snapshot.armful = 1;
    stand(carrying, ON_SQUARE.x, 0, ON_SQUARE.z + 1);
    press(carrying);
    expect(carrying.snapshot.cannons.tier[one]).toBe(1); // it poured
    expect(carrying.snapshot.cannons.magazine[one]).toBe(1);

    // Empty arms: it upgrades.
    const empty = rich();
    const two = put(empty, ON_SQUARE);
    stand(empty, ON_SQUARE.x, 0, ON_SQUARE.z + 1);
    press(empty);
    expect(empty.snapshot.cannons.tier[two]).toBe(2);

    // A full magazine: it upgrades as well, which is what keeps the press from
    // ever being spent on nothing.
    const full = rich();
    const three = put(full, ON_SQUARE);
    full.snapshot.cannons.magazine[three] = BALANCE.cannon.magazine;
    full.snapshot.armful = 3;
    stand(full, ON_SQUARE.x, 0, ON_SQUARE.z + 1);
    press(full);
    expect(full.snapshot.cannons.tier[three]).toBe(2);
    expect(full.snapshot.armful).toBe(3);
  });

  it('never takes one back out of a cannon, by any gesture at all', () => {
    // spec 04-51: what has gone into a cannon stays there.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.tier[at] = 3;
    game.snapshot.cannons.magazine[at] = 3;
    stand(game, ON_SQUARE.x, 0, ON_SQUARE.z + 1);
    for (let n = 0; n < 200; n += 1) press(game);
    expect(game.snapshot.armful).toBe(0);
    expect(game.snapshot.cannons.magazine[at]).toBe(3);
  });

  it('pours where the mark would otherwise be black, and says so before the press', () => {
    // The one place two gestures meet: 05-18 makes the mark black in front of a
    // second-tier cannon beyond the halo, and 05-15 makes the button pour there.
    // The order settles it — the pouring is asked first, so black is what the
    // mark says once there is nothing to pour. (spec 04-50, 05-15, 05-18)
    const game = rich();
    const at = put(game, IN_STREET);
    game.snapshot.cannons.tier[at] = 2;
    expect(inHalo(game.assault.city, IN_STREET.x, IN_STREET.z)).toBe(false);
    expect(mayUpgrade(game, at)).toBe(false);
    stand(game, IN_STREET.x, 0, IN_STREET.z + 1);

    // Empty arms: black, and a press changes nothing. (spec 05-18)
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.NONE);

    // An armful: the mark says something happens here, and the press pours.
    game.snapshot.armful = 3;
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.POUR);
    expect(mayPour(game, at)).toBe(true);
    press(game);
    expect(game.snapshot.cannons.magazine[at]).toBe(3);

    // And with the magazine full, black again: there is nothing left to do here.
    askDiamond(game);
    expect(game.assault.diamond.shows).toBe(DIAMOND.NONE);
  });
});

describe('the jet of flame', () => {
  /** A second-tier cannon on the rail of street one, with a full magazine. */
  function armed(fed = true): { game: Game; at: number } {
    const game = rich();
    const at = put(game, IN_STREET);
    game.snapshot.cannons.tier[at] = FLAME_TIER;
    game.snapshot.cannons.magazine[at] = fed ? BALANCE.cannon.magazine : 0;
    return { game, at };
  }

  it('bears no cone at all at the first tier', () => {
    // spec 05-3: one arm at the first tier, two from the second.
    expect(FLAME_TIER).toBe(2);
    const game = rich();
    const at = put(game, IN_STREET);
    const zombie = bodyAt(game, IN_STREET.x - 2);
    const hp = game.assault.zombies.hp[zombie];
    run(game, 2);
    expect(game.snapshot.cannons.flameLit[at]).toBe(0);
    expect(game.assault.zombies.hp[zombie]).toBe(hp);
  });

  it('burns out to six blocks and no further', () => {
    // spec 05-30: a cone of 60° over 6 blocks.
    expect(BALANCE.cannon.flame.range).toBe(6);
    for (const [away, burnt] of [
      [5, true],
      [7, false],
    ] as [number, boolean][]) {
      const { game, at } = armed();
      const zombie = bodyAt(game, IN_STREET.x - away, 100);
      run(game, 1);
      expect(game.snapshot.cannons.flameLit[at]).toBe(burnt ? 1 : 0);
      expect(game.assault.zombies.hp[zombie] < 100).toBe(burnt);
    }
  });

  it('measures that reach in real distance, never made longer by the roof', () => {
    // spec 05-31, and the table of what the jet reaches from a roof: from a roof
    // of four it leaves four blocks and a half at street height, and from a roof
    // of six exactly nothing. (spec 02-20, 05 "Ce que le jet atteint depuis un toit")
    const reaches = (roof: number, away: number): boolean => {
      const game = rich();
      const at = placeCannon(game, IN_STREET.x, roof, 0, 0);
      game.snapshot.cannons.tier[at] = FLAME_TIER;
      game.snapshot.cannons.magazine[at] = BALANCE.cannon.magazine;
      bodyAt(game, IN_STREET.x - away, 100);
      run(game, 1);
      return game.snapshot.cannons.flameLit[at] === 1;
    };
    expect(reaches(0, 5.9)).toBe(true);
    expect(reaches(4, 4)).toBe(true); // √(16 + 16) = 5,66
    expect(reaches(4, 5)).toBe(false); // √(16 + 25) = 6,4
    expect(reaches(6, 0.5)).toBe(false); // the ground is exactly at the limit
    expect(reaches(8, 0.5)).toBe(false); // and past it, out of reach for good
  });

  it('burns everything in the cone at once, with no ceiling on the number', () => {
    // spec 05-32: continuous, and no maximum number of targets.
    const { game } = armed();
    const bodies: number[] = [];
    for (let x = 55; x < 60; x += 1) bodies.push(bodyAt(game, x, 100));

    run(game, 1);
    for (const zombie of bodies) {
      expect(game.assault.zombies.hp[zombie]).toBeCloseTo(98, 2); // spec 05-34
    }
  });

  it('never lights over an empty cone, and eats nothing while it burns nobody', () => {
    // spec 05-33: it lights only over a zombie, and it eats nothing to burn
    // nobody — which is what makes a lit flame a signal of presence.
    const { game, at } = armed();
    run(game, 60);
    expect(game.snapshot.cannons.flameLit[at]).toBe(0);
    expect(game.snapshot.cannons.magazine[at]).toBe(BALANCE.cannon.magazine);
    expect(game.snapshot.cannons.burnLeft[at]).toBe(0);
    expect(counted(game.assault.events, EVENT.FLAME_LIT)).toBe(0);

    // A body walks in: it lights, once, and it says so once.
    clearEvents(game.assault.events);
    bodyAt(game, IN_STREET.x - 3, 100);
    run(game, 1);
    expect(game.snapshot.cannons.flameLit[at]).toBe(1);
    expect(counted(game.assault.events, EVENT.FLAME_LIT)).toBe(1);
  });

  it('lands two sword hits a second fed, half of one dry, and never nought', () => {
    // spec 05-34: fed 2, dry 0,5 — and it never goes out.
    for (const [fed, owed] of [
      [true, 2],
      [false, 0.5],
    ] as [boolean, number][]) {
      const { game, at } = armed(fed);
      const zombie = bodyAt(game, IN_STREET.x - 3, 100);
      run(game, 1);
      expect(game.assault.zombies.hp[zombie]).toBeCloseTo(100 - owed, 2);
      expect(game.snapshot.cannons.flameLit[at]).toBe(1); // dry, it still burns
    }
  });

  it('never goes out for want of a firebomb, however long it runs dry', () => {
    // spec 05-34, 05-37: dry it weakens, it does not go out — and there is no
    // sputter and no signal of breakdown anywhere.
    const { game, at } = armed(false);
    const zombie = bodyAt(game, IN_STREET.x - 3, 10_000);
    clearEvents(game.assault.events);
    run(game, 120);
    expect(game.snapshot.cannons.flameLit[at]).toBe(1);
    expect(game.assault.zombies.hp[zombie]).toBeLessThan(10_000);
    // One lighting, and not one other fact: nothing announces a dry cannon.
    expect(counted(game.assault.events, EVENT.FLAME_LIT)).toBe(1);
    expect(counted(game.assault.events, EVENT.FLAME_OUT)).toBe(0);
  });

  it('burns one firebomb every six seconds of fed jet, and eighteen holds three', () => {
    // spec 05-35: one firebomb per six seconds of fed jet; a magazine of three
    // is eighteen seconds. (spec 04 "Le ravitaillement")
    const { game, at } = armed();
    bodyAt(game, IN_STREET.x - 3, 10_000);

    run(game, 5.9);
    expect(game.snapshot.cannons.magazine[at]).toBe(2);
    run(game, 0.2);
    expect(game.snapshot.cannons.magazine[at]).toBe(1);
    run(game, 6);
    expect(game.snapshot.cannons.magazine[at]).toBe(0);
    run(game, 6);
    expect(game.snapshot.cannons.burnLeft[at]).toBeLessThanOrEqual(0); // eighteen seconds
  });

  it('goes out when the cone empties, and says so once', () => {
    // spec 05-33: the cone lights over a body and goes out when none is left.
    const { game, at } = armed();
    bodyAt(game, IN_STREET.x - 3, 100);
    run(game, 1);
    expect(game.snapshot.cannons.flameLit[at]).toBe(1);

    clearEvents(game.assault.events);
    game.assault.zombies.count = 0; // the street empties
    run(game, 1);
    expect(game.snapshot.cannons.flameLit[at]).toBe(0);
    expect(counted(game.assault.events, EVENT.FLAME_OUT)).toBe(1);
  });

  it('takes the one furthest along its rail, and aims apart from the ball', () => {
    // spec 05-38, 05-40: the same one sentence for both arms, and the two aim
    // independently — the ball far off while the cone burns at its foot.
    const { game, at } = armed();
    const near = bodyAt(game, IN_STREET.x - 3); // three blocks: in the cone
    const far = bodyAt(game, IN_STREET.x - 10); // ten: out of it, in the ball's reach
    expect(game.assault.zombies.progress[far]).toBeGreaterThan(
      game.assault.zombies.progress[near],
    );
    expect(flameTarget(game, at)).toBe(near);
    expect(ballTarget(game, at)).toBe(far);
  });

  it('burns nobody but a zombie: not him, not the town hall, not a cannon', () => {
    // spec 04-27, 05-43: there is no friendly fire in this game, in either
    // direction — nothing but the pool of zombies is ever looked at.
    const { game, at } = armed();
    bodyAt(game, IN_STREET.x - 3, 10_000);
    stand(game, IN_STREET.x - 2, 0, IN_STREET.z); // standing in the cone
    const hall = game.snapshot.townHall.hp;
    run(game, 5);

    expect(game.snapshot.cannons.flameLit[at]).toBe(1);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp);
    expect(game.snapshot.townHall.hp).toBe(hall);
    expect(game.snapshot.cannons.hp[at]).toBe(BALANCE.cannon.hp);
  });

  it('pays a fatal blow of the flame as a cannon and never as the sword', () => {
    // spec 06-2 to 06-4: the bravery bonus is paid for going in with the sword,
    // and standing in a cone is the opposite of going in. A shambler pays one.
    const { game, at } = armed();
    bodyAt(game, IN_STREET.x - 3);
    run(game, 1);
    expect(game.assault.zombies.count).toBe(0);
    expect(counted(game.assault.events, EVENT.FATAL_BLOW)).toBe(1);
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.value[0]).toBe(BALANCE.economy.coins.shambler);
    expect(game.snapshot.cannons.flameLit[at]).toBe(0); // the cone empties with it
  });
});

describe('the conveyor', () => {
  /** A third-tier cannon at a spot of the halo, whose belt is therefore up. */
  function served(game: Game, spot: { x: number; y: number; z: number }): number {
    const at = put(game, spot);
    game.snapshot.cannons.tier[at] = 2;
    upgradeCannon(game, at);
    return at;
  }

  it('serves no cannon under the third tier', () => {
    // spec 05-4, 04-52: the third tier is the second one fed by itself.
    const game = rich();
    const at = put(game, ON_SQUARE);
    game.snapshot.cannons.tier[at] = 2;
    run(game, 60);
    expect(game.snapshot.cannons.magazine[at]).toBe(0);
  });

  it('appears whole at the purchase, and brings one every six seconds for nothing', () => {
    // spec 04-53, 04-54, 04-55: it appears at once, its debit is one firebomb
    // every six seconds, and the deliveries are free for good.
    const game = rich();
    const at = served(game, ON_SQUARE);
    const purse = game.snapshot.coins;
    expect(game.snapshot.cannons.conveyorLeft[at]).toBe(BALANCE.cannon.conveyorPeriod);

    run(game, 5.9);
    expect(game.snapshot.cannons.magazine[at]).toBe(0);
    run(game, 0.2);
    expect(game.snapshot.cannons.magazine[at]).toBe(1);
    run(game, 6);
    expect(game.snapshot.cannons.magazine[at]).toBe(2);
    expect(game.snapshot.coins).toBe(purse); // nothing was ever paid
  });

  it('takes the same six seconds however far from the base it stands', () => {
    // spec 04-53: nothing is traced and nothing travels — a belt is a countdown
    // and a straight line, so the distance from the base changes nothing at all.
    const near = rich();
    const one = served(near, ON_SQUARE); // four blocks from the base
    const far = rich();
    const two = served(far, FAR_IN_HALO); // fourteen (spec 02-31)
    expect(inHalo(far.assault.city, FAR_IN_HALO.x, FAR_IN_HALO.z)).toBe(true);

    run(near, 6.1);
    run(far, 6.1);
    expect(near.snapshot.cannons.magazine[one]).toBe(1);
    expect(far.snapshot.cannons.magazine[two]).toBe(1);
  });

  it('asks the entries for nothing whatever', () => {
    // spec 04-53: it is never steered. Every button held down or none at all,
    // the deliveries are the same.
    const steered = rich();
    const one = served(steered, ON_SQUARE);
    const alone = rich();
    const two = served(alone, ON_SQUARE);

    const held = createInput();
    held.strike = true;
    held.jump = true;
    held.airlock = true;
    held.dx = 1;
    for (let n = 0; n < 400; n += 1) stepCannons(steered, held, SECONDS);
    run(alone, 400 / 60);
    expect(steered.snapshot.cannons.magazine[one]).toBe(
      alone.snapshot.cannons.magazine[two],
    );
  });

  it('never overflows, and never lets its cannon run dry', () => {
    // spec 04-54: its debit is exactly what a fed jet burns.
    expect(BALANCE.cannon.conveyorPeriod).toBe(BALANCE.cannon.flame.perFirebomb);
    const game = rich();
    const at = served(game, ON_SQUARE);
    game.snapshot.cannons.magazine[at] = BALANCE.cannon.magazine;
    run(game, 30);
    expect(game.snapshot.cannons.magazine[at]).toBe(BALANCE.cannon.magazine); // never over

    // Burning without a let-up, it never comes down to nothing.
    bodyAt(game, ON_SQUARE.x + 2, 1_000_000);
    for (let n = 0; n < 60 * 120; n += 1) {
      idle(game);
      expect(game.snapshot.cannons.magazine[at]).toBeGreaterThan(0);
    }
  });

  it('is indestructible: nothing at all takes anything from a belt', () => {
    // spec 04-55: it cannot be destroyed. It carries no hp anywhere, so the
    // wear of the cannon it serves never touches it — it goes on delivering
    // right down to the last shambler hit. (spec 05-44)
    const game = rich();
    const at = served(game, ON_SQUARE);
    game.snapshot.cannons.hp[at] = 1; // one blow from gone
    run(game, 6.1);
    expect(game.snapshot.cannons.magazine[at]).toBe(1);
    expect(game.snapshot.cannons.hp[at]).toBe(1);
  });

  it('says its cone is out when the cannon that bore it goes', () => {
    // spec 05-33, 09-13: a lit cone holds a voice until it is told to stop, so
    // a cannon that is gone says so on the way out.
    const game = rich();
    const at = put(game, IN_STREET);
    game.snapshot.cannons.tier[at] = FLAME_TIER;
    bodyAt(game, IN_STREET.x - 3, 10_000);
    run(game, 0.5);
    expect(game.snapshot.cannons.flameLit[at]).toBe(1);

    clearEvents(game.assault.events);
    game.snapshot.cannons.hp[at] = 0;
    idle(game);
    expect(counted(game.assault.events, EVENT.FLAME_OUT)).toBe(1);
  });

  it('goes with the cannon it served, and never on its own account', () => {
    // spec 04-55, 05-50: it is indestructible, and it pulls back to the base in
    // one second when the cannon it served is gone. The fact carries the tier,
    // which is what tells the drawing there was a belt to pull back.
    expect(BALANCE.cannon.conveyorRetract).toBe(1);
    const game = rich();
    const at = served(game, ON_SQUARE);
    clearEvents(game.assault.events);
    game.snapshot.cannons.hp[at] = 0;
    idle(game);

    expect(game.snapshot.cannons.count).toBe(0);
    const events = game.assault.events;
    let told = false;
    for (let i = 0; i < events.count; i += 1) {
      if (events.type[i] !== EVENT.CANNON_LOST) continue;
      expect(events.value[i]).toBe(BALANCE.cannon.tiers);
      told = true;
    }
    expect(told).toBe(true);
  });
});
