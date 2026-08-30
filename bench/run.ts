/**
 * **One bench run, from its first step to its last**, played whole and with no
 * drawing at all: a balance handed in, a seed sown, the one pilot at the stick,
 * and the eight indicators that come out of it. About 55 000 steps and a second
 * of reckoning, which is what lets a hundred variants be tried in two minutes.
 * (spec 11-1, 10-44)
 *
 * **No clock is ever read here.** A run counts steps of a sixtieth of a second
 * and turns them into minutes at the end; nothing below asks the machine what
 * time it is, and nothing draws a free number. That is the whole of what
 * `bench/` obeying the interdiction of `src/game/` means. (spec 10-5, 11-6, 11-7)
 *
 * **It refuses nothing and corrects nothing.** The grid of acceptance is
 * `thresholds.ts` and the campaigns are `campaigns.ts`; this file plays and
 * counts, and that is all it does. (spec 11-2)
 *
 * ---
 *
 * **The eight indicators, and the list is closed**: what is not in it is not
 * measured. Six of them carry a threshold; the peak of living bodies is already
 * bounded by the assertion of `waves.ts`, and the collapses are a guard-rail of
 * the pilot and never a threshold of the balance. (spec 11-16, 11-25, 11-26)
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BALANCE, type Balance } from '../src/game/balance';
import { placePlayer } from '../src/game/player';
import {
  EVENT,
  type Game,
  PHASE,
  ZOMBIE,
  clearEvents,
  createGame,
  createInput,
} from '../src/game/state';
import { step } from '../src/game/step';
import { beginAssault, hasEnded, takeOvertime } from '../src/game/waves';
import { atTownHall } from '../src/game/zombies';
import { createPilot, flyPilot } from './pilot';
import { CHILD, type Profile } from './profiles';
import {
  SCANS,
  type Verdict,
  playOvertimeVerdict,
  playVerdict,
} from './campaigns';
import { calledIn, pronounce, scanIn, verdictIn } from './report';
import type { Crossed } from './thresholds';

/**
 * Past how many collapses a run is **void** — it counts neither for the balance
 * nor against it.
 *
 * It is a **guard-rail of the pilot and never a threshold of the balance**: how
 * often he goes down follows from `care`, a figure chosen here, so scoring it
 * would be scoring one's own programming. Past six he is no longer playing the
 * game that was designed, so the run is set aside and it is the profile one
 * repairs, not the balance. That is why this figure lives here and not in the
 * grid. (spec 11-25, and chapter 11 "Pourquoi les écroulements sont un
 * garde-fou")
 */
export const COLLAPSE_CEILING = 6; // spec 11-25

/**
 * How many steps a run may take before it is given up on, in steps.
 *
 * The spec settles no such figure, so it is read off the ones it does settle: a
 * run of the main game is about 55 000 steps for a quarter of an hour, and the
 * longest campaign of chapter 11 — the overtime, to the fall or to wave thirty —
 * is a few times that. An hour of played time is therefore far past anything the
 * grid ever asks about, and a run that reaches it is a run that does not end.
 * Without it the bench would hang instead of saying so. (spec 10-21, 11-30)
 */
export const MOST_STEPS = 60 * 60 * 60;

/** The breaches, in three figures and never in one. (spec 11-18) */
export interface Breaches {
  count: number;
  /** In seconds. */
  meanFor: number;
  /** In seconds. */
  longestFor: number;
}

/** The eight, and there is no ninth. (spec 11-16, and what each is counted in) */
export interface Indicators {
  /** In shambler hits, waves one to ten. (spec 11-17) */
  townHallHits: number;
  /** In minutes. */
  minutes: number;
  /** Living bodies at once, at the fullest. */
  peak: number;
  /** Of the fatal blows, in per cent. */
  swordShare: number;
  /** In coins. */
  coins: number;
  /** One count per tier, never one count. (spec 11-19) */
  cannons: number[];
  collapses: number;
  breaches: Breaches;
}

/** What one run hands back. */
export interface Run {
  readonly profile: string;
  readonly seed: number;
  /** The wave reached, which is the whole of what an end ever shows. (spec 01-30) */
  readonly wave: number;
  readonly won: boolean;
  /**
   * The town hall still on its feet when the run stopped. `won` says the victory
   * of wave ten was taken and nothing takes it back, so past wave ten it says
   * nothing about the end at all — and the overtime is read entirely on the end.
   * (spec 01-26, 11-30, 11-31)
   */
  readonly standing: boolean;
  readonly steps: number;
  /**
   * The run stopped because the game did, and not because the ceiling of steps
   * came. A run that walks into that ceiling is a run that does not end, and the
   * table has to say so rather than print a duration that means nothing.
   * (spec 11-2)
   */
  readonly ended: boolean;
  readonly indicators: Indicators;
  /** Past the ceiling of collapses, this run counts for nothing. (spec 11-25) */
  readonly voided: boolean;
  /**
   * The two thresholds without an indicator that cannot be read off the state a
   * run ends in. They do **not** open the closed list of the eight — the grid of
   * chapter 11 names them itself as thresholds read on the run rather than on an
   * indicator. (spec 11-16, and the grid of acceptance)
   */
  readonly reinforcements: number;
  readonly colossusAtTownHall: boolean;
}

/** What the sword's own phase of a step may say, and the phases before it. */
function beforeTheZombies(type: number): boolean {
  return (
    type === EVENT.SWEEP ||
    type === EVENT.SWORD_HIT ||
    type === EVENT.SWORD_MISS ||
    type === EVENT.FATAL_BLOW ||
    type === EVENT.RISE
  );
}

/** One run of the one pilot, played whole. (spec 11-1) */
export function playRun(
  balance: Balance,
  profile: Profile,
  seed: number,
  lastWave: number,
): Run {
  const game = createGame(balance, seed);
  placePlayer(game); // spec 01-22
  beginAssault(game); // a game opens on the assault of wave one (spec 01-16)

  const pilot = createPilot(balance, profile, seed);
  const input = createInput();
  const seconds = 1 / balance.loop.hz; // spec 10-21
  const pool = game.assault.zombies;
  const events = game.assault.events;

  /** Seconds each living body has spent hammering the town hall. (spec 11-18) */
  const breachFor = new Float32Array(balance.pools.zombies);

  let steps = 0;
  let townHallHits = 0;
  let peak = 0;
  let bySword = 0;
  let byCannon = 0;
  let coins = 0;
  let collapses = 0;
  let reinforcements = 0;
  let colossusAtTownHall = false;
  let breaches = 0;
  let breachTotal = 0;
  let longestFor = 0;

  while (steps < MOST_STEPS) {
    clearEvents(events); // one buffer, emptied before the step that fills it (spec 10-18)
    const alive = pool.count;
    // A blow already in the air goes on cutting at the head of the sword's own
    // phase, and it says nothing of itself: the fact that stands for a blow is
    // said when one is thrown, never when a grace runs out. (spec 04-25, 04-32)
    const inTheAir = game.assault.sword.graceLeft > 0;

    flyPilot(pilot, game, input); // the pilot writes an `InputState`, and nothing else
    step(game, input);
    steps += 1;

    // ---- what the step said, in the order it said it. The buffer says a fatal
    // blow was landed and never by what, so who landed it is read off **the
    // order of a step**, which is fixed and written out in `step.ts`: the sword
    // goes before the zombies, the cannons and the balls. A fatal blow belongs
    // to the sword while the sword's own phase is still speaking — a blow was
    // already in the air when the step opened, or the buffer has just said one
    // went out — and to a cannon from the first fact only a later phase can say.
    // (spec 10-17, 10-19, 10-25)
    let stillTheSword = inTheAir;
    let felled = 0;
    for (let at = 0; at < events.count; at += 1) {
      const type = events.type[at];
      if (type === EVENT.SWEEP) stillTheSword = true;
      if (type === EVENT.FATAL_BLOW) {
        if (stillTheSword) bySword += 1;
        else byCannon += 1;
        // The pool carries its last body into the slot that comes free, so the
        // seconds of a breach are carried with it. Every fatal blow of a step
        // falls before anything walks in, since the waves come last but one in
        // the one order. (spec 10-13, 10-25)
        const gone = events.index[at];
        const last = alive - felled - 1;
        if (gone !== last) breachFor[gone] = breachFor[last];
        breachFor[last] = 0;
        felled += 1;
        continue;
      }
      if (!beforeTheZombies(type)) stillTheSword = false;
      if (type === EVENT.TOWN_HALL_HIT && game.snapshot.wave <= balance.pace.mainWaves) {
        townHallHits += events.value[at]; // in shambler hits (spec 11-17)
      } else if (type === EVENT.COIN_TAKEN || type === EVENT.ASSAULT_BONUS) {
        coins += events.value[at];
      } else if (type === EVENT.COLLAPSE) {
        collapses += 1;
      } else if (type === EVENT.REINFORCEMENT_BOUGHT) {
        reinforcements += 1;
      }
    }

    // Whatever walked in this step took a slot past the ones that were alive.
    for (let at = alive - felled; at < pool.count; at += 1) breachFor[at] = 0;

    if (pool.count > peak) peak = pool.count;

    // A breach is a body come to the town hall and hammering, and its span is
    // how long it goes on: it never leaves, so the span closes on the fatal blow
    // that ends it. (spec 03-17, and the glossary on *Fuite*)
    for (let at = 0; at < pool.count; at += 1) {
      if (!atTownHall(game, at)) continue;
      if (breachFor[at] === 0) breaches += 1;
      breachFor[at] += seconds;
      breachTotal += seconds;
      if (breachFor[at] > longestFor) longestFor = breachFor[at];
      if (pool.type[at] === ZOMBIE.COLOSSUS) colossusAtTownHall = true;
    }

    if (hasEnded(game)) break; // the town hall at nought, the one end (spec 01-28)
    if (game.assault.phase === PHASE.PREP && game.snapshot.wave >= lastWave) break;
    // The overtime is taken on one press once the victory is won, and it is the
    // one preparation that does not run of itself. (spec 01-17, 01-32)
    if (game.snapshot.won && game.assault.phase === PHASE.PREP && game.assault.prepLeft <= 0) {
      takeOvertime(game);
    }
  }

  return {
    profile: profile.name,
    seed,
    wave: game.snapshot.wave,
    won: game.snapshot.won,
    standing: game.snapshot.townHall.hp > 0,
    steps,
    ended: steps < MOST_STEPS,
    indicators: {
      townHallHits,
      minutes: (steps * seconds) / 60,
      peak,
      swordShare: bySword + byCannon === 0 ? 0 : (bySword * 100) / (bySword + byCannon),
      coins,
      cannons: cannonsByTier(game),
      collapses,
      breaches: {
        count: breaches,
        meanFor: breaches === 0 ? 0 : breachTotal / breaches,
        longestFor,
      },
    },
    voided: collapses > COLLAPSE_CEILING, // spec 11-25
    reinforcements,
    colossusAtTownHall,
  };
}

/** The cannons still standing, one count per tier. (spec 11-19) */
function cannonsByTier(game: Game): number[] {
  const cannons = game.snapshot.cannons;
  const found: number[] = [];
  for (let tier = 0; tier < game.balance.cannon.tiers; tier += 1) found.push(0);
  for (let at = 0; at < cannons.count; at += 1) found[cannons.tier[at] - 1] += 1;
  return found;
}

// ------------------------------- the entry of `npm run bench`, and the code

/**
 * **The entry, and the exit code.** `npm run bench` plays the two verdicts,
 * prints their tables and pronounces once; a named campaign plays that one and
 * nothing else. The code out is **nought or one, and nothing else**, because
 * what reads this bench reads a code and a list. (spec 11-38, 11-40)
 *
 * The six names a campaign answers to are the six of chapter 11 — `verdict`,
 * `overtime`, `prices`, `range`, `table`, `gradient` — and a scan among them
 * comes out at nought whatever it finds. (spec 11-28, 11-33)
 *
 * **Why `node bench/run.ts` needs one word more in `package.json`.** The whole
 * repository imports without an extension, which is what `moduleResolution:
 * bundler` is for and what Vite and Vitest resolve; `node` alone resolves no
 * such thing, and it fails on the very first import of `src/game/`. Giving the
 * bench its extensions would not be enough — every module of `src/game/` imports
 * its neighbours without one too, so the failure only moves one file along, and
 * `src/` is not this ticket's to rewrite. So it is **what the target of the
 * script runs under** that changes: `node` is handed a resolve hook, inline and
 * in one line, that retries a specifier with `.ts` when it does not resolve.
 * Five npm scripts stay five, `bench/` keeps its six modules and its reference,
 * and not one dependency is added — which is what 10-46 and 11-41 ask, and all
 * they ask. (spec 10-46, 11-41)
 */
export const CAMPAIGNS = ['verdict', 'overtime', 'prices', 'range', 'table', 'gradient'];

/** Where the frozen run lives, beside the six modules. (spec 11-42) */
const REFERENCE_AT = new URL('./reference.json', import.meta.url);

/** The eight indicators of one run, and which run it was. (spec 11-42) */
export interface Reference {
  readonly profile: string;
  readonly seed: number;
  /** The last wave played, so the file says what it froze. */
  readonly waves: number;
  readonly indicators: Indicators;
}

/**
 * Three decimals, and the reason is the diff: this file is the **account of what
 * a retouch did to the game**, and an account is read. A thousandth of a minute,
 * of a per cent or of a second is far under anything the grid of chapter 11 ever
 * reads, and the long tail of a double would bury the four figures that matter
 * under sixteen that do not. (spec 11-45)
 */
function trimmed(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** The reference run: the child, seed one, waves one to ten. (spec 11-42) */
export function referenceOf(balance: Balance): Reference {
  const run = playRun(balance, CHILD, 1, balance.pace.mainWaves);
  const found = run.indicators;
  return {
    profile: run.profile,
    seed: run.seed,
    waves: balance.pace.mainWaves,
    indicators: {
      townHallHits: found.townHallHits,
      minutes: trimmed(found.minutes),
      peak: found.peak,
      swordShare: trimmed(found.swordShare),
      coins: found.coins,
      cannons: [...found.cannons],
      collapses: found.collapses,
      breaches: {
        count: found.breaches.count,
        meanFor: trimmed(found.breaches.meanFor),
        longestFor: trimmed(found.breaches.longestFor),
      },
    },
  };
}

function say(lines: readonly string[]): void {
  for (const line of lines) console.log(line);
}

/**
 * What `npm run bench` does, and what it hands back as an exit code. It is
 * exported so a test may ask it a question without spawning anything.
 */
export function main(args: readonly string[]): number {
  // `--freeze`, and never a hand: the file has value only as the exact replay of
  // the balance in hand. (spec 11-44)
  if (args.includes('--freeze')) {
    const reference = referenceOf(BALANCE);
    writeFileSync(REFERENCE_AT, `${JSON.stringify(reference, null, 2)}\n`);
    say([`bench/reference.json gelé — ${calledIn(reference.profile)}, graine ${reference.seed}`]);
    return 0;
  }

  const asked = args[0] ?? '';
  const scan = SCANS[asked];
  if (scan !== undefined) {
    say(scanIn(scan(BALANCE)));
    return 0; // a scan explores and never judges (spec 11-33)
  }
  if (asked !== '' && asked !== 'verdict' && asked !== 'overtime') {
    say([`Campagne inconnue : ${asked}`, `Les six : ${CAMPAIGNS.join(', ')}`]);
    return 1;
  }

  const verdicts: Verdict[] = [];
  if (asked === '' || asked === 'verdict') verdicts.push(playVerdict(BALANCE));
  if (asked === '' || asked === 'overtime') verdicts.push(playOvertimeVerdict(BALANCE));

  const crossed: Crossed[] = [];
  for (const verdict of verdicts) {
    say(verdictIn(verdict));
    say(['']);
    for (const cell of verdict.crossed) crossed.push(cell);
  }
  say(pronounce(crossed));
  return crossed.length === 0 ? 0 : 1;
}

// The bench is run, never imported, when `node` is handed this file: the tests
// beside it import it for `playRun` and must not play fifteen games for the
// privilege.
const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
