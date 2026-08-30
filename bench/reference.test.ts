/**
 * **The frozen run, played again and compared.** `bench/reference.json` holds the
 * eight indicators of one run and one only — the child, seed one, waves one to
 * ten — and this file replays it. Touching `balance.ts` breaks this test, and
 * that is what it is for. (spec 11-42, 11-43)
 *
 * It is **not one more test**: it is the readable **account of a retouch of the
 * balance**. Bringing the price of the cannon down from 40 to 35 moves eight
 * figures, and those eight figures are in the diff of the pull request — the
 * duration, the coins, the share taken at the sword, the hits the town hall
 * took. Without it a retouch of the balance is read by hunting for whatever it
 * might have changed. (spec 11-45, and chapter 11 "Pourquoi une partie de
 * référence gelée")
 *
 * It is repaired by `npm run bench -- --freeze` and **never by hand**: the file
 * has value only as the exact replay of the balance in hand, and a figure typed
 * into it is a figure nothing produced. (spec 11-44)
 *
 * This one tries the **balance**; the replay byte for byte of `run.test.ts`
 * tries the **engine**. Neither stands in for the other. (spec 11-46)
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { CHILD } from './profiles';
import { type Reference, playRun, referenceOf } from './run';

const FROZEN = JSON.parse(
  readFileSync(new URL('./reference.json', import.meta.url), 'utf8'),
) as Reference;

describe('the reference run', () => {
  it('is the child on seed one, over the waves of the main game', () => {
    // spec 11-42
    expect(FROZEN.profile).toBe(CHILD.name);
    expect(FROZEN.seed).toBe(1);
    expect(FROZEN.waves).toBe(BALANCE.pace.mainWaves);
  });

  it('freezes the eight indicators, and no ninth', () => {
    // spec 11-16, 11-18, 11-19
    expect(Object.keys(FROZEN.indicators).sort()).toEqual([
      'breaches',
      'cannons',
      'coins',
      'collapses',
      'minutes',
      'peak',
      'swordShare',
      'townHallHits',
    ]);
    expect(Object.keys(FROZEN.indicators.breaches).sort()).toEqual([
      'count',
      'longestFor',
      'meanFor',
    ]);
    expect(FROZEN.indicators.cannons.length).toBe(BALANCE.cannon.tiers);
  });

  it('plays again to the same eight figures', () => {
    // A red here is not a bug of this file: it says the balance moved, and the
    // repair is `npm run bench -- --freeze` in the same pull request as the
    // retouch, never a figure typed in. (spec 11-43, 11-44, 11-47)
    expect(referenceOf(BALANCE)).toEqual(FROZEN);
  });

  it('holds the landmarks chapter 11 asks the bench to find again', () => {
    // The town hall is budgeted 166 shambler hits over waves 1 to 10 and the
    // reference purse 823 coins; what the bench actually finds is written in
    // `reference.json` and judged by the grid, not here. This test only asks
    // that the run be the one the grid reads: the child, seed one, the ten waves
    // of the main game, played whole and won. (spec 11-42, 01-25)
    const run = playRun(BALANCE, CHILD, 1, BALANCE.pace.mainWaves);
    expect(run.wave).toBe(BALANCE.pace.mainWaves);
    expect(run.won).toBe(true);
    expect(run.standing).toBe(true);
    expect(run.voided).toBe(false); // spec 11-25
  });
});
