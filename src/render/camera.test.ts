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
    // spec 10-14: the loop allocates nothing, ever.
    expect((source.match(/\bnew\b/g) ?? []).length).toBe(1);
  });
});
