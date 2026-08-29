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
import { type City, type Game, cellAt, createGame, createInput, heightAt, walkableAt } from './state';

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
