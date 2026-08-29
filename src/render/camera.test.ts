/**
 * The camera read back against chapter 4: the six constants, the recentring that
 * only a run asks for, the freeze a blow of the sword lays on it, the climb that
 * comes before any closing in, and the two refusals — no command anywhere, no
 * framing ever taken from the child. (spec 04-15 to 04-20)
 *
 * Nothing here draws: it turns the camera under node and reads where it stands,
 * which is how a rule of chapter 4 becomes a red error rather than a good
 * intention. The grid and the six constants are written out here by hand,
 * because `src/render/` takes types from the rules and never their functions.
 * (spec 10-2, 10-42, 10-45)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { CameraBalance } from '../game/balance';
import type { City, Player } from '../game/state';
import {
  acrossOf,
  aimCamera,
  closingPace,
  createCamera,
  fitCamera,
  freezeRecentring,
  settleCamera,
  type CameraView,
} from './camera';
import { hazeFar, type CityExtent } from './scene';

/** The six of chapter 4, written out here from the spec and from nowhere else. */
const RULE: CameraBalance = {
  back: 6.5, // spec 04-15
  above: 5.5, // spec 04-15
  minBack: 3.2, // spec 04-18
  climb: 10, // spec 04-18
  recentre: 2.4, // spec 04-16
  freezeAfterBlow: 1.2, // spec 04-17
};

/** What the far plane is read off, from chapter 2 by way of chapter 7. */
const EXTENT: CityExtent = { apothem: 16, outskirts: 12, street: { length: 80 } };

/** A grid large enough to hold a frontage behind a player, and no larger. */
const SIDE = 64;
const HALF = SIDE / 2;

/** A floor one may stand on everywhere, with nothing built on it yet. (spec 04-8) */
function flatCity(): City {
  return {
    side: SIDE,
    height: new Uint8Array(SIDE * SIDE),
    walkable: new Uint8Array(SIDE * SIDE).fill(1),
    // The base and the halo, which this file never reads: no camera of this game
    // has anything to say about a conveyor. (spec 02-31)
    baseX: 0,
    baseZ: 0,
    halo: 16,
    baseAng: 0,
    baseAlong: 2, // half the four blocks the shed runs out from the town hall
    baseAcross: 3, // half the six it is wide (spec 02-8)
    townHallHalf: 4, // half the eight of the town hall (spec 02-7)
    buildings: {
      count: 0,
      x: new Float32Array(0),
      z: new Float32Array(0),
      height: new Uint8Array(0),
      street: new Int8Array(0),
      edge: new Uint8Array(0),
      bay: new Uint8Array(0),
      ladderX: new Float32Array(0),
      ladderZ: new Float32Array(0),
      ladderAng: new Float32Array(0),
      haloed: new Uint8Array(0),
    },
    rails: {
      stops: 2,
      x: new Float32Array(6),
      z: new Float32Array(6),
      at: new Float32Array(6),
      length: 92,
    },
    gateways: { x: new Float32Array(3), z: new Float32Array(3), ang: new Float32Array(3) },
  };
}

/**
 * Builds a block of frontage over a stretch of the grid, in the heights chapter
 * 2 allows and no others. (spec 02-20)
 */
function build(city: City, fromX: number, toX: number, high: number): void {
  for (let x = fromX; x < toX; x += 1) {
    for (let z = -3; z < 3; z += 1) {
      const at = Math.floor(x + HALF) * SIDE + Math.floor(z + HALF);
      city.height[at] = high;
    }
  }
}

/**
 * Raises a box of the grid: the two builds at the middle of the city, which are
 * never walked on and which a line of sight has to stop against all the same.
 * (spec 02-7, 02-8, 02-9)
 */
function raiseBox(
  city: City,
  fromX: number,
  toX: number,
  fromZ: number,
  toZ: number,
  high: number,
): void {
  for (let x = fromX; x < toX; x += 1) {
    for (let z = fromZ; z < toZ; z += 1) {
      city.height[Math.floor(x + HALF) * SIDE + Math.floor(z + HALF)] = high;
    }
  }
}

/** How high what stands in a cell goes, as the camera itself reads it. */
function floorUnder(city: City, x: number, z: number): number {
  return city.height[Math.floor(x + HALF) * SIDE + Math.floor(z + HALF)] ?? 0;
}

/**
 * The two builds of the square, written out here from chapter 2 and from nowhere
 * else: the town hall eight blocks square on seven, at the exact middle, and the
 * shed of the base six by four on three, adossed to the face that watches street
 * one — which in this hand-built grid is the x of the world. (spec 02-7, 02-8)
 */
const TOWN_HALL_HALF = 4;
const TOWN_HALL_HIGH = 7;
const SHED_OUT = 4; // how far it runs out from the face
const SHED_HALF = 3; // half the six it is wide
const SHED_HIGH = 3;

/** The hexagon of the square, and the ring of four-block builds that closes it. */
const APOTHEM = 16; // spec 02-6
const PERIMETER_REACH = 26; // the apothem, a frontage of eight, and two (spec 02-10)
const PERIMETER_HIGH = 4; // all nine of them (spec 02-11)

/** Where the mouth of street one stands, on the x of this hand-built world. */
const MOUTH = APOTHEM; // spec 02-6, 02-7
/** Where the four shamblers of the first assault stand. (spec 02-30) */
const WATCHES_AT = MOUTH + 20;

/**
 * Where a game opens: on the square in front of the base, four blocks past the
 * face of the shed — its own depth again — and six past its flank, turned onto
 * the stretch of street one its four shamblers stand on. Every length is read
 * off the plan: four blocks of town hall, four of shed, four more, and the three
 * of the flank plus the six that hold him clear of it.
 * (spec 01-22, 02-8, 02-30, 08-71)
 */
const OPENS_ALONG = TOWN_HALL_HALF + SHED_OUT * 2;
const OPENS_ACROSS = SHED_HALF + 6;
const OPENS_ANG = Math.atan2(-OPENS_ACROSS, WATCHES_AT - OPENS_ALONG);

/** Where he stands whenever he comes back for an armful: at the face of the shed. */
const AT_THE_SHED = TOWN_HALL_HALF + SHED_OUT + 0.5;

/**
 * The middle of the city as chapter 2 builds it: the town hall eight by eight
 * and seven high at the very middle, and the shed of the base six by four and
 * three high against the face that watches street one, which runs down the x of
 * the world here. (spec 02-7, 02-8)
 */
function middleOfTheCity(): City {
  const city = flatCity();
  raiseBox(city, -TOWN_HALL_HALF, TOWN_HALL_HALF, -TOWN_HALL_HALF, TOWN_HALL_HALF, TOWN_HALL_HIGH);
  raiseBox(city, TOWN_HALL_HALF, TOWN_HALL_HALF + SHED_OUT, -SHED_HALF, SHED_HALF, SHED_HIGH);
  return city;
}

/** How far a spot stands from the middle, on the three axes of the hexagon. (spec 02-6) */
function hexAt(x: number, z: number): number {
  let most = 0;
  for (let s = 0; s < 3; s += 1) {
    const a = (s * Math.PI) / 3;
    const away = Math.abs(x * Math.cos(a) + z * Math.sin(a));
    if (away > most) most = away;
  }
  return most;
}

/**
 * Closes the hub: everything the hexagon of apothem sixteen leaves out, within
 * twenty-six blocks of the middle, stands four blocks high — the nine builds of
 * the perimeter. The three streets are not cut through it here, which can only
 * bring built ground nearer to a lens than the real city does: what this grid
 * says about a clearance, the city says at least as well. (spec 02-10, 02-11)
 */
function raisePerimeter(city: City): void {
  for (let i = 0; i < SIDE; i += 1) {
    for (let j = 0; j < SIDE; j += 1) {
      const x = i + 0.5 - HALF;
      const z = j + 0.5 - HALF;
      if (hexAt(x, z) < APOTHEM) continue;
      if (Math.hypot(x, z) > PERIMETER_REACH) continue;
      city.height[i * SIDE + j] = PERIMETER_HIGH;
    }
  }
}

/** The whole square: the two builds at the middle, and the ring that closes it. */
function theSquare(): City {
  const city = middleOfTheCity();
  raisePerimeter(city);
  return city;
}

/** How far the nearest built volume stands from a spot, in blocks. (spec 01-22) */
function nearestBuilt(city: City, x: number, y: number, z: number): number {
  let least = Infinity;
  for (let i = 0; i < SIDE; i += 1) {
    for (let j = 0; j < SIDE; j += 1) {
      const high = city.height[i * SIDE + j] ?? 0;
      if (high === 0) continue;
      const lowX = i - HALF;
      const lowZ = j - HALF;
      const offX = Math.max(lowX - x, 0, x - (lowX + 1));
      const offZ = Math.max(lowZ - z, 0, z - (lowZ + 1));
      const away = Math.hypot(offX, Math.max(0, y - high), offZ);
      if (away < least) least = away;
    }
  }
  return least;
}

/** A body at a spot, heading a way, standing still unless told otherwise. */
function playerAt(x: number, z: number, ang: number): Player {
  return {
    x,
    y: 0,
    z,
    ang,
    xPrev: x,
    yPrev: 0,
    zPrev: z,
    angPrev: ang,
    vy: 0,
    climbLeft: 0,
    climbFromY: 0,
    climbToX: 0,
    climbToY: 0,
    climbToZ: 0,
    staggerLeft: 0,
    invulnerableLeft: 0,
    regenLeft: 0,
    collapseLeft: 0,
    strikeLeft: 0,
  };
}

/** Makes him run: a step of the one pace, so the camera reads him as moving. (spec 04-6) */
function runsHim(player: Player): void {
  player.xPrev = player.x - 6 / 60;
}

/** Frames of ten milliseconds, from one instant to another. Hands back where it got to. */
function frames(view: CameraView, city: City, player: Player, from: number, ms: number): number {
  let now = from;
  const until = from + ms;
  while (now < until) {
    aimCamera(view, city, player, 1, now);
    now += 10;
  }
  aimCamera(view, city, player, 1, now);
  return now;
}

/** Where the camera looks, as a heading of its own. */
function facing(view: CameraView): THREE.Vector3 {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(view.lens.quaternion);
}

describe('where it stands', () => {
  it('is behind him, six and a half back and five and a half over his ground', () => {
    // spec 04-15: 6,5 blocks of recoil, 5,5 over the ground he walks on.
    const city = flatCity();
    const player = playerAt(0, 0, 0); // heading down the x of the world
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.back).toBe(6.5);
    expect(view.above).toBe(5.5);
    expect(view.lens.position.x).toBeCloseTo(-6.5, 6);
    expect(view.lens.position.y).toBeCloseTo(5.5, 6);
    expect(view.lens.position.z).toBeCloseTo(0, 6);
  });

  it('turns onto him wherever he stands', () => {
    const city = flatCity();
    const player = playerAt(3, -2, Math.PI / 2);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    const look = facing(view);
    expect(look.x).toBeCloseTo(0, 6); // he heads down z, so it watches down z
    expect(look.z).toBeGreaterThan(0);
    expect(look.y).toBeLessThan(0); // it stands over him and looks down
  });

  it('follows the spot between the two last steps, not the last one', () => {
    // spec 10-24: the drawing interpolates, or it judders on a fast screen.
    const city = flatCity();
    const player = playerAt(2, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    player.xPrev = 0;
    aimCamera(view, city, player, 0.5, 0);
    expect(view.lens.position.x).toBeCloseTo(1 - 6.5, 6);
  });

  it('opens a game on the floor of the square, clear of everything, and climbs not at all', () => {
    // spec 01-22: a game opens on the square in front of the base — twelve blocks
    // along the axis of street one and nine across it — turned onto the stretch
    // of that street its four shamblers stand on. spec 02-6 to 02-11: the town
    // hall is eight by eight and seven high at the middle of the city, the shed
    // six by four and three high against the face that watches street one, the
    // mouth of that street stands sixteen blocks out, and the perimeter closes
    // the hexagon four blocks high. spec 04-15, 04-18: 6,5 back and 5,5 up, and
    // the climb is only ever bought by something coming in the way.
    const city = theSquare();
    const player = playerAt(OPENS_ALONG, OPENS_ACROSS, OPENS_ANG);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.back).toBe(6.5);
    expect(view.above).toBe(5.5); // its nominal height, with nothing added to it
    expect(view.lens.position.y).toBeCloseTo(5.5, 6);
    // It sits over the floor of the square, in none of the builds of the city…
    expect(floorUnder(city, view.lens.position.x, view.lens.position.z)).toBe(0);
    const lens = view.lens.position;
    // …and no nearer than two blocks to any of them, which is what the opening
    // spot is chosen for. (spec 01-22)
    expect(nearestBuilt(city, lens.x, lens.y, lens.z)).toBeGreaterThan(2);
    // Nothing comes between the lens and his middle: a build in the way is
    // precisely what would have bought a climb, and none was bought. (spec 04-18)
    expect(view.above).toBe(RULE.above);
  });

  it('would open at the base with the whole climb spent and the recoil halved', () => {
    // spec 01-22, 04-18: at the base itself, on the axis of street one and half a
    // block in front of the face of the shed, the nominal recoil lands inside the
    // town hall and the roof of the shed cuts the line of sight. So the camera
    // spends the whole of its ten blocks and then comes in to little over half
    // its recoil, and the child watches himself from straight over his own head.
    // This is the screen the opening spot was moved off, and it is why the
    // opening is no longer there.
    const city = middleOfTheCity();
    const player = playerAt(AT_THE_SHED, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.above).toBeCloseTo(RULE.above + RULE.climb, 6); // all ten of it
    expect(view.back).toBeLessThan(4);
    expect(view.back).toBeGreaterThanOrEqual(RULE.minBack);
    // It ends up over the roof of the shed rather than over the town hall.
    expect(floorUnder(city, view.lens.position.x, view.lens.position.z)).toBe(SHED_HIGH);
  });

  it('opens with neither the town hall nor the shed in the frame, and the gateway in it', () => {
    // spec 01-22: the first picture of a run holds the child's own body and the
    // street he has to walk down, and neither of the two builds of the square:
    // every one of their corners falls beyond the borders of the picture,
    // whatever shape the screen is, while the gateway of street one stands
    // inside them. It is the whole reason the opening spot stands off the shed —
    // against it, the shed and the town hall took the left half of the picture.
    // (spec 02-27, 04-15)
    const city = theSquare();
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, playerAt(OPENS_ALONG, OPENS_ACROSS, OPENS_ANG));

    const corners: [number, number][] = [];
    for (const along of [-TOWN_HALL_HALF, TOWN_HALL_HALF]) {
      for (const across of [-TOWN_HALL_HALF, TOWN_HALL_HALF]) corners.push([along, across]);
    }
    for (const along of [TOWN_HALL_HALF, TOWN_HALL_HALF + SHED_OUT]) {
      for (const across of [-SHED_HALF, SHED_HALF]) corners.push([along, across]);
    }

    const inFrame: string[] = [];
    // A square screen, an iPad and a wide one: the narrower the screen, the
    // further out a corner falls, so the widest is the one that has to hold.
    for (const shape of [1, 4 / 3, 16 / 9]) {
      fitCamera(view, shape * 100, 100);
      for (const [x, z] of corners) {
        if (Math.abs(acrossOf(view, x, z)) <= 1) inFrame.push(`${shape} ${x} ${z}`);
      }
      expect(Math.abs(acrossOf(view, MOUTH, 0))).toBeLessThan(1); // the gateway (spec 02-27)
    }
    expect(inFrame).toEqual([]);
  });

  it('stops its far plane where the haze is total', () => {
    // spec 07-6: past that distance what is clipped and what is drawn are the
    // one colour, so the cut cannot be seen.
    const view = createCamera(RULE, EXTENT);
    expect(view.lens.far).toBe(hazeFar(EXTENT));
    expect(view.lens.far).toBe(108); // spec 07 "La lumière et la brume"
  });

  it('takes the shape of the screen and asks nothing of the game', () => {
    const view = createCamera(RULE, EXTENT);
    fitCamera(view, 1024, 768);
    expect(view.lens.aspect).toBeCloseTo(1024 / 768, 6);
  });
});

describe('the recentring', () => {
  it('swings back behind him as soon as he runs, at 2,4 radians a second', () => {
    // spec 04-16: assisted, and 2,4 rad/s is the whole of the speed.
    const city = flatCity();
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    player.ang = Math.PI / 2;
    player.angPrev = Math.PI / 2;
    runsHim(player);

    const now = frames(view, city, player, 0, 500);
    expect(view.ang).toBeCloseTo(2.4 * 0.5, 6); // half a second of turning

    frames(view, city, player, now, 500);
    expect(view.ang).toBeCloseTo(Math.PI / 2, 6); // and it stops behind him
  });

  it('holds still while he does', () => {
    // spec 04-16: it recentres because he runs, and for no other reason.
    const city = flatCity();
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    player.ang = Math.PI / 2;
    player.angPrev = Math.PI / 2;
    frames(view, city, player, 0, 1000);
    expect(view.ang).toBe(0);
  });

  it('is frozen for 1,2 second after a blow of his sword', () => {
    // spec 04-17: the aim turns him on the instant he strikes, and the camera
    // never follows that pivot — the freeze is what keeps it out of it.
    const city = flatCity();
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    player.ang = Math.PI / 2;
    player.angPrev = Math.PI / 2;
    runsHim(player);
    freezeRecentring(view);
    expect(view.freezeLeft).toBe(1.2);

    const now = frames(view, city, player, 0, 1000);
    expect(view.ang).toBe(0); // a whole second of running, and it has not moved

    frames(view, city, player, now, 500);
    expect(view.ang).toBeGreaterThan(0); // the freeze runs out and it goes back
  });
});

describe('what a building does to it', () => {
  it('climbs, and does not come in, while the climb is enough', () => {
    // spec 04-18: it climbs before it ever comes in, because pressing against
    // his back is seeing nothing at all.
    const city = flatCity();
    build(city, -6, -4, 8); // a frontage of eight blocks behind him (spec 02-20)
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.back).toBe(6.5); // the recoil is untouched
    expect(view.above).toBeGreaterThan(5.5); // and it went up instead
    expect(view.above).toBeLessThanOrEqual(5.5 + 10);
  });

  it('comes in only once the ten blocks are spent, and never under 3,2', () => {
    // spec 04-18: up to ten blocks higher, and never under 3,2 of recoil.
    const city = flatCity();
    build(city, -3, -1, 8); // a wall right at his back
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.above).toBeCloseTo(5.5 + 10, 6); // the whole of the climb
    expect(view.back).toBeGreaterThanOrEqual(3.2);
    expect(view.back).toBeLessThan(6.5);
  });

  it('takes nothing from a building that stands where it does not look', () => {
    const city = flatCity();
    build(city, 2, 6, 8); // in front of him, which hides nothing of him
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(view.back).toBe(6.5);
    expect(view.above).toBe(5.5);
  });

  it('closes on what it asks for at the pace it is already granted', () => {
    // The spec settles no speed for the climb: it is read off two of the six,
    // the recentring carrying the camera at recentre × back at the nominal
    // recoil. (spec 04-16, 04-18)
    expect(closingPace(RULE)).toBeCloseTo(2.4 * 6.5, 6);

    const city = flatCity();
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);
    build(city, -6, -4, 8); // it goes up while he stands there

    aimCamera(view, city, player, 1, 0);
    aimCamera(view, city, player, 1, 10); // ten milliseconds of climbing
    expect(view.above).toBeGreaterThan(5.5);
    expect(view.above).toBeLessThanOrEqual(5.5 + closingPace(RULE) * 0.01 + 1e-9);

    frames(view, city, player, 10, 1000);
    expect(view.above).toBeGreaterThan(5.5 + 1);
  });
});

/**
 * The whole city of chapter 2, laid cell by cell: the three streets and their
 * two frontages with the suites of heights the chapter writes out, the paving of
 * the hexagon, the town hall and the shed that carry their height and are never
 * walked on, and the ring of four that closes the hub. It is written out here
 * from the chapter and from nowhere else, because `src/render/` takes types from
 * the rules and never the one function that engenders the real plan.
 * (spec 02-2, 02-6 to 02-11, 02-14, 02-19, 02-20, 02-34, 10-2)
 */
const WHOLE_SIDE = 216; // spec 02-1
const STREETS = 3; // spec 02-2
const STREET_LENGTH = 80; // spec 02-12
const STREET_WIDTH = 6; // spec 02-12
const FRONTAGE_DEPTH = 8; // spec 02-14
const ALIGNED_BAYS = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8]; // spec 02-19
const ALIGNED_HEIGHTS = [4, 6, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8, 8]; // spec 02-23
const SHIFTED_BAYS = [3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11]; // spec 02-19
const SHIFTED_HEIGHTS = [4, 6, 8, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8]; // spec 02-23

/** How high the bay a distance down an edge falls in stands. (spec 02-19) */
function bayHigh(bays: number[], heights: number[], from: number): number {
  let start = 0;
  for (let b = 0; b < bays.length; b += 1) {
    start += bays[b]!;
    if (from < start) return heights[b]!;
  }
  return heights[heights.length - 1]!;
}

function wholeCity(): City {
  const side = WHOLE_SIDE;
  const half = side / 2;
  const height = new Uint8Array(side * side);
  const walkable = new Uint8Array(side * side);
  const halfWidth = STREET_WIDTH / 2;
  const frontage = halfWidth + FRONTAGE_DEPTH;
  const far = MOUTH + STREET_LENGTH;

  for (let i = 0; i < side; i += 1) {
    for (let j = 0; j < side; j += 1) {
      const x = i + 0.5 - half;
      const z = j + 0.5 - half;
      const at = i * side + j;
      let settled = false;

      // A street, and the frontage of eight that borders it on either side.
      for (let k = 0; k < STREETS && !settled; k += 1) {
        const ux = Math.cos((k * 2 * Math.PI) / STREETS);
        const uz = Math.sin((k * 2 * Math.PI) / STREETS);
        const along = x * ux + z * uz;
        if (along <= MOUTH || along >= far) continue;
        const across = -x * uz + z * ux;
        const off = Math.abs(across);
        if (off < halfWidth) {
          walkable[at] = 1; // all of it is street floor: no verge (spec 02-15)
          settled = true;
        } else if (off < frontage) {
          const aligned = across > 0;
          walkable[at] = 1;
          height[at] = bayHigh(
            aligned ? ALIGNED_BAYS : SHIFTED_BAYS,
            aligned ? ALIGNED_HEIGHTS : SHIFTED_HEIGHTS,
            along - MOUTH,
          );
          settled = true;
        }
      }
      if (settled) continue;

      if (hexAt(x, z) < APOTHEM) {
        // The two builds nobody walks on carry their height all the same.
        if (Math.abs(x) < TOWN_HALL_HALF && Math.abs(z) < TOWN_HALL_HALF) {
          height[at] = TOWN_HALL_HIGH;
        } else if (x > TOWN_HALL_HALF && x < TOWN_HALL_HALF + SHED_OUT && Math.abs(z) < SHED_HALF) {
          height[at] = SHED_HIGH;
        } else {
          walkable[at] = 1; // the paving of the square
        }
        continue;
      }

      // What the square, the streets and their frontages leave inside the disk.
      if (Math.hypot(x, z) > PERIMETER_REACH) continue;
      walkable[at] = 1;
      height[at] = PERIMETER_HIGH;
    }
  }
  return { ...flatCity(), side, height, walkable };
}

/** How high what stands in a cell of that grid goes. */
function standsIn(city: City, x: number, z: number): number {
  const half = city.side / 2;
  const i = Math.floor(x + half);
  const j = Math.floor(z + half);
  if (i < 0 || j < 0 || i >= city.side || j >= city.side) return 0;
  return city.height[i * city.side + j]!;
}

/**
 * Where the line of sight starts from: the middle of a body, which stands two
 * blocks at a scale of one, and what hides that middle is what hides him.
 * (spec 07-18)
 */
const MIDDLE = 1;

/**
 * How much built ground stands over the line of sight, in blocks, walked far
 * finer than the camera walks it — six hundred readings over a recoil, one
 * every hundredth of a block. Nought is a clear view of his middle.
 */
function overTheSight(city: City, view: CameraView, px: number, py: number, pz: number): number {
  const eyeY = py + MIDDLE;
  const runX = view.lens.position.x - px;
  const runZ = view.lens.position.z - pz;
  const rise = view.lens.position.y - eyeY;
  let most = 0;
  for (let s = 1; s <= 600; s += 1) {
    const t = s / 600;
    const over = standsIn(city, px + runX * t, pz + runZ * t) - (eyeY + rise * t);
    if (over > most) most = over;
  }
  return most;
}

/**
 * How far the nearest thing taller than his eye stands, in blocks, looked for
 * three cells about him. It is what tells the placements that stay masked apart
 * from the rest: every one of them has him pressed against a wall.
 */
function nearestOver(city: City, x: number, y: number, z: number): number {
  const half = city.side / 2;
  const i = Math.floor(x + half);
  const j = Math.floor(z + half);
  let least = 99;
  for (let di = -3; di <= 3; di += 1) {
    for (let dj = -3; dj <= 3; dj += 1) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= city.side || jj >= city.side) continue;
      if (city.height[ii * city.side + jj]! <= y + MIDDLE) continue;
      const lowX = ii - half;
      const lowZ = jj - half;
      const away = Math.hypot(
        Math.max(lowX - x, 0, x - (lowX + 1)),
        Math.max(lowZ - z, 0, z - (lowZ + 1)),
      );
      if (away < least) least = away;
    }
  }
  return least;
}

/** A body on the floor his cell carries, roof or street alike. (spec 04-9) */
function standing(x: number, y: number, z: number, ang: number): Player {
  const player = playerAt(x, z, ang);
  player.y = y;
  player.yPrev = y;
  return player;
}

describe('the sight, swept over the whole city', () => {
  /**
   * All 6 712 cells of the city he is allowed to stand on, off the middle of each
   * by a turning offset so the sweep never sits on the lattice, and thirty-two
   * headings at each, turned along with it — 214 784 placements of the camera
   * over 1 024 headings in all. Every one of them is read back against a line of
   * sight walked six hundred times over, a hundredth of a block a reading, where
   * the camera walks it a cell at a time.
   *
   * A camera that read the grid every half block left the city over that line in
   * 46 737 of these placements, better than a fifth of the sweep: a line that
   * clips the corner of a frontage takes a couple of tenths of a block out of it
   * and lands in no reading, so the camera called the way clear and the child
   * lost his own body behind a wall. Three spots chosen by hand catch none of
   * that — it is a defect one only ever catches by sweeping. (spec 04-18)
   */
  it('leaves nothing of the city over the line of sight it has not paid for', () => {
    const city = wholeCity();
    const half = city.side / 2;
    const view = createCamera(RULE, EXTENT);
    const TURNS = 32;

    let placements = 0;
    let masked = 0;
    let worst = 0;
    const unpaid: string[] = [];
    const unhugged: string[] = [];

    for (let i = 0; i < city.side; i += 1) {
      for (let j = 0; j < city.side; j += 1) {
        const at = i * city.side + j;
        if (city.walkable[at] !== 1) continue;
        // Off the middle of the cell, and never the same way twice running.
        const px = i + 0.5 - half + (((i * 5 + j * 3) % 7) - 3) / 8;
        const pz = j + 0.5 - half + (((i * 3 + j * 5) % 7) - 3) / 8;
        const py = city.height[at]!;
        const turned = (((i * 11 + j * 7) % 32) / 32) * ((2 * Math.PI) / TURNS);

        for (let turn = 0; turn < TURNS; turn += 1) {
          placements += 1;
          const ang = turned + (turn * 2 * Math.PI) / TURNS;
          settleCamera(view, city, standing(px, py, pz, ang));
          const over = overTheSight(city, view, px, py, pz);
          if (over <= 1e-6) continue;

          masked += 1;
          if (over > worst) worst = over;
          // Masked while it still had a block of climb or of recoil in hand: that
          // is the defect, and there is to be none of it. (spec 04-18)
          const spent =
            Math.abs(view.back - RULE.minBack) < 1e-9 &&
            Math.abs(view.above - (RULE.above + RULE.climb)) < 1e-9;
          if (!spent && unpaid.length < 8) {
            unpaid.push(`${px} ${pz} ${py} ${ang} back ${view.back} above ${view.above}`);
          }
          // And every one of those stands with a wall against him.
          if (nearestOver(city, px, py, pz) > 2 && unhugged.length < 8) {
            unhugged.push(`${px} ${pz} ${py} ${ang}`);
          }
        }
      }
    }

    expect(placements).toBeGreaterThan(200000);
    expect(unpaid).toEqual([]);
    expect(unhugged).toEqual([]);
    // What is left over is a bound of the rule and not of the reading: pressed
    // against a wall taller than his eye, no camera 3,2 blocks out and ten
    // blocks up sees over it, and 04-18 grants nothing further. It is 9 318 of
    // the 214 784 placements, on 959 of the 6 712 spots — a twenty-third of the
    // sweep, and it was better than a fifth of it while the grid was read every
    // half block. (spec 04-18)
    expect(masked / placements).toBeLessThan(0.05);
    expect(worst).toBeLessThan(7);
  }, 120000);
});

/** Raises the two builds in the grid, height alone: nobody ever walks there. (spec 02-9) */
function raiseHub(city: City): void {
  for (let i = 0; i < SIDE; i += 1) {
    for (let j = 0; j < SIDE; j += 1) {
      const x = i + 0.5 - HALF;
      const z = j + 0.5 - HALF;
      const at = i * SIDE + j;
      if (Math.abs(x) < TOWN_HALL_HALF && Math.abs(z) < TOWN_HALL_HALF) {
        city.height[at] = TOWN_HALL_HIGH;
        city.walkable[at] = 0;
      } else if (
        x > TOWN_HALL_HALF &&
        x < TOWN_HALL_HALF + SHED_OUT &&
        Math.abs(z) < SHED_HALF
      ) {
        city.height[at] = SHED_HIGH;
        city.walkable[at] = 0;
      }
    }
  }
}

/**
 * Whether a spot of the world stands inside one of the two builds. The footprint
 * is held off by a hair, because a lens seated straight behind a player standing
 * on a face lands a billionth of a block on the wrong side of it, and the grid,
 * which reads by the middle of a cell, calls that the paving it is.
 */
const HAIR = 1e-9;
function inHub(x: number, y: number, z: number): boolean {
  const hall =
    Math.abs(x) < TOWN_HALL_HALF - HAIR &&
    Math.abs(z) < TOWN_HALL_HALF - HAIR &&
    y < TOWN_HALL_HIGH;
  const shed =
    x > TOWN_HALL_HALF + HAIR &&
    x < TOWN_HALL_HALF + SHED_OUT - HAIR &&
    Math.abs(z) < SHED_HALF - HAIR &&
    y < SHED_HIGH;
  return hall || shed;
}

const lensIsIn = (view: CameraView): boolean =>
  inHub(view.lens.position.x, view.lens.position.y, view.lens.position.z);

describe('the town hall and the shed', () => {
  it('never holds the lens inside either of them, at the face of the shed', () => {
    // He comes back to the base for an armful and stands at the face of the shed
    // facing down street one, and the camera is 6,5 blocks behind him — which is
    // straight through the shed and into the town hall. The two of them carry
    // their height in the grid, so the sight climbs over them rather than through
    // them. (spec 02-9, 04-8, 04-15, 04-18, 04-45)
    const city = flatCity();
    raiseHub(city);
    const player = playerAt(AT_THE_SHED, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    expect(lensIsIn(view)).toBe(false);
    // It stands clear over the roof of the shed, and its sight grazes that roof
    // rather than running through it. (spec 02-8, 02-9)
    expect(floorUnder(city, view.lens.position.x, view.lens.position.z)).toBe(SHED_HIGH);
    expect(view.lens.position.y).toBeGreaterThan(SHED_HIGH);
    // And it climbed the whole ten before it came in at all, which is the order
    // of the chapter, and it never came under 3,2. (spec 04-18)
    expect(view.above).toBeCloseTo(RULE.above + RULE.climb, 6);
    expect(view.back).toBeLessThan(RULE.back);
    expect(view.back).toBeGreaterThanOrEqual(RULE.minBack);
  });

  it('never holds it inside either of them, wherever he stands on the square', () => {
    // The same reading swept over the whole hub: every spot of paving the square
    // holds, and every heading he can face on it. Nothing of the two builds is
    // ever between the lens and nothing at all. (spec 04-18)
    const city = flatCity();
    raiseHub(city);
    const view = createCamera(RULE, EXTENT);
    const inside: string[] = [];
    for (let x = -14; x <= 14; x += 0.5) {
      for (let z = -14; z <= 14; z += 0.5) {
        if (inHub(x, 0, z)) continue; // he is never in there in the first place
        for (let turn = 0; turn < 16; turn += 1) {
          const ang = (turn * Math.PI) / 8;
          settleCamera(view, city, playerAt(x, z, ang));
          if (lensIsIn(view)) inside.push(`${x} ${z} ${ang}`);
        }
      }
    }
    expect(inside).toEqual([]);
  });

  it('stays out of them frame after frame, as he leaves the base', () => {
    // Not only where it settles: the seconds that follow an armful, when he sets
    // off down street one with the shed at his back and the town hall behind it.
    // The camera trails over the two of them the whole way out. (spec 04-6, 04-18)
    const city = flatCity();
    raiseHub(city);
    const player = playerAt(AT_THE_SHED, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    const stride = 6 / 60; // the one pace, one step of the loop (spec 04-6, 10-21)
    const inside: string[] = [];
    let now = 0;
    while (player.x < 20) {
      player.xPrev = player.x;
      player.x += stride;
      now += 1000 / 60;
      aimCamera(view, city, player, 1, now);
      if (lensIsIn(view)) inside.push(player.x.toFixed(2));
    }
    expect(inside).toEqual([]);
  });
});

describe('where a spot falls across the screen', () => {
  /** A camera straight behind a player standing at the middle, on a square screen. */
  function seated(): CameraView {
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, flatCity(), playerAt(0, 0, 0));
    fitCamera(view, 100, 100);
    return view;
  }

  it('puts what it looks straight at in the middle', () => {
    expect(acrossOf(seated(), 0, 0)).toBeCloseTo(0, 6);
  });

  it('puts what stands at the border of the sight on the border', () => {
    const view = seated();
    // The lens sits 6,5 blocks behind him and the half field is 30 degrees, so
    // the right border of a square screen runs through this spot. (spec 04-15)
    const border = RULE.back * Math.tan(Math.PI / 6);
    expect(acrossOf(view, 0, border)).toBeCloseTo(1, 3);
    expect(acrossOf(view, 0, -border)).toBeCloseTo(-1, 3);
  });

  it('hands back the border a spot behind it lies beyond', () => {
    const view = seated();
    // A street one has turned one's back on: its arrow goes flat against a
    // border rather than swinging about. (spec 08-32)
    expect(acrossOf(view, -20, 5)).toBeGreaterThan(1);
    expect(acrossOf(view, -20, -5)).toBeLessThan(-1);
  });
});

describe('what it never does', () => {
  const source = readFileSync(fileURLToPath(new URL('./camera.ts', import.meta.url)), 'utf8');

  it('takes no command, on any platform', () => {
    // spec 04-19: nothing the child presses ever reaches it, so it never sees
    // the one `InputState`, and it takes nothing from the layer that fills it.
    expect(source).not.toMatch(/InputState/);
    expect(source).not.toMatch(/from\s*'\.\.\/app/);
  });

  it('is never bound to the aim, and never framed by the game', () => {
    // spec 04-17, 04-20: no cut scene, no framing imposed, and the pivot of a
    // blow is the player's alone.
    const city = flatCity();
    const player = playerAt(0, 0, 0);
    const view = createCamera(RULE, EXTENT);
    settleCamera(view, city, player);

    // He pivots on the spot, as the aim turns him, without running.
    player.angPrev = 0;
    player.ang = -Math.PI / 2;
    frames(view, city, player, 0, 1000);
    expect(view.ang).toBe(0);
  });

  it('allocates nothing once it is built', () => {
    // spec 10-14: the loop allocates nothing, ever. Three things are ever built
    // in this file — the one lens, and the two arrays the march of the sight
    // writes over frame after frame — and all three are built once, at load or
    // at the opening of a run, none of them in anything a frame calls.
    expect(source.match(/\bnew\s+[\w.]+/g)).toEqual([
      'new Float64Array',
      'new Float64Array',
      'new THREE.PerspectiveCamera',
    ]);
    expect(source.slice(source.indexOf('function march'))).not.toMatch(/\bnew\b/);
  });
});
