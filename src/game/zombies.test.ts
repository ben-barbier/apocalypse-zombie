/**
 * The assailants read back against chapter 3. Every number here is written out
 * by hand from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Nothing walks a zombie in on its own yet — the table of the waves is its own
 * chapter — so every one of them is put on its rail by hand, which is also the
 * shortest way to say what a position is: a street, an advance, an offset.
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import {
  EVENT,
  type EventBuffer,
  type Game,
  ZOMBIE,
  type ZombieType,
  createGame,
  railX,
  railZ,
} from './state';
import { atTownHall, balanceOf, massZombie, spawnZombie, speedOf, stepZombies } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** From the entrance of a street to the face of the town hall. (spec 02-13, 03-6) */
const RAIL = 92;

/**
 * Puts one on a rail at an advance and an offset of its own. Its spot is worked
 * out again at the head of every step, so writing the offset here is enough.
 */
function put(
  game: Game,
  type: ZombieType,
  street: number,
  progress: number,
  offset: number,
): number {
  const at = spawnZombie(game, type, street, progress);
  game.assault.zombies.offset[at] = offset;
  return at;
}

function walk(game: Game, steps: number): void {
  for (let i = 0; i < steps; i += 1) stepZombies(game, SECONDS);
}

/** How many facts of one type the buffer holds. */
function counted(events: EventBuffer, type: number): number {
  let found = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found += 1;
  return found;
}

/** Puts a cannon down where a rail passes, at a height. (spec 05-7) */
function putCannon(game: Game, street: number, along: number, across: number, y: number): void {
  const cannons = game.snapshot.cannons;
  const rails = game.assault.city.rails;
  const at = cannons.count;
  cannons.x[at] = railX(rails, street, along);
  cannons.z[at] = railZ(rails, street, along) + across;
  cannons.y[at] = y;
  cannons.hp[at] = BALANCE.cannon.hp;
  cannons.tier[at] = 1;
  cannons.count = at + 1;
}

describe('the four kinds', () => {
  it('holds four and no fifth, told apart by four numbers and never by a shape', () => {
    // spec 03-1, 03-2: four kinds, told apart by colour, scale, pace and
    // behaviour — and the shape is the same fourteen boxes for all of them.
    expect(Object.keys(ZOMBIE)).toHaveLength(4);
    const table = [
      [ZOMBIE.SHAMBLER, 1.5, 1, 1, 1],
      [ZOMBIE.SPRINTER, 4, 1, 1, 0.8],
      [ZOMBIE.BRUISER, 1, 5, 3, 1.4],
      [ZOMBIE.COLOSSUS, 0.8, 25, 10, 2.2],
    ];
    for (const [type, speed, hp, shamblerHits, scale] of table) {
      const kind = balanceOf(BALANCE, type as ZombieType);
      expect(kind.speed).toBe(speed);
      expect(kind.hp).toBe(hp);
      expect(kind.shamblerHits).toBe(shamblerHits);
      expect(kind.scale).toBe(scale);
    }
  });

  it('counts hp in sword hits, blows in shambler hits and touches in contacts', () => {
    // spec 03-3: three kinds of harm, three numbers, and never one that would
    // run them together — a bruiser reads 5, 3 and 1, and they mean three
    // different things.
    const bruiser = balanceOf(BALANCE, ZOMBIE.BRUISER);
    expect(bruiser.hp).toBe(5);
    expect(bruiser.shamblerHits).toBe(3);
    expect(BALANCE.player.contactCost).toBe(1); // spec 04-37
  });

  it('walks each kind at the pace of its line, and by nothing else', () => {
    // spec 03-2, 03-5: the pace tells them apart, and no line of the table ever
    // moves from wave one to the last wave of overtime.
    const game = createGame(BALANCE, 3);
    const kinds: ZombieType[] = [ZOMBIE.SHAMBLER, ZOMBIE.SPRINTER, ZOMBIE.BRUISER, ZOMBIE.COLOSSUS];
    for (const type of kinds) put(game, type, 0, 0, 0);
    walk(game, 60);
    const pool = game.assault.zombies;
    for (let at = 0; at < kinds.length; at += 1) {
      // A pool is written in Float32Array, so four decimals is all one may ask
      // of a sum of sixty strides. (spec 10-11)
      expect(pool.progress[at]).toBeCloseTo(balanceOf(BALANCE, kinds[at]).speed, 4);
    }
  });
});

describe('the rail', () => {
  it('is one advance and one offset, and never a third thing', () => {
    // spec 03-7: a zombie has one position — its advance along the rail of its
    // street, plus an offset across it. Nothing else has any say in where it is.
    const game = createGame(BALANCE, 11);
    const rails = game.assault.city.rails;
    for (let street = 0; street < 3; street += 1) put(game, ZOMBIE.SHAMBLER, street, 10, 0);
    walk(game, 300);

    const pool = game.assault.zombies;
    for (let at = 0; at < pool.count; at += 1) {
      const street = pool.street[at];
      const ang = pool.ang[at];
      expect(pool.x[at]).toBeCloseTo(
        railX(rails, street, pool.progress[at]) - Math.sin(ang) * pool.offset[at],
        4,
      );
      expect(pool.z[at]).toBeCloseTo(
        railZ(rails, street, pool.progress[at]) + Math.cos(ang) * pool.offset[at],
        4,
      );
    }
  });

  it('spreads a pack across the width of a street, inside two blocks', () => {
    // spec 03-7: the offset is drawn in ±2 blocks, so a pack takes the width of
    // the street instead of walking in single file.
    const game = createGame(BALANCE, 20260829);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const at = spawnZombie(game, ZOMBIE.SHAMBLER, 0, 0);
      const offset = game.assault.zombies.offset[at];
      expect(Math.abs(offset)).toBeLessThanOrEqual(2);
      seen.add(offset);
    }
    expect(seen.size).toBeGreaterThan(30);
  });

  it('never lets an advance decrease, whatever holds it', () => {
    // spec 03-8: the advance never decreases, and that is the formal guarantee
    // that an assault always ends. spec 04-34: a sword blow shifts sideways.
    const game = createGame(BALANCE, 7);
    const at = put(game, ZOMBIE.SHAMBLER, 0, 0, 0);
    const pool = game.assault.zombies;
    let last = pool.progress[at];
    for (let i = 0; i < 900; i += 1) {
      if (i % 24 === 0) {
        pool.knockedFor[at] = BALANCE.knockback.shambler.paused; // spec 04-35
        pool.offset[at] += BALANCE.knockback.shambler.shift;
      }
      stepZombies(game, SECONDS);
      expect(pool.progress[at]).toBeGreaterThanOrEqual(last);
      last = pool.progress[at];
    }
    expect(last).toBeGreaterThan(0);
  });

  it('walks a city where no cell is walkable and every cell stands eight high', () => {
    // spec 03-9: no collision with the ground at all — it can neither wedge
    // itself, nor drop out of the city, nor become unreachable. The proof is
    // that the whole grid can be made hostile and the walk does not notice.
    const game = createGame(BALANCE, 5);
    game.assault.city.walkable.fill(0);
    game.assault.city.height.fill(8);
    const at = put(game, ZOMBIE.SPRINTER, 0, 0, 1.5);
    walk(game, 60 * 24); // twenty-four seconds, one more than a sprinter needs
    expect(game.assault.zombies.progress[at]).toBe(RAIL); // spec 03, "Les traversées"
  });

  it('pushes one along after three seconds of a held advance', () => {
    // spec 03-11: an advance that has not moved for three seconds is pushed
    // along its rail. spec 03-13: the sword is the one thing that holds one, so
    // this is what stops a player holding a zombie in one spot for good.
    const game = createGame(BALANCE, 9);
    const at = put(game, ZOMBIE.SHAMBLER, 0, 10, 0);
    const pool = game.assault.zombies;

    for (let i = 0; i < 60 * 3 - 1; i += 1) {
      pool.knockedFor[at] = 1; // held, and held again, and held again
      stepZombies(game, SECONDS);
    }
    expect(pool.progress[at]).toBe(10); // not one block in three seconds
    expect(pool.stuckFor[at]).toBeCloseTo(3 - SECONDS, 4);

    // The count is a sum of sixtieths in a Float32Array, so it crosses the three
    // seconds on that step or on the next one, and never later. (spec 10-11)
    for (let i = 0; i < 2; i += 1) {
      pool.knockedFor[at] = 1;
      stepZombies(game, SECONDS);
    }
    expect(pool.progress[at]).toBeCloseTo(10 + 1.5 * SECONDS, 4); // one stride, forced
    expect(pool.stuckFor[at]).toBeLessThan(2 * SECONDS); // and the count starts over
  });

  it('sends the last of them down at four blocks a second, the colossus apart', () => {
    // spec 03-39: fifteen seconds at three left or fewer and the survivors take
    // four blocks a second. spec 03-40: the colossus is left out of it.
    const game = createGame(BALANCE, 2);
    const slow = put(game, ZOMBIE.SHAMBLER, 0, 0, 0);
    const huge = put(game, ZOMBIE.COLOSSUS, 1, 0, 0);
    expect(speedOf(game, slow)).toBe(1.5);
    game.assault.fewFor = BALANCE.assault.rushAfter;
    expect(speedOf(game, slow)).toBe(4);
    expect(speedOf(game, huge)).toBe(0.8);
  });
});

describe('the town hall, from the rail', () => {
  it('stops at its face and stays a target', () => {
    // spec 03-17: it stops at the contact and goes on being killable — no
    // vanishing, no burst, no end of the line.
    const game = createGame(BALANCE, 4);
    const at = put(game, ZOMBIE.SHAMBLER, 0, RAIL - 1, 0);
    const pool = game.assault.zombies;
    walk(game, 60 * 10);

    expect(pool.progress[at]).toBe(RAIL);
    expect(pool.count).toBe(1);
    expect(pool.hp[at]).toBe(1); // untouched, in sword hits (spec 03-3)
    expect(pool.type[at]).toBe(ZOMBIE.SHAMBLER);
    expect(atTownHall(game, at)).toBe(true);
    // It stands at the face of the town hall, four blocks from the middle of the
    // city, and it does not go one block further. (spec 02-7)
    expect(Math.hypot(pool.x[at], pool.z[at])).toBeCloseTo(
      Math.hypot(BALANCE.city.townHallSide / 2, pool.offset[at]),
      4,
    );
  });
});

describe('what it walks past', () => {
  it('lands one blow in passing on a ground cannon, and never stops for it', () => {
    // spec 03-15, 05-45: closer than a block and a half, one blow in passing,
    // and it never stands still for it — a cannon is not a barricade.
    const game = createGame(BALANCE, 6);
    putCannon(game, 0, 40, 0, 0);
    const at = put(game, ZOMBIE.SHAMBLER, 0, 30, 0);
    walk(game, 60 * 14); // twenty blocks at a shambler's pace, and then some

    const cannons = game.snapshot.cannons;
    expect(cannons.hp[0]).toBe(BALANCE.cannon.hp - 1); // spec 05-44, one shambler hit
    expect(counted(game.assault.events, EVENT.CANNON_HIT)).toBe(1);

    // The same walk with no cannon at all lands on the same advance, to the bit.
    const alone = createGame(BALANCE, 6);
    const other = put(alone, ZOMBIE.SHAMBLER, 0, 30, 0);
    walk(alone, 60 * 14);
    expect(game.assault.zombies.progress[at]).toBe(alone.assault.zombies.progress[other]);
  });

  it('leaves a cannon further off than a block and a half alone', () => {
    // spec 03-15: a block and a half, and not one more.
    const game = createGame(BALANCE, 6);
    putCannon(game, 0, 40, 1.6, 0);
    put(game, ZOMBIE.SHAMBLER, 0, 30, 0);
    walk(game, 60 * 14);
    expect(game.snapshot.cannons.hp[0]).toBe(BALANCE.cannon.hp);
    expect(counted(game.assault.events, EVENT.CANNON_HIT)).toBe(0);
  });

  it('never reaches a cannon on a roof', () => {
    // spec 03-16, 05-46: a cannon on a roof is out of reach for good, so it
    // never loses a single hp.
    const game = createGame(BALANCE, 6);
    putCannon(game, 0, 40, 0, 4);
    put(game, ZOMBIE.SHAMBLER, 0, 30, 0);
    walk(game, 60 * 14);
    expect(game.snapshot.cannons.hp[0]).toBe(BALANCE.cannon.hp);
    expect(counted(game.assault.events, EVENT.CANNON_HIT)).toBe(0);
  });

  it('takes three off a cannon for a bruiser and ten for a colossus', () => {
    // spec 03-3 and the table of chapter 3: a blow is worth the column of the
    // kind that lands it, in shambler hits. (spec 05, "L'usure au sol")
    const game = createGame(BALANCE, 8);
    putCannon(game, 0, 40, 0, 0);
    putCannon(game, 1, 40, 0, 0);
    put(game, ZOMBIE.BRUISER, 0, 39, 0);
    put(game, ZOMBIE.COLOSSUS, 1, 39, 0);
    walk(game, 60 * 3);
    expect(game.snapshot.cannons.hp[0]).toBe(BALANCE.cannon.hp - 3);
    expect(game.snapshot.cannons.hp[1]).toBe(BALANCE.cannon.hp - 10);
  });
});

describe('the player, walked into', () => {
  it('takes one hp at a touch, and nothing at all from itself', () => {
    // spec 03-14, 04-40: a touch costs him one hp and costs the zombie nothing —
    // it does not stop, does not swerve, and never takes what he carries.
    const game = createGame(BALANCE, 12);
    const at = put(game, ZOMBIE.SHAMBLER, 0, 30, 0);
    const pool = game.assault.zombies;
    const player = game.assault.player;
    player.x = pool.x[at];
    player.z = pool.z[at];
    const offset = pool.offset[at];
    stepZombies(game, SECONDS);

    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 1); // spec 04-37
    expect(counted(game.assault.events, EVENT.CONTACT)).toBe(1);
    expect(pool.hp[at]).toBe(1);
    expect(pool.offset[at]).toBe(offset);
    expect(pool.progress[at]).toBeCloseTo(30 + 1.5 * SECONDS, 4);
  });

  it('takes no second hp before two seconds have gone', () => {
    // spec 04-39: staggered a second, then untouchable a second, so one hp every
    // two seconds and ten seconds of standing in a pack before he falls.
    const game = createGame(BALANCE, 13);
    const at = put(game, ZOMBIE.COLOSSUS, 0, 30, 0);
    const pool = game.assault.zombies;
    const player = game.assault.player;
    for (let i = 0; i < 60 * 4; i += 1) {
      player.x = pool.x[at];
      player.z = pool.z[at];
      stepZombies(game, SECONDS);
    }
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 2);
  });

  it('never touches a body standing a storey up', () => {
    // spec 04-9: a roof is a whole refuge, and a zombie walks the floor of its
    // street and nothing else. (spec 03-12)
    const game = createGame(BALANCE, 14);
    const at = put(game, ZOMBIE.SHAMBLER, 0, 30, 0);
    const player = game.assault.player;
    player.x = game.assault.zombies.x[at];
    player.z = game.assault.zombies.z[at];
    player.y = 4;
    walk(game, 60);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp);
    expect(counted(game.assault.events, EVENT.CONTACT)).toBe(0);
  });

  it('never turns towards him, whatever he does', () => {
    // spec 03-12: no zombie ever leaves its rail and none of them chases the
    // player — they aim at the town hall and at nothing else.
    const chased = createGame(BALANCE, 15);
    const one = put(chased, ZOMBIE.SHAMBLER, 0, 20, 0);
    const alone = createGame(BALANCE, 15);
    const other = put(alone, ZOMBIE.SHAMBLER, 0, 20, 0);

    for (let i = 0; i < 600; i += 1) {
      // He runs circles around it, and it never looks up.
      chased.assault.player.x = chased.assault.zombies.x[one] + 4 * Math.cos(i / 30);
      chased.assault.player.z = chased.assault.zombies.z[one] + 4 * Math.sin(i / 30);
      stepZombies(chased, SECONDS);
      stepZombies(alone, SECONDS);
    }
    const here = chased.assault.zombies;
    const there = alone.assault.zombies;
    expect(here.progress[one]).toBe(there.progress[other]);
    expect(here.offset[one]).toBe(there.offset[other]);
    expect(here.x[one]).toBe(there.x[other]);
    expect(here.z[one]).toBe(there.z[other]);
    expect(here.ang[one]).toBe(there.ang[other]);
  });
});

describe('the escort of the colossus', () => {
  it('masses the six of them inside three blocks of him', () => {
    // spec 03-34: six bruisers, massed at less than three blocks of him. It is
    // the offset that gives way and never the advance. (spec 03-8)
    const game = createGame(BALANCE, 4242);
    const colossus = put(game, ZOMBIE.COLOSSUS, 0, 0, 2);
    const pool = game.assault.zombies;
    for (let i = 0; i < BALANCE.assault.escortCount; i += 1) {
      const at = put(game, ZOMBIE.BRUISER, 0, 0, i % 2 === 0 ? -12 : 12);
      massZombie(game, at, colossus, BALANCE.assault.escortRadius);
      expect(Math.abs(pool.offset[at] - pool.offset[colossus])).toBeLessThanOrEqual(3);
      expect(pool.progress[at]).toBe(pool.progress[colossus]);
    }
  });

  it('walks them at his pace, and the third net takes them without him', () => {
    // spec 03-34: held to his pace, eight tenths of a block a second — which is
    // what keeps them massed the whole way down. spec 03-40: the third net
    // leaves out the colossus, and him alone.
    const game = createGame(BALANCE, 5);
    const colossus = put(game, ZOMBIE.COLOSSUS, 0, 0, 0);
    const bruiser = put(game, ZOMBIE.BRUISER, 0, 0, 0);
    game.assault.zombies.escort[bruiser] = 1;
    expect(speedOf(game, bruiser)).toBe(0.8);
    expect(speedOf(game, colossus)).toBe(0.8);
    walk(game, 60);
    expect(game.assault.zombies.progress[bruiser]).toBeCloseTo(0.8, 4);

    game.assault.fewFor = BALANCE.assault.rushAfter;
    expect(speedOf(game, bruiser)).toBe(4); // spec 03-39
    expect(speedOf(game, colossus)).toBe(0.8); // spec 03-40
  });
});
