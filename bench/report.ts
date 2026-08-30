/**
 * **What the bench prints**: the table — one line per run, eight columns — then
 * the one line that pronounces, `VERDICT: ACCEPTÉ` or `VERDICT: REFUSÉ`. A
 * refusal lists **only the cells that were crossed**, each in value against
 * threshold, and never the whole grid. (spec 11-38, 11-39)
 *
 * The exit code belongs to `run.ts` and is nought or one, and nothing else: what
 * reads this bench reads a code and a list, and a list of crossed cells in value
 * against threshold cannot be argued with, where fifteen lines and eight columns
 * always can. The table stays printed for the human who wants to understand —
 * but it is not the table that pronounces. (spec 11-40, and chapter 11
 * "Pourquoi un code de sortie plutôt qu'un tableau")
 *
 * Everything here is **French, because it is printed**: the code around it is
 * English, and the two never mix. (ADR-0002)
 */
import type { Verdict, Scan } from './campaigns';
import type { Run } from './run';
import type { Crossed } from './thresholds';

/** What chapter 11 calls each profile, for the column that names a line. */
const CALLED: { readonly [name: string]: string } = {
  watcher: 'Le guetteur',
  child: "L'enfant",
  racer: 'Le pressé',
};

export function calledIn(profile: string): string {
  return CALLED[profile] ?? profile;
}

/** What chapter 11 calls each campaign, and what each one plays. (spec 11, tables) */
const CAMPAIGNS: { readonly [name: string]: string } = {
  verdict: 'Le verdict — les trois profils, graines 1 à 5, vagues 1 à 10',
  overtime:
    "La Rallonge — l'enfant et le pressé, graines 1 à 5, jusqu'à la chute ou la vague 30",
  prices: "Le balayage des prix — l'enfant, graine 1",
  range: "Le balayage de la portée — l'enfant, graine 1",
  table: "Le balayage de la table — l'enfant, graine 1",
  gradient: "Le balayage du gradient — l'enfant, graine 1",
};

export function campaignIn(name: string): string {
  return CAMPAIGNS[name] ?? name;
}

/** A figure written the way chapter 11 writes one: a comma, and no long tail. */
export function said(value: number, decimals = 0): string {
  return value.toFixed(decimals).replace('.', ',');
}

/** The eight columns, in the order chapter 11 lists the eight. (spec 11-16) */
const COLUMNS = [
  'Dégâts',
  'Durée',
  'Pic',
  'Épée',
  'Pièces',
  'Canons',
  'Écroul.',
  'Fuites',
];

/** The eight readings of one run, each written in what it is counted in. */
function cellsOf(run: Run): string[] {
  const breaches = run.indicators.breaches;
  return [
    `${run.indicators.townHallHits}`,
    `${said(run.indicators.minutes, 2)} min`,
    `${run.indicators.peak}`,
    `${said(run.indicators.swordShare, 1)} %`,
    `${run.indicators.coins}`,
    run.indicators.cannons.join('/'),
    `${run.indicators.collapses}`,
    `${breaches.count} · ${said(breaches.meanFor, 1)} s · ${said(breaches.longestFor, 1)} s`,
  ];
}

/**
 * What a line has to say about itself beyond its eight figures. None of it
 * judges and none of it changes an exit code: a run that fell, a run that never
 * ended and a run set aside are all printed rather than hidden, which is what
 * chapter 11 asks of a variant walked out of the nail and what a table owes its
 * reader everywhere else. (spec 11-25, 11-36)
 */
function notesOf(run: Run): string[] {
  const found: string[] = [];
  if (!run.standing) found.push(`la mairie tombe à la vague ${run.wave}`);
  if (!run.ended) found.push('la partie ne se termine pas — arrêtée au plafond de pas');
  if (run.voided) found.push(`partie nulle — ${run.indicators.collapses} écroulements`);
  return found;
}

/** One line of a printed table: what it is, and what came out of it. */
export interface Line {
  readonly label: string;
  readonly run: Run | null;
  /** Why a variant carries a mark, and it is printed rather than hidden. */
  readonly marked: string;
}

/**
 * The table: a first column that names the line, then the eight. Every column is
 * as wide as its widest cell, so a table stays a table however long a label runs.
 */
export function tableOf(lines: readonly Line[]): string[] {
  const head = ['', ...COLUMNS];
  const body = lines.map((line) => [
    line.label,
    ...(line.run === null ? COLUMNS.map(() => '—') : cellsOf(line.run)),
  ]);
  const wide = head.map((cell, at) =>
    Math.max(cell.length, ...body.map((row) => (row[at] ?? '').length)),
  );

  const written: string[] = [];
  const lay = (row: string[]): string =>
    row
      .map((cell, at) => (at === 0 ? cell.padEnd(wide[at]) : cell.padStart(wide[at])))
      .join('  ')
      .trimEnd();

  written.push(lay(head));
  written.push(wide.map((width) => '─'.repeat(width)).join('  '));
  for (let at = 0; at < lines.length; at += 1) {
    written.push(lay(body[at]));
    const line = lines[at];
    if (line.marked !== '') written.push(`    ⚠ ${line.marked}`);
    if (line.run !== null) {
      for (const note of notesOf(line.run)) written.push(`    ⚠ ${note}`);
    }
  }
  return written;
}

/** One line per run, named by its profile and its seed. */
export function linesOf(runs: readonly Run[]): Line[] {
  return runs.map((run) => ({
    label: `${calledIn(run.profile)}, graine ${run.seed}`,
    run,
    marked: '',
  }));
}

/** A crossed cell, in **value against threshold** and in nothing else. (spec 11-39) */
export function crossedIn(crossed: Crossed): string {
  const decimals = Number.isInteger(crossed.worst) ? 0 : 2;
  const against = crossed.atMost ? '≤' : '≥';
  const seed = crossed.seed < 0 ? '' : `, graine ${crossed.seed}`;
  return (
    `  ${calledIn(crossed.profile)} · ${crossed.cell} : ` +
    `${said(crossed.worst, decimals)} contre ${against} ${said(crossed.limit)} ` +
    `${crossed.counted}${seed}`
  );
}

/** The table of one verdict, and nothing that pronounces. (spec 11-38) */
export function verdictIn(verdict: Verdict): string[] {
  return [campaignIn(verdict.name), '', ...tableOf(linesOf(verdict.runs))];
}

/**
 * The one line that pronounces, and the crossed cells under it when it refuses.
 * Nothing else is ever printed after it. (spec 11-38, 11-39)
 */
export function pronounce(crossed: readonly Crossed[]): string[] {
  if (crossed.length === 0) return ['VERDICT: ACCEPTÉ'];
  return ['VERDICT: REFUSÉ', ...crossed.map(crossedIn)];
}

/**
 * A scan: its axes, its variants, and the condition of reading when it carries
 * one. It pronounces nothing — it has no cell to cross and it always comes out
 * at nought. (spec 11-33, 11-35)
 */
export function scanIn(scan: Scan): string[] {
  const written: string[] = [campaignIn(scan.name), ''];
  for (const axis of scan.axes) {
    written.push(axis.name);
    written.push(
      ...tableOf(
        axis.variants.map((variant) => ({
          label: variant.at,
          run: variant.run,
          marked: variant.marked,
        })),
      ),
    );
    written.push('');
  }
  for (const line of scan.reading) written.push(line);
  return written;
}
