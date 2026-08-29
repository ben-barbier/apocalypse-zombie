/**
 * The one body read back against chapter 4. Every number here is written out by
 * hand from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * The ground it walks is the real grid the rules engender, flattened and then
 * raised cell by cell: what the tests want is a roof, a void and a ladder in
 * known spots, and the grid is the one thing a body ever touches. (spec 04-8)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { gravityOf, isClimbing, placePlayer, stepPlayer, takeOffOf } from './player';
import {
  EVENT,
  type City,
  type Game,
  ZOMBIE,
  type ZombieType,
  cellAt,
  clearEvents,
  createGame,
  createInput,
  heightAt,
  walkableAt,
} from './state';
import { step } from './step';
import { spawnZombie } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** A flat, walkable world, so a test only has to raise what it wants. */
function flatGame(): Game {
  const game = createGame(BALANCE);
  const city = game.assault.city;
  city.height.fill(0);
  city.walkable.fill(1);
  city.buildings.count = 0;
  const player = game.assault.player;
  player.x = 0.5;
  player.y = 0;
  player.z = 0.5;
  return game;
}

/** Raises the cells whose middle falls between two marks, on the one row z = 0,5. */
function raise(city: City, from: number, to: number, high: number): void {
  for (let x = from + 0.5; x < to; x += 1) city.height[cellAt(city, x, 0.5)] = high;
}

/** Walks the body for a while, with the same entries all the way through. */
function walk(game: Game, steps: number, dx: number, dz = 0, jump = false): void {
  const input = createInput();
  input.dx = dx;
  input.dz = dz;
  for (let i = 0; i < steps; i += 1) {
    input.jump = jump && i === 0; // a rising edge belongs to one step (spec 10-31)
    stepPlayer(game, input, SECONDS);
  }
}

describe('the one pace', () => {
  it('runs six blocks a second, and there is no other', () => {
    // spec 04-6: the run is the only pace, 6 blocks a second, always.
    expect(BALANCE.player.runSpeed).toBe(6);
    const game = flatGame();
    walk(game, 60, 1);
    expect(game.assault.player.x - 0.5).toBeCloseTo(6, 6);
  });

  it('runs exactly as fast carrying three firebombs', () => {
    // spec 04-7: the pace never depends on what he carries.
    const loaded = flatGame();
    loaded.snapshot.armful = BALANCE.player.armful;
    walk(loaded, 60, 1);
    const empty = flatGame();
    walk(empty, 60, 1);
    expect(loaded.assault.player.x).toBe(empty.assault.player.x);
  });

  it('holds a stick pushed past one to the same six blocks a second', () => {
    // spec 10-30: dx and dz of a norm of at most one.
    const game = flatGame();
    walk(game, 60, 1, 1);
    const player = game.assault.player;
    expect(Math.hypot(player.x - 0.5, player.z - 0.5)).toBeCloseTo(6, 6);
  });

  it('turns him the way he goes', () => {
    const game = flatGame();
    walk(game, 1, 0, 1);
    expect(game.assault.player.ang).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe('the grid, which is the one collision of the game', () => {
  it('refuses a cell one has no right to be in', () => {
    // spec 04-8: a cell says at what height one walks and whether one may be there.
    const game = flatGame();
    const city = game.assault.city;
    for (let x = 1.5; x < 6; x += 1) city.walkable[cellAt(city, x, 0.5)] = 0;
    walk(game, 60, 1);
    expect(game.assault.player.x).toBeLessThan(1);
  });

  it('never walks up: a roof is not climbed, it is jumped onto or laddered', () => {
    // spec 04-11: the jump never rises from the ground, and a roof is four blocks.
    const game = flatGame();
    raise(game.assault.city, 1, 6, 2);
    walk(game, 60, 1);
    expect(game.assault.player.x).toBeLessThan(1);
    expect(game.assault.player.y).toBe(0);
  });

  it('walks off a roof into the void, and the fall costs nothing', () => {
    // spec 04-12: one comes down from a roof by walking into the void, and the
    // fall costs nothing, ever. spec 04-38: only a contact costs an hp.
    expect(BALANCE.player.fallCost).toBe(0);
    const game = flatGame();
    raise(game.assault.city, -6, 0, 4);
    const player = game.assault.player;
    player.x = -0.5;
    player.y = 4;
    walk(game, 60, 1);
    expect(player.y).toBe(0);
    expect(player.x).toBeGreaterThan(0);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp);
  });
});

describe('the jump, and its two bounds', () => {
  it('reads its arc off the two bounds and the one pace, and invents nothing', () => {
    // spec 04-10: two blocks of rise, two blocks of void, never more.
    // spec 04-6: six blocks a second. Together they fix the arc and its pull.
    expect(BALANCE.player.jumpRise).toBe(2);
    expect(BALANCE.player.jumpGap).toBe(2);
    const pull = gravityOf(BALANCE.player);
    const off = takeOffOf(BALANCE.player);
    expect(pull).toBeCloseTo(64, 6);
    expect(off).toBeCloseTo(16, 6);
    // It tops out at exactly the rise it is promised, and it is that wide.
    expect((off * off) / (2 * pull)).toBeCloseTo(BALANCE.player.jumpRise, 6);
    const flight = (2 * off) / pull;
    expect(flight * BALANCE.player.runSpeed).toBeCloseTo(BALANCE.player.jumpGap + 1, 6);
  });

  it('clears two blocks of rise', () => {
    // spec 04-10: two blocks of rise.
    const game = flatGame();
    raise(game.assault.city, 1, 6, 2);
    walk(game, 60, 1, 0, true);
    expect(game.assault.player.y).toBe(2);
    expect(game.assault.player.x).toBeGreaterThan(1);
  });

  it('never clears three, nor the four-block drop chapter 2 cuts its roofs with', () => {
    // spec 04-10: never more. spec 02-22: a four-block drop the jump does not cross.
    for (const high of [3, 4]) {
      const game = flatGame();
      raise(game.assault.city, 1, 6, high);
      walk(game, 120, 1, 0, true);
      expect(game.assault.player.y).toBe(0);
      expect(game.assault.player.x).toBeLessThan(1);
    }
  });

  it('clears two blocks of void, from anywhere in the cell it leaves', () => {
    // spec 04-10: two blocks of void.
    // Anywhere in the cell against the void, and the whole cell is swept.
    for (let from = 0.01; from < 1; from += 0.02) {
      const game = flatGame();
      const city = game.assault.city;
      raise(city, -4, 1, 4);
      raise(city, 3, 12, 4);
      const player = game.assault.player;
      player.x = from;
      player.y = 4;
      walk(game, 60, 1, 0, true);
      expect(player.y).toBe(4);
      expect(player.x).toBeGreaterThanOrEqual(3);
    }
  });

  it('never clears three blocks of void, from anywhere at all', () => {
    // spec 04-10: never more.
    for (let from = 0.01; from < 1; from += 0.02) {
      const game = flatGame();
      const city = game.assault.city;
      raise(city, -4, 1, 4);
      raise(city, 4, 12, 4);
      const player = game.assault.player;
      player.x = from;
      player.y = 4;
      walk(game, 60, 1, 0, true);
      expect(player.y).toBe(0);
    }
  });

  it('never jumps a second time in the air', () => {
    // CONTEXT.md, Saut: never a double jump. spec 04-10: one jump, two bounds.
    const game = flatGame();
    const player = game.assault.player;
    const input = createInput();
    input.jump = true;
    stepPlayer(game, input, SECONDS);
    const rising = player.vy;
    stepPlayer(game, input, SECONDS); // held down, and pressed again
    expect(player.vy).toBeLessThan(rising);
  });

  it('comes back down to the ground it left', () => {
    // spec 04-11: the jump never serves to come down; spec 04-12: falling is free.
    const game = flatGame();
    walk(game, 60, 0, 0, true);
    expect(game.assault.player.y).toBe(0);
    expect(game.assault.player.vy).toBe(0);
  });
});

/** One building, its one ladder on the face that gives onto walkable ground. */
function ladderGame(): Game {
  const game = flatGame();
  const city = game.assault.city;
  raise(city, 0, 4, 4);
  const buildings = city.buildings;
  buildings.count = 1;
  buildings.height[0] = 4;
  buildings.ladderX[0] = 0;
  buildings.ladderZ[0] = 0.5;
  buildings.ladderAng[0] = 0; // pushing towards +x is pushing into the building
  const player = game.assault.player;
  player.x = -0.5;
  player.y = 0;
  player.z = 0.5;
  return game;
}

describe('the ladder, which is the one climb from street height', () => {
  it('takes itself: walking onto it and pushing at the building is the whole gesture', () => {
    // spec 04-13: the climb is automatic; spec 04-14: it is the one climb.
    const game = ladderGame();
    const player = game.assault.player;
    const input = createInput();
    input.dx = 1;
    stepPlayer(game, input, SECONDS);
    expect(isClimbing(player)).toBe(true);
    while (isClimbing(player)) stepPlayer(game, input, SECONDS);
    // He steps off onto the roof cell, and nowhere else. (spec 04-13)
    expect(player.y).toBe(4);
    expect(player.x).toBeCloseTo(0.5, 6);
  });

  it('takes eight tenths of a second, going up and coming down', () => {
    // spec 04-13: it takes 0,8 second.
    expect(BALANCE.player.ladderTime).toBe(0.8);
    const game = ladderGame();
    const player = game.assault.player;
    const input = createInput();
    input.dx = 1;
    let steps = 0;
    while (steps < 200 && player.y < 4) {
      stepPlayer(game, input, SECONDS);
      steps += 1;
    }
    // The one step it takes to walk onto the ladder, then the climb itself.
    expect(Math.abs(steps - 1 - BALANCE.player.ladderTime * 60)).toBeLessThanOrEqual(1);

    input.dx = -1;
    let down = 0;
    while (down < 200 && player.y > 0) {
      stepPlayer(game, input, SECONDS);
      down += 1;
    }
    expect(Math.abs(down - 1 - BALANCE.player.ladderTime * 60)).toBeLessThanOrEqual(1);
    expect(player.x).toBeCloseTo(-0.5, 6);
  });

  it('holds him untouchable for the whole of it, and lets nothing else in', () => {
    // spec 04-13: he is immune to contact while climbing, and comes out ready.
    const game = ladderGame();
    const player = game.assault.player;
    walk(game, 1, 1);
    const input = createInput();
    input.dz = 1;
    input.jump = true;
    const held = player.z;
    for (let i = 0; i < 10; i += 1) stepPlayer(game, input, SECONDS);
    expect(isClimbing(player)).toBe(true);
    expect(player.z).toBe(held);
    expect(player.vy).toBe(0);
    expect(player.strikeLeft).toBe(0);
  });

  it('does not start when he pushes away from it', () => {
    const game = ladderGame();
    walk(game, 5, -1);
    expect(isClimbing(game.assault.player)).toBe(false);
    expect(game.assault.player.y).toBe(0);
  });
});

describe('where he stands when a game opens', () => {
  it('is at the base, in front of the town hall, on ground he may stand on', () => {
    // spec 01-22, 08-71: he stands at the base, in front of the town hall.
    const game = createGame(BALANCE);
    placePlayer(game);
    const player = game.assault.player;
    const city = game.assault.city;
    expect(walkableAt(city, player.x, player.z)).toBe(true);
    expect(heightAt(city, player.x, player.z)).toBe(0);
    expect(player.y).toBe(0);
    // Clear of the shed, and short of the mouth of the street. (spec 02-7, 02-8)
    const along = Math.hypot(player.x, player.z);
    expect(along).toBeGreaterThan(BALANCE.city.townHallSide / 2 + BALANCE.city.baseWidth);
    expect(along).toBeLessThan(BALANCE.city.apothem);
    expect(player.xPrev).toBe(player.x);
  });
});

describe('the real plan, where a roof is never a case of its own', () => {
  it('walks out of the base and down street one, on the grid the rules engender', () => {
    // spec 04-8: the grid is the one collision structure of the game.
    const game = createGame(BALANCE);
    placePlayer(game);
    const player = game.assault.player;
    const city = game.assault.city;
    const ang = city.gateways.ang[0];
    const input = createInput();
    input.dx = Math.cos(ang);
    input.dz = Math.sin(ang);

    const from = Math.hypot(player.x, player.z);
    for (let i = 0; i < 600; i += 1) stepPlayer(game, input, SECONDS);
    const to = Math.hypot(player.x, player.z);
    // Ten seconds at six blocks a second, and nothing in the way. (spec 04-6)
    expect(to - from).toBeCloseTo(60, 0);
    expect(player.y).toBe(0);
    expect(walkableAt(city, player.x, player.z)).toBe(true);
  });

  it('climbs the one ladder of a real building, and comes back down it', () => {
    // spec 04-13, 04-14, 02-26: one ladder per building, on the face that gives
    // onto walkable ground, and it is the one climb from street height.
    const game = createGame(BALANCE);
    const city = game.assault.city;
    const player = game.assault.player;
    const at = 3;
    const into = city.buildings.ladderAng[at];
    const ix = Math.cos(into);
    const iz = Math.sin(into);
    player.x = city.buildings.ladderX[at] - ix * 0.5;
    player.z = city.buildings.ladderZ[at] - iz * 0.5;
    player.y = heightAt(city, player.x, player.z);
    expect(player.y).toBe(0);

    const input = createInput();
    input.dx = ix;
    input.dz = iz;
    stepPlayer(game, input, SECONDS);
    expect(isClimbing(player)).toBe(true);
    for (let i = 0; i < 120 && isClimbing(player); i += 1) stepPlayer(game, input, SECONDS);
    expect(player.y).toBe(city.buildings.height[at]);

    input.dx = -ix;
    input.dz = -iz;
    stepPlayer(game, input, SECONDS);
    expect(isClimbing(player)).toBe(true);
    for (let i = 0; i < 120 && isClimbing(player); i += 1) stepPlayer(game, input, SECONDS);
    expect(player.y).toBe(0);
  });
});

describe('his five hp, which turn his mistakes into hp of the town hall', () => {
  /**
   * One body of a kind on the rail of street one, with nothing walking in behind
   * it: the wave has already sent every pack it had, so the one body a test
   * plants is the only one in the city. (spec 03-27)
   */
  function plant(game: Game, type: ZombieType): number {
    game.assault.sent.fill(255);
    return spawnZombie(game, type, 0, 30);
  }

  /** One fact of the buffer: the step it happened at, its kind, and what it carried. */
  interface Fact {
    step: number;
    kind: number;
    x: number;
    z: number;
    value: number;
  }

  /**
   * Drives whole steps, holding him against the body at `at` — or nowhere near
   * anything, at -1 — and hands back every fact the buffer carried. The whole
   * step is driven and in its one order, because what a touch costs is settled in
   * the phase of the zombies and what it buys is counted down in his, which comes
   * before it. (spec 10-25)
   *
   * He is let go the moment he is on the floor: nothing holds a body down there,
   * and that is what lets a test read the spot he gets up in. (spec 04-42)
   */
  function press(game: Game, at: number, steps: number): Fact[] {
    const pool = game.assault.zombies;
    const player = game.assault.player;
    const events = game.assault.events;
    const idle = createInput(); // his hands are empty: nothing here is about a press
    const facts: Fact[] = [];
    for (let i = 0; i < steps; i += 1) {
      if (at >= 0 && player.collapseLeft <= 0) {
        player.x = pool.x[at];
        player.z = pool.z[at];
      }
      clearEvents(events);
      step(game, idle);
      for (let e = 0; e < events.count; e += 1) {
        facts.push({
          step: i,
          kind: events.type[e],
          x: events.x[e],
          z: events.z[e],
          value: events.value[e],
        });
      }
    }
    return facts;
  }

  const only = (facts: Fact[], kind: number): Fact[] => facts.filter((f) => f.kind === kind);

  /** Stands him back at the middle of the city, where nothing walks into him. */
  function away(game: Game): void {
    game.assault.player.x = 0.5;
    game.assault.player.z = 0.5;
  }

  it('loses one hp per touch and never more than one every two seconds', () => {
    // spec 04-37, 04-39: five hp, one per contact, staggered a second and then
    // untouchable a second — so a body pressed against a pack goes down on its
    // fifth touch and not before, which is the ten seconds of chapter 4.
    const game = flatGame();
    const at = plant(game, ZOMBIE.COLOSSUS);
    const facts = press(game, at, 60 * 12);

    const touches = only(facts, EVENT.CONTACT);
    expect(touches.length).toBe(BALANCE.player.hp); // five, and then he is down
    for (const touch of touches) expect(touch.value).toBe(BALANCE.player.contactCost);
    for (let i = 1; i < touches.length; i += 1) {
      const apart = (touches[i].step - touches[i - 1].step) * SECONDS;
      // Never faster than the ceiling, and never a step slower than it either.
      expect(apart).toBeGreaterThanOrEqual(BALANCE.player.stagger + BALANCE.player.invulnerable);
      expect(apart).toBeLessThan(BALANCE.player.stagger + BALANCE.player.invulnerable + SECONDS * 2);
    }
    // Five hp at one every two seconds: ten seconds of a body pressed against a
    // pack, of which eight stand between the first touch and the fall. (spec 04-39)
    const across = (touches[4].step - touches[0].step) * SECONDS;
    expect(across).toBeGreaterThanOrEqual(8);
    expect(across).toBeLessThan(8 + 8 * SECONDS);

    const down = only(facts, EVENT.COLLAPSE);
    expect(down.length).toBe(1);
    expect(down[0].step).toBe(touches[4].step); // the fifth touch is the one that puts him down
  });

  it('goes down where he stands, and gets up in that same spot three seconds later', () => {
    // spec 04-42: he falls where he is, lies three seconds, and gets up there at
    // full hp with three seconds of being untouchable. Nowhere else, ever — the
    // base would make going down the fastest way across the city.
    const game = flatGame();
    const at = plant(game, ZOMBIE.BRUISER);
    const facts = press(game, at, 60 * 12);
    const player = game.assault.player;

    const down = only(facts, EVENT.COLLAPSE)[0];
    const up = only(facts, EVENT.RISE)[0];
    expect(up.x).toBe(down.x); // the same spot, and it is not compared to a base
    expect(up.z).toBe(down.z);
    const lying = (up.step - down.step) * SECONDS;
    expect(lying).toBeGreaterThanOrEqual(BALANCE.player.collapseTime);
    expect(lying).toBeLessThan(BALANCE.player.collapseTime + 2 * SECONDS);
    expect(up.value).toBe(BALANCE.player.hp);

    // He is untouchable for three seconds from there, which is the one exception
    // to the second the rest of the chapter runs on. (spec 04-42)
    const after = only(facts, EVENT.CONTACT).filter((f) => f.step > up.step);
    for (const touch of after) {
      expect((touch.step - up.step) * SECONDS).toBeGreaterThanOrEqual(
        BALANCE.player.riseInvulnerable,
      );
    }
    expect(player.collapseLeft).toBe(0);
  });

  it('takes no blow of any kind while he is on the floor', () => {
    // spec 04-42: at nought there is nothing left to take, and he gets up whole.
    const game = flatGame();
    const at = plant(game, ZOMBIE.COLOSSUS);
    const facts = press(game, at, 60 * 12);
    const down = only(facts, EVENT.COLLAPSE)[0];
    const up = only(facts, EVENT.RISE)[0];
    // The touch that put him down is the one on the step he went down at; from
    // there to the step he gets up on, nothing reaches him at all.
    const during = only(facts, EVENT.CONTACT).filter(
      (f) => f.step > down.step && f.step <= up.step,
    );
    expect(during.length).toBe(0);
  });

  it('loses his armful when he goes down, and that is the one loss of firebombs there is', () => {
    // spec 04-43: the armful goes at the collapse, and nowhere else does a
    // firebomb leave him — none falls, none is picked up off the ground. (04-48)
    const game = flatGame();
    game.snapshot.armful = BALANCE.player.armful;
    const at = plant(game, ZOMBIE.BRUISER);
    const facts = press(game, at, 60 * 12);

    const down = only(facts, EVENT.COLLAPSE)[0];
    expect(down.value).toBe(BALANCE.player.armful); // what it carried away
    expect(game.snapshot.armful).toBe(0);
    // And he does not get it back by getting up: only the base ever fills it.
    expect(only(facts, EVENT.ARMFUL_TAKEN).length).toBe(0);
  });

  it('never falls for good, and never gets up anywhere else', () => {
    // spec 04-5, 04-42 and the interdits of chapter 4: there is no state of being
    // gone, no screen, no walking back in. Three collapses in a row and he is
    // still there, in the same spot, at full hp each time.
    const game = flatGame();
    const at = plant(game, ZOMBIE.COLOSSUS);
    const facts = press(game, at, 60 * 40);

    const downs = only(facts, EVENT.COLLAPSE);
    const ups = only(facts, EVENT.RISE);
    expect(downs.length).toBeGreaterThanOrEqual(3);
    expect(ups.length).toBe(downs.length);
    for (let i = 0; i < downs.length; i += 1) {
      expect(ups[i].x).toBe(downs[i].x);
      expect(ups[i].z).toBe(downs[i].z);
      expect(ups[i].value).toBe(BALANCE.player.hp);
    }
    expect(game.snapshot.playerHp).toBeGreaterThan(0);
  });

  it('gives one hp back every six seconds, and every touch starts that count over', () => {
    // spec 04-41: the regeneration is the one mending of the game, +1 every six
    // seconds, and each contact puts the count back to the beginning.
    const game = flatGame();
    const at = plant(game, ZOMBIE.SHAMBLER);
    press(game, at, 1); // one touch, and one hp gone
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 1);

    // Five seconds of the count gone, and then a second touch: the hp that was
    // one second away is six seconds away again.
    away(game);
    const waited = press(game, -1, 60 * 5);
    expect(only(waited, EVENT.CONTACT).length).toBe(0);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 1);

    press(game, at, 1); // walked into again, and the count starts over
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 2);
    away(game);
    press(game, -1, 60 * BALANCE.player.regenPeriod - 1);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 2); // not a step early
    press(game, -1, 3);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 1); // and there at six
  });

  it('never gives one back at close quarters, because six is longer than two', () => {
    // spec 04-41 and the "Pourquoi" of chapter 4: six seconds are longer than the
    // two of the loss ceiling, so one never regains anything in a pack — one has
    // to break off, and the roof is the infirmary.
    const game = flatGame();
    const at = plant(game, ZOMBIE.COLOSSUS);
    const facts = press(game, at, 60 * 8);
    const touches = only(facts, EVENT.CONTACT);
    // Four touches in eight seconds and four hp gone: nothing came back between
    // any two of them.
    expect(touches.length).toBe(4);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp - 4);
  });

  it('is refilled whole by a preparation, without a rule of its own', () => {
    // spec 04-41 and the hp table of chapter 4: thirty seconds are five hp, so a
    // preparation makes the plein and no rule of renewal between two waves has to
    // exist at all.
    const game = flatGame();
    const at = plant(game, ZOMBIE.COLOSSUS);
    press(game, at, 60 * 7); // four touches, and down to his last hp
    expect(game.snapshot.playerHp).toBe(1);
    away(game);
    press(game, -1, 60 * BALANCE.pace.latePrep);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp);
  });

  it('gives nothing back above five, and the ceiling never moves', () => {
    // spec 04-44: nothing is bought for him and the ceiling of five never rises.
    const game = flatGame();
    press(game, -1, 60 * 20);
    expect(game.snapshot.playerHp).toBe(BALANCE.player.hp);
  });
});
