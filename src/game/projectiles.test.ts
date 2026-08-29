/**
 * The ball read back against chapter 5. Every figure here is written out by hand
 * from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Five properties are what this file exists to make red when they break:
 *
 *   - **a cannon never misses** — the blow lands on its date wherever the body
 *     has walked to, and the reckoning ahead is what puts the ball there
 *     (spec 05-25);
 *   - **nothing in a flight is ever a test** — no collision, no line of sight: a
 *     body standing between a cannon and its target takes nothing at all, and a
 *     wall between them changes nothing (spec 05-26);
 *   - **no blow is ever thrown away** — a cannon never fires at a body the balls
 *     already gone will fell, and the booking follows that body through every
 *     move of the pool (spec 05-27, 10-13);
 *   - **the aim is one sentence** — the one furthest along its rail within
 *     reach, all three streets together, and never a kind and never a setting
 *     (spec 05-38, 05-39, 05-41);
 *   - **a ball earns the plain coin** — the bravery bonus is what the sword is
 *     paid, and a cannon is the opposite of going in (spec 06-3, 06-4).
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { placeCannon } from './cannons';
import { bookedOn, ballTarget, condemned, stepProjectiles } from './projectiles';
import {
  EVENT,
  type Game,
  NO_TARGET,
  ZOMBIE,
  type ZombieType,
  createGame,
  railX,
  railZ,
} from './state';
import { fellZombie, spawnZombie, stepZombies } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** The flight of a ball, in steps: 0,6 second at 60 Hz. (spec 05-25, 10-21) */
const FLIGHT_STEPS = 36;

/** The cadence, in steps: one ball every 2 seconds at 60 Hz. (spec 05-23, 10-21) */
const CADENCE_STEPS = 120;

function fresh(): Game {
  return createGame(BALANCE, 20260829);
}

/**
 * Walks one in on a rail with no offset at all, so every distance below is the
 * one this file writes and never one the generator drew. (spec 03-7)
 */
function walkIn(game: Game, type: ZombieType, street: number, progress: number): number {
  const at = spawnZombie(game, type, street, progress);
  const pool = game.assault.zombies;
  const rails = game.assault.city.rails;
  pool.offset[at] = 0;
  pool.x[at] = railX(rails, street, progress);
  pool.z[at] = railZ(rails, street, progress);
  pool.xPrev[at] = pool.x[at];
  pool.zPrev[at] = pool.z[at];
  return at;
}

/** A cannon standing at a spot, with its cadence run out so it fires at once. */
function armed(game: Game, x: number, y: number, z: number): number {
  const at = placeCannon(game, x, y, z, 0);
  game.snapshot.cannons.ballLeft[at] = 0;
  return at;
}

/** A cannon `away` blocks along `+x` of that body, at that height. */
function armedFrom(game: Game, zombie: number, away: number, y = 0): number {
  const pool = game.assault.zombies;
  return armed(game, pool.x[zombie] + away, y, pool.z[zombie]);
}

/** Steps the balls alone, so nothing walks and every spot below stays put. */
function fly(game: Game, steps: number): void {
  for (let i = 0; i < steps; i += 1) stepProjectiles(game, SECONDS);
}

/** Steps the walk and the balls, in the order of a step. (spec 10-25) */
function run(game: Game, steps: number): void {
  for (let i = 0; i < steps; i += 1) {
    stepZombies(game, SECONDS);
    stepProjectiles(game, SECONDS);
  }
}

function counted(game: Game, kind: number): number {
  const events = game.assault.events;
  let many = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === kind) many += 1;
  return many;
}

// ------------------------------------------------------------------ the reach

describe('how far a ball carries', () => {
  it('carries twelve blocks from the ground, and no further', () => {
    // spec 05-22: 12 blocks on the ground, measured flat.
    const near = fresh();
    const body = walkIn(near, ZOMBIE.SHAMBLER, 0, 40);
    expect(ballTarget(near, armedFrom(near, body, 12))).toBe(body);

    const far = fresh();
    const other = walkIn(far, ZOMBIE.SHAMBLER, 0, 40);
    expect(ballTarget(far, armedFrom(far, other, 12.5))).toBe(-1);
  });

  it('carries fifteen, sixteen and a half and eighteen from the three roofs', () => {
    // spec 05-22: +0,75 block per block of height — 4, 6 and 8 give 15, 16,5, 18.
    const reaches = [
      { height: 4, carries: 15 },
      { height: 6, carries: 16.5 },
      { height: 8, carries: 18 },
    ];
    for (const roof of reaches) {
      const game = fresh();
      const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
      expect(ballTarget(game, armedFrom(game, body, roof.carries, roof.height))).toBe(body);

      const beyond = fresh();
      const other = walkIn(beyond, ZOMBIE.SHAMBLER, 0, 40);
      expect(ballTarget(beyond, armedFrom(beyond, other, roof.carries + 0.5, roof.height))).toBe(
        -1,
      );
    }
  });

  it('measures it flat, so the height of a roof is never spent on the way', () => {
    // spec 05-22: horizontal distance. From a roof of 8 the reach is 18 flat,
    // which is 19,7 through the air — and the ball carries all the same.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    const cannon = armedFrom(game, body, 18, 8);
    expect(Math.hypot(18, 8)).toBeGreaterThan(18);
    expect(ballTarget(game, cannon)).toBe(body);
  });

  it('has no least range: a body standing on a ground cannon is fired at', () => {
    // spec 05-29: no least range at all.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    expect(ballTarget(game, armedFrom(game, body, 0))).toBe(body);
  });
});

// -------------------------------------------------------------------- the aim

describe('what a cannon fires at', () => {
  it('takes the one furthest along its rail, all three streets together', () => {
    // spec 05-38, 05-39: the furthest along, and the three rails measure the
    // same 92 blocks, so one advance compares with another whatever the street.
    // An advance of 85 stands 11 blocks from the middle of the city, one of 88
    // stands 8: both are within the twelve of a cannon standing there.
    const game = fresh();
    const behind = walkIn(game, ZOMBIE.SHAMBLER, 0, 85);
    const ahead = walkIn(game, ZOMBIE.SHAMBLER, 1, 88);
    const cannon = armed(game, 0, 0, 0);
    expect(ballTarget(game, cannon)).toBe(ahead);
    expect(game.assault.zombies.progress[ahead]).toBeGreaterThan(
      game.assault.zombies.progress[behind],
    );
  });

  it('takes the furthest along even when a nearer one stands at the muzzle', () => {
    // spec 05-38: the furthest along, never the nearest — the one two steps from
    // the town hall is exactly the one that costs.
    const game = fresh();
    const ahead = walkIn(game, ZOMBIE.SHAMBLER, 0, 50);
    const near = walkIn(game, ZOMBIE.SHAMBLER, 0, 42);
    const cannon = armedFrom(game, near, 0);
    expect(ballTarget(game, cannon)).toBe(ahead);
  });

  it('never asks what kind it is', () => {
    // spec 05-41: no aiming by kind — never the bruiser rather than the shambler.
    // The same two spots, with the kinds swapped: the furthest along wins each
    // time, so nothing here reads a kind at all.
    const both: readonly (readonly ZombieType[])[] = [
      [ZOMBIE.BRUISER, ZOMBIE.SHAMBLER],
      [ZOMBIE.SHAMBLER, ZOMBIE.BRUISER],
    ];
    for (const kinds of both) {
      const game = fresh();
      walkIn(game, kinds[0], 0, 85);
      const ahead = walkIn(game, kinds[1], 0, 88);
      expect(ballTarget(game, armed(game, 0, 0, 0))).toBe(ahead);
    }
  });

  it('faces what it fires at, and holds its heading when nothing is within reach', () => {
    // spec 05-38, 05-42: the barrel is the aim, and the aim is never commanded.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    const cannons = game.snapshot.cannons;
    const cannon = armedFrom(game, body, 6);
    fly(game, 1);
    const towards = Math.atan2(
      game.assault.zombies.z[body] - cannons.z[cannon],
      game.assault.zombies.x[body] - cannons.x[cannon],
    );
    // A heading rides in a `Float32Array`, so five figures is the whole of what
    // is ever there to compare. (spec 10-11)
    expect(cannons.ang[cannon]).toBeCloseTo(towards, 5);

    const held = cannons.ang[cannon];
    fellZombie(game, body, true);
    fly(game, 1);
    expect(cannons.ang[cannon]).toBe(held);
  });
});

// ------------------------------------------------------------------- the shot

describe('the shot', () => {
  it('sends one ball every two seconds, and the tier changes nothing', () => {
    // spec 05-23: 1 shot / 2 s, at every tier. Ten seconds hold five shots.
    for (const tier of [1, 2, 3]) {
      const game = fresh();
      const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40); // 25 hp: five balls leave it standing
      const cannon = armedFrom(game, body, 0);
      game.snapshot.cannons.tier[cannon] = tier;
      run(game, 600);
      expect(counted(game, EVENT.CANNONBALL_FIRED)).toBe(5);
    }
  });

  it('lands its blow 0,6 second later, whatever the distance', () => {
    // spec 05-25: a flight of 0,6 s, constant — 36 steps at 60 Hz.
    for (const away of [0.5, 6, 12]) {
      const game = fresh();
      const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40);
      armedFrom(game, body, away);
      const pool = game.assault.zombies;

      fly(game, 1); // the shot goes out on this one
      expect(game.assault.projectiles.count).toBe(1);
      const whole = pool.hp[body];

      fly(game, FLIGHT_STEPS - 1);
      expect(pool.hp[body]).toBe(whole);
      fly(game, 1);
      expect(pool.hp[body]).toBe(whole - 1); // 1 sword hit (spec 05-24)
      expect(game.assault.projectiles.count).toBe(0);
    }
  });

  it('costs one sword hit to one body, and touches nothing else', () => {
    // spec 05-24: one target, one sword hit, and no area of effect at all.
    const game = fresh();
    const struck = walkIn(game, ZOMBIE.COLOSSUS, 0, 50);
    const beside = walkIn(game, ZOMBIE.COLOSSUS, 0, 49.9); // half a block away
    armedFrom(game, struck, 6);
    const pool = game.assault.zombies;
    const whole = pool.hp[beside];

    fly(game, 1 + FLIGHT_STEPS);
    expect(pool.hp[struck]).toBe(24);
    expect(pool.hp[beside]).toBe(whole);
  });

  it('never misses: the blow lands wherever the body has walked to', () => {
    // spec 05-25: the blow lands on its date, and a cannon does not miss. The
    // body is carried right out of the reach of the cannon mid-flight and takes
    // it all the same.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40);
    armedFrom(game, body, 6);
    const pool = game.assault.zombies;

    fly(game, 1);
    pool.x[body] += 60; // further than any reach of this game
    fly(game, FLIGHT_STEPS);
    expect(pool.hp[body]).toBe(24);
  });

  it('goes through whatever stands between: no collision, no line of sight', () => {
    // spec 05-26: no collision test and no line of sight on a ball in flight. A
    // body standing exactly between takes nothing, and the frontage the shot
    // crosses is never so much as looked at.
    const game = fresh();
    const aimed = walkIn(game, ZOMBIE.COLOSSUS, 0, 50);
    const between = walkIn(game, ZOMBIE.COLOSSUS, 0, 44);
    const cannon = armedFrom(game, between, 2);
    expect(ballTarget(game, cannon)).toBe(aimed);

    const pool = game.assault.zombies;
    const whole = pool.hp[between];
    fly(game, 1 + FLIGHT_STEPS);
    expect(pool.hp[aimed]).toBe(24);
    expect(pool.hp[between]).toBe(whole);
  });

  it('comes down where the body is reckoned to be, not where it stood', () => {
    // spec 05-25: it leaves towards the reckoned spot of its target, which is
    // its own advance carried on for the 0,6 second of the flight — 0,9 block
    // for a shambler at 1,5 blocks a second. (spec 03 "Les quatre types")
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    armedFrom(game, body, 6);
    const rails = game.assault.city.rails;

    fly(game, 1);
    const balls = game.assault.projectiles;
    expect(balls.toX[0]).toBeCloseTo(railX(rails, 0, 40 + 0.9), 4);
    expect(balls.toZ[0]).toBeCloseTo(railZ(rails, 0, 40 + 0.9), 4);
    expect(balls.toY[0]).toBe(0);
  });
});

// --------------------------------------------------------------- the booking

describe('what is in the air is booked', () => {
  it('never sends a second ball at a body the first will fell', () => {
    // spec 05-27: the sword hits already in the air are booked. Six cannons and
    // one shambler of 1 hp: one ball goes out, and five cannons hold their fire.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    for (let i = 0; i < 6; i += 1) armedFrom(game, body, i * 0.5 + 1);

    fly(game, 1);
    expect(game.assault.projectiles.count).toBe(1);
    expect(counted(game, EVENT.CANNONBALL_FIRED)).toBe(1);
    expect(condemned(game, body)).toBe(true);
  });

  it('books exactly as many as a body can take, and no more', () => {
    // spec 05-27, 03 "Les quatre types": a bruiser of 5 hp takes five balls, and
    // a sixth cannon standing over it fires at nothing.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.BRUISER, 0, 40);
    for (let i = 0; i < 8; i += 1) armedFrom(game, body, i * 0.5 + 1);

    fly(game, 1);
    expect(game.assault.projectiles.count).toBe(5);
    expect(bookedOn(game, body)).toBe(5);
    expect(game.assault.zombies.hp[body]).toBe(5); // not one of them has landed yet
  });

  it('hands the booking back the instant the blow lands', () => {
    // spec 05-27: what is booked is what is in the air, and nothing else. A
    // colossus of 25 hp is fired at again as soon as a ball comes off it.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40);
    armedFrom(game, body, 1);

    fly(game, 1);
    expect(bookedOn(game, body)).toBe(1);
    fly(game, FLIGHT_STEPS);
    expect(bookedOn(game, body)).toBe(0);
    expect(game.assault.zombies.hp[body]).toBe(24);
  });

  it('follows the body when the pool carries another into its slot', () => {
    // spec 10-13, 05-27: the last of the pool is carried into the slot that
    // comes free, and a booked blow stays booked for the body it was booked for.
    const game = fresh();
    const first = walkIn(game, ZOMBIE.COLOSSUS, 0, 30);
    const aimed = walkIn(game, ZOMBIE.COLOSSUS, 0, 50);
    armedFrom(game, aimed, 1);

    fly(game, 1);
    expect(game.assault.projectiles.target[0]).toBe(aimed);
    fellZombie(game, first, true); // the sword fells the one in the lower slot
    expect(game.assault.projectiles.target[0]).toBe(first); // it was carried down
    expect(game.assault.zombies.progress[first]).toBe(50);

    fly(game, FLIGHT_STEPS);
    expect(game.assault.zombies.hp[first]).toBe(24);
  });
});

// ----------------------------------------------------- when the target falls

describe('when the target falls before the ball is due', () => {
  it('flies on to its date and crashes, and lands no blow', () => {
    // spec 05-28: the ball goes out all the same and crashes on the floor.
    const game = fresh();
    const aimed = walkIn(game, ZOMBIE.SHAMBLER, 0, 50);
    const other = walkIn(game, ZOMBIE.COLOSSUS, 0, 30);
    armedFrom(game, aimed, 1);

    fly(game, 1);
    const balls = game.assault.projectiles;
    expect(balls.target[0]).toBe(aimed);

    fellZombie(game, aimed, true); // the sword takes it first
    expect(balls.target[0]).toBe(NO_TARGET);

    // The last of the pool was carried into the slot that came free, so the
    // colossus now stands where the shambler stood: it must take nothing.
    const left = game.assault.zombies;
    expect(other).toBe(1);
    expect(left.count).toBe(1);
    expect(left.type[0]).toBe(ZOMBIE.COLOSSUS);

    fly(game, FLIGHT_STEPS - 1);
    expect(balls.count).toBe(1); // still in the air, its whole 0,6 second
    fly(game, 1);
    expect(balls.count).toBe(0);
    expect(left.hp[0]).toBe(25);
    expect(left.count).toBe(1);
  });
});

// ---------------------------------------------------------- what a ball earns

describe('what a ball earns', () => {
  it('pays the plain coin, because the bravery bonus is what the sword is paid', () => {
    // spec 06-2, 06-3, 06-4: a shambler pays 1, and 2 only when the sword lands
    // the fatal blow. The fatal blow decides, and nothing else.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.SHAMBLER, 0, 40);
    armedFrom(game, body, 6);

    fly(game, 1 + FLIGHT_STEPS);
    expect(game.assault.zombies.count).toBe(0);
    expect(game.assault.coins.count).toBe(1);
    expect(game.assault.coins.value[0]).toBe(1);
    expect(counted(game, EVENT.FATAL_BLOW)).toBe(1);
  });

  it('says a body took a blow without saying his sword landed it', () => {
    // spec 07-36, 09 "Ce qui déclenche chacun": whatever takes a blow throws a
    // white puff, and the "tchac" is a blow of his sword — there is no sound of
    // a ball landing at all, so a ball landing is a fact of its own.
    const game = fresh();
    const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40);
    armedFrom(game, body, 6);

    fly(game, 1 + FLIGHT_STEPS);
    expect(counted(game, EVENT.CANNONBALL_HIT)).toBe(1);
    expect(counted(game, EVENT.SWORD_HIT)).toBe(0);
  });
});

// -------------------------------------------------------------------- the pool

describe('the pool of balls', () => {
  it('holds the ninety-six of chapter 10, and never more than a handful', () => {
    // spec 10 "Les pools": 96 projectiles, allocated at load — and the cadence
    // of 2 s against a flight of 0,6 s is what keeps that out of reach.
    const game = fresh();
    expect(game.assault.projectiles.left).toHaveLength(96);

    const body = walkIn(game, ZOMBIE.COLOSSUS, 0, 40);
    for (let i = 0; i < 8; i += 1) armedFrom(game, body, i * 0.5 + 1);
    let most = 0;
    for (let i = 0; i < CADENCE_STEPS * 3; i += 1) {
      stepProjectiles(game, SECONDS);
      most = Math.max(most, game.assault.projectiles.count);
    }
    expect(most).toBeLessThanOrEqual(8);
  });
});
