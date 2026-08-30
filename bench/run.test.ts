/**
 * One bench run played whole, the eight indicators it hands back, the guard-rail
 * of the collapses — and **the replay, byte for byte**, which is the promise of
 * chapter 10 that the whole bench rests on: a game replays from a seed and the
 * run of entries it was handed, and nothing else. (spec 10-29, 11-1, 11-25)
 *
 * This one tries the **engine**; `reference.json` and its test try the
 * **balance**, and neither stands in for the other. (spec 11-46)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE, type Balance } from '../src/game/balance';
import { placePlayer } from '../src/game/player';
import { type Game, type InputState, clearEvents, createGame, createInput } from '../src/game/state';
import { step } from '../src/game/step';
import { beginAssault } from '../src/game/waves';
import { createPilot, flyPilot } from './pilot';
import { CHILD, PROFILES, type Profile, WATCHER } from './profiles';
import { COLLAPSE_CEILING, MOST_STEPS, playRun } from './run';

/** The run of entries a game replays from: two headings and the four buttons. */
interface Tape {
  readonly dx: Float64Array;
  readonly dz: Float64Array;
  readonly pressed: Uint8Array;
}

function openGame(balance: Balance, seed: number): Game {
  const game = createGame(balance, seed);
  placePlayer(game); // spec 01-22
  beginAssault(game); // spec 01-16
  return game;
}

/** Plays a run with the pilot at the stick and keeps every entry it wrote. */
function taped(profile: Profile, seed: number, steps: number): { game: Game; tape: Tape } {
  const game = openGame(BALANCE, seed);
  const pilot = createPilot(BALANCE, profile, seed);
  const input = createInput();
  const tape: Tape = {
    dx: new Float64Array(steps),
    dz: new Float64Array(steps),
    pressed: new Uint8Array(steps),
  };

  for (let at = 0; at < steps; at += 1) {
    clearEvents(game.assault.events); // spec 10-18
    flyPilot(pilot, game, input);
    tape.dx[at] = input.dx;
    tape.dz[at] = input.dz;
    tape.pressed[at] =
      (input.strike ? 1 : 0) |
      (input.action ? 2 : 0) |
      (input.jump ? 4 : 0) |
      (input.airlock ? 8 : 0);
    step(game, input);
  }
  return { game, tape };
}

/** Plays the same game again from the seed and the run of entries alone. */
function replayed(seed: number, tape: Tape): Game {
  const game = openGame(BALANCE, seed);
  const input: InputState = createInput();

  for (let at = 0; at < tape.dx.length; at += 1) {
    clearEvents(game.assault.events);
    input.dx = tape.dx[at];
    input.dz = tape.dz[at];
    input.strike = (tape.pressed[at] & 1) !== 0;
    input.action = (tape.pressed[at] & 2) !== 0;
    input.jump = (tape.pressed[at] & 4) !== 0;
    input.airlock = (tape.pressed[at] & 8) !== 0;
    step(game, input);
  }
  return game;
}

/** Every column of one pool, compared byte for byte. (spec 10-29) */
function sameBytes(left: unknown, right: unknown, what: string): void {
  const one = left as { [column: string]: unknown };
  const two = right as { [column: string]: unknown };
  for (const column of Object.keys(one)) {
    const here = one[column];
    const there = two[column];
    if (ArrayBuffer.isView(here) && ArrayBuffer.isView(there)) {
      expect(
        new Uint8Array(here.buffer, here.byteOffset, here.byteLength),
        `${what}.${column}`,
      ).toEqual(new Uint8Array(there.buffer, there.byteOffset, there.byteLength));
    } else {
      expect(there, `${what}.${column}`).toEqual(here);
    }
  }
}

describe('a run replays from a seed and the entries it was handed', () => {
  it('lands on the same pools, byte for byte', () => {
    // Thirty thousand steps is eight minutes and change of played time, which
    // carries a run past the fourth wave, its second street and its first
    // cannons. (spec 10-21, 10-29)
    const { game, tape } = taped(CHILD, 1, 30000);
    const again = replayed(1, tape);

    sameBytes(game.assault.zombies, again.assault.zombies, 'zombies');
    sameBytes(game.assault.projectiles, again.assault.projectiles, 'projectiles');
    sameBytes(game.assault.coins, again.assault.coins, 'coins');
    sameBytes(game.snapshot.cannons, again.snapshot.cannons, 'cannons');
    sameBytes(game.assault.player, again.assault.player, 'player');
    sameBytes(game.assault.sword, again.assault.sword, 'sword');
    sameBytes(game.snapshot.random, again.snapshot.random, 'random');
    sameBytes(game.assault.city.buildings, again.assault.city.buildings, 'buildings');
    expect(again.snapshot.wave).toBe(game.snapshot.wave);
    expect(again.snapshot.coins).toBe(game.snapshot.coins);
    expect(again.snapshot.townHall.hp).toBe(game.snapshot.townHall.hp);
  });

  it('lands elsewhere on another seed, so the comparison is worth something', () => {
    const { tape } = taped(CHILD, 1, 6000);
    const same = replayed(1, tape);
    const other = replayed(2, tape);
    expect(other.snapshot.random.seed).not.toBe(same.snapshot.random.seed);
  });
});

describe('a bench run', () => {
  it('plays the three profiles from the first step to the last, with no drawing', () => {
    for (const profile of PROFILES) {
      const run = playRun(BALANCE, profile, 1, BALANCE.pace.mainWaves);
      expect(run.profile).toBe(profile.name);
      expect(run.steps).toBeGreaterThan(0);
      expect(run.steps).toBeLessThan(MOST_STEPS); // it ends, and it says so
      // A run stops on the fall of the town hall or on the last wave it was
      // asked for, and on nothing else. (spec 01-25, 01-28, 11-29)
      expect(run.won || run.wave < BALANCE.pace.mainWaves).toBe(true);
    }
  });

  it('hands back the eight indicators, and no ninth', () => {
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(Object.keys(run.indicators).sort()).toEqual([
      'breaches',
      'cannons',
      'coins',
      'collapses',
      'minutes',
      'peak',
      'swordShare',
      'townHallHits',
    ]); // spec 11-16
    // The breaches are three figures and never one. (spec 11-18)
    expect(Object.keys(run.indicators.breaches).sort()).toEqual([
      'count',
      'longestFor',
      'meanFor',
    ]);
    // The cannons come with their tiers and never as one count. (spec 11-19)
    expect(run.indicators.cannons.length).toBe(BALANCE.cannon.tiers);
  });

  it('counts a duration in minutes off the steps and never off a clock', () => {
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(run.indicators.minutes).toBeCloseTo(run.steps / BALANCE.loop.hz / 60, 9); // spec 11-7
  });

  it('never sees more living bodies at once than the wave walks in', () => {
    // The assertion of `waves.ts` is what bounds them, and the bench is where it
    // is seen. (spec 03-42, 10-43, 11-26)
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(run.indicators.peak).toBeLessThanOrEqual(BALANCE.pools.zombies);
  });

  it('splits the fatal blows between the sword and the cannons', () => {
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(run.indicators.swordShare).toBeGreaterThan(0);
    expect(run.indicators.swordShare).toBeLessThan(100);
  });
});

describe('the guard-rail of the collapses', () => {
  it('sets a run aside past six, and never counts it', () => {
    expect(COLLAPSE_CEILING).toBe(6); // spec 11-25
  });

  it('voids a run whose pilot goes down more often than that', () => {
    // The balance is injected, so a body of one hp with nothing untouchable
    // about it is all it takes to see the guard-rail bite — and seeing it bite
    // is the whole of this test. It is the watcher who takes it, because he is
    // the one whose `care` is nought and who therefore never breaks off.
    // Nothing here judges the run: void is neither for the balance nor against
    // it. (spec 10-15, 11-12, 11-25)
    const brittle: Balance = {
      ...BALANCE,
      player: {
        ...BALANCE.player,
        hp: 1,
        stagger: 0,
        invulnerable: 0,
        riseInvulnerable: 0,
      },
    };
    const run = playRun(brittle, WATCHER, 1, BALANCE.pace.mainWaves);
    expect(run.indicators.collapses).toBeGreaterThan(COLLAPSE_CEILING);
    expect(run.voided).toBe(true);
  });

  it('leaves a run that holds its feet standing', () => {
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(run.indicators.collapses).toBeLessThanOrEqual(COLLAPSE_CEILING);
    expect(run.voided).toBe(false);
  });
});
