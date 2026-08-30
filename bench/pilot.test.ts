/**
 * The one pilot, held against chapter 11: it writes an `InputState` and nothing
 * else, it draws on a stream of its own, and its five settings are what turn
 * into a way of playing. Every figure below is written out by hand from the spec.
 * (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { placePlayer } from '../src/game/player';
import { createRandom } from '../src/game/random';
import { clearEvents, createCity, createGame, createInput } from '../src/game/state';
import { step } from '../src/game/step';
import { beginAssault } from '../src/game/waves';
import { createPilot, flyPilot } from './pilot';
import { BUY, CHILD, PROFILES, RACER, WATCHER } from './profiles';

const CITY = createCity(BALANCE.city);

function opened(profile = CHILD, seed = 1) {
  const game = createGame(BALANCE, seed);
  placePlayer(game);
  beginAssault(game);
  return { game, pilot: createPilot(BALANCE, profile, seed), input: createInput() };
}

/** One step, run the way `run.ts` runs it, so this file needs no run of its own. */
function stepOnce(game: ReturnType<typeof createGame>, input: ReturnType<typeof createInput>) {
  clearEvents(game.assault.events); // spec 10-18
  step(game, input);
}

describe('the second generator', () => {
  it('is sown apart from the one inside the game, on every one of the five seeds', () => {
    // spec 10-28, 11-9, 11-37
    for (let seed = 1; seed <= 5; seed += 1) {
      const pilot = createPilot(BALANCE, CHILD, seed);
      expect(pilot.random.seed).not.toBe(createRandom(seed).seed);
      expect(pilot.random.draws).toBe(0);
    }
  });

  it('opens on a state of its own for each seed', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 5; seed += 1) {
      seen.add(createPilot(BALANCE, CHILD, seed).random.seed);
    }
    expect(seen.size).toBe(5);
  });

  it('never touches the draws of the world', () => {
    // The pilot alone, with no step run at all: its own stream moves and the
    // world's does not. (spec 10-27, 10-28, 11-9)
    const { game, pilot, input } = opened();
    const drawn = game.snapshot.random.draws; // what opening the assault took
    for (let at = 0; at < 200; at += 1) flyPilot(pilot, game, input);
    expect(pilot.random.draws).toBeGreaterThan(0);
    expect(game.snapshot.random.draws).toBe(drawn);
  });
});

describe('the reserve', () => {
  it('is read off its own figure, and names the post it is kept for', () => {
    // spec 11, table of `spend`
    expect(createPilot(BALANCE, WATCHER, 1).keptFor).toBe(BUY.REINFORCEMENT);
    expect(createPilot(BALANCE, CHILD, 1).keptFor).toBe(BUY.REINFORCEMENT);
    expect(createPilot(BALANCE, RACER, 1).keptFor).toBe(BUY.ARMFUL);
  });
});

describe('what venture names', () => {
  it('reads on the eighty blocks of a street, from its mouth', () => {
    // The mouth of a street stands at eighty along its rail of ninety-two, so a
    // venture of 0,05 holds him four blocks past it and one of 0,95 at the far
    // end. (spec 02-12, 02-13, and spec 11, "Les cinq réglages")
    expect(createPilot(BALANCE, WATCHER, 1).postAt).toBeCloseTo(76, 6);
    expect(createPilot(BALANCE, CHILD, 1).postAt).toBeCloseTo(52, 6);
    expect(createPilot(BALANCE, RACER, 1).postAt).toBeCloseTo(4, 6);
  });

  it('gives the child the tall roofs of a stretch near the mouth', () => {
    // "pose sur les toits de 8 du premier tronçon" — the tallest roof of the
    // stretch his venture falls in comes first. (spec 11-13, 02-22)
    const roofs = createPilot(BALANCE, CHILD, 1).roofs[0];
    expect(CITY.buildings.height[roofs[0]]).toBe(8);
    expect(roofs.length).toBeGreaterThan(1);
  });

  it('gives the racer roofs deeper down the street than the watcher', () => {
    // "va au fond de la rue active, pose sur les tronçons profonds" against
    // "ne quitte ni la place ni les toits qui la ferment". (spec 11-12, 11-14)
    const mouth = BALANCE.city.apothem;
    const along = (at: number) => Math.hypot(CITY.buildings.x[at], CITY.buildings.z[at]) - mouth;
    const watcher = createPilot(BALANCE, WATCHER, 1).roofs[0];
    const racer = createPilot(BALANCE, RACER, 1).roofs[0];
    for (const at of watcher) expect(along(at)).toBeLessThan(BALANCE.city.street.length / 2);
    for (const at of racer) expect(along(at)).toBeGreaterThan(BALANCE.city.street.length / 2);
  });

  it('gives every roof of a stretch a height of four, six or eight', () => {
    for (const profile of PROFILES) {
      for (const list of createPilot(BALANCE, profile, 1).roofs) {
        for (const at of list) expect([4, 6, 8]).toContain(CITY.buildings.height[at]); // spec 02-20
      }
    }
  });
});

describe('what the pilot writes', () => {
  it('is an InputState, and never anything else', () => {
    // The one interdiction of chapter 11: a pilot that short-circuited the
    // entries would try a game nobody plays. Nothing of the game may move
    // between two steps but by the step itself. (spec 11-8, 11-11)
    const { game, pilot, input } = opened();
    const before = JSON.stringify(game.snapshot) + JSON.stringify(game.assault.player);
    const zombies = new Uint8Array(game.assault.zombies.x.buffer.slice(0));
    for (let at = 0; at < 300; at += 1) flyPilot(pilot, game, input);
    expect(JSON.stringify(game.snapshot) + JSON.stringify(game.assault.player)).toBe(before);
    expect(new Uint8Array(game.assault.zombies.x.buffer)).toEqual(zombies);
  });

  it('holds the stick to a norm of at most one, and holds the strike out', () => {
    // spec 10-30, and 04-24 / 04-28 on a blow that touches nothing costing
    // nothing at all.
    for (const profile of PROFILES) {
      const { game, pilot, input } = opened(profile);
      let held = 0;
      for (let at = 0; at < 4000; at += 1) {
        flyPilot(pilot, game, input);
        expect(Math.hypot(input.dx, input.dz)).toBeLessThanOrEqual(1 + 1e-9);
        expect(typeof input.strike).toBe('boolean');
        expect(input.airlock).toBe(false); // the Sas is no part of a bench run
        if (input.strike) held += 1;
        stepOnce(game, input);
      }
      expect(held).toBeGreaterThan(0);
    }
  });
});
