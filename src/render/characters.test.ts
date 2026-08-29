/**
 * The bodies read back against chapter 7. Nothing here draws: it builds the two
 * meshes under node and counts what is in them, which is how the budget of calls
 * and the fourteen boxes become red errors rather than good intentions.
 * (spec 10-45)
 *
 * The body it places is written out here by hand, because `src/render/` takes
 * types from the rules and never their functions. (spec 10-2)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Player } from '../game/state';
import {
  BLOT,
  BODY,
  BOXES,
  KIND_COLOURS,
  SKIN,
  STEEL,
  TUNIC,
  buildCharacters,
  flingHead,
  placeCharacters,
} from './characters';

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
    placeCharacters(view, playerAt(3, 0, 4), 1, 0);
    expect(view.bodies.count).toBe(BOXES + 1);
    expect(view.blots.count).toBe(1);
  });

  it('stows the sword for the whole of a ladder', () => {
    // spec 04-13: the sword is stowed while he climbs, and out again at the top.
    const view = buildCharacters(1);
    const climbing = playerAt(0, 0, 0);
    climbing.climbLeft = 0.4;
    placeCharacters(view, climbing, 1, 0);
    expect(view.bodies.count).toBe(BOXES);
  });

  it('paints a colour on each instance, and never a second material', () => {
    // spec 07-21: one InstancedMesh with a colour per instance.
    // spec 04-3: a blue tunic and light steel, the only cold colours a body wears.
    const view = buildCharacters(1);
    placeCharacters(view, playerAt(0, 0, 0), 1, 0);
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
});

describe('the blot', () => {
  it('lies flat under him, whichever way he faces', () => {
    // spec 07-23: it does not orient, does not stretch, and depends neither on
    // the sun nor on the height.
    const view = buildCharacters(1);
    for (const ang of [0, 1, -2.5, Math.PI]) {
      placeCharacters(view, playerAt(2, 4, -3, ang), 1, 0);
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
    placeCharacters(view, player, 0.5, 0);
    seatOf(view.blots, 0).decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(2, 6);
  });

  it('turns the short way about, so a body does not spin on the wrap', () => {
    const view = buildCharacters(1);
    const player = playerAt(0, 0, 0);
    player.angPrev = Math.PI - 0.1;
    player.ang = -Math.PI + 0.1;
    placeCharacters(view, player, 0.5, 0);
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
    placeCharacters(view, player, 0, 0);
    const seats = view.bodies.instanceMatrix;
    const painted = view.bodies.instanceColor;
    const laid = view.blots.instanceMatrix;
    for (let i = 0; i < 1000; i += 1) placeCharacters(view, player, i / 1000, 0);
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
    placeCharacters(view, playerAt(0, 0, 0), 1, 0);
    const bare = view.bodies.count;

    flingHead(view, 3, 0, -2, 1, 2, 600, 1000);
    placeCharacters(view, playerAt(0, 0, 0), 1, 1000);
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
    placeCharacters(view, playerAt(0, 0, 0), 1, 1300);
    seatOf(view.bodies, bare).decompose(SPOT, TURN, SIZE);
    expect(SPOT.y).toBeGreaterThan(head.y);
    expect(TURN.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.1);

    // And gone at the end of its span, with nothing put down where it stood.
    placeCharacters(view, playerAt(0, 0, 0), 1, 1601);
    expect(view.bodies.count).toBe(bare);
    expect(view.blots.count).toBe(1); // and a head never carried a blot (spec 07-24)
  });

  it('wears the scale of its kind, and still costs no call of its own', () => {
    // spec 07-21: every box of every body rides in the one mesh.
    const view = buildCharacters(4);
    flingHead(view, 0, 0, 0, 2.2, 3, 600, 0);
    placeCharacters(view, playerAt(0, 0, 0), 1, 0);
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
