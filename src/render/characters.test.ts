/**
 * The bodies read back against chapter 7. Nothing here draws: it builds the two
 * meshes under node and counts what is in them, which is how the budget of calls
 * and the fourteen boxes become red errors rather than good intentions.
 * (spec 10-45)
 *
 * The body it places and the pool it walks are written out here by hand, because
 * `src/render/` takes types from the rules and never their functions. (spec 10-2)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Player, ZombiePool } from '../game/state';
import {
  BLOT,
  BODY,
  BOXES,
  type CharacterView,
  KIND_COLOURS,
  SKIN,
  STEEL,
  TUNIC,
  buildCharacters,
  flingHead,
  placeCharacters,
  swingSword,
} from './characters';
import { ARC_SPAN, FIRE, STRUCK, WHITE, buildEffects, lightUp } from './effects';

/** A body standing still, so a test only has to move what it is about. */
function playerAt(x: number, y: number, z: number, ang = 0): Player {
  return {
    x,
    y,
    z,
    ang,
    xPrev: x,
    yPrev: y,
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

/**
 * A pool of zombies standing still, one entry a kind, written out here for the
 * same reason the body above is. What the drawing reads of one is where it
 * stands, where it stood, which way it faces and its kind; the rest of the
 * columns are the rules' and are left at nothing. (spec 03-7, 10-2, 10-11)
 */
function poolOf(...kinds: number[]): ZombiePool {
  const size = Math.max(kinds.length, 1);
  const pool: ZombiePool = {
    count: kinds.length,
    x: new Float32Array(size),
    z: new Float32Array(size),
    ang: new Float32Array(size),
    xPrev: new Float32Array(size),
    zPrev: new Float32Array(size),
    angPrev: new Float32Array(size),
    type: new Uint8Array(size),
    hp: new Float32Array(size),
    street: new Uint8Array(size),
    progress: new Float32Array(size),
    offset: new Float32Array(size),
    escort: new Uint8Array(size),
    knockedFor: new Float32Array(size),
    stuckFor: new Float32Array(size),
    blowLeft: new Float32Array(size),
    struckBy: new Uint32Array(size),
  };
  for (let i = 0; i < kinds.length; i += 1) pool.type[i] = kinds[i];
  return pool;
}

/**
 * The scale of each of the four kinds, in the order chapter 3 names them, in
 * hard figures off its table: a shambler at 1, a sprinter at 0,8, a bruiser at
 * 1,4, a colossus at 2,2. The drawing is handed them, so a test hands them too.
 * (spec 03-2, 03 "Les quatre types")
 */
const SCALES = [1, 0.8, 1.4, 2.2];

/** An empty city, for the tests that are about the one body the child drives. */
const NOBODY = poolOf();

/** Nothing in it is ever lit, so a body wears the colour of its kind. (spec 07-36) */
const UNLIT = buildEffects(8, 1);

/** The one call, for a test that has no zombie of its own to walk in. */
function place(
  view: CharacterView,
  player: Player,
  alpha: number,
  now: number,
  white = false,
  carried = 0,
): void {
  placeCharacters(view, UNLIT, player, NOBODY, SCALES, alpha, now, white, carried);
}

const SEAT = new THREE.Matrix4();
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SIZE = new THREE.Vector3();

function seatOf(mesh: THREE.InstancedMesh, at: number): THREE.Matrix4 {
  mesh.getMatrixAt(at, SEAT);
  return SEAT;
}

describe('the budget', () => {
  it('costs two calls, whatever it holds', () => {
    // spec 07-21: every box of every body in one InstancedMesh.
    // spec 07-22: every blot in one call. spec 10 "Le budget de rendu".
    const one = buildCharacters(1);
    const many = buildCharacters(61);
    expect(one.draws.length).toBe(2);
    expect(many.draws.length).toBe(one.draws.length);
    for (const mesh of many.draws) expect(mesh.isInstancedMesh).toBe(true);
  });

  it('carries no tile, because what moves is plain', () => {
    // spec 07-10: the city is tiled, what moves and what is put down is plain.
    const view = buildCharacters(1);
    for (const mesh of view.draws) {
      const paint = mesh.material as THREE.MeshLambertMaterial;
      expect(paint.map).toBe(null);
    }
  });
});

describe('the fourteen boxes', () => {
  it('are fourteen, named the way chapter 7 names them', () => {
    // spec 07-18: torso, head, jaw, two shoulders, two arms, two hands, belt,
    // two legs, two feet.
    expect(BOXES).toBe(14);
    expect(BODY.length).toBe(BOXES);
    const named = BODY.map((box) => box.id).sort();
    expect(named).toEqual(
      [
        'armLeft',
        'armRight',
        'belt',
        'footLeft',
        'footRight',
        'handLeft',
        'handRight',
        'head',
        'jaw',
        'legLeft',
        'legRight',
        'shoulderLeft',
        'shoulderRight',
        'torso',
      ].sort(),
    );
  });

  it('stand one storey tall, from the ground up', () => {
    // spec 07-55: a storey is two blocks — the one measurement the drawing sets
    // itself, since no rule of the game reads a body.
    let low = Infinity;
    let high = -Infinity;
    for (const box of BODY) {
      low = Math.min(low, box.y - box.h / 2);
      high = Math.max(high, box.y + box.h / 2);
    }
    expect(low).toBeCloseTo(0, 6);
    expect(high).toBeCloseTo(2, 6);
  });

  it('all ride in one mesh, and the sword makes a fifteenth box of the player', () => {
    // spec 04-2: the fourteen boxes of a zombie, plus the sword he holds.
    const view = buildCharacters(1);
    place(view, playerAt(3, 0, 4), 1, 0);
    expect(view.bodies.count).toBe(BOXES + 1);
    expect(view.blots.count).toBe(1);
  });

  it('stows the sword for the whole of a ladder', () => {
    // spec 04-13: the sword is stowed while he climbs, and out again at the top.
    const view = buildCharacters(1);
    const climbing = playerAt(0, 0, 0);
    climbing.climbLeft = 0.4;
    place(view, climbing, 1, 0);
    expect(view.bodies.count).toBe(BOXES);
  });

  it('paints a colour on each instance, and never a second material', () => {
    // spec 07-21: one InstancedMesh with a colour per instance.
    // spec 04-3: a blue tunic and light steel, the only cold colours a body wears.
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0), 1, 0);
    expect(view.bodies.instanceColor).not.toBe(null);
    expect(TUNIC).toBe('#1f6fd8');
    expect(SKIN).toBe('#f4c79a');
    expect(STEEL).toBe('#f2f6f9');
    const worn = new Set<string>();
    const paint = new THREE.Color();
    for (let i = 0; i < view.bodies.count; i += 1) {
      view.bodies.getColorAt(i, paint);
      worn.add(`#${paint.getHexString()}`);
    }
    expect(worn).toEqual(new Set([TUNIC, SKIN, STEEL]));
  });

  it('goes white all over on the blink of a body walked into', () => {
    // spec 07-41: the blink of a body that has been touched takes the whole
    // silhouette, sword included — a garment changing colour would read as a
    // second character, and the two states are told apart by the rhythm alone.
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0), 1, 0, true);
    const worn = new Set<string>();
    const paint = new THREE.Color();
    for (let i = 0; i < view.bodies.count; i += 1) {
      view.bodies.getColorAt(i, paint);
      worn.add(`#${paint.getHexString()}`);
    }
    expect(worn).toEqual(new Set([WHITE]));
    expect(view.bodies.count).toBe(BOXES + 1); // and it is still the same fifteen
  });
});

describe('the blot', () => {
  it('lies flat under him, whichever way he faces', () => {
    // spec 07-23: it does not orient, does not stretch, and depends neither on
    // the sun nor on the height.
    const view = buildCharacters(1);
    for (const ang of [0, 1, -2.5, Math.PI]) {
      place(view, playerAt(2, 4, -3, ang), 1, 0);
      seatOf(view.blots, 0).decompose(SPOT, TURN, SIZE);
      expect(TURN.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6);
      expect(SPOT.x).toBeCloseTo(2, 6);
      expect(SPOT.z).toBeCloseTo(-3, 6);
      expect(SPOT.y - 4).toBeGreaterThan(0);
      expect(SPOT.y - 4).toBeLessThan(0.1);
      expect(SIZE.x).toBeCloseTo(SIZE.z, 6);
    }
  });

  it('takes no light, because it is not a shade of anything', () => {
    // spec 07-3, 07-23: nothing casts, and the blot is what stands in for it.
    const view = buildCharacters(1);
    expect(view.blots.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    const paint = view.blots.material as THREE.MeshBasicMaterial;
    expect(`#${paint.color.getHexString()}`).toBe(BLOT);
    // Never the pure black of what is picked up. (spec 07-12, 07-13)
    expect(BLOT).not.toBe('#000000');
  });
});

describe('a frame', () => {
  it('sits between the two last steps', () => {
    // spec 10-24: the drawing interpolates between the two last steps.
    const view = buildCharacters(1);
    const player = playerAt(0, 0, 0);
    player.xPrev = 0;
    player.x = 4;
    place(view, player, 0.5, 0);
    seatOf(view.blots, 0).decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(2, 6);
  });

  it('turns the short way about, so a body does not spin on the wrap', () => {
    const view = buildCharacters(1);
    const player = playerAt(0, 0, 0);
    player.angPrev = Math.PI - 0.1;
    player.ang = -Math.PI + 0.1;
    place(view, player, 0.5, 0);
    seatOf(view.bodies, 0).decompose(SPOT, TURN, SIZE);
    // Halfway across the wrap is due south, not a half turn the other way.
    const half = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2 - Math.PI,
    );
    expect(TURN.angleTo(half)).toBeCloseTo(0, 5);
  });

  it('replaces nothing, a thousand frames in', () => {
    // spec 10-14: the loop allocates nothing.
    const view = buildCharacters(61);
    const player = playerAt(0, 0, 0);
    place(view, player, 0, 0);
    const seats = view.bodies.instanceMatrix;
    const painted = view.bodies.instanceColor;
    const laid = view.blots.instanceMatrix;
    for (let i = 0; i < 1000; i += 1) place(view, player, i / 1000, 0);
    expect(view.bodies.instanceMatrix).toBe(seats);
    expect(view.bodies.instanceColor).toBe(painted);
    expect(view.blots.instanceMatrix).toBe(laid);
  });
});

describe('the head a fatal blow throws', () => {
  it('goes up turning, in the colour of its kind, and never lands', () => {
    // spec 03-19: the head is thrown spinning. spec 03-21: nothing is left on the
    // ground — so it is gone while it is still in the air. spec 07-30: it flies
    // in the colour of its kind.
    const view = buildCharacters(4);
    place(view, playerAt(0, 0, 0), 1, 0);
    const bare = view.bodies.count;

    flingHead(view, 3, 0, -2, 1, 2, 600, 1000);
    place(view, playerAt(0, 0, 0), 1, 1000);
    expect(view.bodies.count).toBe(bare + 1);

    seatOf(view.bodies, bare).decompose(SPOT, TURN, SIZE);
    const head = BODY[BODY.length - 1];
    expect(head.id).toBe('head');
    expect(SPOT.x).toBeCloseTo(3, 6);
    expect(SPOT.z).toBeCloseTo(-2, 6);
    expect(SPOT.y).toBeCloseTo(head.y, 6);

    const paint = new THREE.Color();
    view.bodies.getColorAt(bare, paint);
    expect(`#${paint.getHexString()}`).toBe(KIND_COLOURS[2]);

    // Halfway through, it stands higher and has turned. (spec 03-19)
    place(view, playerAt(0, 0, 0), 1, 1300);
    seatOf(view.bodies, bare).decompose(SPOT, TURN, SIZE);
    expect(SPOT.y).toBeGreaterThan(head.y);
    expect(TURN.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.1);

    // And gone at the end of its span, with nothing put down where it stood.
    place(view, playerAt(0, 0, 0), 1, 1601);
    expect(view.bodies.count).toBe(bare);
    expect(view.blots.count).toBe(1); // and a head never carried a blot (spec 07-24)
  });

  it('wears the scale of its kind, and still costs no call of its own', () => {
    // spec 07-21: every box of every body rides in the one mesh.
    const view = buildCharacters(4);
    flingHead(view, 0, 0, 0, 2.2, 3, 600, 0);
    place(view, playerAt(0, 0, 0), 1, 0);
    expect(view.draws.length).toBe(2);
    seatOf(view.bodies, view.bodies.count - 1).decompose(SPOT, TURN, SIZE);
    const head = BODY[BODY.length - 1];
    expect(SIZE.x).toBeCloseTo(head.w * 2.2, 6);
    expect(SPOT.y).toBeCloseTo(head.y * 2.2, 6);
  });

  it('names one colour per kind, cold or saturated and never the orange of the city', () => {
    // spec 03-2, 07 "La palette de ce qui se joue": pale green, bright saturated
    // green, blue-violet, gold.
    expect(KIND_COLOURS).toEqual(['#7ec24a', '#b6ff3d', '#9b6bff', '#ffd24a']);
  });
});

describe('the armful over his head', () => {
  /** How many boxes he takes carrying that many firebombs. */
  function boxes(carried: number): number {
    const view = buildCharacters(1, 3);
    place(view, playerAt(0, 0, 0), 1, 10_000, false, carried);
    return view.bodies.count;
  }

  it('shows one cube a bomb, and nothing at all when his arms are empty', () => {
    // spec 04-47: the armful is read over his head, one cube a bomb.
    expect(boxes(0)).toBe(BOXES + 1); // the fourteen and his sword
    expect(boxes(1)).toBe(BOXES + 2);
    expect(boxes(3)).toBe(BOXES + 4);
  });

  it('lays them over his head and nowhere near the hud', () => {
    // spec 04-47, 08-4: over his head, in the world, and never in the hud —
    // there is no counter of firebombs anywhere.
    const view = buildCharacters(1, 3);
    place(view, playerAt(0, 0, 0), 1, 10_000, false, 3);

    const head = BODY[BODY.length - 1];
    const top = head.y + head.h / 2;
    for (let i = BOXES + 1; i < view.bodies.count; i += 1) {
      seatOf(view.bodies, i).decompose(SPOT, TURN, SIZE);
      expect(SPOT.y).toBeGreaterThan(top);
    }
  });

  it('paints them in the one colour the fire of this game has', () => {
    // spec 07-39: a firebomb is what the flame is made of, and the fire is
    // white-blue throughout.
    const view = buildCharacters(1, 3);
    place(view, playerAt(0, 0, 0), 1, 10_000, false, 3);

    const paint = new THREE.Color();
    let fired = 0;
    for (let i = 0; i < view.bodies.count; i += 1) {
      view.bodies.getColorAt(i, paint);
      if (paint.getHex() === new THREE.Color(FIRE).getHex()) fired += 1;
    }
    expect(fired).toBe(3);
  });

  it('keeps them out of the blink of a body that has been walked into', () => {
    // spec 04-48: a carried bomb never falls, and a contact says something
    // about him and nothing about what he carries. (spec 07-41)
    const view = buildCharacters(1, 3);
    place(view, playerAt(0, 0, 0), 1, 10_000, true, 3);

    const paint = new THREE.Color();
    view.bodies.getColorAt(0, paint);
    expect(paint.getHex()).toBe(new THREE.Color(WHITE).getHex()); // he is white
    view.bodies.getColorAt(BOXES + 1, paint);
    expect(paint.getHex()).toBe(new THREE.Color(FIRE).getHex()); // they are not
  });
});

describe('the zombies', () => {
  /** A pool of that many shamblers, standing where the drawing puts them. */
  function walkIn(many: number): ZombiePool {
    const kinds: number[] = [];
    for (let i = 0; i < many; i += 1) kinds.push(0);
    return poolOf(...kinds);
  }

  it('are all seated, and the seats taken grow with the pool', () => {
    // spec 07-18, 07-19: every zombie is the same fourteen boxes as him.
    // spec 07-21: and every one of those boxes rides in the one mesh.
    //
    // This is the reading the whole thing turns on: a pool that fills while the
    // count of the mesh stands still is a city with nothing walking down it.
    const view = buildCharacters(61);
    const seats = (many: number): number => {
      placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(many), SCALES, 1, 0);
      return view.bodies.count;
    };
    const him = BOXES + 1; // his fourteen, and his sword
    expect(seats(0)).toBe(him);
    expect(seats(1)).toBe(him + BOXES);
    expect(seats(4)).toBe(him + 4 * BOXES);
    expect(seats(60)).toBe(him + 60 * BOXES);
  });

  it('lay one blot each, his and theirs, and still in the one mesh', () => {
    // spec 07-22, 07-24: one blot a character, all of them in one call, and
    // nothing but a character carries one.
    const view = buildCharacters(61);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(0), SCALES, 1, 0);
    expect(view.blots.count).toBe(1);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), poolOf(0, 1, 2, 3), SCALES, 1, 0);
    expect(view.blots.count).toBe(5);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(60), SCALES, 1, 0);
    expect(view.blots.count).toBe(61);
  });

  it('cost no call at all, sixty of them no more than none', () => {
    // spec 07-21, 07-22, 10 "Le budget de rendu": the whole cast is two calls,
    // whatever it holds.
    const view = buildCharacters(61);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(0), SCALES, 1, 0);
    expect(view.draws.length).toBe(2);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(60), SCALES, 1, 0);
    expect(view.draws.length).toBe(2);
  });

  it('wear the colour and the scale of their kind, and never a shape of their own', () => {
    // spec 03-2, 07-19: colour, scale, pace and behaviour tell one kind from
    // another — never the silhouette.
    // spec 03 "Les quatre types": 1 for a shambler, 0,8 a sprinter, 1,4 a
    // bruiser, 2,2 a colossus.
    // spec 07 "La palette de ce qui se joue": pale green, bright saturated
    // green, blue-violet, gold.
    const view = buildCharacters(5);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), poolOf(0, 1, 2, 3), SCALES, 1, 0);
    expect(SCALES).toEqual([1, 0.8, 1.4, 2.2]);

    const torso = BODY.findIndex((box) => box.id === 'torso');
    const paint = new THREE.Color();
    for (let kind = 0; kind < 4; kind += 1) {
      // The same box of the same body, whichever kind stands there.
      const at = BOXES + 1 + kind * BOXES + torso;
      view.bodies.getColorAt(at, paint);
      expect(`#${paint.getHexString()}`).toBe(KIND_COLOURS[kind]);
      seatOf(view.bodies, at).decompose(SPOT, TURN, SIZE);
      expect(SIZE.x).toBeCloseTo(BODY[torso].w * SCALES[kind], 6);
      expect(SIZE.y).toBeCloseTo(BODY[torso].h * SCALES[kind], 6);
    }
  });

  it('stand between the two last steps, like everything else a frame draws', () => {
    // spec 10-24: a frame interpolates between the two last steps.
    const view = buildCharacters(2);
    const pool = poolOf(0);
    pool.xPrev[0] = 0;
    pool.x[0] = 4;
    pool.zPrev[0] = 10;
    pool.z[0] = 10;
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), pool, SCALES, 0.25, 0);
    seatOf(view.blots, 1).decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(1, 6);
    expect(SPOT.z).toBeCloseTo(10, 6);
  });

  it('go white all over for the eighty milliseconds after a blow, and only then', () => {
    // spec 07-36: whatever takes a blow lights white for 80 ms — and the one
    // beside it, which took none, keeps the colour of its kind.
    const view = buildCharacters(3);
    const effects = buildEffects(8, 1);
    const pool = poolOf(0, 0);
    const paint = new THREE.Color();
    const worn = (which: number): string => {
      view.bodies.getColorAt(BOXES + 1 + which * BOXES, paint);
      return `#${paint.getHexString()}`;
    };

    lightUp(effects, STRUCK.ZOMBIE, 1, 1000);
    placeCharacters(view, effects, playerAt(0, 0, 0), pool, SCALES, 1, 1000);
    expect(worn(0)).toBe(KIND_COLOURS[0]);
    expect(worn(1)).toBe(WHITE);

    // And out again at eighty milliseconds, with nothing left of it. (spec 07-36)
    placeCharacters(view, effects, playerAt(0, 0, 0), pool, SCALES, 1, 1080);
    expect(worn(1)).toBe(KIND_COLOURS[0]);
  });

  it('replace nothing, however many walk in and fall out', () => {
    // spec 10-14: nothing is allocated in the loop.
    const view = buildCharacters(61);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(0), SCALES, 1, 0);
    const seats = view.bodies.instanceMatrix;
    const painted = view.bodies.instanceColor;
    const laid = view.blots.instanceMatrix;
    for (let many = 0; many <= 60; many += 1) {
      placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(many), SCALES, 1, many);
    }
    expect(view.bodies.instanceMatrix).toBe(seats);
    expect(view.bodies.instanceColor).toBe(painted);
    expect(view.blots.instanceMatrix).toBe(laid);
  });

  it('leave one unseated rather than grow, should a pool ever outrun the meshes', () => {
    // spec 10-13, 10-14: the meshes are sized for the whole pool at load, so
    // this never happens in a game; what it must never do is allocate.
    const view = buildCharacters(3);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), walkIn(9), SCALES, 1, 0);
    expect(view.bodies.count).toBe(BOXES + 1 + 2 * BOXES);
    expect(view.blots.count).toBe(3);
  });
});

describe('the gait', () => {
  /**
   * A quarter of the stride, in blocks walked: the point where the legs are at
   * their widest and the body at its lowest, so the whole of chapter 7's table
   * reads back in one place. The stride runs at 2,3 radians a block, so a quarter
   * of it is π / 2 over 2,3. (spec 07 "La démarche")
   */
  const STRIDE = 2.3;
  const WIDEST = Math.PI / 2 / STRIDE;

  /** Facing due south, so the body's own heading is nought and a joint reads bare. */
  const SOUTH = Math.PI / 2;

  const AT = new THREE.Euler();
  const named = (id: string): number => BODY.findIndex((box) => box.id === id);

  /** How far one box of him has swung on its joint, in radians. */
  function swungBy(view: CharacterView, at: number): THREE.Euler {
    seatOf(view.bodies, at).decompose(SPOT, TURN, SIZE);
    return AT.setFromQuaternion(TURN);
  }

  /**
   * A body drawn having walked exactly that many blocks in a straight line, which
   * is the one figure a gait is made of. Two frames: the first is where he stood,
   * the second where he has got to. (spec 07-63)
   */
  function walked(blocks: number, now = 0): CharacterView {
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0, SOUTH), 1, now);
    place(view, playerAt(0, 0, blocks, SOUTH), 1, now);
    return view;
  }

  /** Everything the two meshes hold this frame, copied out to be compared. */
  function held(view: CharacterView): number[] {
    return [...view.bodies.instanceMatrix.array, ...view.blots.instanceMatrix.array];
  }

  it('swings the legs and the arms in opposition, at the amplitudes of chapter 7', () => {
    // spec 07 "La démarche": 0,52 radian on a leg, 0,44 on an arm, in opposition
    // one side against the other. spec 07-63: it is the walking that moves them,
    // and nothing else — no file of animation, and no SkinnedMesh. (spec 07-20)
    const view = walked(WIDEST);
    expect(swungBy(view, named('legLeft')).x).toBeCloseTo(0.52, 6);
    expect(swungBy(view, named('legRight')).x).toBeCloseTo(-0.52, 6);
    expect(swungBy(view, named('armLeft')).x).toBeCloseTo(-0.44, 6);
    expect(swungBy(view, named('armRight')).x).toBeCloseTo(0.44, 6);
    // A foot goes with its leg and a hand with its arm: they are one limb.
    expect(swungBy(view, named('footLeft')).x).toBeCloseTo(0.52, 6);
    expect(swungBy(view, named('handRight')).x).toBeCloseTo(0.44, 6);
    // And the belt, the torso and the two shoulders ride the body whole.
    for (const still of ['belt', 'torso', 'shoulderLeft', 'shoulderRight']) {
      expect(swungBy(view, named(still)).x).toBeCloseTo(0, 6);
    }
  });

  it('lolls the head at its own slower period, and never nods it', () => {
    // spec 07 "La démarche": 0,17 radian, at 0,63 of the period of the stride,
    // about the axis through the body — so the head lolls rather than nods.
    const view = walked(WIDEST);
    const wanted = Math.sin(WIDEST * STRIDE * 0.63) * 0.17;
    expect(wanted).not.toBeCloseTo(0, 3);
    for (const box of ['head', 'jaw']) {
      const swung = swungBy(view, named(box));
      expect(swung.z).toBeCloseTo(wanted, 6);
      expect(swung.x).toBeCloseTo(0, 6);
    }
  });

  it('dips the body as the legs part, by the 0,05 block of chapter 7', () => {
    // spec 07 "La démarche": the body rises and falls over the stride, by five
    // hundredths of a block, and it is back at its standing height when the legs
    // meet — so a body that has walked nowhere stands exactly on the floor.
    const torso = named('torso');
    seatOf(walked(0).bodies, torso).decompose(SPOT, TURN, SIZE);
    expect(SPOT.y).toBeCloseTo(BODY[torso].y, 6);

    seatOf(walked(WIDEST).bodies, torso).decompose(SPOT, TURN, SIZE);
    expect(SPOT.y).toBeCloseTo(BODY[torso].y - 0.05, 6);
  });

  it('holds a walking body at two different poses within one stride', () => {
    // spec 07-63: this is the whole of the thing — a body that walks is not the
    // same body twice, and the two boxes that say so are its legs.
    const foot = named('footLeft');
    const lifted = new Set<string>();
    const poses = new Set<string>();
    for (let eighth = 0; eighth < 8; eighth += 1) {
      const view = walked((eighth * Math.PI) / (4 * STRIDE));
      seatOf(view.bodies, foot).decompose(SPOT, TURN, SIZE);
      lifted.add(SPOT.y.toFixed(4));
      poses.add(
        [
          swungBy(view, named('legLeft')).x.toFixed(4),
          swungBy(view, named('armRight')).x.toFixed(4),
          swungBy(view, named('head')).z.toFixed(4),
        ].join(' '),
      );
    }
    // A foot off the floor, at four heights over the stride and never the same
    // one twice running — and, the head lolling at its own period, eight poses.
    expect(lifted.size).toBeGreaterThanOrEqual(4);
    expect(poses.size).toBe(8);
  });

  it('holds a body at rest at one pose, however long it stands there', () => {
    // spec 07-63: the stride is made of blocks walked and not of seconds, so a
    // body that has stopped has stopped — nothing of it breathes, sways or idles.
    const view = buildCharacters(2);
    const still = playerAt(4, 0, -2, SOUTH);
    placeCharacters(view, UNLIT, still, poolOf(0), SCALES, 1, 0);
    placeCharacters(view, UNLIT, still, poolOf(0), SCALES, 1, 0);
    const first = held(view);
    for (const now of [16, 500, 9000, 120_000]) {
      placeCharacters(view, UNLIT, still, poolOf(0), SCALES, 1, now);
      expect(held(view)).toEqual(first);
    }
  });

  it('walks a zombie on the blocks its rail has counted, and him on his own', () => {
    // spec 03-2, 07-19: the silhouette never tells a kind from another, so the
    // one body the child drives and a shambler that has come the same way stand
    // in exactly the same fourteen boxes. spec 03-8: its rail already counts them.
    const view = buildCharacters(2);
    const pool = poolOf(0);
    pool.x[0] = 0;
    pool.xPrev[0] = 0;
    pool.z[0] = WIDEST;
    pool.zPrev[0] = WIDEST;
    pool.ang[0] = SOUTH;
    pool.angPrev[0] = SOUTH;
    pool.progress[0] = WIDEST;

    placeCharacters(view, UNLIT, playerAt(0, 0, 0, SOUTH), pool, SCALES, 1, 0);
    placeCharacters(view, UNLIT, playerAt(0, 0, WIDEST, SOUTH), pool, SCALES, 1, 0);

    for (let box = 0; box < BOXES; box += 1) {
      const his = seatOf(view.bodies, box).clone();
      const its = seatOf(view.bodies, BOXES + 1 + box);
      for (let cell = 0; cell < 16; cell += 1) {
        expect(its.elements[cell]).toBeCloseTo(his.elements[cell], 5);
      }
    }
  });

  it('leaves a zombie whose rail has stopped standing perfectly still', () => {
    // spec 03-8, 04-35: an advance that does not move is a body that does not
    // walk — a blow of the sword halts one, and it stops mid-stride.
    const view = buildCharacters(2);
    const pool = poolOf(0);
    pool.progress[0] = 1.7;
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), pool, SCALES, 1, 0);
    const first = held(view);
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), pool, SCALES, 1, 4000);
    expect(held(view)).toEqual(first);
    // And it is not the pose of a body that has come nowhere. (spec 07-63)
    pool.progress[0] = 0;
    placeCharacters(view, UNLIT, playerAt(0, 0, 0), pool, SCALES, 1, 0);
    expect(held(view)).not.toEqual(first);
  });

  it('costs no call at all, walking or standing', () => {
    // spec 07-20, 07-21: the gait is arithmetic written into matrices the boxes
    // were writing anyway — there is no SkinnedMesh, so it takes no call, and the
    // count of what is drawn does not move because a body walks.
    const view = buildCharacters(61);
    const many = poolOf(...new Array(60).fill(0));
    for (let i = 0; i < 60; i += 1) many.progress[i] = i * 0.31;
    placeCharacters(view, UNLIT, playerAt(0, 0, 0, SOUTH), many, SCALES, 1, 0);
    const drawn = view.bodies.count;
    const laid = view.blots.count;
    expect(view.draws.length).toBe(2);
    expect(drawn).toBe(BOXES + 1 + 60 * BOXES);

    place(view, playerAt(0, 0, 0, SOUTH), 1, 0);
    placeCharacters(view, UNLIT, playerAt(0, 0, 9, SOUTH), many, SCALES, 1, 0);
    expect(view.draws.length).toBe(2);
    expect(view.bodies.count).toBe(drawn);
    expect(view.blots.count).toBe(laid);
  });
});

describe('the blow of his sword', () => {
  const SOUTH = Math.PI / 2;
  const AT = new THREE.Euler();
  const named = (id: string): number => BODY.findIndex((box) => box.id === id);

  /** How far the arm that holds the sword has swung, in radians. */
  function armSwing(view: CharacterView): number {
    seatOf(view.bodies, named('armRight')).decompose(SPOT, TURN, SIZE);
    return AT.setFromQuaternion(TURN).x;
  }

  it('takes the arm through the 120° of the sweep, and comes back to nought', () => {
    // spec 04-22: a blow sweeps a sector of 120° in front of him, and the arm
    // opens the same. spec 04-25, 07-31: it runs the 150 ms a blow goes on
    // touching in, which is the span the white arc holds for. spec 07-65: half a
    // sine, so it leaves the gait and comes back to it with no break at all.
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1000);
    expect(armSwing(view)).toBeCloseTo(0, 6);

    swingSword(view, 1000);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1000);
    expect(armSwing(view)).toBeCloseTo(0, 6); // it opens from where the arm was
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1075);
    expect(armSwing(view)).toBeCloseTo((120 * Math.PI) / 180, 6); // and opens whole
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1150);
    expect(armSwing(view)).toBeCloseTo(0, 6); // and is done, on the dot
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1399);
    expect(armSwing(view)).toBeCloseTo(0, 6);
  });

  it('carries the sword and the hand with the arm, and nothing else with them', () => {
    // spec 04-2: the sword is a fifteenth box, and it is the arm that holds it
    // which moves — a blow that moved the whole body would be a second
    // silhouette. (spec 07-19)
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1000);
    swingSword(view, 1000);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1075);

    const swung = armSwing(view);
    for (const carried of ['handRight', 'armRight']) {
      seatOf(view.bodies, named(carried)).decompose(SPOT, TURN, SIZE);
      expect(AT.setFromQuaternion(TURN).x).toBeCloseTo(swung, 6);
    }
    seatOf(view.bodies, BOXES).decompose(SPOT, TURN, SIZE); // the sword, box fifteen
    expect(AT.setFromQuaternion(TURN).x).toBeCloseTo(swung, 6);
    // The other arm, the legs and the head know nothing of it.
    for (const untouched of ['armLeft', 'legLeft', 'legRight', 'head']) {
      seatOf(view.bodies, named(untouched)).decompose(SPOT, TURN, SIZE);
      expect(AT.setFromQuaternion(TURN).x).toBeCloseTo(0, 6);
    }
  });

  it('is over well before the next blow can go out, so nothing is ever held back', () => {
    // spec 04-24: 2,5 blows a second, one every 0,4 s, and the button held down
    // strikes on and on — no combo, no blocking animation, no window to respect.
    // The gesture runs 150 ms, so it fits inside that interval two and a half
    // times over: it can neither be cut short nor run into the next one.
    expect(ARC_SPAN).toBe(150);
    expect(ARC_SPAN / 1000).toBeLessThan(0.4);

    const view = buildCharacters(1);
    for (let blow = 0; blow < 6; blow += 1) {
      const at = 1000 + blow * 400;
      swingSword(view, at);
      place(view, playerAt(0, 0, 0, SOUTH), 1, at + 75);
      expect(armSwing(view)).toBeCloseTo((120 * Math.PI) / 180, 6);
      place(view, playerAt(0, 0, 0, SOUTH), 1, at + 399);
      expect(armSwing(view)).toBeCloseTo(0, 6);
    }
  });

  it('costs no call, and no box either', () => {
    // spec 07-20, 07-21: a blow of his sword is one more angle on one arm.
    const view = buildCharacters(1);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1000);
    const drawn = view.bodies.count;
    swingSword(view, 1000);
    place(view, playerAt(0, 0, 0, SOUTH), 1, 1075);
    expect(view.bodies.count).toBe(drawn);
    expect(view.draws.length).toBe(2);
  });
});
