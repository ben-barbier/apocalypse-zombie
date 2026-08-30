/**
 * The one object read back against the spec: three branches, the ten fields of
 * the Instantané, and pools whose sizes are written out by hand from chapter 10
 * with the address of the rule beside them. (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import {
  atBase,
  atFreeFace,
  BASE_STREET,
  cellAt,
  clearEvents,
  createGame,
  createInput,
  EVENT,
  heightAt,
  PHASE,
  pushEvent,
  railX,
  railZ,
  SNAPSHOT_VERSION,
  STREETS,
  walkableAt,
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
    // No chapter sizes the coins, so the pool is derived: one springs from every
    // zombie felled (spec 06-2), it lies until the end of the assault
    // (spec 06-8), the end of an assault pays every one of them (spec 06-14) so
    // nothing carries over, and no line of the wave table walks more than sixty
    // in (spec 03-42, 10-43). Hence exactly the sixty of the zombies.
    expectPool(game.assault.coins, 60);
  });

  it('start empty and are driven by a counter', () => {
    // spec 10-13: entries [0, count) are the live ones.
    const game = createGame(BALANCE);
    expect(game.assault.zombies.count).toBe(0);
    expect(game.assault.projectiles.count).toBe(0);
    expect(game.snapshot.cannons.count).toBe(0);
    expect(game.assault.events.count).toBe(0);
    expect(game.assault.coins.count).toBe(0);
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
    // A coin lies still until he passes it, so it has no two steps to sit
    // between: what the eye sees fly is the drawing's. (spec 06-12, 07-35)
    expect(Object.keys(game.assault.coins)).toEqual(['count', 'x', 'y', 'z', 'value']);
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

// ------------------------------------------------------------------- the plan

/**
 * The plan read back against chapter 2. Nothing here reads the city out of a
 * stored grid: it is engendered from the constants at load, and these are the
 * counts the chapter publishes. (spec 02 "Pourquoi le plan est une règle et non
 * une image", spec 04-8)
 */

const APOTHEM = 16; // spec 02-6
const MOUTH = APOTHEM; // a street begins where the square ends, spec 02-7
const FAR = MOUTH + 80; // eighty blocks of street, spec 02-12
const HALF_WIDTH = 3; // six blocks wide, spec 02-12
const TOWN_HALL = 4; // eight blocks square, spec 02-7
const BASE_MIDDLE = 6; // four blocks of shed out from a face at four, spec 02-8
const HALO = 16; // spec 02-31
const ALIGNED_BAYS = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8]; // spec 02-19
const ALIGNED_HEIGHTS = [4, 6, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8, 8]; // spec 02-23
const SHIFTED_BAYS = [3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11]; // spec 02-19
const SHIFTED_HEIGHTS = [4, 6, 8, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8]; // spec 02-23
const JUMP_RISE = 2; // what a jump clears, spec 04-10
const TOWN_HALL_CELLS = 8 * 8; // spec 02-7
const BASE_CELLS = 6 * 4; // spec 02-8

const city = createGame(BALANCE).assault.city;
const half = city.side / 2;

const spotOf = (i: number, j: number): [number, number] => [i + 0.5 - half, j + 0.5 - half];
const headingOf = (k: number): number => (k * 2 * Math.PI) / STREETS;
const alongOf = (k: number, x: number, z: number): number =>
  x * Math.cos(headingOf(k)) + z * Math.sin(headingOf(k));
const acrossOf = (k: number, x: number, z: number): number =>
  -x * Math.sin(headingOf(k)) + z * Math.cos(headingOf(k));

/** Which street a spot of floor belongs to, or -1 when it is the square. */
function streetOf(x: number, z: number): number {
  for (let k = 0; k < STREETS; k += 1) {
    const along = alongOf(k, x, z);
    if (along > MOUTH && along < FAR && Math.abs(acrossOf(k, x, z)) < HALF_WIDTH) return k;
  }
  return -1;
}

/** Every walkable cell, sorted by what it is. */
function census(): { floor: number; street: number; square: number; roofs: number } {
  const tally = { floor: 0, street: 0, square: 0, roofs: 0 };
  for (let i = 0; i < city.side; i += 1) {
    for (let j = 0; j < city.side; j += 1) {
      const at = i * city.side + j;
      if (city.walkable[at] !== 1) continue;
      if (city.height[at] > 0) {
        tally.roofs += 1;
        continue;
      }
      tally.floor += 1;
      const [x, z] = spotOf(i, j);
      if (streetOf(x, z) >= 0) tally.street += 1;
      else tally.square += 1;
    }
  }
  return tally;
}

/** The heights of one edge, from the mouth towards the far end. */
function edgeHeights(street: number, edge: number): number[] {
  const heights: number[] = [];
  const buildings = city.buildings;
  for (let n = 0; n < buildings.count; n += 1) {
    if (buildings.street[n] === street && buildings.edge[n] === edge) {
      heights[buildings.bay[n]] = buildings.height[n];
    }
  }
  return heights;
}

/** The ribbons of roof an edge holds: a drop a jump cannot take is a cut. (spec 02-25) */
function ribbonsOf(heights: readonly number[]): number[] {
  const ribbons: number[] = [1];
  for (let b = 1; b < heights.length; b += 1) {
    if (Math.abs(heights[b] - heights[b - 1]) <= JUMP_RISE) ribbons[ribbons.length - 1] += 1;
    else ribbons.push(1);
  }
  return ribbons;
}

describe('the plan of the city', () => {
  it('is one grid of 46 656 cells, one per block', () => {
    // spec 02-1 and the chapter table: 216 × 216.
    expect(city.side).toBe(216);
    expect(city.height).toHaveLength(46656);
    expect(city.walkable).toHaveLength(46656);
  });

  it('raises eighty-seven buildings, seventy-eight of street and nine of perimeter', () => {
    // spec 02-17: thirteen bays per edge, two edges, three streets, plus nine.
    const buildings = city.buildings;
    expect(buildings.count).toBe(87);
    let street = 0;
    let perimeter = 0;
    for (let n = 0; n < buildings.count; n += 1) {
      if (buildings.street[n] >= 0) street += 1;
      else perimeter += 1;
    }
    expect(street).toBe(78);
    expect(perimeter).toBe(9); // spec 02-10
  });

  it('shares their heights thirty-three, twenty-four and thirty', () => {
    // The chapter table: buildings of 4 / 6 / 8 blocks.
    const buildings = city.buildings;
    const tally = new Map<number, number>();
    for (let n = 0; n < buildings.count; n += 1) {
      const h = buildings.height[n];
      expect([4, 6, 8]).toContain(h); // spec 02-20
      tally.set(h, (tally.get(h) ?? 0) + 1);
    }
    expect(tally.get(4)).toBe(33);
    expect(tally.get(6)).toBe(24);
    expect(tally.get(8)).toBe(30);
  });

  it('keeps the nine of the perimeter at four blocks, all of them', () => {
    // spec 02-11: their roofs make one balcony around the town hall.
    const buildings = city.buildings;
    for (let n = 0; n < buildings.count; n += 1) {
      if (buildings.street[n] < 0) expect(buildings.height[n]).toBe(4);
    }
  });

  it('gives the three streets the same drawing, turned by 120°', () => {
    // spec 02-16: the overtime invents no terrain.
    for (let k = 1; k < STREETS; k += 1) {
      expect(edgeHeights(k, 0)).toEqual(edgeHeights(0, 0));
      expect(edgeHeights(k, 1)).toEqual(edgeHeights(0, 1));
    }
  });

  it('carries the two height sequences of the chapter table', () => {
    // spec 02-23: the shifted edge opens on the stretch of four, the aligned one
    // closes on it, and the far end is an eight on both. (spec 02-24)
    expect(edgeHeights(0, 0)).toEqual(ALIGNED_HEIGHTS);
    expect(edgeHeights(0, 1)).toEqual(SHIFTED_HEIGHTS);
  });

  it('shifts one edge against the other by half a bay', () => {
    // spec 02-18: three blocks, and the shift costs not one block — both edges
    // run the eighty blocks of the street.
    const sum = (bays: readonly number[]): number => bays.reduce((a, b) => a + b, 0);
    expect(sum(ALIGNED_BAYS)).toBe(80);
    expect(sum(SHIFTED_BAYS)).toBe(80);
    expect(SHIFTED_BAYS[0]).toBe(ALIGNED_BAYS[0] / 2);
  });

  it('cuts each edge three times, and no ribbon runs past four buildings', () => {
    // spec 02-25: no edge is walked from the foot to the far end without coming
    // back down into the street.
    for (let k = 0; k < STREETS; k += 1) {
      for (let edge = 0; edge < 2; edge += 1) {
        const ribbons = ribbonsOf(edgeHeights(k, edge));
        expect(ribbons.length - 1).toBe(3);
        expect(Math.max(...ribbons)).toBe(4);
      }
    }
  });

  it('lays 1 440 cells of street floor and 800 of square floor', () => {
    // The chapter table: 1 440 cells of street — three times eighty by six.
    // The square is the hexagon of apothem sixteen, less the eight by eight of
    // the town hall and the six by four of the base. (spec 02-6 to 02-9)
    const tally = census();
    expect(tally.street).toBe(1440);
    expect(tally.square).toBe(800);
  });

  it('counts 6 800 cells of floor and of roof', () => {
    // The chapter table, "Cellules praticables (sol et toits)". It tallies the
    // floor of the square, the floor of the three streets, and every cell that
    // carries a roof — the town hall and the shed of the base included, whose
    // eighty-eight cells carry one although nobody ever climbs them. (spec 02-9)
    let cells = 0;
    for (let at = 0; at < city.walkable.length; at += 1) cells += city.walkable[at];
    expect(cells + TOWN_HALL_CELLS + BASE_CELLS).toBe(6800);
    // It splits in five: 800 of square floor, 1 440 of street floor, 3 840 of
    // street roof, what the perimeter closes, and the 88 above. The first three
    // are read back one by one in the two tests that follow.
    const tally = census();
    expect(tally.square + tally.street + tally.roofs).toBe(cells);
  });

  it('roofs 3 840 cells along the streets, eight blocks deep on both edges', () => {
    // spec 02-14, 02-17: eighty blocks of frontage, eight deep, twice a street.
    let deep = 0;
    for (let i = 0; i < city.side; i += 1) {
      for (let j = 0; j < city.side; j += 1) {
        const at = i * city.side + j;
        if (city.walkable[at] !== 1 || city.height[at] === 0) continue;
        const [x, z] = spotOf(i, j);
        for (let k = 0; k < STREETS; k += 1) {
          const along = alongOf(k, x, z);
          const across = Math.abs(acrossOf(k, x, z));
          if (along > MOUTH && along < FAR && across > HALF_WIDTH && across < HALF_WIDTH + 8) {
            deep += 1;
          }
        }
      }
    }
    expect(deep).toBe(3840);
  });

  it('never lets one stand on the town hall or on the shed of the base', () => {
    // spec 02-9: neither carries a ladder, their roofs are not climbed, and
    // nothing is put down on them.
    for (let i = 0; i < city.side; i += 1) {
      for (let j = 0; j < city.side; j += 1) {
        const [x, z] = spotOf(i, j);
        if (Math.abs(x) < TOWN_HALL && Math.abs(z) < TOWN_HALL) {
          expect(walkableAt(city, x, z)).toBe(false);
        }
        const along = alongOf(0, x, z);
        if (along > TOWN_HALL && along < TOWN_HALL + 4 && Math.abs(acrossOf(0, x, z)) < 3) {
          expect(walkableAt(city, x, z)).toBe(false);
        }
      }
    }
  });

  it('stands the town hall seven blocks high in the grid, and the shed three', () => {
    // spec 02-7, 02-8: eight by eight on seven blocks, six by four on three. The
    // grid carries their height even though nobody ever walks there, because it
    // is the one thing a line of sight is traced against, and a build left at
    // nought is a build a camera stands inside. (spec 04-8, 04-18)
    let hall = 0;
    let shed = 0;
    for (let i = 0; i < city.side; i += 1) {
      for (let j = 0; j < city.side; j += 1) {
        const [x, z] = spotOf(i, j);
        const inHall = Math.abs(x) < TOWN_HALL && Math.abs(z) < TOWN_HALL;
        const along = alongOf(0, x, z);
        const inShed =
          along > TOWN_HALL && along < TOWN_HALL + 4 && Math.abs(acrossOf(0, x, z)) < 3;
        if (inHall) {
          hall += 1;
          expect(heightAt(city, x, z)).toBe(7); // spec 02-7
        } else if (inShed) {
          shed += 1;
          expect(heightAt(city, x, z)).toBe(3); // spec 02-8
        }
        // And nothing rose beside them: ten blocks each way of the middle lies
        // wholly inside the hexagon, and every cell of it that is not one of the
        // two builds is paving at nought. (spec 02-6)
        if (!inHall && !inShed && Math.abs(x) < 10 && Math.abs(z) < 10) {
          expect(heightAt(city, x, z)).toBe(0);
          expect(walkableAt(city, x, z)).toBe(true);
        }
        // Neither of the two is ever opened, whatever it now stands at: the
        // height is one half of a cell and the right to be there the other, and
        // only the first of them moved. (spec 02-9, 04-8)
        if (inHall || inShed) expect(walkableAt(city, x, z)).toBe(false);
      }
    }
    expect(hall).toBe(TOWN_HALL_CELLS);
    expect(shed).toBe(BASE_CELLS);
  });

  it('gives every building one ladder, and only one, onto walkable ground', () => {
    // spec 02-26: in the middle of the one face that gives onto walkable ground
    // — the street facade, or the square facade for the nine of the perimeter.
    const buildings = city.buildings;
    const faces = new Set<number>();
    for (let n = 0; n < buildings.count; n += 1) {
      const x = buildings.ladderX[n];
      const z = buildings.ladderZ[n];
      const up = buildings.ladderAng[n];
      faces.add(cellAt(city, x, z));
      // A block back from the face one stands on walkable floor. (spec 02-26)
      expect(walkableAt(city, x - Math.cos(up), z - Math.sin(up))).toBe(true);
      expect(heightAt(city, x - Math.cos(up), z - Math.sin(up))).toBe(0);
      // A block on, one is under the roof the ladder climbs to. (spec 04-14)
      expect(heightAt(city, x + Math.cos(up), z + Math.sin(up))).toBe(buildings.height[n]);
    }
    expect(faces.size).toBe(87);
  });

  it('traces three rails of ninety-two blocks, entrance to face of the town hall', () => {
    // spec 02-13, 03-6: the eighty of the street, plus the twelve that hold its
    // mouth off the face of the town hall.
    const rails = city.rails;
    expect(rails.length).toBe(92);
    for (let k = 0; k < STREETS; k += 1) {
      const entrance = Math.hypot(railX(rails, k, 0), railZ(rails, k, 0));
      const face = Math.hypot(railX(rails, k, 92), railZ(rails, k, 92));
      expect(entrance).toBeCloseTo(96, 4); // the far end of a street, spec 02 table
      expect(face).toBeCloseTo(TOWN_HALL, 4); // spec 02-7
      expect(entrance - face).toBeCloseTo(92, 4);
      // The advance never decreases and the rail never doubles back. (spec 03-8)
      const middle = Math.hypot(railX(rails, k, 46), railZ(rails, k, 46));
      expect(middle).toBeCloseTo(50, 4);
    }
  });

  it('stops a walk at the face of the built, the shed on street one', () => {
    // spec 03-45: the shed of the base is built for a zombie, so the street it
    // stands in front of stops at its face — the depth of the shed short of the
    // town hall. spec 02-13: and the rail keeps its ninety-two blocks all the
    // same, on the three of them.
    const rails = city.rails;
    expect(BASE_STREET).toBe(0); // the street the base watches (spec 02-8, 02-29)
    expect(rails.faceAt[BASE_STREET]).toBe(92 - BALANCE.city.baseWidth); // 88
    for (let k = 0; k < STREETS; k += 1) {
      if (k === BASE_STREET) continue;
      expect(rails.faceAt[k]).toBe(92); // nothing before the town hall (spec 03-45)
    }
    // Where a body of street one comes to rest: eight blocks out, which is the
    // near face of the shed, and the far side of it is the town hall's own.
    // (spec 02-7, 02-8)
    const stops = rails.faceAt[BASE_STREET];
    const x = railX(rails, BASE_STREET, stops);
    const z = railZ(rails, BASE_STREET, stops);
    expect(Math.hypot(x, z)).toBeCloseTo(TOWN_HALL + BALANCE.city.baseWidth, 4);
    // And the cell it stands in is floor, never the three blocks of the shed.
    // (spec 02-9, 03-47)
    expect(heightAt(city, x, z)).toBe(0);
  });

  it('stands a gateway at the mouth of each street, never at the far end', () => {
    // spec 02-27: at the mouth, on the square side — it must announce itself
    // from the square.
    for (let k = 0; k < STREETS; k += 1) {
      const away = Math.hypot(city.gateways.x[k], city.gateways.z[k]);
      expect(away).toBeCloseTo(MOUTH, 4);
      expect(city.gateways.ang[k]).toBeCloseTo(headingOf(k), 4);
    }
  });

  it('lets the halo six blocks into street one, and not a block into the others', () => {
    // spec 02-31, 02-32: sixteen blocks flat from the base, which does not cover
    // the whole square and enters one street only.
    const deep = [0, 0, 0];
    for (let i = 0; i < city.side; i += 1) {
      for (let j = 0; j < city.side; j += 1) {
        const at = i * city.side + j;
        if (city.walkable[at] !== 1 || city.height[at] > 0) continue;
        const [x, z] = spotOf(i, j);
        const k = streetOf(x, z);
        if (k < 0) continue;
        if (Math.hypot(x - BASE_MIDDLE, z) >= HALO) continue;
        deep[k] = Math.max(deep[k], Math.ceil(alongOf(k, x, z) - MOUTH));
      }
    }
    expect(deep).toEqual([6, 0, 0]);
  });

  it('makes nine roofs of eighty-seven eligible to a conveyor', () => {
    // spec 02-33: the six of the perimeter the halo reaches, and the three of the
    // foot of street one. Everywhere else a cannon is resupplied on foot for the
    // whole game.
    const buildings = city.buildings;
    const held: string[] = [];
    let eligible = 0;
    let perimeter = 0;
    for (let n = 0; n < buildings.count; n += 1) {
      if (buildings.haloed[n] !== 1) continue;
      eligible += 1;
      if (buildings.street[n] < 0) perimeter += 1;
      else {
        held.push(`street ${buildings.street[n]} edge ${buildings.edge[n]} bay ${buildings.bay[n]}`);
      }
    }
    expect(eligible).toBe(9);
    expect(perimeter).toBe(6);
    // The three of the foot of street one: one on the aligned edge, two on the
    // shifted one, which is what six blocks of halo take. (spec 02-19, 02-32)
    expect(held).toEqual([
      'street 0 edge 0 bay 0',
      'street 0 edge 1 bay 0',
      'street 0 edge 1 bay 1',
    ]);
  });

  it('holds those six of the perimeter on the two faces that flank street one', () => {
    // spec 02-33: the halo is measured from the base, which watches street one,
    // so the face between streets two and three is out of its reach entirely.
    const buildings = city.buildings;
    const faces = new Set<number>();
    for (let n = 0; n < buildings.count; n += 1) {
      if (buildings.street[n] >= 0 || buildings.haloed[n] !== 1) continue;
      // Three buildings per face, so the face is the rank divided by three.
      faces.add(Math.floor((n - 78) / 3));
    }
    expect(faces.size).toBe(2);
  });

  it('keeps the square the one passage from one street to another', () => {
    // spec 02-3: there is no shortcut. Take the square away and the three
    // streets no longer touch.
    const seen = new Uint8Array(city.side * city.side);
    const queue: number[] = [];
    const enter = (i: number, j: number): void => {
      if (i < 0 || j < 0 || i >= city.side || j >= city.side) return;
      const at = i * city.side + j;
      if (seen[at] === 1 || city.walkable[at] !== 1 || city.height[at] > 0) return;
      const [x, z] = spotOf(i, j);
      if (streetOf(x, z) < 0) return; // the square is what we took away
      seen[at] = 1;
      queue.push(at);
    };
    // Start at the far end of street one and walk as far as the floor allows.
    enter(Math.floor(90 + half), Math.floor(half));
    for (let n = 0; n < queue.length; n += 1) {
      const at = queue[n];
      const i = Math.floor(at / city.side);
      const j = at % city.side;
      enter(i + 1, j);
      enter(i - 1, j);
      enter(i, j + 1);
      enter(i, j - 1);
    }
    let reached = 0;
    for (let n = 0; n < seen.length; n += 1) reached += seen[n];
    expect(reached).toBe(480); // one street of eighty by six, and no other
  });
});

describe('the four faces of the town hall', () => {
  /** Half his own side, which is the one reading of a contact. (spec 03-14, 04-45) */
  const CONTACT = 0.5;

  it('answers at the three free faces, and never at the one the shed holds', () => {
    // spec 06-31: the three free faces reinforce; the face the shed of the base
    // is adossed to never does — there, one takes firebombs.
    // Street one heads along +x, so the shed holds the +x face. (spec 02-8, 02-29)
    expect(atFreeFace(city, -TOWN_HALL - 0.2, 0, CONTACT)).toBe(true);
    expect(atFreeFace(city, 0, TOWN_HALL + 0.2, CONTACT)).toBe(true);
    expect(atFreeFace(city, 0, -TOWN_HALL - 0.2, CONTACT)).toBe(true);
    expect(atFreeFace(city, TOWN_HALL + 0.2, 0, CONTACT)).toBe(false);
  });

  it('refuses the whole of the face the shed holds, corners and ends alike', () => {
    // spec 06-31: it is a face that never reinforces, not merely the six blocks
    // the shed happens to cover — so nothing at all on that heading answers,
    // however far across it stands and however close it presses.
    for (let across = -12; across <= 12; across += 0.25) {
      for (let along = TOWN_HALL - 0.4; along <= TOWN_HALL + 0.4; along += 0.1) {
        if (Math.abs(across) > along) continue; // that is another face
        expect(atFreeFace(city, along, across, CONTACT)).toBe(false);
      }
    }
  });

  it('never answers where the shed does, so the two gestures never meet', () => {
    // spec 06-31, 04-45: one press, one sense at one spot. Walked over the whole
    // middle of the city, a quarter of a block at a time.
    for (let x = -12; x <= 12; x += 0.25) {
      for (let z = -12; z <= 12; z += 0.25) {
        if (atBase(city, x, z, CONTACT)) expect(atFreeFace(city, x, z, CONTACT)).toBe(false);
      }
    }
  });

  it('lets go the moment he steps off, and never reaches across the square', () => {
    // spec 06-31: it is a contact, and a contact is half a block.
    expect(atFreeFace(city, -TOWN_HALL - 0.6, 0, CONTACT)).toBe(false);
    expect(atFreeFace(city, -10, 0, CONTACT)).toBe(false);
    expect(atFreeFace(city, 0, 0, CONTACT)).toBe(false); // inside it, where nobody stands
  });

  it('leaves walkable paving at the contact of each of the three', () => {
    // spec 02-4, 06-31: the three faces are reachable on foot, or the valve
    // would be shut. The cell beside a face is square paving. (spec 02-6)
    expect(walkableAt(city, -TOWN_HALL - 0.2, 0)).toBe(true);
    expect(walkableAt(city, 0, TOWN_HALL + 0.2)).toBe(true);
    expect(walkableAt(city, 0, -TOWN_HALL - 0.2)).toBe(true);
  });
});
