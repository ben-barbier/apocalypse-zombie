/**
 * The cannons read back against chapters 5 and 7. Nothing here draws: it builds
 * the mesh and the two marks and counts what is in them, which is how the three
 * silhouettes, the wear and the absence of any bar become red errors rather than
 * good intentions. (spec 10-45)
 *
 * The pool it places is written out here by hand, because `src/render/` takes
 * types from the rules and never their functions. (spec 10-2)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { CannonBalance } from '../game/balance';
import type { CannonPool } from '../game/state';
import {
  COPPER,
  METAL,
  PLATES,
  TIER_SCALES,
  buildCannons,
  layDiamond,
  placeCannons,
  platesOf,
  raiseCannon,
} from './cannons';
import { BLACK, WHITE } from './effects';

/** Chapter 5's figures, written out here from the spec and from nowhere else. */
const RULE: CannonBalance = {
  tiers: 3, // spec 05-2
  placeTime: 0.3, // spec 05-7
  spacing: 3, // spec 05-11
  hp: 20, // spec 05-44
  magazine: 3, // spec 04-47
  pourRange: 3, // spec 04-49
  pourTime: 0.3, // spec 04-49
  conveyorPeriod: 6, // spec 04-54
  conveyorRetract: 1, // spec 04-55
  ball: { range: 12, perHeight: 0.75, period: 2, flight: 0.6, swordHits: 1 }, // spec 05-22
  flame: { arc: 60, range: 6, fed: 2, dry: 0.5, perFirebomb: 6 }, // spec 05-30
};

const HOLDS = 24; // spec 05-52

/** One pool with room for the whole bound, and nothing standing in it yet. */
function pool(): CannonPool {
  return {
    count: 0,
    x: new Float32Array(HOLDS),
    y: new Float32Array(HOLDS),
    z: new Float32Array(HOLDS),
    ang: new Float32Array(HOLDS),
    angPrev: new Float32Array(HOLDS),
    tier: new Uint8Array(HOLDS),
    hp: new Float32Array(HOLDS),
    magazine: new Uint8Array(HOLDS),
    ballLeft: new Float32Array(HOLDS),
    burnLeft: new Float32Array(HOLDS),
  };
}

/** Stands one cannon in the pool and hands back where it sits. */
function stand(
  cannons: CannonPool,
  x: number,
  y: number,
  z: number,
  tier: number,
  hp = RULE.hp,
  magazine = 0,
): number {
  const at = cannons.count;
  cannons.x[at] = x;
  cannons.y[at] = y;
  cannons.z[at] = z;
  cannons.tier[at] = tier;
  cannons.hp[at] = hp;
  cannons.magazine[at] = magazine;
  cannons.count = at + 1;
  return at;
}

const SEAT = new THREE.Matrix4();
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SIZE = new THREE.Vector3();

function seatOf(mesh: THREE.InstancedMesh, at: number): THREE.Vector3 {
  mesh.getMatrixAt(at, SEAT);
  SEAT.decompose(SPOT, TURN, SIZE);
  return SPOT;
}

/** How high the tallest box of a cannon reaches, which is what says its size. */
function tallestOf(view: ReturnType<typeof buildCannons>, floor: number): number {
  let most = 0;
  for (let i = 0; i < view.bodies.count; i += 1) {
    view.bodies.getMatrixAt(i, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    const top = SPOT.y - floor + SIZE.y / 2;
    if (top > most) most = top;
  }
  return most;
}

describe('the budget', () => {
  it('costs one call for the cannons, and one each for the mark and its circle', () => {
    // spec 07-21, 10 "Le budget de rendu": every box of every cannon in one
    // InstancedMesh, twenty-four of them or none.
    const one = buildCannons(1);
    const many = buildCannons(HOLDS);
    expect(one.draws.length).toBe(3);
    expect(many.draws.length).toBe(one.draws.length);
    expect(many.bodies.isInstancedMesh).toBe(true);
  });

  it('hangs nothing over a cannon: no bar, no blink, no colour of alarm', () => {
    // spec 05-49, 07-42: the shape is the whole of the state.
    const view = buildCannons(HOLDS);
    const names = view.draws.map((mesh) => mesh.name).sort();
    expect(names).toEqual(['cannons', 'diamond', 'reach']);
  });
});

describe('the three silhouettes', () => {
  it('tells the three tiers apart by shape alone, and by nothing written', () => {
    // spec 05-5: small and grey with a short tube, medium in copper, large.
    const seen: number[] = [];
    const tall: number[] = [];
    for (const tier of [1, 2, 3]) {
      const view = buildCannons(HOLDS);
      const cannons = pool();
      stand(cannons, 0, 0, 0, tier);
      placeCannons(view, cannons, RULE, 1, 10_000);
      seen.push(view.bodies.count);
      tall.push(tallestOf(view, 0));
    }
    // The second tier carries a second arm, so it holds more boxes than the
    // first; the third is the second, larger. (spec 05-3, 05-4, 05-5)
    expect(seen[1]).toBeGreaterThan(seen[0]);
    expect(seen[2]).toBe(seen[1]);
    expect(tall[0]).toBeLessThan(tall[1]);
    expect(tall[1]).toBeLessThan(tall[2]);
    expect(TIER_SCALES).toEqual([0.8, 1, 1.25]);
  });

  it('wears grey stone at the first tier and copper from the second', () => {
    // spec 05-5, 07 "La palette de ce qui se joue".
    const paint = new THREE.Color();
    const grey = new THREE.Color(METAL);
    const copper = new THREE.Color(COPPER);

    for (const tier of [1, 2]) {
      const view = buildCannons(HOLDS);
      const cannons = pool();
      stand(cannons, 0, 0, 0, tier);
      placeCannons(view, cannons, RULE, 1, 10_000);
      let coppered = 0;
      for (let i = 0; i < view.bodies.count; i += 1) {
        view.bodies.getColorAt(i, paint);
        if (paint.getHex() === copper.getHex()) coppered += 1;
      }
      expect(coppered).toBe(tier === 1 ? 0 : 3);
    }
    expect(grey.getHex()).not.toBe(copper.getHex());
  });

  it('shows the three cells of a magazine, and shows them empty', () => {
    // spec 05-5: the three cells of the magazine, emptying.
    for (const held of [0, 1, 3]) {
      const view = buildCannons(HOLDS);
      const cannons = pool();
      stand(cannons, 0, 0, 0, 2, RULE.hp, held);
      placeCannons(view, cannons, RULE, 1, 10_000);
      const bare = buildCannons(HOLDS);
      const none = pool();
      stand(none, 0, 0, 0, 2, RULE.hp, 0);
      placeCannons(bare, none, RULE, 1, 10_000);
      expect(view.bodies.count - bare.bodies.count).toBe(held);
    }
  });
});

describe('what wear takes', () => {
  it('takes a plate at a time as the hp go down, and never gives one back', () => {
    // spec 05-48: blocks come off, for good.
    expect(platesOf(20, 20)).toBe(PLATES);
    expect(platesOf(10, 20)).toBe(PLATES / 2);
    expect(platesOf(1, 20)).toBe(1);
    expect(platesOf(0, 20)).toBe(0);

    let was = PLATES;
    for (let hp = 20; hp >= 0; hp -= 0.5) {
      const now = platesOf(hp, 20);
      expect(now).toBeLessThanOrEqual(was);
      was = now;
    }
  });

  it('leaves a worn cannon smaller and more full of holes, and standing', () => {
    // spec 05-49: it is visibly smaller and more full of holes, and it stays
    // that way until an upgrade.
    const whole = buildCannons(HOLDS);
    const wholePool = pool();
    stand(wholePool, 0, 0, 0, 1, 20);
    placeCannons(whole, wholePool, RULE, 1, 10_000);

    const worn = buildCannons(HOLDS);
    const wornPool = pool();
    stand(wornPool, 0, 0, 0, 1, 3);
    placeCannons(worn, wornPool, RULE, 1, 10_000);

    expect(worn.bodies.count).toBeLessThan(whole.bodies.count);
    expect(worn.bodies.count).toBeGreaterThan(0); // it still stands on its footing
  });

  it('never takes one off a roof, whose hp never move', () => {
    // spec 05-46: a roof is out of reach, for good.
    const view = buildCannons(HOLDS);
    const cannons = pool();
    stand(cannons, 0, 4, 0, 1, RULE.hp);
    placeCannons(view, cannons, RULE, 1, 10_000);
    expect(platesOf(cannons.hp[0], RULE.hp)).toBe(PLATES);
  });
});

describe('going down', () => {
  it('comes up out of the ground over the 0,3 second of the placing', () => {
    // spec 05-7.
    const view = buildCannons(HOLDS);
    const cannons = pool();
    stand(cannons, 5, 4, -2, 1);
    const span = RULE.placeTime * 1000;

    raiseCannon(view, 5, -2, span, 1_000);
    placeCannons(view, cannons, RULE, 1, 1_000);
    const opening = seatOf(view.bodies, 0).y;

    placeCannons(view, cannons, RULE, 1, 1_000 + span / 2);
    const half = seatOf(view.bodies, 0).y;

    placeCannons(view, cannons, RULE, 1, 1_000 + span);
    const up = seatOf(view.bodies, 0).y;

    expect(opening).toBeLessThan(half);
    expect(half).toBeLessThan(up);
    expect(up).toBeGreaterThan(4); // its footing sits on the roof it went down on
  });
});

describe('the mark and the circle it draws', () => {
  it('is wide and white where a cannon goes down', () => {
    // spec 05-17.
    const view = buildCannons(HOLDS);
    layDiamond(view, 3, 4, -5, 15, true, false, RULE, 0);
    expect(view.mark.scale.x).toBe(RULE.spacing);
    expect((view.mark.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      new THREE.Color(WHITE).getHex(),
    );
    expect(view.mark.position.x).toBe(3);
    expect(view.mark.position.z).toBe(-5);
    expect(view.mark.position.y).toBeGreaterThan(4); // laid on the floor, over it
  });

  it('is tight and breathing where one moves up a tier', () => {
    // spec 05-17: tight, white and pulsing.
    const view = buildCannons(HOLDS);
    const seen = new Set<number>();
    let widest = 0;
    for (let ms = 0; ms < 1_000; ms += 20) {
      layDiamond(view, 0, 0, 0, 12, true, true, RULE, ms);
      seen.add(Math.round(view.mark.scale.x * 1000));
      widest = Math.max(widest, view.mark.scale.x);
    }
    expect(seen.size).toBeGreaterThan(10); // it breathes rather than sitting still
    expect(widest).toBeLessThan(RULE.spacing); // and it is the tight one

    layDiamond(view, 0, 0, 0, 12, true, false, RULE, 0);
    expect(view.mark.scale.x).toBe(RULE.spacing); // against the wide one
  });

  it('is black, and widened, where there is nothing left to do', () => {
    // spec 05-18.
    const view = buildCannons(HOLDS);
    layDiamond(view, 0, 0, 0, 12, false, false, RULE, 0);
    expect((view.mark.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      new THREE.Color(BLACK).getHex(),
    );
    expect(view.mark.scale.x).toBe(RULE.spacing);
  });

  it('paints the circle at the reach it is handed, in the colour of the mark', () => {
    // spec 05-19: the reach carries the colour of the mark above it.
    const view = buildCannons(HOLDS);
    for (const [reach, white] of [
      [12, true],
      [18, false],
    ] as [number, boolean][]) {
      layDiamond(view, 1, 0, 2, reach, white, false, RULE, 0);
      expect(view.circle.scale.x).toBe(reach);
      expect(view.circle.scale.z).toBe(reach);
      expect((view.circle.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
        new THREE.Color(white ? WHITE : BLACK).getHex(),
      );
    }
  });

  it('follows the feet, both of them, wherever they go', () => {
    // spec 05-20: they are laid where he stands, every frame, and nowhere else.
    const view = buildCannons(HOLDS);
    layDiamond(view, 40, 8, -3, 18, true, false, RULE, 0);
    expect(view.mark.position.x).toBe(40);
    expect(view.circle.position.x).toBe(40);
    expect(view.circle.position.z).toBe(-3);
    layDiamond(view, -7, 0, 9, 12, true, false, RULE, 0);
    expect(view.mark.position.x).toBe(-7);
    expect(view.circle.position.z).toBe(9);
  });
});
