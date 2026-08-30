/**
 * The two verdicts and the four scans. The figures of the six axes are written
 * **by hand from the tables of chapter 11**, so a table and this file cannot
 * drift apart in silence. (spec 10-42)
 *
 * The campaigns that judge are played over a **shortened balance** here: what is
 * being tried is the shape of a campaign — how many runs, which profiles, which
 * seeds, what it marks and what it refuses to judge — and none of that depends
 * on how many waves a run lasts. What the balance as delivered does is the work
 * of `npm run bench`, and of nothing else.
 */
import { describe, expect, it } from 'vitest';
import { BALANCE, type Balance } from '../src/game/balance';
import {
  CADENCE_AXIS,
  GRADIENT_MOST_APART,
  GROUND_RANGE_AXIS,
  OVERTIME_LAST_WAVE,
  PER_HEIGHT_AXIS,
  PRICE_AXIS,
  SCANS,
  SEEDS,
  TABLE_FACTOR_AXIS,
  VENTURE_AXIS,
  playGradientScan,
  playOvertimeVerdict,
  playPricesScan,
  playRangeScan,
  playTableScan,
  playVerdict,
} from './campaigns';

/** Two waves is enough to see the shape of a campaign, and it is quick. */
const SHORT: Balance = { ...BALANCE, pace: { ...BALANCE.pace, mainWaves: 2 } };

const near = (values: readonly number[], decimals = 2): number[] =>
  values.map((one) => Number(one.toFixed(decimals)));

describe('the seeds', () => {
  it('are five, numbered one to five, and the same for every campaign', () => {
    expect([...SEEDS]).toEqual([1, 2, 3, 4, 5]); // spec 11-37
  });
});

describe('the verdict', () => {
  it('plays the three profiles on the five seeds, fifteen runs', () => {
    // spec 11-29
    const verdict = playVerdict(SHORT);
    expect(verdict.runs.length).toBe(15);
    expect(new Set(verdict.runs.map((run) => run.profile))).toEqual(
      new Set(['watcher', 'child', 'racer']),
    );
    expect(new Set(verdict.runs.map((run) => run.seed))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('applies the grid, and hands back the cells that were crossed', () => {
    // spec 11-29, 11-39
    const verdict = playVerdict(SHORT);
    for (const crossed of verdict.crossed) {
      expect(['watcher', 'child', 'racer']).toContain(crossed.profile);
      expect(crossed.cell.length).toBeGreaterThan(0);
    }
  });
});

describe('the overtime', () => {
  it('is played to the fall of the town hall or to wave thirty', () => {
    expect(OVERTIME_LAST_WAVE).toBe(30); // spec 11-30
  });

  it('plays the child and the racer on the five seeds, ten runs', () => {
    // spec 11-30
    const verdict = playOvertimeVerdict(SHORT);
    expect(verdict.runs.length).toBe(10);
    expect(new Set(verdict.runs.map((run) => run.profile))).toEqual(new Set(['child', 'racer']));
    // Ten runs of thirty waves is the longest thing the bench ever plays — about
    // forty-five seconds of reckoning for the campaign as a whole. (spec 11-30)
  }, 60000);
});

describe('the six axes of the four scans', () => {
  it('walks the price of the cannon from 30 to 60 by five, seven variants', () => {
    // spec 11, "Les quatre balayages"
    expect(PRICE_AXIS).toEqual([30, 35, 40, 45, 50, 55, 60]);
    expect(PRICE_AXIS).toContain(BALANCE.economy.prices.cannon); // the value as delivered
  });

  it('walks the rise per block from 0,25 to 1,25 by a quarter, five variants', () => {
    expect(near(PER_HEIGHT_AXIS)).toEqual([0.25, 0.5, 0.75, 1, 1.25]);
    expect(near(PER_HEIGHT_AXIS)).toContain(BALANCE.cannon.ball.perHeight);
  });

  it('walks the range on the ground from 9 to 15 blocks by one, seven variants', () => {
    expect(GROUND_RANGE_AXIS).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(GROUND_RANGE_AXIS).toContain(BALANCE.cannon.ball.range);
  });

  it('walks the totals of the table from ×0,8 to ×1,2 by a twentieth, nine variants', () => {
    expect(near(TABLE_FACTOR_AXIS)).toEqual([0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2]);
    expect(near(TABLE_FACTOR_AXIS)).toContain(1);
  });

  it('walks the cadence from 4 to 8 seconds by a half, nine variants', () => {
    expect(near(CADENCE_AXIS)).toEqual([4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]);
    expect(near(CADENCE_AXIS)).toContain(BALANCE.assault.cadence);
  });

  it('walks `venture` from 0,05 to 0,95 by a tenth, ten variants', () => {
    expect(near(VENTURE_AXIS)).toEqual([
      0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95,
    ]);
    // The three profiles are three readings of that one axis. (spec 11-11)
    expect(near(VENTURE_AXIS)).toContain(0.05);
    expect(near(VENTURE_AXIS)).toContain(0.35);
    expect(near(VENTURE_AXIS)).toContain(0.95);
  });
});

describe('a scan explores and never judges', () => {
  it('carries the four of chapter 11, and no fifth', () => {
    expect(Object.keys(SCANS).sort()).toEqual(['gradient', 'prices', 'range', 'table']); // spec 11-28
  });

  it('plays one profile and one seed, and moves one axis at a time', () => {
    // spec 11-32
    const scan = playPricesScan(SHORT);
    expect(scan.axes.length).toBe(1);
    expect(scan.axes[0].variants.length).toBe(7);
    for (const variant of scan.axes[0].variants) expect(variant.run?.seed).toBe(1);
    for (const variant of scan.axes[0].variants) expect(variant.run?.profile).toBe('child');
  });

  it('moves the tiers and the reinforcements by the ratios chapter 6 freezes', () => {
    // A reinforcement costs 1,25 cannon and a third tier 3 cannons, so at 60
    // coins the cannon they are 75 and 180. (spec 06 "Les prix", 11 "Les prix")
    const prices = BALANCE.economy.prices;
    expect(prices.cannon).toBe(40);
    expect(prices.reinforcements[0] / prices.cannon).toBe(1.25);
    expect(prices.tierThree / prices.cannon).toBe(3);
  });

  it('lays out the two axes of the range, five then seven', () => {
    const scan = playRangeScan(SHORT);
    expect(scan.axes.length).toBe(2);
    expect(scan.axes.map((axis) => axis.variants.length)).toEqual([5, 7]);
  });

  it('lays out the two axes of the table, nine and nine', () => {
    const scan = playTableScan(SHORT);
    expect(scan.axes.map((axis) => axis.variants.length)).toEqual([9, 9]);
  });

  it('marks a variant whose total walks past sixty, and hides none', () => {
    // The scan neither refuses it nor hides it: it says so in the table.
    // (spec 11-34, 11-36)
    const totals = playTableScan(SHORT).axes[0];
    const marked = totals.variants.filter((variant) => variant.marked !== '');
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.map((variant) => variant.at)).toContain('×1,20');
    for (const variant of marked) expect(variant.run).toBeNull();
    expect(totals.variants.length).toBe(9); // every variant is still in the table
  });

  it('carries no cell of the grid, on any of the four', () => {
    // spec 11-33, and the interdicts of chapter 11
    for (const scan of Object.values(SCANS)) {
      const played = scan(SHORT);
      expect(Object.keys(played)).toEqual(['name', 'axes', 'reading']);
    }
  });
});

describe('the gradient and its condition of reading', () => {
  it('is a reading and not a threshold: forty between two neighbours', () => {
    expect(GRADIENT_MOST_APART).toBe(40); // spec 11-35
  });

  it('says whether the town hall holds at every venture, and how wide a step', () => {
    // Read and never refused: the bench will never know how far down a child of
    // eight goes, so what it asks is whether the balance is acceptable at every
    // venture. (spec 11-35)
    const scan = playGradientScan(SHORT);
    expect(scan.axes[0].variants.length).toBe(10);
    expect(scan.reading.length).toBe(2);
    expect(scan.reading[0]).toContain('mairie');
    expect(scan.reading[1]).toContain('marche');
  });
});
