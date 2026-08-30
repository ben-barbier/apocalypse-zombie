/**
 * **The grid of acceptance**: the whole of what the bench is allowed to judge,
 * and it judges nothing else. A cell of this grid is **a figure and a
 * comparison**, never an opinion — that is what makes the bench readable by
 * something that reads an exit code rather than a paragraph. (spec 11-20)
 *
 * **A cell always binds one profile.** The same two hundred hits of the town
 * hall praise the watcher and condemn the racer, so there is no such thing here
 * as a threshold on its own: every one of them carries the name of the profile
 * it belongs to. (spec 11-21)
 *
 * **A cell is judged on the worst of the five seeds, never on their mean.** The
 * chance in this game is thin, five seeds are enough to bring out a worst case,
 * and it is that worst case which decides whether a child lives the game that
 * was written. A mean drowns it in four quiet runs, and a balance that breaks
 * one time in five would pass. Which run is the worst follows from the
 * comparison itself: for a ceiling it is the largest reading, for a floor the
 * smallest. (spec 11-22, and chapter 11 "Pourquoi la pire des graines")
 *
 * **A void run is neither for the balance nor against it** and is left out of
 * every reading here. Past the ceiling of collapses the pilot is no longer
 * playing the game that was designed, so it is the profile one repairs.
 * (spec 11-25)
 *
 * Six of the nine rows read one of the eight indicators. Three read the run
 * itself and open no ninth indicator: the reinforcements bought, the colossus
 * come to the town hall, and the largest line of the wave table. Two indicators
 * carry no cell at all — the peak of living bodies, which the assertion of
 * `waves.ts` already bounds, and the collapses, which are a guard-rail of the
 * pilot. (spec 11-16, 11-23, 11-25, 11-26, and the grid of chapter 11)
 *
 * There is **no cell on a scan**, ever: a scan explores and never judges, which
 * is the whole of what separates it from a verdict. (spec 11-33)
 */
import type { Balance } from '../src/game/balance';
import { totalOf } from '../src/game/waves';
import type { Run } from './run';

/**
 * One cell of the grid: a figure, a comparison, and the profile it binds.
 * `counted` is what the figure is counted in, and it is printed beside it when
 * the cell is crossed. (spec 11-20, 11-21, 11-39)
 */
export interface Threshold {
  readonly profile: string;
  /** How chapter 11 names the row, printed as it is written there. */
  readonly cell: string;
  readonly counted: string;
  readonly limit: number;
  /** True for a ceiling (value ≤ limit), false for a floor (value ≥ limit). */
  readonly atMost: boolean;
  readonly readOf: (run: Run, balance: Balance) => number;
}

/** A cell that was crossed, in **value against threshold**. (spec 11-39) */
export interface Crossed {
  readonly profile: string;
  readonly cell: string;
  readonly counted: string;
  /** The reading of the worst of the five seeds. (spec 11-22) */
  readonly worst: number;
  readonly limit: number;
  readonly atMost: boolean;
  /** Which seed that was, or −1 for a cell no single seed answers for. */
  readonly seed: number;
}

const ceiling = (
  profile: string,
  cell: string,
  counted: string,
  limit: number,
  readOf: (run: Run, balance: Balance) => number,
): Threshold => ({ profile, cell, counted, limit, atMost: true, readOf });

const floor = (
  profile: string,
  cell: string,
  counted: string,
  limit: number,
  readOf: (run: Run, balance: Balance) => number,
): Threshold => ({ profile, cell, counted, limit, atMost: false, readOf });

/** The cannons still standing, all tiers together. (spec 11-19) */
export function allCannons(run: Run): number {
  let found = 0;
  for (const at of run.indicators.cannons) found += at;
  return found;
}

/**
 * The fullest line of the wave table, overtime included. It is read off the
 * balance and not off a run, because it is a property of the table and not of a
 * game: the assertion of `waves.ts` already holds it on the table as delivered,
 * and the row only takes its meaning back in a scan, where a table blown up to
 * ×1,2 walks out of the nail. (spec 11-26, 10-43)
 */
export function largestWave(balance: Balance): number {
  let found = 0;
  for (const row of balance.waves) {
    const total = totalOf(row);
    if (total > found) found = total;
  }
  return found;
}

/**
 * The grid of chapter 11, row by row and column by column. Two cells of the
 * table are deliberately absent and their absence is the decision: the
 * reinforcements of the watcher, which are free, and his longest breach, which
 * chapter 11 writes as a dash. His colossus is absent for a third reason, and a
 * loud one — **he is the one profile allowed to let it through**, because a
 * player who never leaves the square, takes everything and buys reinforcements
 * back is the only test the valve of chapter 6 ever gets. (spec 11-23, 11-24)
 */
export const GRID: readonly Threshold[] = [
  // ------------------------------------------------------------ the watcher
  ceiling('watcher', 'Dégâts cumulés v1-10', 'parties où la mairie tombe', 0, (run) =>
    run.standing ? 0 : 1,
  ),
  ceiling('watcher', 'Durée v1-10', 'minutes', 20, (run) => run.indicators.minutes),
  floor('watcher', "Part tuée à l'épée", '%', 15, (run) => run.indicators.swordShare),
  floor('watcher', 'Pièces gagnées', 'pièces', 584, (run) => run.indicators.coins),
  floor('watcher', 'Canons en fin de partie', 'canons', 4, allCannons),
  ceiling('watcher', "Total d'une vague", 'zombies', 60, (_run, balance) =>
    largestWave(balance),
  ),

  // -------------------------------------------------------------- the child
  ceiling('child', 'Dégâts cumulés v1-10', 'coups de Traînard', 166, (run) =>
    run.indicators.townHallHits,
  ),
  ceiling('child', 'Renforts achetés', 'Renforts', 1, (run) => run.reinforcements),
  floor('child', 'Durée v1-10', 'minutes', 12, (run) => run.indicators.minutes),
  ceiling('child', 'Durée v1-10', 'minutes', 18, (run) => run.indicators.minutes),
  floor('child', "Part tuée à l'épée", '%', 35, (run) => run.indicators.swordShare),
  ceiling('child', "Part tuée à l'épée", '%', 50, (run) => run.indicators.swordShare),
  floor('child', 'Pièces gagnées', 'pièces', 760, (run) => run.indicators.coins),
  ceiling('child', 'Pièces gagnées', 'pièces', 900, (run) => run.indicators.coins),
  floor('child', 'Canons en fin de partie', 'canons', 6, allCannons),
  ceiling('child', 'Canons en fin de partie', 'canons', 9, allCannons),
  ceiling('child', 'Fuite la plus longue', 'secondes', 20, (run) =>
    run.indicators.breaches.longestFor,
  ),
  ceiling('child', 'Le Colosse atteint la mairie', 'parties', 0, (run) =>
    run.colossusAtTownHall ? 1 : 0,
  ),
  ceiling('child', "Total d'une vague", 'zombies', 60, (_run, balance) => largestWave(balance)),

  // -------------------------------------------------------------- the racer
  ceiling('racer', 'Dégâts cumulés v1-10', 'coups de Traînard', 100, (run) =>
    run.indicators.townHallHits,
  ),
  ceiling('racer', 'Renforts achetés', 'Renforts', 0, (run) => run.reinforcements),
  floor('racer', 'Durée v1-10', 'minutes', 11, (run) => run.indicators.minutes),
  floor('racer', "Part tuée à l'épée", '%', 50, (run) => run.indicators.swordShare),
  ceiling('racer', 'Pièces gagnées', 'pièces', 1068, (run) => run.indicators.coins),
  ceiling('racer', 'Canons en fin de partie', 'canons', 24, allCannons),
  ceiling('racer', 'Fuite la plus longue', 'secondes', 10, (run) =>
    run.indicators.breaches.longestFor,
  ),
  ceiling('racer', 'Le Colosse atteint la mairie', 'parties', 0, (run) =>
    run.colossusAtTownHall ? 1 : 0,
  ),
  ceiling('racer', "Total d'une vague", 'zombies', 60, (_run, balance) => largestWave(balance)),
];

/** Whether one reading answers one cell. */
export function holds(threshold: Threshold, value: number): boolean {
  return threshold.atMost ? value <= threshold.limit : value >= threshold.limit;
}

/**
 * The worst of the five seeds for one cell — the largest reading under a
 * ceiling, the smallest under a floor — and the seed it came from. Void runs are
 * left out, and a profile all of whose runs are void answers nothing at all.
 * (spec 11-22, 11-25)
 */
export function worstOf(
  threshold: Threshold,
  runs: readonly Run[],
  balance: Balance,
): { value: number; seed: number } | null {
  let worst: { value: number; seed: number } | null = null;
  for (const run of runs) {
    if (run.profile !== threshold.profile || run.voided) continue;
    const value = threshold.readOf(run, balance);
    if (worst === null || (threshold.atMost ? value > worst.value : value < worst.value)) {
      worst = { value, seed: run.seed };
    }
  }
  return worst;
}

/** Every cell of the grid the runs crossed, and nothing else. (spec 11-39) */
export function crossings(balance: Balance, runs: readonly Run[]): Crossed[] {
  const found: Crossed[] = [];
  for (const threshold of GRID) {
    const worst = worstOf(threshold, runs, balance);
    if (worst === null || holds(threshold, worst.value)) continue;
    found.push({
      profile: threshold.profile,
      cell: threshold.cell,
      counted: threshold.counted,
      worst: worst.value,
      limit: threshold.limit,
      atMost: threshold.atMost,
      seed: worst.seed,
    });
  }
  return found;
}

/**
 * The three refusals of the overtime, which no cell of the grid can hold because
 * each of them reads two profiles at once or the end of a run rather than a
 * figure taken during it. They are thresholds all the same — a figure and a
 * comparison — and they are judged on the worst of the five seeds like every
 * other. (spec 11-31)
 *
 * The second one is read as "still standing when wave thirty comes", because the
 * campaign stops there: a run that is asked to go to the fall or to wave thirty
 * and reaches wave thirty on its feet is exactly the run that holds past it, and
 * playing further to find out would only move the same question one wave along.
 * (spec 11-30, 11-31)
 */
export function overtimeCrossings(
  childRuns: readonly Run[],
  racerRuns: readonly Run[],
): Crossed[] {
  const child = childRuns.filter((run) => !run.voided);
  const racer = racerRuns.filter((run) => !run.voided);
  const found: Crossed[] = [];

  let soonest: Run | null = null;
  for (const run of child) if (soonest === null || run.wave < soonest.wave) soonest = run;
  if (soonest !== null && soonest.wave < 14) {
    found.push({
      profile: 'child',
      cell: "L'enfant tombe avant la vague 14",
      counted: 'vagues',
      worst: soonest.wave,
      limit: 14,
      atMost: false,
      seed: soonest.seed,
    });
  }

  const held = child.filter((run) => run.standing).length;
  if (held > 0) {
    found.push({
      profile: 'child',
      cell: "L'enfant tient au-delà de la vague 30",
      counted: 'parties encore debout',
      worst: held,
      limit: 0,
      atMost: true,
      seed: -1,
    });
  }

  let narrowest: { value: number; seed: number } | null = null;
  for (const run of racer) {
    const same = child.find((other) => other.seed === run.seed);
    if (same === undefined) continue;
    const value = run.wave - same.wave;
    if (narrowest === null || value < narrowest.value) narrowest = { value, seed: run.seed };
  }
  if (narrowest !== null && narrowest.value < 3) {
    found.push({
      profile: 'racer',
      cell: 'Le pressé tient au moins 3 vagues de plus',
      counted: 'vagues',
      worst: narrowest.value,
      limit: 3,
      atMost: false,
      seed: narrowest.seed,
    });
  }

  return found;
}
