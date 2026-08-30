/**
 * **The campaigns**, and a campaign has two shapes and two only: the **verdict**,
 * which judges, and the **scan**, which explores. There are two verdicts — the
 * verdict itself and the overtime — and four scans — the prices, the range, the
 * table and the gradient. (spec 11-27, 11-28)
 *
 * **A verdict applies the grid**; a scan carries no cell of it, hands back a
 * table, and always comes out at nought. That is the whole of what separates
 * them, and it is why a scan is free to try figures the spec refuses — a cadence
 * of four seconds, a table blown up — without laying anything down.
 * (spec 11-29, 11-33, 11-34)
 *
 * **The seeds are five, numbered one to five, and the same for every campaign.**
 * (spec 11-37)
 *
 * **Nothing here reads a clock.** A campaign counts steps, hands them to
 * `playRun` and reads what comes back. (spec 11-6, 11-7)
 */
import type { Balance, WaveRow } from '../src/game/balance';
import { CHILD, PROFILES, type Profile, RACER } from './profiles';
import { type Run, playRun } from './run';
import { type Crossed, crossings, overtimeCrossings } from './thresholds';

/** Five, numbered one to five, and the same for every campaign. (spec 11-37) */
export const SEEDS: readonly number[] = [1, 2, 3, 4, 5];

/** The overtime is played to the fall of the town hall or to this wave. (spec 11-30) */
export const OVERTIME_LAST_WAVE = 30;

/** What a verdict hands back: the runs it played, and the cells they crossed. */
export interface Verdict {
  readonly name: string;
  readonly runs: readonly Run[];
  readonly crossed: readonly Crossed[];
}

/** One variant of one axis of a scan. */
export interface Variant {
  /** The value of the axis, written as the tables of chapter 11 write it. */
  readonly at: string;
  /** Null when the variant could not be opened at all. (spec 11-36) */
  readonly run: Run | null;
  /** A variant walked out of the nail is **marked**, never refused, never hidden. */
  readonly marked: string;
}

export interface Axis {
  readonly name: string;
  readonly variants: readonly Variant[];
}

/** What a scan hands back: axes and their variants, and never a cell. (spec 11-33) */
export interface Scan {
  readonly name: string;
  readonly axes: readonly Axis[];
  /**
   * The condition of **reading** of the gradient, which is not a threshold: it is
   * written out for the human who reads the table, and it changes no exit code.
   * Empty for the three other scans. (spec 11-35)
   */
  readonly reading: readonly string[];
}

// ------------------------------------------------------------- the verdicts

/**
 * **The verdict**: the three profiles on five seeds, waves one to ten, and the
 * grid of acceptance applied to what comes out. Fifteen runs. (spec 11-29)
 */
export function playVerdict(balance: Balance): Verdict {
  const runs: Run[] = [];
  for (const profile of PROFILES) {
    for (const seed of SEEDS) runs.push(playRun(balance, profile, seed, balance.pace.mainWaves));
  }
  return { name: 'verdict', runs, crossed: crossings(balance, runs) };
}

/**
 * **The overtime**: the child and the racer on five seeds, to the fall of the
 * town hall or to wave thirty. Ten runs, and three refusals of its own — the
 * child must reach the landing of chapter 1, the game must end one day, and
 * playing better must be worth something. (spec 11-30, 11-31)
 */
export function playOvertimeVerdict(balance: Balance): Verdict {
  const childRuns: Run[] = [];
  const racerRuns: Run[] = [];
  for (const seed of SEEDS) {
    childRuns.push(playRun(balance, CHILD, seed, OVERTIME_LAST_WAVE));
    racerRuns.push(playRun(balance, RACER, seed, OVERTIME_LAST_WAVE));
  }
  return {
    name: 'overtime',
    runs: [...childRuns, ...racerRuns],
    crossed: overtimeCrossings(childRuns, racerRuns),
  };
}

// ----------------------------------------------------------------- the scans

/**
 * Every scan plays **the child and the seed one**, one axis at a time, over the
 * same waves the verdict plays. The spec fixes the profile and the seed and
 * leaves the waves open; taking the ten of the verdict is what makes the two
 * tables comparable line for line, which is the only use a scan has.
 * (spec 11-32, and chapter 11 "Les quatre balayages")
 */
const SCAN_SEED = 1;

/** The values of one axis, laid out from whole counts so no step drifts. */
function stepsOf(first: number, count: number, by: number): number[] {
  const found: number[] = [];
  for (let at = 0; at < count; at += 1) found.push(first + at * by);
  return found;
}

/** Two decimals at most, and a comma, as chapter 11 writes its figures. */
function said(value: number): string {
  const written = Number.isInteger(value) ? `${value}` : value.toFixed(2);
  return written.replace('.', ',');
}

/**
 * The six axes of the four scans, each one written as the table of chapter 11
 * writes it: from, to, and the step between. Each interval **holds the value as
 * delivered** — 40 coins, +0,75 per block, 12 blocks on the ground, ×1,00, 6
 * seconds — without which the table would have nothing to be read against.
 * (spec 11, "Les quatre balayages")
 */
export const PRICE_AXIS = stepsOf(30, 7, 5);
export const PER_HEIGHT_AXIS = stepsOf(0.25, 5, 0.25);
export const GROUND_RANGE_AXIS = stepsOf(9, 7, 1);
export const TABLE_FACTOR_AXIS = stepsOf(0.8, 9, 0.05);
export const CADENCE_AXIS = stepsOf(4, 9, 0.5);
export const VENTURE_AXIS = stepsOf(0.05, 10, 0.1);

function variantOf(balance: Balance, profile: Profile, at: string, marked: string): Variant {
  // A table that walks more in than the pool holds cannot be opened at all — the
  // assertion of `waves.ts` says so before the first step. The variant is shown
  // and marked, which is exactly what chapter 11 asks of it. (spec 11-36, 10-43)
  const run = marked === '' ? playRun(balance, profile, SCAN_SEED, balance.pace.mainWaves) : null;
  return { at, run, marked };
}

/**
 * **The prices**: the price of the cannon from 30 to 60 coins in steps of five,
 * seven variants. The tiers and the reinforcements follow it by **the ratios
 * chapter 6 freezes** — a reinforcement costs 1,25 cannon and not fifty coins —
 * so one axis moves and one only. Chapter 6 freezes ratios and not the coins
 * they land on, so each price is rounded to the nearest coin here. The reserve
 * a profile keeps is a figure of the profile and stays where it is: moving it
 * with the price would be a second axis. (spec 11-32, 06 "Les prix")
 */
export function playPricesScan(balance: Balance): Scan {
  const variants = PRICE_AXIS.map((price) => {
    const prices = balance.economy.prices;
    const ratio = price / prices.cannon;
    const moved: Balance = {
      ...balance,
      economy: {
        ...balance.economy,
        prices: {
          ...prices,
          cannon: price,
          tierTwo: Math.round(prices.tierTwo * ratio),
          tierThree: Math.round(prices.tierThree * ratio),
          reinforcements: prices.reinforcements.map((one) => Math.round(one * ratio)),
          reinforcementAgain: Math.round(prices.reinforcementAgain * ratio),
        },
      },
    };
    return variantOf(moved, CHILD, `${said(price)} pièces`, '');
  });
  return {
    name: 'prices',
    axes: [{ name: 'Le prix du canon', variants }],
    reading: [],
  };
}

/**
 * **The range**: the rise per block of height from 0,25 to 1,25 in steps of a
 * quarter, five variants; then the range on the ground from 9 to 15 blocks in
 * steps of one, seven variants. Two axes, one at a time. (spec 11, "Les quatre
 * balayages")
 */
export function playRangeScan(balance: Balance): Scan {
  const perHeight = PER_HEIGHT_AXIS.map((rise) => {
    const moved: Balance = {
      ...balance,
      cannon: { ...balance.cannon, ball: { ...balance.cannon.ball, perHeight: rise } },
    };
    return variantOf(moved, CHILD, `+${said(rise)} par bloc`, '');
  });
  const onTheGround = GROUND_RANGE_AXIS.map((blocks) => {
    const moved: Balance = {
      ...balance,
      cannon: { ...balance.cannon, ball: { ...balance.cannon.ball, range: blocks } },
    };
    return variantOf(moved, CHILD, `${said(blocks)} blocs`, '');
  });
  return {
    name: 'range',
    axes: [
      { name: 'La majoration par bloc de hauteur', variants: perHeight },
      { name: 'La portée de base au sol', variants: onTheGround },
    ],
    reading: [],
  };
}

/**
 * **The table**: the totals of the wave table from ×0,8 to ×1,2 in steps of a
 * twentieth, nine variants; then the cadence between two packs from 4 to 8
 * seconds in steps of a half, nine variants. Both walk out of what the spec
 * allows, and that is the work of a scan. (spec 11-34, 11-36)
 */
export function playTableScan(balance: Balance): Scan {
  const totals = TABLE_FACTOR_AXIS.map((factor) => {
    const waves: WaveRow[] = balance.waves.map((row) => ({
      wave: row.wave,
      shamblers: Math.round(row.shamblers * factor),
      sprinters: Math.round(row.sprinters * factor),
      bruisers: Math.round(row.bruisers * factor),
      colossi: Math.round(row.colossi * factor),
      streets: row.streets,
    }));
    let fullest = 0;
    for (const row of waves) {
      const total = row.shamblers + row.sprinters + row.bruisers + row.colossi;
      if (total > fullest) fullest = total;
    }
    const marked =
      fullest > balance.pools.zombies
        ? `un total monte à ${fullest} — au-delà de ${balance.pools.zombies}, la partie ne s'ouvre pas`
        : '';
    return variantOf({ ...balance, waves }, CHILD, `×${said(factor)}`, marked);
  });

  const cadence = CADENCE_AXIS.map((seconds) => {
    const moved: Balance = { ...balance, assault: { ...balance.assault, cadence: seconds } };
    return variantOf(moved, CHILD, `${said(seconds)} s`, '');
  });

  return {
    name: 'table',
    axes: [
      { name: 'Les totaux de la table des vagues', variants: totals },
      { name: 'La cadence entre deux paquets', variants: cadence },
    ],
    reading: [],
  };
}

/** How far apart two neighbouring ventures may leave the town hall. (spec 11-35) */
export const GRADIENT_MOST_APART = 40;

/**
 * **The gradient**: `venture` from 0,05 to 0,95 in steps of a tenth, ten
 * variants. It is the one scan that moves a figure of the pilot rather than one
 * of the balance, and that is exactly what five settings bought: the gradient
 * does nothing but slide one of them.
 *
 * It carries a **condition of reading** and not a threshold — the town hall
 * holds at every venture, and the hits it takes make no step of more than forty
 * between two neighbouring ventures. The bench will never know how far down a
 * child of eight goes; the question that can be answered is whether the balance
 * is acceptable at every venture, and that one protects the timid child as much
 * as the bold one. It is written under the table and it changes no exit code.
 * (spec 11-35, and chapter 11 "Pourquoi le seuil de profondeur se retourne")
 */
export function playGradientScan(balance: Balance): Scan {
  const variants = VENTURE_AXIS.map((venture) => {
    const profile: Profile = { ...CHILD, venture };
    const run = playRun(balance, profile, SCAN_SEED, balance.pace.mainWaves);
    return { at: said(Math.round(venture * 100) / 100), run, marked: '' };
  });

  const fallen = variants.filter((one) => one.run !== null && !one.run.standing);
  const reading: string[] = [
    fallen.length === 0
      ? 'La mairie tient à toutes les profondeurs.'
      : `La mairie tombe à ${fallen.length} profondeur(s).`,
  ];

  let widest = 0;
  let between = '';
  for (let at = 1; at < variants.length; at += 1) {
    const before = variants[at - 1].run;
    const after = variants[at].run;
    if (before === null || after === null) continue;
    const apart = Math.abs(after.indicators.townHallHits - before.indicators.townHallHits);
    if (apart > widest) {
      widest = apart;
      between = `${variants[at - 1].at} → ${variants[at].at}`;
    }
  }
  reading.push(
    widest <= GRADIENT_MOST_APART
      ? `La plus grande marche est de ${widest} (${between}), sous ${GRADIENT_MOST_APART}.`
      : `La plus grande marche est de ${widest} (${between}), au-dessus de ${GRADIENT_MOST_APART}.`,
  );

  return { name: 'gradient', axes: [{ name: 'venture', variants }], reading };
}

/** The four scans, by the name the argument of `npm run bench` carries. */
export const SCANS: { readonly [name: string]: (balance: Balance) => Scan } = {
  prices: playPricesScan,
  range: playRangeScan,
  table: playTableScan,
  gradient: playGradientScan,
};
