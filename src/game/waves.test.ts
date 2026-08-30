/**
 * The waves read back against chapters 1 and 3. Every number here is written out
 * by hand from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Nothing yet takes a zombie out of the pool — the sword is its own chapter — so
 * what closes an assault in these tests is a test emptying the pool by hand,
 * which is exactly what the fall of the last zombie will do. (spec 01-12)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE, type Balance, type WaveRow } from './balance';
import {
  EVENT,
  type Game,
  PHASE,
  STREETS,
  ZOMBIE,
  createGame,
  createInput,
} from './state';
import { step } from './step';
import {
  beginAssault,
  checkWaveTotals,
  colossusStreetOf,
  hasEnded,
  rowFor,
  stepWaves,
  takeOvertime,
  totalOf,
  zombiesLeft,
} from './waves';
import { speedOf } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** From the entrance of a street to the face of the town hall. (spec 02-13) */
const RAIL = 92;

/** Opens a game on the wave asked for, at the start of its assault. */
function openAt(wave: number, seed = 20260829): Game {
  const game = createGame(BALANCE, seed);
  game.snapshot.wave = wave;
  beginAssault(game);
  return game;
}

/** Runs the waves alone, second by second of the one step. */
function walk(game: Game, seconds: number): void {
  const steps = Math.round(seconds / SECONDS);
  for (let i = 0; i < steps; i += 1) stepWaves(game, SECONDS);
}

/** What a sword will do, and the one thing that closes an assault. (spec 01-12) */
function fell(game: Game): void {
  game.assault.zombies.count = 0;
}

/** Runs an assault to its close: everything walks in, then everything falls. */
function clearAssault(game: Game): void {
  while (game.assault.toEnter > 0) stepWaves(game, SECONDS);
  fell(game);
  stepWaves(game, SECONDS);
}

interface Entry {
  /** Seconds into the assault. */
  at: number;
  street: number;
  type: number;
  /** How many walked in together. */
  held: number;
}

/** Every pack of an assault, in the order it walks in. */
function entriesOf(game: Game, seconds: number): Entry[] {
  const pool = game.assault.zombies;
  const found: Entry[] = [];
  let last = 0;
  const note = (at: number): void => {
    found.push({ at, street: pool.street[last], type: pool.type[last], held: pool.count - last });
    last = pool.count;
  };
  if (pool.count > 0) note(0);
  const steps = Math.round(seconds / SECONDS);
  for (let i = 0; i < steps; i += 1) {
    stepWaves(game, SECONDS);
    if (pool.count > last) note(Math.round((i + 1) * SECONDS * 10) / 10);
  }
  return found;
}

describe('the assertion that bounds the population', () => {
  it('lets no line of the table, overtime included, walk more in than the pool holds', () => {
    // spec 03-42, 10-43: no wave total goes over sixty, and sixty is the pool.
    expect(() => checkWaveTotals(BALANCE)).not.toThrow();
    expect(BALANCE.pools.zombies).toBe(60); // spec 10, "Les pools"
    for (const row of BALANCE.waves) expect(totalOf(row)).toBeLessThanOrEqual(60);
    // The plateau is the fullest line of them all. (spec 03, "La table des vagues")
    expect(totalOf(rowFor(BALANCE, 14))).toBe(60);
  });

  it('fails loudly on a table that walks sixty-one in', () => {
    // spec 03-43: the table is what bounds; a tally of the living would only hide
    // a broken table instead of failing on it.
    const rows: WaveRow[] = BALANCE.waves.map((row) => ({ ...row }));
    rows[13] = { ...rows[13], sprinters: rows[13].sprinters + 1 };
    const forged: Balance = { ...BALANCE, waves: rows };
    expect(totalOf(rows[13])).toBe(61);
    expect(() => checkWaveTotals(forged)).toThrow();
  });

  it('never fills the pool, whatever the wave', () => {
    for (let wave = 1; wave <= 17; wave += 1) {
      const game = openAt(wave);
      walk(game, 120);
      expect(game.assault.toEnter).toBe(0);
      expect(game.assault.zombies.count).toBe(totalOf(rowFor(BALANCE, wave)));
      expect(game.assault.zombies.count).toBeLessThanOrEqual(60); // spec 03-42
    }
  });
});

describe('the table, read and never worked out', () => {
  it('hands back the very line of the balance', () => {
    // spec 03-41: the table is written out in full, and no wave is computed.
    expect(rowFor(BALANCE, 7)).toBe(BALANCE.waves[6]);
    const row = rowFor(BALANCE, 7);
    expect(row.shamblers).toBe(18); // spec 03, "La table des vagues"
    expect(row.sprinters).toBe(12);
    expect(row.bruisers).toBe(4);
    expect(row.colossi).toBe(0);
    expect(row.streets).toBe(2);
    expect(totalOf(row)).toBe(34);
  });

  it('repeats the plateau, and never grows past it', () => {
    // spec 03-44, 01-36: wave fourteen is the plateau, and every wave past it is
    // its exact copy.
    const plateau = rowFor(BALANCE, 14);
    expect(totalOf(plateau)).toBe(60);
    for (const wave of [15, 16, 20, 99, 400]) expect(rowFor(BALANCE, wave)).toBe(plateau);
  });
});

describe('the first wave, already standing', () => {
  it('opens a game on its assault, with nothing before it', () => {
    // spec 01-16, 01-22: the game opens on the assault of wave one.
    const game = openAt(1);
    expect(game.snapshot.wave).toBe(1);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    expect(game.assault.prepLeft).toBe(0); // spec 01-12: no clock during an assault
    expect(game.snapshot.won).toBe(false);
  });

  it('stands four shamblers twenty blocks up street one', () => {
    // spec 02-30, 03-31: they are there at the curtain, and nothing pops into
    // being in plain view. The rail is 92 blocks, of which the last 12 separate
    // the mouth of the street from the face of the town hall. (spec 02-13, 02-7)
    const game = openAt(1);
    const pool = game.assault.zombies;
    expect(pool.count).toBe(4);
    expect(game.assault.toEnter).toBe(0);
    for (let at = 0; at < 4; at += 1) {
      expect(pool.type[at]).toBe(ZOMBIE.SHAMBLER);
      expect(pool.street[at]).toBe(0);
      expect(pool.progress[at]).toBe(RAIL - 12 - 20);
    }
  });

  it('announces nothing at all, because street one is lit from the start', () => {
    // spec 03-31: wave one does not announce itself.
    const game = openAt(1);
    const events = game.assault.events;
    let lit = 0;
    let began = 0;
    for (let i = 0; i < events.count; i += 1) {
      if (events.type[i] === EVENT.GATEWAY_LIT) lit += 1;
      if (events.type[i] === EVENT.ASSAULT_BEGAN) began += 1;
    }
    expect(lit).toBe(0);
    expect(began).toBe(1);
    expect([...game.snapshot.streets]).toEqual([1, 0, 0]); // spec 03-28
  });
});

describe('the cadence, and the packs', () => {
  it('walks four in every six seconds, and never at another rhythm', () => {
    // spec 03-22: a pack of four every six seconds, in every active street, and
    // it never varies from one wave to the next.
    expect(BALANCE.assault.cadence).toBe(6);
    expect(BALANCE.assault.packSize).toBe(4);
    const entries = entriesOf(openAt(2), 30);
    expect(entries.map((e) => e.at)).toEqual([0, 6]);
    expect(entries.map((e) => e.held)).toEqual([4, 4]);
  });

  it('never mixes two kinds in one pack', () => {
    // spec 03-23: a pack is homogeneous, one kind and never two.
    for (const wave of [7, 9, 11, 14]) {
      for (const entry of entriesOf(openAt(wave), 60)) {
        if (entry.type === ZOMBIE.COLOSSUS) continue; // he walks in with his escort
        expect(entry.held).toBeLessThanOrEqual(4);
      }
    }
  });

  it('walks the kinds in from the slowest to the fastest', () => {
    // spec 03-26: the order of entry is the reverse of the order of arrival —
    // bruisers, then shamblers, then sprinters.
    const order: number[] = [ZOMBIE.BRUISER, ZOMBIE.SHAMBLER, ZOMBIE.SPRINTER];
    for (const wave of [7, 9, 11, 13, 14]) {
      const seen: number[][] = [[], [], []];
      for (const entry of entriesOf(openAt(wave), 60)) {
        if (entry.type === ZOMBIE.COLOSSUS) continue;
        seen[entry.street].push(order.indexOf(entry.type));
      }
      for (const street of seen) {
        for (let i = 1; i < street.length; i += 1) {
          expect(street[i]).toBeGreaterThanOrEqual(street[i - 1]);
        }
      }
    }
  });

  it('stretches no wave past the entry span the table publishes', () => {
    // spec 03, "La table des vagues", column "Fenêtre d'entrée", and the formula
    // of "La fenêtre d'entrée" that the column publishes. The schedule below
    // lands on it to the second everywhere but wave 7, which closes six seconds
    // early because its four bruisers make exactly one pack and the formula
    // reckons on packs that four always divides.
    const published = [
      [2, 6],
      [3, 18],
      [4, 18],
      [5, 20],
      [6, 26],
      [7, 32],
      [8, 32],
      [9, 38],
      [10, 48],
      [11, 34],
      [12, 38],
      [13, 38],
      [14, 44],
      [15, 44],
    ];
    const stretched: string[] = [];
    for (const [wave, span] of published) {
      const entries = entriesOf(openAt(wave), 90);
      const last = entries[entries.length - 1].at;
      if (last > span) stretched.push(`wave ${wave} walks in over ${last} s, not ${span} s`);
    }
    expect(stretched).toEqual([]);
  });
});

describe('the streets', () => {
  it('follows a calendar that is settled and never drawn', () => {
    // spec 03-28: street one from wave one, one and two from wave five, all
    // three from wave eleven.
    const lit = (wave: number): number[] => {
      const game = openAt(wave);
      return [...game.snapshot.streets];
    };
    expect(lit(1)).toEqual([1, 0, 0]);
    expect(lit(4)).toEqual([1, 0, 0]);
    expect(lit(5)).toEqual([1, 1, 0]);
    expect(lit(10)).toEqual([1, 1, 0]);
    expect(lit(11)).toEqual([1, 1, 1]); // spec 01-35
    expect(lit(14)).toEqual([1, 1, 1]);
  });

  it('walks the same wave in whatever the seed, because chance has no say', () => {
    // spec 03-28: never a street drawn — at eight years old, spending your money
    // and finding chance has undone it is the worst feeling there is.
    const shape = (seed: number): string =>
      entriesOf(openAt(12, seed), 60)
        .map((e) => `${e.at}:${e.street}:${e.type}:${e.held}`)
        .join(' ');
    expect(shape(1)).toBe(shape(999_983));
    expect([...openAt(12, 1).snapshot.streets]).toEqual([...openAt(12, 999_983).snapshot.streets]);
    // The street of the colossus is a settled turn too, and not a draw. (spec 03-35)
    expect(colossusStreetOf(rowFor(BALANCE, 13), 13)).toBe(1);
  });

  it('opens the streets carrying a wave eight seconds apart', () => {
    // spec 03-25: the streets carrying the bulk of a wave start one after the
    // other, eight seconds apart.
    expect(BALANCE.assault.streetStagger).toBe(8);
    const entries = entriesOf(openAt(5), 40);
    expect(entries[0].at).toBe(0);
    expect(entries[0].street).toBe(0);
    const second = entries.find((e) => e.street === 1);
    expect(second?.at).toBe(8);
    const third = entriesOf(openAt(11), 40).find((e) => e.street === 2);
    expect(third?.at).toBe(16);
  });

  it('shares the head count of a wave between the streets instead of doubling it', () => {
    // spec 03-24: the active streets share a wave, they never double it.
    const game = openAt(11);
    walk(game, 60);
    const pool = game.assault.zombies;
    expect(pool.count).toBe(45); // spec 03, "La table des vagues"
    const perStreet = [0, 0, 0];
    for (let at = 0; at < pool.count; at += 1) perStreet[pool.street[at]] += 1;
    expect(perStreet[0] + perStreet[1] + perStreet[2]).toBe(45);
    for (const held of perStreet) expect(held).toBeGreaterThanOrEqual(45 / STREETS - 4);
  });

  it('lights a gateway when a street becomes active, and never twice', () => {
    // spec 03-29, 03-30: the streets are told from the first second of the
    // preparation before the wave, and stay lit for the whole assault.
    const game = openAt(4);
    clearAssault(game);
    expect(game.assault.phase).toBe(PHASE.PREP);
    expect([...game.snapshot.streets]).toEqual([1, 1, 0]); // street two, told at wave 5
    const events = game.assault.events;
    let lit = -1;
    for (let i = 0; i < events.count; i += 1) {
      if (events.type[i] === EVENT.GATEWAY_LIT) lit = events.index[i];
    }
    expect(lit).toBe(1);
  });
});

describe('the colossus', () => {
  it('walks in first, at the first second, with six bruisers', () => {
    // spec 03-33, 03-34: he walks in first and owns his street; his escort is six
    // bruisers, massed within three blocks and held to his pace.
    const game = openAt(10);
    const pool = game.assault.zombies;
    expect(pool.count).toBe(7);
    expect(pool.type[0]).toBe(ZOMBIE.COLOSSUS);
    expect(pool.progress[0]).toBe(0); // in at the mouth of his street (spec 03-32)
    for (let at = 1; at <= 6; at += 1) {
      expect(pool.type[at]).toBe(ZOMBIE.BRUISER);
      expect(pool.escort[at]).toBe(1);
      expect(pool.street[at]).toBe(pool.street[0]);
      expect(speedOf(game, at)).toBe(0.8); // spec 03-34
      expect(Math.abs(pool.offset[at] - pool.offset[0])).toBeLessThanOrEqual(3);
    }
    expect(BALANCE.assault.escortCount).toBe(6);
    expect(BALANCE.assault.escortRadius).toBe(3);
  });

  it('owns his street: nothing else ever walks into it', () => {
    // spec 03-33: he owns his street, and nothing else enters it.
    for (const wave of [10, 12, 13, 14, 15]) {
      const game = openAt(wave);
      const his = colossusStreetOf(rowFor(BALANCE, wave), wave);
      walk(game, 90);
      const pool = game.assault.zombies;
      expect(game.assault.toEnter).toBe(0);
      let held = 0;
      for (let at = 0; at < pool.count; at += 1) {
        if (pool.street[at] !== his) continue;
        held += 1;
        expect(pool.type[at] === ZOMBIE.COLOSSUS || pool.escort[at] === 1).toBe(true);
      }
      expect(held).toBe(7); // himself and his six
    }
  });

  it('is one and never two, and turns his street at every wave of the overtime', () => {
    // spec 03-35, 01-37: one a wave from wave twelve, never two at once, and his
    // street changes at every wave.
    for (let wave = 1; wave <= 20; wave += 1) {
      expect(rowFor(BALANCE, wave).colossi).toBeLessThanOrEqual(1);
    }
    for (let wave = 12; wave <= 20; wave += 1) {
      const row = rowFor(BALANCE, wave);
      const here = colossusStreetOf(row, wave);
      const next = colossusStreetOf(rowFor(BALANCE, wave + 1), wave + 1);
      expect(here).toBeGreaterThanOrEqual(0);
      expect(here).toBeLessThan(row.streets);
      expect(next).not.toBe(here);
    }
  });

  it('takes every bruiser into his escort from wave twelve on', () => {
    // spec 03-36: past wave twelve not one bruiser walks anywhere but his street.
    for (let wave = 12; wave <= 17; wave += 1) {
      const game = openAt(wave);
      const his = colossusStreetOf(rowFor(BALANCE, wave), wave);
      walk(game, 90);
      const pool = game.assault.zombies;
      for (let at = 0; at < pool.count; at += 1) {
        if (pool.type[at] === ZOMBIE.BRUISER) expect(pool.street[at]).toBe(his);
      }
      expect(rowFor(BALANCE, wave).bruisers).toBe(6);
    }
  });
});

describe('the three nets of the end of an assault', () => {
  it('counts what walks and what is still to walk in', () => {
    // spec 03-37: the number of zombies left is what the hud carries.
    const game = openAt(9);
    expect(zombiesLeft(game)).toBe(45);
    walk(game, 10);
    expect(zombiesLeft(game)).toBe(45);
    walk(game, 60);
    expect(game.assault.toEnter).toBe(0);
    expect(zombiesLeft(game)).toBe(45);
  });

  it('counts the seconds spent at three or fewer, and starts again above it', () => {
    // spec 03-38, 03-39: three or fewer lights the columns; fifteen seconds of it
    // sends the survivors down at four blocks a second.
    expect(BALANCE.assault.beaconsAt).toBe(3);
    expect(BALANCE.assault.rushAfter).toBe(15);
    expect(BALANCE.assault.rushSpeed).toBe(4);
    const game = openAt(9);
    walk(game, 60);
    game.assault.zombies.count = 4;
    walk(game, 5);
    expect(game.assault.fewFor).toBe(0);
    game.assault.zombies.count = 3;
    walk(game, 10);
    expect(game.assault.fewFor).toBeCloseTo(10, 6);
    game.assault.zombies.count = 4;
    walk(game, 1);
    expect(game.assault.fewFor).toBe(0);
  });

  it('sends the last of them at four blocks a second, the colossus excepted', () => {
    // spec 03-39, 03-40: uniform at four, and his pace never changes.
    const game = openAt(10);
    walk(game, 60);
    game.assault.fewFor = 15;
    const pool = game.assault.zombies;
    expect(pool.type[0]).toBe(ZOMBIE.COLOSSUS);
    expect(speedOf(game, 0)).toBe(0.8);
    expect(speedOf(game, 1)).toBe(4); // one of his escort, taken by the net
    expect(speedOf(game, pool.count - 1)).toBe(4);
  });
});

describe('the two times of a wave', () => {
  it('runs no clock at all during an assault', () => {
    // spec 01-12: an assault closes on the fall of its last zombie, and nothing
    // else closes one.
    const game = openAt(3);
    walk(game, 300);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    expect(game.assault.prepLeft).toBe(0);
    expect(game.snapshot.wave).toBe(3);
  });

  it('closes on the fall of the last zombie, and only then', () => {
    const game = openAt(2);
    walk(game, 20);
    expect(game.assault.zombies.count).toBe(8);
    game.assault.zombies.count = 1;
    walk(game, 60);
    expect(game.assault.phase).toBe(PHASE.ASSAULT); // spec 01-12
    fell(game);
    stepWaves(game, SECONDS);
    expect(game.assault.phase).toBe(PHASE.PREP);
  });

  it('gives forty seconds of preparation to the first three waves, then thirty', () => {
    // spec 01-15: forty seconds for waves one to three, thirty from wave four on,
    // overtime included; the wave named is the one whose assault has just closed.
    const held: number[] = [];
    const game = openAt(1);
    for (let wave = 1; wave <= 9; wave += 1) {
      clearAssault(game);
      held.push(game.assault.prepLeft);
      walk(game, game.assault.prepLeft + 0.1);
    }
    expect(held).toEqual([40, 40, 40, 30, 30, 30, 30, 30, 30]);
    expect(held.reduce((a, b) => a + b, 0)).toBe(300); // spec 01, "Une partie"
    expect(game.snapshot.wave).toBe(10);
  });

  it('lets nothing lengthen a preparation, shorten it, or start one', () => {
    // spec 01-14: no button starts it, lengthens it or cuts it short, and there
    // is no ready button.
    const game = openAt(4);
    clearAssault(game);
    expect(game.assault.prepLeft).toBe(30);
    walk(game, 10);
    expect(game.assault.prepLeft).toBeCloseTo(20, 6);
    takeOvertime(game); // the one press there is, and it has nothing to do here
    expect(game.assault.prepLeft).toBeCloseTo(20, 6);
    walk(game, 19.9);
    expect(game.assault.phase).toBe(PHASE.PREP);
    walk(game, 0.2);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    expect(game.snapshot.wave).toBe(5);
  });

  it('counts ten assaults and nine preparations in a game won', () => {
    // spec 01-16: a game won counts ten assaults and nine preparations.
    const game = openAt(1);
    const input = createInput();
    let assaults = 1;
    let preps = 0;
    for (let i = 0; i < 60 * 60 * 20; i += 1) {
      if (game.assault.phase === PHASE.ASSAULT && game.assault.toEnter === 0) fell(game);
      const was = game.assault.phase;
      step(game, input);
      // A preparation that runs is one the game sets going of itself; the one
      // that closes wave ten waits on the press instead. (spec 01-14, 01-17)
      if (was === PHASE.ASSAULT && game.assault.prepLeft > 0) preps += 1;
      if (was === PHASE.PREP && game.assault.phase === PHASE.ASSAULT) assaults += 1;
      if (game.snapshot.won) break;
    }
    expect(game.snapshot.won).toBe(true);
    expect(game.snapshot.wave).toBe(10); // spec 01-10
    expect(assaults).toBe(10);
    expect(preps).toBe(9);
    expect(game.assault.phase).toBe(PHASE.PREP);
    expect(game.assault.prepLeft).toBe(0); // spec 01-17
  });
});

describe('the victory, and the overtime', () => {
  it('wins on the last zombie of wave ten, and holds the victory for good', () => {
    // spec 01-25, 01-26: holding to the last zombie of wave ten is winning, and
    // nothing that follows takes it back.
    const game = openAt(10);
    expect(game.snapshot.won).toBe(false);
    clearAssault(game);
    expect(game.snapshot.won).toBe(true);
    expect(game.assault.phase).toBe(PHASE.PREP);
    expect(game.assault.prepLeft).toBe(0); // spec 01-17
    walk(game, 120);
    expect(game.snapshot.wave).toBe(10); // it waits, and waits (spec 01-17)
    expect(game.assault.phase).toBe(PHASE.PREP);
  });

  it('runs on into the preparation of wave ten only when the overtime is taken', () => {
    // spec 01-17, 01-32: the preparation of wave ten happens only then, and it
    // runs on into wave eleven.
    const game = openAt(10);
    clearAssault(game);
    takeOvertime(game);
    expect(game.assault.prepLeft).toBe(30); // spec 01-15
    expect([...game.snapshot.streets]).toEqual([1, 1, 1]); // spec 01-35, 03-29
    walk(game, 30.1);
    expect(game.snapshot.wave).toBe(11);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    walk(game, 60);
    expect(game.assault.zombies.count).toBe(45); // spec 01-35: a third street, no
    expect(totalOf(rowFor(BALANCE, 9))).toBe(45); // one zombie more than wave nine
  });

  it('takes no press before a victory, and no second press', () => {
    const game = openAt(4);
    clearAssault(game);
    const before = game.assault.prepLeft;
    takeOvertime(game);
    expect(game.assault.prepLeft).toBe(before);
    const won = openAt(10);
    clearAssault(won);
    takeOvertime(won);
    walk(won, 10);
    const left = won.assault.prepLeft;
    takeOvertime(won); // a second press changes nothing
    expect(won.assault.prepLeft).toBe(left);
  });

  it('keeps the victory even when the town hall falls in overtime', () => {
    // spec 01-26: the town hall may fall in overtime without unmaking it.
    const game = openAt(10);
    clearAssault(game);
    takeOvertime(game);
    walk(game, 30.1);
    game.snapshot.townHall.hp = 0;
    walk(game, 60);
    expect(game.snapshot.won).toBe(true);
  });

  it('repeats the plateau of wave fourteen, wave after wave', () => {
    // spec 01-36, 03-44: sixty zombies, three streets, and wave fourteen repeated
    // exactly.
    const fourteen = openAt(14);
    const fifteen = openAt(15);
    walk(fourteen, 90);
    walk(fifteen, 90);
    expect(fourteen.assault.zombies.count).toBe(60);
    expect(fifteen.assault.zombies.count).toBe(60);
    const kinds = (game: Game): number[] => {
      const held = [0, 0, 0, 0];
      const pool = game.assault.zombies;
      for (let at = 0; at < pool.count; at += 1) held[pool.type[at]] += 1;
      return held;
    };
    expect(kinds(fifteen)).toEqual(kinds(fourteen));
    expect(kinds(fourteen)).toEqual([22, 31, 6, 1]); // spec 03, "La table des vagues"
  });
});

describe('the defeat', () => {
  it('stops everything when the town hall falls, and is the one end there is', () => {
    // spec 01-28: the game ends when the town hall reaches nought, and the child
    // himself never falls.
    const game = openAt(5);
    walk(game, 10);
    const held = game.assault.zombies.count;
    game.snapshot.townHall.hp = 0;
    walk(game, 120);
    expect(game.assault.zombies.count).toBe(held);
    expect(game.snapshot.wave).toBe(5);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
  });

  it('starts no wave once the town hall is down', () => {
    const game = openAt(3);
    walk(game, 30);
    fell(game);
    game.snapshot.townHall.hp = 0;
    walk(game, 120);
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    expect(game.snapshot.wave).toBe(3);
  });

  it('reads the end off the town hall alone, and holds it nowhere', () => {
    // spec 01-28: the town hall at nought is the one end there is, and the child
    // himself never falls. spec 08-70: the Instantané holds ten fields and not
    // one more, so there is no eleventh flag to say this.
    const game = openAt(6);
    expect(hasEnded(game)).toBe(false);
    game.snapshot.playerHp = 0; // he falls where he stands, and that ends nothing
    expect(hasEnded(game)).toBe(false);
    game.snapshot.townHall.hp = 0;
    expect(hasEnded(game)).toBe(true);
  });

  it('lets nothing walk in once it is over, whatever time passes', () => {
    // spec 01-28: nothing more walks in, and no wave follows. Wave eight walks
    // forty in over ten packs, so twelve seconds leaves plenty waiting.
    // (spec 03, "La table des vagues", 03-22)
    const game = openAt(8);
    walk(game, 12);
    const standing = game.assault.zombies.count;
    const waiting = game.assault.toEnter;
    expect(waiting).toBeGreaterThan(0);
    game.snapshot.townHall.hp = 0;
    walk(game, 300);
    expect(game.assault.zombies.count).toBe(standing);
    expect(game.assault.toEnter).toBe(waiting);
    expect(game.snapshot.wave).toBe(8);
  });

  it('runs no preparation down once it is over', () => {
    // spec 01-14, 01-28: a preparation runs of itself and runs into the assault
    // of the next wave — but not past the end of a game.
    const game = openAt(2);
    clearAssault(game);
    expect(game.assault.phase).toBe(PHASE.PREP);
    const left = game.assault.prepLeft;
    expect(left).toBe(40); // spec 01-15
    game.snapshot.townHall.hp = 0;
    walk(game, 120);
    expect(game.assault.prepLeft).toBe(left);
    expect(game.assault.phase).toBe(PHASE.PREP);
    expect(game.snapshot.wave).toBe(2);
  });

  it('ends a game in overtime on the wave it had reached, victory and all', () => {
    // spec 01-26: the victory is won for good and the town hall may fall in
    // overtime without unmaking it. spec 01-30: what the end shows is the number
    // of the wave reached, which in overtime has no ceiling. (spec 08-77)
    const game = openAt(10);
    clearAssault(game);
    takeOvertime(game);
    walk(game, 30.1);
    expect(game.snapshot.wave).toBe(11);
    game.snapshot.townHall.hp = 0;
    walk(game, 300);
    expect(hasEnded(game)).toBe(true);
    expect(game.snapshot.won).toBe(true);
    expect(game.snapshot.wave).toBe(11);
  });
});
