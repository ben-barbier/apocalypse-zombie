/**
 * The one object read back against the spec: three branches, the ten fields of
 * the Instantané, and pools whose sizes are written out by hand from chapter 10
 * with the address of the rule beside them. (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import {
  clearEvents,
  createGame,
  createInput,
  EVENT,
  PHASE,
  pushEvent,
  SNAPSHOT_VERSION,
  STREETS,
  ZOMBIE,
} from './state';

type Column = Float32Array | Uint8Array | Uint16Array;

const isColumn = (value: unknown): value is Column => ArrayBuffer.isView(value);

/** Every column of a pool, which is to say everything in it but its counter. */
function columnsOf(pool: object): [string, unknown][] {
  return Object.entries(pool).filter(([name]) => name !== 'count');
}

function expectPool(pool: object, size: number): void {
  const columns = columnsOf(pool);
  expect(columns.length).toBeGreaterThan(0);
  for (const [name, column] of columns) {
    // spec 10-11: structures of arrays, never an array of objects.
    expect(`${name} ${Array.isArray(column)}`).toBe(`${name} false`);
    expect(`${name} ${isColumn(column)}`).toBe(`${name} true`);
    if (isColumn(column)) expect(`${name} ${column.length}`).toBe(`${name} ${size}`);
  }
}

describe('the one object', () => {
  it('has three branches and three only', () => {
    // spec 10-12: balance, snapshot, assault.
    expect(Object.keys(createGame(BALANCE))).toEqual(['balance', 'snapshot', 'assault']);
  });

  it('takes the balance handed to it instead of importing one', () => {
    // spec 10-15: createGame(BALANCE) stores it in game.balance.
    const game = createGame(BALANCE);
    expect(game.balance).toBe(BALANCE);
    expect(Object.isFrozen(game.balance)).toBe(true);
  });

  it('opens on the assault of wave one, with street one alone', () => {
    const game = createGame(BALANCE);
    expect(game.snapshot.wave).toBe(1); // spec 01-10
    expect(game.assault.phase).toBe(PHASE.ASSAULT); // spec 01-16
    expect(game.snapshot.won).toBe(false); // spec 01-25
    expect([...game.snapshot.streets]).toEqual([1, 0, 0]); // spec 03-28, 03-31
    expect(game.snapshot.streets).toHaveLength(STREETS); // spec 02-2
    expect(STREETS).toBe(3); // spec 02-2
  });

  it('opens with a fresh town hall, an empty purse and no firebomb', () => {
    const game = createGame(BALANCE);
    expect(game.snapshot.townHall.hp).toBe(200); // spec 06-26
    expect(game.snapshot.townHall.cap).toBe(200); // spec 06-26
    expect(game.snapshot.coins).toBe(0);
    expect(game.snapshot.playerHp).toBe(5); // spec 04-37
    expect(game.snapshot.armful).toBe(0); // spec 04-47
  });

  it('holds one generator, whose whole state rides in the snapshot', () => {
    // spec 10-27: one mulberry32, its state in Game and in the Instantané.
    expect(createGame(BALANCE, 7).snapshot.random).toEqual({ seed: 7, draws: 0 });
    expect(createGame(BALANCE).snapshot.random.seed).toBe(0);
  });
});

describe('the wave boundary', () => {
  it('carries ten fields and not one more', () => {
    // spec 08-70: the version, the wave, the victory flag, the hp of the town
    // hall and its ceiling, the coins, the cannons, the hp of the player, the
    // armful, the active streets and the state of the generator.
    expect(Object.keys(createGame(BALANCE).snapshot)).toEqual([
      'version',
      'wave',
      'won',
      'townHall',
      'coins',
      'cannons',
      'playerHp',
      'armful',
      'streets',
      'random',
    ]);
  });

  it('writes its format in the JSON and never in the key', () => {
    expect(createGame(BALANCE).snapshot.version).toBe(SNAPSHOT_VERSION); // spec 10-32
  });

  it('leaves the spot of the player out of it', () => {
    // spec 08-71: at a resume he stands at the base, where a preparation begins.
    const snapshot: object = createGame(BALANCE).snapshot;
    expect(Object.keys(snapshot)).not.toContain('player');
  });
});

describe('the pools', () => {
  it('are the sizes of chapter 10, allocated at load', () => {
    const game = createGame(BALANCE);
    // spec 10, "Les pools, alloués au chargement": 60, 96, 600, 256 — the six
    // hundred shards being the one pool that lives in the renderer. (spec 10-39)
    expectPool(game.assault.zombies, 60);
    expectPool(game.assault.projectiles, 96);
    expectPool(game.assault.events, 256);
    expectPool(game.snapshot.cannons, 24); // spec 05-52
  });

  it('start empty and are driven by a counter', () => {
    // spec 10-13: entries [0, count) are the live ones.
    const game = createGame(BALANCE);
    expect(game.assault.zombies.count).toBe(0);
    expect(game.assault.projectiles.count).toBe(0);
    expect(game.snapshot.cannons.count).toBe(0);
    expect(game.assault.events.count).toBe(0);
  });

  it('carry a Prev buffer for whatever moves', () => {
    // spec 10-24: the renderer interpolates between the two last steps.
    const game = createGame(BALANCE);
    expect(game.assault.zombies.xPrev).toHaveLength(60);
    expect(game.assault.zombies.zPrev).toHaveLength(60);
    expect(game.assault.zombies.angPrev).toHaveLength(60);
    expect(game.assault.projectiles.xPrev).toHaveLength(96);
    expect(game.assault.projectiles.zPrev).toHaveLength(96);
    // A cannon stands still once it is down: only its aim turns. (spec 05-38)
    expect(game.snapshot.cannons.angPrev).toHaveLength(24);
    expect(game.assault.player.xPrev).toBe(0);
    expect(game.assault.player.angPrev).toBe(0);
  });

  it('names the four kinds of zombie, and no fifth', () => {
    expect(Object.keys(ZOMBIE)).toEqual(['SHAMBLER', 'SPRINTER', 'BRUISER', 'COLOSSUS']); // spec 03-1
  });
});

describe('the buffer of events', () => {
  it('holds one enumeration, whose constants are all apart', () => {
    // spec 10-20: one enumeration, declared here, and the size of the buffer
    // does not move when a chapter adds a fact of the game.
    const types = Object.values(EVENT);
    expect(new Set(types).size).toBe(types.length);
    for (const type of types) expect(type).toBeLessThan(256);
  });

  it('drops a fact rather than growing', () => {
    // spec 10-14, 10-17: 256 entries, pre-allocated, and no allocation ever.
    const events = createGame(BALANCE).assault.events;
    for (let i = 0; i < 300; i += 1) {
      pushEvent(events, EVENT.FATAL_BLOW, i, 1, 2, 3, 4);
    }
    expect(events.count).toBe(256);
    expect(events.type).toHaveLength(256);
    expect(events.type[0]).toBe(EVENT.FATAL_BLOW);
    expect(events.x[255]).toBe(1);
    expect(events.value[255]).toBe(4);
  });

  it('empties at the start of a frame', () => {
    // spec 10-18: emptied at the start of a frame, read once before the drawing.
    const events = createGame(BALANCE).assault.events;
    pushEvent(events, EVENT.COIN_TAKEN, 0, 0, 0, 0, 2);
    expect(events.count).toBe(1);
    clearEvents(events);
    expect(events.count).toBe(0);
  });
});

describe('the entries', () => {
  it('are one shape, whatever writes them', () => {
    // spec 10-30: dx and dz of norm at most one, strike held, three edges.
    expect(createInput()).toEqual({
      dx: 0,
      dz: 0,
      strike: false,
      action: false,
      jump: false,
      airlock: false,
    });
  });
});
