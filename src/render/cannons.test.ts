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
  pourCells,
  raiseCannon,
  retractConveyor,
} from './cannons';
import { BLACK, FIRE, WHITE } from './effects';

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
    flameAng: new Float32Array(HOLDS),
    flameAngPrev: new Float32Array(HOLDS),
    flameLit: new Uint8Array(HOLDS),
    conveyorLeft: new Float32Array(HOLDS),
  };
}

/**
 * Where every belt runs home to. The base sits six blocks out along street one,
 * which heads along `+x`. (spec 02-8, 02-16)
 */
const BASE_X = 6;
const BASE_Z = 0;

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

/** How large one instance is drawn, which is the whole of what a cone says. */
function sizeOf(mesh: THREE.InstancedMesh, at: number): THREE.Vector3 {
  mesh.getMatrixAt(at, SEAT);
  SEAT.decompose(SPOT, TURN, SIZE);
  return SIZE;
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
  it('costs one call for the cannons, one for the cones, one each for the mark and its circle', () => {
    // spec 07-21, 10 "Le budget de rendu": every box of every cannon in one
    // InstancedMesh, twenty-four of them or none — the belts of the third tier
    // among them (spec 05-5) — and the cones in the second of the two instanced
    // systems of effect chapter 7 counts (spec 07-38, 07 "Les éclats").
    const one = buildCannons(1, RULE.flame.arc);
    const many = buildCannons(HOLDS, RULE.flame.arc);
    expect(one.draws.length).toBe(4);
    expect(many.draws.length).toBe(one.draws.length);
    expect(many.bodies.isInstancedMesh).toBe(true);
  });

  it('hangs nothing over a cannon: no bar, no blink, no colour of alarm', () => {
    // spec 05-49, 07-42: the shape is the whole of the state.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const names = view.draws.map((mesh) => mesh.name).sort();
    expect(names).toEqual(['cannons', 'diamond', 'flames', 'reach']);
  });
});

describe('the three silhouettes', () => {
  it('tells the three tiers apart by shape alone, and by nothing written', () => {
    // spec 05-5: small and grey with a short tube, medium in copper, large.
    const seen: number[] = [];
    const tall: number[] = [];
    for (const tier of [1, 2, 3]) {
      const view = buildCannons(HOLDS, RULE.flame.arc);
      const cannons = pool();
      stand(cannons, 0, 0, 0, tier);
      placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
      seen.push(view.bodies.count);
      tall.push(tallestOf(view, 0));
    }
    // The second tier carries a second arm, so it holds more boxes than the
    // first; the third is the second, larger, plus the one box of the belt that
    // runs to the base. (spec 05-3, 05-4, 05-5)
    expect(seen[1]).toBeGreaterThan(seen[0]);
    expect(seen[2]).toBe(seen[1] + 1);
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
      const view = buildCannons(HOLDS, RULE.flame.arc);
      const cannons = pool();
      stand(cannons, 0, 0, 0, tier);
      placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
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
      const view = buildCannons(HOLDS, RULE.flame.arc);
      const cannons = pool();
      stand(cannons, 0, 0, 0, 2, RULE.hp, held);
      placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
      const bare = buildCannons(HOLDS, RULE.flame.arc);
      const none = pool();
      stand(none, 0, 0, 0, 2, RULE.hp, 0);
      placeCannons(bare, none, RULE, 1, 10_000, BASE_X, BASE_Z);
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
    const whole = buildCannons(HOLDS, RULE.flame.arc);
    const wholePool = pool();
    stand(wholePool, 0, 0, 0, 1, 20);
    placeCannons(whole, wholePool, RULE, 1, 10_000, BASE_X, BASE_Z);

    const worn = buildCannons(HOLDS, RULE.flame.arc);
    const wornPool = pool();
    stand(wornPool, 0, 0, 0, 1, 3);
    placeCannons(worn, wornPool, RULE, 1, 10_000, BASE_X, BASE_Z);

    expect(worn.bodies.count).toBeLessThan(whole.bodies.count);
    expect(worn.bodies.count).toBeGreaterThan(0); // it still stands on its footing
  });

  it('never takes one off a roof, whose hp never move', () => {
    // spec 05-46: a roof is out of reach, for good.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool();
    stand(cannons, 0, 4, 0, 1, RULE.hp);
    placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
    expect(platesOf(cannons.hp[0], RULE.hp)).toBe(PLATES);
  });
});

describe('going down', () => {
  it('comes up out of the ground over the 0,3 second of the placing', () => {
    // spec 05-7.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool();
    stand(cannons, 5, 4, -2, 1);
    const span = RULE.placeTime * 1000;

    raiseCannon(view, 5, -2, span, 1_000);
    placeCannons(view, cannons, RULE, 1, 1_000, BASE_X, BASE_Z);
    const opening = seatOf(view.bodies, 0).y;

    placeCannons(view, cannons, RULE, 1, 1_000 + span / 2, BASE_X, BASE_Z);
    const half = seatOf(view.bodies, 0).y;

    placeCannons(view, cannons, RULE, 1, 1_000 + span, BASE_X, BASE_Z);
    const up = seatOf(view.bodies, 0).y;

    expect(opening).toBeLessThan(half);
    expect(half).toBeLessThan(up);
    expect(up).toBeGreaterThan(4); // its footing sits on the roof it went down on
  });
});

describe('the mark and the circle it draws', () => {
  it('is wide and white where a cannon goes down', () => {
    // spec 05-17.
    const view = buildCannons(HOLDS, RULE.flame.arc);
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
    const view = buildCannons(HOLDS, RULE.flame.arc);
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
    const view = buildCannons(HOLDS, RULE.flame.arc);
    layDiamond(view, 0, 0, 0, 12, false, false, RULE, 0);
    expect((view.mark.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      new THREE.Color(BLACK).getHex(),
    );
    expect(view.mark.scale.x).toBe(RULE.spacing);
  });

  it('paints the circle at the reach it is handed, in the colour of the mark', () => {
    // spec 05-19: the reach carries the colour of the mark above it.
    const view = buildCannons(HOLDS, RULE.flame.arc);
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
    const view = buildCannons(HOLDS, RULE.flame.arc);
    layDiamond(view, 40, 8, -3, 18, true, false, RULE, 0);
    expect(view.mark.position.x).toBe(40);
    expect(view.circle.position.x).toBe(40);
    expect(view.circle.position.z).toBe(-3);
    layDiamond(view, -7, 0, 9, 12, true, false, RULE, 0);
    expect(view.mark.position.x).toBe(-7);
    expect(view.circle.position.z).toBe(9);
  });
});

describe('the cone of a jet of flame', () => {
  /** One cannon, told whether its cone is alight and whether it is fed. */
  function burning(tier: number, lit: boolean, fed: boolean, ang = 0): CannonPool {
    const cannons = pool();
    const at = stand(cannons, 0, 0, 0, tier, RULE.hp, fed ? RULE.magazine : 0);
    cannons.flameLit[at] = lit ? 1 : 0;
    cannons.burnLeft[at] = fed ? RULE.flame.perFirebomb : 0;
    cannons.flameAng[at] = ang;
    cannons.flameAngPrev[at] = ang;
    return cannons;
  }

  it('seats one cone per cannon that burns, and none at all over an empty street', () => {
    // spec 05-33, 07-38: one instance per cannon that burns, and a cone on the
    // screen is a zombie on the screen.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    placeCannons(view, burning(2, false, true), RULE, 1, 10_000, BASE_X, BASE_Z);
    expect(view.flames.count).toBe(0);

    placeCannons(view, burning(2, true, true), RULE, 1, 10_000, BASE_X, BASE_Z);
    expect(view.flames.count).toBe(1);
  });

  it('says fed or dry by the length alone, and never by a colour', () => {
    // spec 05-36, 07-39: the state is read off the length of the flame, never
    // off its colour — the fire of this game is white-blue throughout.
    const view = buildCannons(HOLDS, RULE.flame.arc);

    placeCannons(view, burning(2, true, true), RULE, 1, 10_000, BASE_X, BASE_Z);
    const long = sizeOf(view.flames, 0).x;
    placeCannons(view, burning(2, true, false), RULE, 1, 10_000, BASE_X, BASE_Z);
    const short = sizeOf(view.flames, 0).x;

    expect(long).toBeCloseTo(RULE.flame.range, 6); // six blocks fed (spec 05-30)
    expect(short).toBeLessThan(long);
    expect(short).toBeGreaterThan(0); // it never goes out (spec 05-34)

    // One colour for every cone there will ever be: the mesh carries no colour
    // per instance at all, so no state of a cannon can ever be said with one.
    expect(view.flames.instanceColor).toBe(null);
    expect((view.flames.material as THREE.MeshBasicMaterial).color.getHex()).toBe(
      new THREE.Color(FIRE).getHex(),
    );
    // And it takes no haze: a cone at the far end of a street is seen to burn.
    // (spec 07-8)
    expect((view.flames.material as THREE.MeshBasicMaterial).fog).toBe(false);
  });

  it('leaves the cone at the mouth of the cannon, on the heading it burns along', () => {
    // spec 07-38: attached to the cannon, and turned towards what it burns.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    placeCannons(view, burning(2, true, true, 0), RULE, 1, 10_000, BASE_X, BASE_Z);
    const east = seatOf(view.flames, 0).clone();
    placeCannons(view, burning(2, true, true, Math.PI), RULE, 1, 10_000, BASE_X, BASE_Z);
    const west = seatOf(view.flames, 0).clone();

    // The cone leaves the mouth of the second arm, which turns with what it
    // burns: ahead of the middle on one heading, behind it on the other.
    expect(east.x).toBeGreaterThan(0);
    expect(west.x).toBeCloseTo(-east.x, 6);
    expect(east.y).toBeGreaterThan(0); // and over the ground it sits on
    expect(east.y).toBeCloseTo(west.y, 6);
  });
});

describe('the belt of a third tier', () => {
  it('runs one straight belt from the base, and none under the third tier', () => {
    // spec 05-5, 04-53: the third silhouette is the belt running to the base,
    // and it appears whole — there is no path and no growing.
    const boxes = (tier: number): number => {
      const view = buildCannons(HOLDS, RULE.flame.arc);
      const cannons = pool();
      stand(cannons, 20, 0, 0, tier);
      placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
      return view.bodies.count;
    };
    expect(boxes(3)).toBe(boxes(2) + 1);

    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool();
    stand(cannons, 20, 0, 0, 3);
    placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);
    const belt = view.bodies.count - 1;
    // One box, half way between the two ends, as long as the run between them.
    expect(seatOf(view.bodies, belt).x).toBeCloseTo((BASE_X + 20) / 2, 3);
    expect(sizeOf(view.bodies, belt).x).toBeCloseTo(20 - BASE_X, 1);
  });

  it('pulls back to the base over one second, and then there is nothing left', () => {
    // spec 04-55, 05-50: it goes because the cannon it served is gone, and it
    // takes the one second of the chapter to go home.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool(); // its cannon has already gone
    const span = RULE.conveyorRetract * 1000;
    retractConveyor(view, 20, 0, 0, span, 1_000);

    placeCannons(view, cannons, RULE, 1, 1_000, BASE_X, BASE_Z);
    const whole = sizeOf(view.bodies, 0).x;
    placeCannons(view, cannons, RULE, 1, 1_000 + span / 2, BASE_X, BASE_Z);
    const half = sizeOf(view.bodies, 0).x;

    expect(whole).toBeCloseTo(20 - BASE_X, 1);
    expect(half).toBeLessThan(whole);
    expect(half).toBeGreaterThan(0);

    placeCannons(view, cannons, RULE, 1, 1_000 + span, BASE_X, BASE_Z);
    expect(view.bodies.count).toBe(0);
    expect(view.pullCount).toBe(0);
  });
});

describe('an armful going into a magazine', () => {
  it('fills the cells over the three tenths of a second of the pour', () => {
    // spec 04-49, 05-5: the cells fill over the gesture, off what the magazine
    // held before it.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool();
    stand(cannons, 0, 0, 0, 2, RULE.hp, 3); // it holds three now
    const span = RULE.pourTime * 1000;
    pourCells(view, 0, 0, 0, span, 1_000); // and held none before

    placeCannons(view, cannons, RULE, 1, 1_000, BASE_X, BASE_Z);
    const opening = view.bodies.count;
    placeCannons(view, cannons, RULE, 1, 1_000 + span / 2, BASE_X, BASE_Z);
    const half = view.bodies.count;
    placeCannons(view, cannons, RULE, 1, 1_000 + span, BASE_X, BASE_Z);
    const done = view.bodies.count;

    expect(half).toBeGreaterThan(opening);
    expect(done).toBe(opening + 3);
    expect(view.pourCount).toBe(0); // and the filling is let go of
  });

  it('paints a cell that holds a firebomb in the one colour the fire has', () => {
    // spec 07-39: white-blue, and the same for the cone and for what he carries.
    const view = buildCannons(HOLDS, RULE.flame.arc);
    const cannons = pool();
    stand(cannons, 0, 0, 0, 2, RULE.hp, 3);
    placeCannons(view, cannons, RULE, 1, 10_000, BASE_X, BASE_Z);

    const paint = new THREE.Color();
    let fired = 0;
    for (let i = 0; i < view.bodies.count; i += 1) {
      view.bodies.getColorAt(i, paint);
      if (paint.getHex() === new THREE.Color(FIRE).getHex()) fired += 1;
    }
    expect(fired).toBe(3);
  });
});
