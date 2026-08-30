/**
 * The grid of acceptance, cell by cell. Every figure here is written **by hand
 * from the spec**, which is the only way the grid and chapter 11 can be caught
 * disagreeing. (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE, type Balance } from '../src/game/balance';
import type { Run } from './run';
import {
  GRID,
  type Threshold,
  allCannons,
  crossings,
  holds,
  largestWave,
  overtimeCrossings,
  worstOf,
} from './thresholds';

/** A run whose eight indicators say whatever a test needs them to say. */
function forged(profile: string, seed: number, over: Partial<Run> = {}): Run {
  return {
    profile,
    seed,
    wave: 10,
    won: true,
    standing: true,
    steps: 54800,
    ended: true,
    indicators: {
      townHallHits: 100,
      minutes: 15,
      peak: 40,
      swordShare: 40,
      coins: 800,
      cannons: [6, 1, 0],
      collapses: 0,
      breaches: { count: 10, meanFor: 5, longestFor: 10 },
    },
    voided: false,
    reinforcements: 0,
    colossusAtTownHall: false,
    ...over,
  };
}

const cellsOf = (profile: string, cell: string): Threshold[] =>
  GRID.filter((one) => one.profile === profile && one.cell === cell);

const limitsOf = (profile: string, cell: string): number[] =>
  cellsOf(profile, cell).map((one) => one.limit);

describe('a cell is a figure and a comparison, and it binds one profile', () => {
  it('names a profile on every one of them', () => {
    // spec 11-20, 11-21
    for (const threshold of GRID) {
      expect(['watcher', 'child', 'racer']).toContain(threshold.profile);
      expect(Number.isFinite(threshold.limit)).toBe(true);
    }
  });

  it('writes the column of the child, which is the one the grid binds', () => {
    // spec 11-13, and the grid of acceptance of chapter 11
    expect(limitsOf('child', 'Dégâts cumulés v1-10')).toEqual([166]);
    expect(limitsOf('child', 'Renforts achetés')).toEqual([1]);
    expect(limitsOf('child', 'Durée v1-10').sort((a, b) => a - b)).toEqual([12, 18]);
    expect(limitsOf('child', "Part tuée à l'épée").sort((a, b) => a - b)).toEqual([35, 50]);
    expect(limitsOf('child', 'Pièces gagnées').sort((a, b) => a - b)).toEqual([760, 900]);
    expect(limitsOf('child', 'Canons en fin de partie').sort((a, b) => a - b)).toEqual([6, 9]);
    expect(limitsOf('child', 'Fuite la plus longue')).toEqual([20]);
  });

  it('writes the column of the watcher, who bounds the floor', () => {
    // spec 11-12, and the grid of acceptance
    expect(limitsOf('watcher', 'Durée v1-10')).toEqual([20]);
    expect(limitsOf('watcher', "Part tuée à l'épée")).toEqual([15]);
    expect(limitsOf('watcher', 'Pièces gagnées')).toEqual([584]);
    expect(limitsOf('watcher', 'Canons en fin de partie')).toEqual([4]);
  });

  it('writes the column of the racer, who bounds the ceiling', () => {
    // spec 11-14, and the grid of acceptance
    expect(limitsOf('racer', 'Dégâts cumulés v1-10')).toEqual([100]);
    expect(limitsOf('racer', 'Renforts achetés')).toEqual([0]);
    expect(limitsOf('racer', 'Durée v1-10')).toEqual([11]);
    expect(limitsOf('racer', "Part tuée à l'épée")).toEqual([50]);
    expect(limitsOf('racer', 'Pièces gagnées')).toEqual([1068]);
    expect(limitsOf('racer', 'Canons en fin de partie')).toEqual([24]);
    expect(limitsOf('racer', 'Fuite la plus longue')).toEqual([10]);
  });

  it('leaves the watcher his reinforcements and his longest breach', () => {
    // Free, and a dash: chapter 11 writes them so, and an absent cell is the
    // decision. (spec 11, grid of acceptance)
    expect(cellsOf('watcher', 'Renforts achetés')).toEqual([]);
    expect(cellsOf('watcher', 'Fuite la plus longue')).toEqual([]);
  });
});

describe('the colossus at the town hall, and the one exception to it', () => {
  it('refuses it for the child and for the racer', () => {
    // The colossus is a threshold and not an indicator: chapter 3 budgets it at
    // nought, and this cell is what checks that nought. (spec 11-23)
    expect(limitsOf('child', 'Le Colosse atteint la mairie')).toEqual([0]);
    expect(limitsOf('racer', 'Le Colosse atteint la mairie')).toEqual([0]);
  });

  it('tolerates it for the watcher, the one test the valve ever gets', () => {
    // He alone may let it through, because a player who never leaves the square
    // and buys reinforcements back is the only place the valve of chapter 6 is
    // tried at all. (spec 11-24)
    expect(cellsOf('watcher', 'Le Colosse atteint la mairie')).toEqual([]);
    const through = [forged('watcher', 1, { colossusAtTownHall: true })];
    expect(crossings(BALANCE, through).map((one) => one.cell)).not.toContain(
      'Le Colosse atteint la mairie',
    );
  });
});

describe('the two indicators that carry no cell', () => {
  it('puts no cell on the collapses, ever', () => {
    // Their number follows from `care`, a figure the profile chose: scoring it
    // would be scoring one's own programming. (spec 11-25, and the interdicts)
    expect(cellsOf('watcher', 'Écroulements')).toEqual([]);
    expect(cellsOf('child', 'Écroulements')).toEqual([]);
    expect(cellsOf('racer', 'Écroulements')).toEqual([]);
  });

  it('puts no cell on the peak, which the assertion of `waves.ts` bounds', () => {
    // spec 11-26
    expect(GRID.filter((one) => one.cell.includes('Pic'))).toEqual([]);
  });
});

describe("the total of a wave, the same figure for the three profiles", () => {
  it('holds at sixty on the table as delivered', () => {
    // spec 11-26, 10-43
    expect(largestWave(BALANCE)).toBe(60);
    expect(limitsOf('watcher', "Total d'une vague")).toEqual([60]);
    expect(limitsOf('child', "Total d'une vague")).toEqual([60]);
    expect(limitsOf('racer', "Total d'une vague")).toEqual([60]);
  });

  it('crosses on a table blown past it', () => {
    const blown: Balance = {
      ...BALANCE,
      waves: BALANCE.waves.map((row) => ({ ...row, shamblers: row.shamblers + 40 })),
    };
    const crossed = crossings(blown, [forged('child', 1)]);
    expect(crossed.map((one) => one.cell)).toContain("Total d'une vague");
  });
});

describe('a cell is judged on the worst of the five seeds', () => {
  const runs = [
    forged('child', 1, { indicators: { ...forged('child', 1).indicators, townHallHits: 10 } }),
    forged('child', 2, { indicators: { ...forged('child', 1).indicators, townHallHits: 300 } }),
    forged('child', 3, { indicators: { ...forged('child', 1).indicators, townHallHits: 20 } }),
  ];

  it('takes the largest reading under a ceiling, and never the mean', () => {
    // The mean of those three is 110, which holds; the worst is 300, which does
    // not — and it is the worst that decides. (spec 11-22, and the interdicts)
    const cell = cellsOf('child', 'Dégâts cumulés v1-10')[0];
    expect(worstOf(cell, runs, BALANCE)).toEqual({ value: 300, seed: 2 });
    expect(crossings(BALANCE, runs).map((one) => one.worst)).toContain(300);
  });

  it('takes the smallest reading under a floor', () => {
    const cell = cellsOf('racer', 'Pièces gagnées')[0];
    expect(cell.atMost).toBe(true); // the racer's coins are a ceiling
    const floorCell = cellsOf('watcher', 'Pièces gagnées')[0];
    const purses = [
      forged('watcher', 1, { indicators: { ...forged('watcher', 1).indicators, coins: 900 } }),
      forged('watcher', 2, { indicators: { ...forged('watcher', 1).indicators, coins: 500 } }),
    ];
    expect(worstOf(floorCell, purses, BALANCE)).toEqual({ value: 500, seed: 2 });
  });

  it('leaves a void run out, for it counts neither way', () => {
    // spec 11-25
    const withVoid = [
      forged('child', 1, {
        voided: true,
        indicators: { ...forged('child', 1).indicators, townHallHits: 900 },
      }),
      forged('child', 2),
    ];
    const cell = cellsOf('child', 'Dégâts cumulés v1-10')[0];
    expect(worstOf(cell, withVoid, BALANCE)).toEqual({ value: 100, seed: 2 });
  });
});

describe('the comparison', () => {
  it('reads a ceiling and a floor the way the grid writes them', () => {
    // spec 11-20
    const ceiling = cellsOf('child', 'Dégâts cumulés v1-10')[0];
    expect(holds(ceiling, 166)).toBe(true);
    expect(holds(ceiling, 167)).toBe(false);
    const floorCell = cellsOf('watcher', 'Pièces gagnées')[0];
    expect(holds(floorCell, 584)).toBe(true);
    expect(holds(floorCell, 583)).toBe(false);
  });

  it('counts the cannons of a run over its tiers and never one by one', () => {
    // spec 11-19
    expect(allCannons(forged('child', 1))).toBe(7);
  });
});

describe('the three refusals of the overtime', () => {
  const child = (seed: number, wave: number, standing: boolean): Run =>
    forged('child', seed, { wave, standing });
  const racer = (seed: number, wave: number): Run =>
    forged('racer', seed, { wave, standing: false });

  it('accepts a child who falls between wave 14 and wave 30, beaten by the racer', () => {
    // spec 11-31
    const crossed = overtimeCrossings(
      [child(1, 18, false), child(2, 20, false)],
      [racer(1, 22), racer(2, 24)],
    );
    expect(crossed).toEqual([]);
  });

  it('refuses a child who falls before wave 14', () => {
    // The landing of chapter 1 has to be reachable. (spec 11-31)
    const crossed = overtimeCrossings([child(1, 13, false)], [racer(1, 20)]);
    expect(crossed.map((one) => one.cell)).toContain("L'enfant tombe avant la vague 14");
    expect(crossed[0].worst).toBe(13);
    expect(crossed[0].limit).toBe(14);
  });

  it('refuses a child still standing when wave 30 comes', () => {
    // An overtime without an end is no longer an end of a game. (spec 11-31)
    const crossed = overtimeCrossings([child(1, 30, true)], [racer(1, 30)]);
    expect(crossed.map((one) => one.cell)).toContain("L'enfant tient au-delà de la vague 30");
  });

  it('refuses a racer who holds fewer than three waves more than the child', () => {
    // Playing better has to be worth something. (spec 11-31)
    const crossed = overtimeCrossings([child(1, 20, false)], [racer(1, 22)]);
    const found = crossed.find((one) => one.cell.startsWith('Le pressé'));
    expect(found?.worst).toBe(2);
    expect(found?.limit).toBe(3);
  });
});
