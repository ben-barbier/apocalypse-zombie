/**
 * The Instantané read back against chapters 8, 1 and 10. Every number here is
 * written out by hand from `docs/spec/`, with the address of the rule beside it.
 * (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { placeCannon } from './cannons';
import { placePlayer } from './player';
import { nextFloat } from './random';
import {
  applySnapshot,
  decodeSnapshot,
  encodeSnapshot,
  owesSnapshot,
  type StoredSnapshot,
} from './snapshot';
import {
  EVENT,
  type EventType,
  type Game,
  PHASE,
  createGame,
  pushEvent,
  clearEvents,
} from './state';

/** The ten fields of the Instantané, and not one more. (spec 08-70) */
const TEN = [
  'armful',
  'cannons',
  'coins',
  'playerHp',
  'random',
  'streets',
  'townHall',
  'version',
  'wave',
  'won',
];

function newGame(): Game {
  return createGame(BALANCE, 7);
}

/** What a text off the disk is before a field of it is believed. */
interface Loose {
  [field: string]: unknown;
}

/** Reads the text back as a plain object, which is what a disk hands over. */
function textOf(game: Game): Loose {
  return JSON.parse(encodeSnapshot(game)) as Loose;
}

function pass(game: Game): StoredSnapshot {
  const stored = decodeSnapshot(encodeSnapshot(game));
  if (stored === null) throw new Error('the text of a whole game was refused');
  return stored;
}

function say(game: Game, kind: EventType): void {
  pushEvent(game.assault.events, kind, 0, 0, 0, 0, 0);
}

describe('what the Instantané holds', () => {
  it('holds ten fields, and not one more (spec 08-70)', () => {
    expect(Object.keys(textOf(newGame())).sort()).toEqual(TEN);
  });

  it('leaves the player where he stands out of it (spec 08-71)', () => {
    const game = newGame();
    game.assault.player.x = 42;
    game.assault.player.z = -13;
    const text = encodeSnapshot(game);
    expect(text).not.toContain('42');
    expect(text).not.toContain('-13');

    // He comes back exactly where a new game opens him, and turned as it turns
    // him. (spec 01-22, 08-71)
    const fresh = newGame();
    placePlayer(fresh);
    applySnapshot(game, pass(game));
    // Twelve blocks along the axis of street one and nine to the side, clear of
    // the shed. (spec 01-22)
    expect(Math.abs(game.assault.player.x)).toBeCloseTo(12, 6);
    expect(Math.abs(game.assault.player.z)).toBeCloseTo(9, 6);
    expect(game.assault.player.x).toBeCloseTo(fresh.assault.player.x, 6);
    expect(game.assault.player.z).toBeCloseTo(fresh.assault.player.z, 6);
    expect(game.assault.player.ang).toBeCloseTo(fresh.assault.player.ang, 6);
  });

  it('carries the state of the one generator, so the wave that comes back is the wave that had begun (spec 10-27)', () => {
    const game = newGame();
    for (let i = 0; i < 5; i += 1) nextFloat(game.snapshot.random);
    const stored = pass(game);
    expect(stored.random.draws).toBe(5);

    const owed = nextFloat(game.snapshot.random);
    const other = newGame();
    applySnapshot(other, stored);
    expect(nextFloat(other.snapshot.random)).toBe(owed);
  });

  it('carries the town hall, its ceiling, the purse and the streets (spec 08-70)', () => {
    const game = newGame();
    game.snapshot.townHall.hp = 137;
    game.snapshot.townHall.cap = 300; // the first notch of a reinforcement (spec 06-27)
    game.snapshot.coins = 214;
    game.snapshot.playerHp = 3; // of the five (spec 04-37)
    game.snapshot.armful = 2; // of the three (spec 04-47)
    game.snapshot.wave = 7;
    game.snapshot.streets[1] = 1; // the second street opens at wave 5 (spec 03-28)

    const other = newGame();
    applySnapshot(other, pass(game));
    expect(other.snapshot.townHall.hp).toBe(137);
    expect(other.snapshot.townHall.cap).toBe(300);
    expect(other.snapshot.coins).toBe(214);
    expect(other.snapshot.playerHp).toBe(3);
    expect(other.snapshot.armful).toBe(2);
    expect(other.snapshot.wave).toBe(7);
    expect([...other.snapshot.streets]).toEqual([1, 1, 0]);
  });

  it('carries a cannon whole: where, how high, which tier, its magazine and what is left of it (spec 08-70, 05-47)', () => {
    const game = newGame();
    const pool = game.snapshot.cannons;
    pool.count = 1;
    pool.x[0] = 12;
    pool.y[0] = 6; // a roof, which is a taller cell and no special case (spec 04-9)
    pool.z[0] = -4;
    pool.tier[0] = 3;
    pool.magazine[0] = 2;
    // A ground cannon is worth twenty shambler hits and never mends: a killed
    // page may not hand one back whole. (spec 05-44, 05-47)
    pool.hp[0] = 6;

    const other = newGame();
    applySnapshot(other, pass(game));
    const back = other.snapshot.cannons;
    expect(back.count).toBe(1);
    expect(back.x[0]).toBe(12);
    expect(back.y[0]).toBe(6);
    expect(back.z[0]).toBe(-4);
    expect(back.tier[0]).toBe(3);
    expect(back.magazine[0]).toBe(2);
    expect(back.hp[0]).toBe(6);
  });

  it('is about a kibibyte of text on a game well under way (spec 08 "Ce que porte l\'Instantané")', () => {
    const game = newGame();
    game.assault.phase = PHASE.PREP;
    game.snapshot.coins = 9999;
    for (let i = 0; i < 12; i += 1) {
      placeCannon(game, 8 + i * 3, 0, 0, 0);
    }
    expect(encodeSnapshot(game).length).toBeLessThan(2048);
  });
});

describe('a text that cannot be believed', () => {
  it('is nothing at all, and there is no migration ever (spec 08-78, 10-35)', () => {
    expect(decodeSnapshot(null)).toBeNull();
    expect(decodeSnapshot('')).toBeNull();
    expect(decodeSnapshot('{')).toBeNull();
    expect(decodeSnapshot('"a string"')).toBeNull();
    expect(decodeSnapshot('[]')).toBeNull();
  });

  it('is nothing when the format is another one (spec 08-78, 10-35)', () => {
    const game = newGame();
    const held = JSON.parse(encodeSnapshot(game)) as Loose;
    held.version = 2;
    expect(decodeSnapshot(JSON.stringify(held))).toBeNull();
    held.version = 0;
    expect(decodeSnapshot(JSON.stringify(held))).toBeNull();
    delete held.version;
    expect(decodeSnapshot(JSON.stringify(held))).toBeNull();
  });

  it('is nothing when one field of the ten is short (spec 08-78)', () => {
    const game = newGame();
    for (const field of TEN) {
      if (field === 'version') continue;
      const held = JSON.parse(encodeSnapshot(game)) as Loose;
      delete held[field];
      expect(decodeSnapshot(JSON.stringify(held))).toBeNull();
    }
  });

  it('is nothing when a field is of the wrong kind (spec 08-78)', () => {
    const game = newGame();
    const held = JSON.parse(encodeSnapshot(game)) as Loose;
    held.coins = 'lots';
    expect(decodeSnapshot(JSON.stringify(held))).toBeNull();
  });
});

describe('when it is written', () => {
  it('is written at the entry into a preparation (spec 08-72)', () => {
    const game = newGame();
    game.assault.phase = PHASE.PREP;
    say(game, EVENT.ASSAULT_ENDED);
    expect(owesSnapshot(game)).toBe(true);
  });

  it('is written at each of the four purchases of that preparation (spec 08-72)', () => {
    for (const kind of [
      EVENT.CANNON_PLACED,
      EVENT.CANNON_UPGRADED,
      EVENT.ARMFUL_TAKEN,
      EVENT.REINFORCEMENT_BOUGHT,
    ]) {
      const game = newGame();
      game.assault.phase = PHASE.PREP;
      say(game, kind);
      expect(owesSnapshot(game)).toBe(true);
    }
  });

  it('is never written during an assault, whatever is bought there (spec 08-73, 08-74)', () => {
    const game = newGame(); // a game opens on the assault of wave one (spec 01-16)
    expect(game.assault.phase).toBe(PHASE.ASSAULT);
    say(game, EVENT.CANNON_PLACED);
    say(game, EVENT.REINFORCEMENT_BOUGHT);
    expect(owesSnapshot(game)).toBe(false);
  });

  it('is not written on a frame where nothing of the ten moved (spec 08-72)', () => {
    const game = newGame();
    game.assault.phase = PHASE.PREP;
    say(game, EVENT.SWORD_HIT);
    say(game, EVENT.COIN_TAKEN);
    expect(owesSnapshot(game)).toBe(false);
    clearEvents(game.assault.events);
    expect(owesSnapshot(game)).toBe(false);
  });

  it('is still written at the boundary of a won game, which keeps its net (spec 08-76, 08-77)', () => {
    const game = newGame();
    game.snapshot.won = true;
    game.snapshot.wave = 14; // overtime, and its wave has no ceiling (spec 08-77)
    game.assault.phase = PHASE.PREP;
    say(game, EVENT.ASSAULT_ENDED);
    expect(owesSnapshot(game)).toBe(true);
    expect(pass(game).won).toBe(true);
  });
});

describe('the resumed game', () => {
  it('comes back at the start of the preparation of the wave in hand, bar full (spec 08-66)', () => {
    const game = newGame();
    game.snapshot.wave = 2;
    const stored = pass(game);

    const other = newGame();
    applySnapshot(other, stored);
    expect(other.assault.phase).toBe(PHASE.PREP);
    // Forty seconds for waves 1 to 3, thirty from wave 4 on. (spec 01-15)
    expect(other.assault.prepLeft).toBe(40);

    game.snapshot.wave = 6;
    applySnapshot(other, pass(game));
    expect(other.assault.prepLeft).toBe(30);
  });

  it('comes back on a city with nothing of the assault left in it (spec 08-69)', () => {
    const game = newGame(); // wave one has four shamblers standing in street one
    game.assault.zombies.count = 4;
    game.assault.projectiles.count = 2;
    game.assault.coins.count = 3;
    game.assault.toEnter = 9;
    game.assault.fewFor = 11;
    game.assault.sent[0] = 2;
    game.assault.enterLeft[0] = 4;

    applySnapshot(game, pass(game));
    expect(game.assault.zombies.count).toBe(0);
    expect(game.assault.projectiles.count).toBe(0);
    expect(game.assault.coins.count).toBe(0);
    expect(game.assault.toEnter).toBe(0);
    expect(game.assault.fewFor).toBe(0);
    expect([...game.assault.sent]).toEqual([0, 0, 0]);
    expect([...game.assault.enterLeft]).toEqual([0, 0, 0]);
  });

  it('waits on the press that takes the overtime, and never takes it itself (spec 01-17, 01-32)', () => {
    const game = newGame();
    game.snapshot.won = true;
    game.snapshot.wave = 10; // the victory, and the preparation that waits (spec 01-25)
    const other = newGame();
    applySnapshot(other, pass(game));
    expect(other.assault.phase).toBe(PHASE.PREP);
    expect(other.assault.prepLeft).toBe(0);
  });

  it('never lets a text push more cannons than the pool holds (spec 10-13)', () => {
    const game = newGame();
    const size = game.snapshot.cannons.x.length;
    const stored = pass(game);
    stored.cannons.count = size + 5;
    for (let i = 0; i < size + 5; i += 1) {
      stored.cannons.x.push(0);
      stored.cannons.y.push(0);
      stored.cannons.z.push(0);
      stored.cannons.tier.push(1);
      stored.cannons.hp.push(20);
      stored.cannons.magazine.push(0);
    }
    applySnapshot(game, stored);
    expect(game.snapshot.cannons.count).toBe(size);
  });

  it('puts him back on his feet, whatever the assault had left him (spec 08-66)', () => {
    const game = newGame();
    game.assault.player.collapseLeft = 2;
    game.assault.player.staggerLeft = 1;
    applySnapshot(game, pass(game));
    expect(game.assault.player.collapseLeft).toBe(0);
    expect(game.assault.player.staggerLeft).toBe(0);
  });
});
