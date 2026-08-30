/**
 * The shape of a game: waves numbered from one, each a cycle in two times — an
 * assault, then a preparation — the victory at wave ten, the fall of the town
 * hall, and the overtime that carries a won game on to its plateau.
 * (spec 01-10, 01-11)
 *
 * Two things this file never does, and they are the whole of its discipline:
 *
 *   - **It reads the table, it never works one out.** Every head count, every
 *     kind and every active street comes from one line of `balance.waves`,
 *     written out in full; there is no formula anywhere below that grows a wave,
 *     fills a gap or carries a trend on. Past the plateau, the line of the
 *     plateau is handed back again, unchanged. (spec 03-41, 03-44)
 *   - **It counts nobody to hold an entry back.** What bounds the population is
 *     the table, checked once by `checkWaveTotals`: no line, overtime included,
 *     walks more in than the pool holds. That assertion is the guarantee, and a
 *     tally of the living would only hide a table that had gone wrong.
 *     (spec 03-42, 03-43, 10-43)
 *
 * Nothing here draws on the generator. The calendar of the streets is settled —
 * street one from wave one, two from wave five, three from wave eleven — and so
 * is the street the colossus owns, which turns with the wave; at eight years
 * old, spending your money and finding that chance has undone it is the worst
 * feeling a game can hand you. (spec 03-28, 03-35)
 *
 * The two times, and what holds them apart: an assault carries no clock at all
 * and closes on the fall of its last zombie, while a preparation is a fixed run
 * of seconds that nothing lengthens, shortens or starts — there is no ready
 * button, and there never will be. (spec 01-12, 01-14)
 */
import type { Balance, WaveRow } from './balance';
import { payAssault } from './economy';
import {
  EVENT,
  type Game,
  PHASE,
  STREETS,
  ZOMBIE,
  type ZombieType,
  pushEvent,
} from './state';
import { massZombie, spawnZombie } from './zombies';

/**
 * The one assertion of this file, and the one thing that bounds how many walk
 * the city at once: no line of the table, overtime included, walks more in than
 * the pool holds. A wave enters faster than it empties, so the head count of a
 * line is the head count of the living, and the line is what is checked.
 * (spec 03-42, 10-43, 03 "Pourquoi le plafond n'est plus tenu par la géométrie")
 *
 * It is not a guard on the population: it counts no living thing and holds no
 * entry back. It fails loudly on a table that has gone wrong, which is exactly
 * what a retouch of the balance needs it to do. (spec 03-43)
 */
export function checkWaveTotals(balance: Balance): void {
  for (let i = 0; i < balance.waves.length; i += 1) {
    const row = balance.waves[i];
    if (totalOf(row) > balance.pools.zombies) {
      throw new Error(
        `wave ${row.wave} walks ${totalOf(row)} in, and the pool holds ${balance.pools.zombies}`,
      );
    }
  }
}

/** What one line of the table walks in, all kinds together. */
export function totalOf(row: WaveRow): number {
  return row.shamblers + row.sprinters + row.bruisers + row.colossi;
}

/**
 * The one line a wave is. Past the plateau every wave is the exact copy of it,
 * so the same line comes back for ever — nothing is grown, nothing is guessed.
 * (spec 03-41, 03-44, 01-36)
 */
export function rowFor(balance: Balance, wave: number): WaveRow {
  const held = wave > balance.plateauWave ? balance.plateauWave : wave;
  for (let i = 0; i < balance.waves.length; i += 1) {
    const row = balance.waves[i];
    if (row.wave === held) return row;
  }
  throw new Error(`no line of the table stands for wave ${wave}`);
}

/**
 * Which street the colossus owns, or -1 when the line brings none. It is settled
 * and never drawn, and it turns with the wave, so no two waves in a row put him
 * in the same street. The spec fixes those three things and leaves the street
 * itself open, so the wave number chooses it. (spec 03-35, 03-28)
 */
export function colossusStreetOf(row: WaveRow, wave: number): number {
  return row.colossi > 0 ? wave % row.streets : -1;
}

/**
 * Which of the streets carrying the wave a street is, or -1 when it carries
 * none — because it is not open yet, or because the colossus owns it and
 * nothing else walks in there. (spec 03-24, 03-33)
 */
function carrierOf(row: WaveRow, colossusStreet: number, street: number): number {
  if (street >= row.streets || street === colossusStreet) return -1;
  return colossusStreet >= 0 && street > colossusStreet ? street - 1 : street;
}

/** How many streets share the head count of the wave. (spec 03-24) */
function carriersOf(row: WaveRow): number {
  return row.colossi > 0 ? row.streets - 1 : row.streets;
}

/** Bruisers that walk the streets rather than the escort. (spec 03-36) */
function looseBruisers(balance: Balance, row: WaveRow): number {
  return row.colossi > 0 ? row.bruisers - balance.assault.escortCount : row.bruisers;
}

/**
 * How many packs a wave walks in, the escort of the colossus apart. A pack holds
 * four of one kind, so a kind that four does not divide closes on a short one:
 * that is the price of a pack never mixing two kinds. (spec 03-22, 03-23)
 */
function packsOf(balance: Balance, row: WaveRow): number {
  const size = balance.assault.packSize;
  return (
    Math.ceil(looseBruisers(balance, row) / size) +
    Math.ceil(row.shamblers / size) +
    Math.ceil(row.sprinters / size)
  );
}

/**
 * Walks one pack in, at the rank it holds among the packs of the wave. The kinds
 * come in the order the ranks are laid out — bruisers, then shamblers, then
 * sprinters — which is the reverse of the order they arrive in: the slowest walk
 * in first, take the head of the column, and are overtaken under the eyes of the
 * child. (spec 03-26)
 *
 * A pack is of one kind and one only, and it holds four unless it is what is
 * left of its kind. (spec 03-22, 03-23)
 *
 * Nothing here defends the pool. The table is what bounds the population, and
 * `checkWaveTotals` is what makes that binding; a count of the living, taken
 * here, would hide a broken table instead of failing on it. (spec 03-43)
 */
function walkPackIn(
  game: Game,
  row: WaveRow,
  street: number,
  rank: number,
  progress: number,
): void {
  const balance = game.balance;
  const size = balance.assault.packSize;
  const bruisers = looseBruisers(balance, row);
  const bruiserPacks = Math.ceil(bruisers / size);
  const shamblerPacks = Math.ceil(row.shamblers / size);

  let type: ZombieType = ZOMBIE.SPRINTER;
  let held = 0;
  if (rank < bruiserPacks) {
    type = ZOMBIE.BRUISER;
    held = bruisers - rank * size;
  } else if (rank < bruiserPacks + shamblerPacks) {
    type = ZOMBIE.SHAMBLER;
    held = row.shamblers - (rank - bruiserPacks) * size;
  } else {
    type = ZOMBIE.SPRINTER;
    held = row.sprinters - (rank - bruiserPacks - shamblerPacks) * size;
  }
  if (held > size) held = size;

  // Each of the four takes its own lane across the street. (spec 03-7)
  for (let i = 0; i < held; i += 1) spawnZombie(game, type, street, progress, i);
  game.assault.toEnter -= held;
}

/**
 * The colossus and his six bruisers, at the mouth of the street he owns and at
 * the first second of the assault. He walks in first — entered last, he would
 * add a hundred and fifteen seconds of a giant walking alone down an empty
 * street — and nothing else ever walks into his street. (spec 03-33, 03-34)
 */
function walkColossusIn(game: Game, street: number): void {
  const balance = game.balance;
  const pool = game.assault.zombies;
  const colossus = spawnZombie(game, ZOMBIE.COLOSSUS, street, 0);
  for (let i = 0; i < balance.assault.escortCount; i += 1) {
    const at = spawnZombie(game, ZOMBIE.BRUISER, street, 0);
    pool.escort[at] = 1;
    massZombie(game, at, colossus, balance.assault.escortRadius);
  }
  game.assault.toEnter -= 1 + balance.assault.escortCount;
}

/**
 * Lights the streets a wave walks down. They are told from the first second of
 * the preparation that comes before it and stay lit for the whole assault, so
 * the child spends his money knowing where it will be needed — the announcement
 * reveals no draw, it telegraphs a decision already taken. (spec 03-29, 03-30)
 *
 * A street already lit lights no second time, which is why wave one announces
 * nothing at all: street one is lit from the moment the game is made.
 * (spec 03-31)
 */
function announceStreets(game: Game, wave: number): void {
  const row = rowFor(game.balance, wave);
  const streets = game.snapshot.streets;
  const gateways = game.assault.city.gateways;
  for (let street = 0; street < row.streets; street += 1) {
    if (streets[street] === 1) continue;
    streets[street] = 1;
    pushEvent(
      game.assault.events,
      EVENT.GATEWAY_LIT,
      street,
      gateways.x[street],
      0,
      gateways.z[street],
      0,
    );
  }
}

/**
 * How long the preparation that closes a wave runs, in seconds: forty for the
 * three where the child learns to put a cannon down, take a ladder and come back
 * to the base, thirty from there on, overtime included. It never goes under
 * thirty, and no button of the game touches it. (spec 01-14, 01-15)
 */
export function prepFor(balance: Balance, wave: number): number {
  return wave <= balance.pace.lastEarlyPrepWave ? balance.pace.earlyPrep : balance.pace.latePrep;
}

/**
 * Whether the game is over, which is one question and one only: has the town
 * hall reached nought? That is the one end there is, and the child himself never
 * falls, so nothing else is ever asked here. (spec 01-28)
 *
 * It is read off the town hall itself and held nowhere. A flag beside it would be
 * a second fact saying the same thing, and it would have to cross a wave boundary
 * — where the Instantané holds ten fields and not one more. (spec 08-70, 10-12)
 *
 * A victory is not an end and never was: it is won for good, the overtime carries
 * a won game on, and the town hall may fall there without taking it back.
 * (spec 01-25, 01-26, 01-32)
 */
export function hasEnded(game: Game): boolean {
  return game.snapshot.townHall.hp <= 0;
}

/** How many are still to be dealt with, walking or yet to walk in. (spec 03-37) */
export function zombiesLeft(game: Game): number {
  return game.assault.zombies.count + game.assault.toEnter;
}

/**
 * Opens the assault of the wave in hand. It is what a game opens on — no
 * preparation comes before the first one — and what the end of every preparation
 * runs into. (spec 01-16)
 *
 * The four shamblers of wave one are a case of their own and the only one: they
 * are already standing twenty blocks up street one when the curtain goes up,
 * because nothing may pop into being in plain view, and because twenty-four
 * seconds of waiting before the first sword blow would teach the child nothing.
 * (spec 02-30, 03-31, 01-22)
 */
export function beginAssault(game: Game): void {
  checkWaveTotals(game.balance);

  const balance = game.balance;
  const assault = game.assault;
  const wave = game.snapshot.wave;
  const row = rowFor(balance, wave);

  assault.phase = PHASE.ASSAULT;
  assault.prepLeft = 0; // no clock runs during an assault (spec 01-12)
  assault.fewFor = 0;
  assault.toEnter = totalOf(row);
  // The moan is an emission of the **assault**, so an assault opens its own: the
  // pile the last one left behind buys nothing here. (spec 09-24)
  assault.moanLeft = balance.assault.moanPeriod;
  assault.moanOwed = 0;
  assault.moanNext = 0;
  announceStreets(game, wave);

  // The streets that carry the wave open one after the other, eight seconds
  // apart; the street of the colossus opens at the first second. (spec 03-25)
  const colossusStreet = colossusStreetOf(row, wave);
  for (let street = 0; street < STREETS; street += 1) {
    const carrier = carrierOf(row, colossusStreet, street);
    assault.sent[street] = 0;
    assault.enterLeft[street] = carrier < 0 ? 0 : carrier * balance.assault.streetStagger;
  }

  if (colossusStreet >= 0) walkColossusIn(game, colossusStreet);

  if (wave === 1) {
    const standing =
      assault.city.rails.length - balance.city.mouthToTownHall - balance.city.street.firstPackAt;
    walkPackIn(game, row, 0, 0, standing);
    assault.sent[0] = 1;
    assault.enterLeft[0] = balance.assault.cadence;
  }

  pushEvent(assault.events, EVENT.ASSAULT_BEGAN, 0, 0, 0, 0, wave);
}

/**
 * Walks in whatever this step is owed: one pack per street every six seconds,
 * the one constant of rhythm of the whole game, which no wave ever varies. The
 * head count of a wave says how many packs, and therefore how long the column
 * is, and nothing else. (spec 03-22, 03-27)
 *
 * The streets carrying the wave share its head count, they never double it: the
 * packs are dealt to the streets in turn, so each carries as near a third —
 * or a half — as four at a time allows. (spec 03-24)
 */
function walkPacksIn(game: Game, seconds: number): void {
  const balance = game.balance;
  const assault = game.assault;
  const row = rowFor(balance, game.snapshot.wave);
  const colossusStreet = colossusStreetOf(row, game.snapshot.wave);
  const carriers = carriersOf(row);
  const packs = packsOf(balance, row);

  for (let street = 0; street < STREETS; street += 1) {
    const carrier = carrierOf(row, colossusStreet, street);
    if (carrier < 0) continue;
    const rank = assault.sent[street] * carriers + carrier;
    if (rank >= packs) continue; // this street has walked its share in
    assault.enterLeft[street] -= seconds;
    if (assault.enterLeft[street] > 0) continue;
    assault.enterLeft[street] += balance.assault.cadence;
    walkPackIn(game, row, street, rank, 0); // in at the mouth, out of sight (spec 03-32)
    assault.sent[street] += 1;
  }
}

/**
 * The third net of the end of an assault: fifteen seconds with three or fewer
 * left and the survivors take four blocks a second, straight down to the town
 * hall. This counts those seconds; `speedOf` is what spends them, and it leaves
 * the colossus out. A child who hunts the last zombie for two minutes gives up.
 * (spec 03-38, 03-39, 03-40)
 */
function holdTheFew(game: Game, seconds: number): void {
  const assault = game.assault;
  if (zombiesLeft(game) <= game.balance.assault.beaconsAt) assault.fewFor += seconds;
  else assault.fewFor = 0;
}

/**
 * Closes the assault on the fall of its last zombie — nothing else closes one,
 * and no clock ever has a say. (spec 01-12)
 *
 * The town hall pays in the same breath: the ten coins that punctuate an assault
 * which has no clock to punctuate it, and every coin still lying in the city
 * with them. That is why a preparation always opens on a city with none.
 * (spec 06-13, 06-14, 06-15)
 *
 * Holding to the last zombie of the assault of wave ten is winning, and the
 * victory is won for good: nothing that comes after takes it back, and the town
 * hall may fall in overtime without unmaking it. The preparation of wave ten is
 * the one that does not run of itself — it waits on the press that takes the
 * overtime, and on nothing else. (spec 01-25, 01-26, 01-17)
 */
function endAssault(game: Game): void {
  const snapshot = game.snapshot;
  const assault = game.assault;
  pushEvent(assault.events, EVENT.ASSAULT_ENDED, 0, 0, 0, 0, snapshot.wave);
  payAssault(game);
  assault.phase = PHASE.PREP;
  assault.prepLeft = 0;
  assault.fewFor = 0;
  if (snapshot.wave === game.balance.pace.mainWaves) {
    snapshot.won = true;
    return;
  }
  runPrep(game);
}

/** Sets the preparation running and tells the streets of the wave to come. */
function runPrep(game: Game): void {
  game.assault.prepLeft = prepFor(game.balance, game.snapshot.wave);
  announceStreets(game, game.snapshot.wave + 1);
}

/**
 * The overtime, taken on one press once the victory is won: it runs on into the
 * preparation that leads to wave eleven, where the third street opens at an
 * unchanged head count. It invents nothing — no kind of zombie, no swollen
 * figure, no touched constant of rhythm — and it has three levers and three
 * only: the streets, the head count and the make-up of a wave.
 * (spec 01-32, 01-33, 01-34, 01-35)
 *
 * It is the only door out of a preparation that does not run of itself, so a
 * press that comes before a victory, or a second press, does nothing at all.
 */
export function takeOvertime(game: Game): void {
  const assault = game.assault;
  if (!game.snapshot.won) return;
  if (assault.phase !== PHASE.PREP || assault.prepLeft > 0) return;
  runPrep(game);
}

/**
 * The waves, in the one order of the step: whatever walks in walks in, the last
 * few are counted, and an assault that has nothing left closes.
 *
 * A preparation runs down of itself and runs into the assault of the next wave.
 * Nothing starts it, nothing lengthens it and nothing cuts it short: the only
 * rhythm the child holds is that of his own clearing up. (spec 01-14, 10-25)
 *
 * The town hall at nought ends the game, and it is the one end there is — the
 * child himself never falls. Nothing more walks in, and no wave follows.
 * (spec 01-28)
 */
export function stepWaves(game: Game, seconds: number): void {
  if (hasEnded(game)) return;
  const assault = game.assault;

  if (assault.phase === PHASE.PREP) {
    // A preparation halted on nought is the victory waiting on the overtime, and
    // it is the one preparation that a press has to start. (spec 01-17)
    if (assault.prepLeft <= 0) return;
    assault.prepLeft -= seconds;
    if (assault.prepLeft <= 0) {
      assault.prepLeft = 0;
      game.snapshot.wave += 1;
      beginAssault(game);
    }
    return;
  }

  walkPacksIn(game, seconds);
  holdTheFew(game, seconds);
  if (assault.zombies.count === 0 && assault.toEnter === 0) endAssault(game);
}
