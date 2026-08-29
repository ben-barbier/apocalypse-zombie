/**
 * The shards read back against chapter 7. Nothing here draws: it builds the one
 * mesh under node, throws clouds into it and reads back what came out — which is
 * how the pool of six hundred, the order a full pool gives way in, and the
 * erasing towards white become red errors rather than good intentions.
 * (spec 10-45)
 *
 * Every number here is written out by hand from the spec, and the address of the
 * rule is beside it. (spec 10-42)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARC,
  ARC_SPAN,
  type Effects,
  LIT_FOR,
  PRIORITY,
  PUFF,
  PUFF_SPAN,
  SHARD_SIDE,
  STRUCK,
  WHITE,
  buildEffects,
  holdShards,
  isLit,
  lightUp,
  placeShards,
  scatter,
  strike,
  sweepArc,
} from './effects';

/** The pool, allocated at load. (spec 07-27, 10 "Les pools") */
const POOL = 600;

/** What the third tier of the quality scale lowers it to. (spec 10 "L'échelle de qualité") */
const LOWERED = 200;

const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SIZE = new THREE.Vector3();
const SEAT = new THREE.Matrix4();
const PAINT = new THREE.Color();

/** How many shards alive hold this one of the four priorities. */
function howMany(effects: Effects, priority: number): number {
  let found = 0;
  for (let i = 0; i < effects.count; i += 1) if (effects.priority[i] === priority) found += 1;
  return found;
}

/** A pool small enough for a test to fill it by hand, without allocating a second one. */
function smallPool(holds: number): Effects {
  const effects = buildEffects(POOL);
  holdShards(effects, holds);
  return effects;
}

describe('the pool', () => {
  it('costs one call, whatever it holds', () => {
    // spec 07-27: one InstancedMesh carries them all.
    const effects = buildEffects(POOL);
    expect(effects.draws.length).toBe(1);
    expect(effects.draws[0]).toBe(effects.shards);
    expect(effects.shards.isInstancedMesh).toBe(true);
  });

  it('is six hundred, allocated at load and empty', () => {
    // spec 07-27, spec 10-13.
    const effects = buildEffects(POOL);
    expect(effects.shards.instanceMatrix.count).toBe(POOL);
    expect(effects.x.length).toBe(POOL);
    expect(effects.priority.length).toBe(POOL);
    expect(effects.count).toBe(0);
    expect(effects.shards.count).toBe(0);
  });

  it('never grows, whatever is asked of it', () => {
    // spec 07-27, 10-14: the pool is fixed, and saturation applies the order of
    // 07-29 instead of making room.
    const effects = buildEffects(POOL);
    const held = effects.x;
    for (let i = 0; i < 400; i += 1) {
      scatter(effects, PRIORITY.PLAIN, 10, 0, 1, 0, WHITE, 3, 600, i);
      expect(effects.count).toBeLessThanOrEqual(POOL);
    }
    expect(effects.count).toBe(POOL);
    expect(effects.x).toBe(held);
    expect(effects.x.length).toBe(POOL);
    expect(effects.shards.instanceMatrix.count).toBe(POOL);
  });
});

describe('a shard', () => {
  it('is a cube of a quarter of a block', () => {
    // spec 07-25.
    expect(SHARD_SIDE).toBe(0.25);
    const effects = buildEffects(POOL);
    scatter(effects, PRIORITY.PLAIN, 1, 4, 2, -3, WHITE, 0, 600, 0);
    placeShards(effects, 0);
    effects.shards.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    expect(SIZE.x).toBeCloseTo(0.25, 6);
    expect(SIZE.y).toBeCloseTo(0.25, 6);
    expect(SIZE.z).toBeCloseTo(0.25, 6);
    // A cloud thrown at no speed stays where it was thrown from.
    expect(SPOT.x).toBeCloseTo(4, 6);
    expect(SPOT.y).toBeCloseTo(2, 6);
    expect(SPOT.z).toBeCloseTo(-3, 6);
  });

  it('carries no tile, takes no light, and takes no haze', () => {
    // spec 07-10: what moves and what is put down is plain.
    // spec 07-8: an effect never takes the haze.
    // spec 07-17: nothing in this game is the least bit see-through.
    const effects = buildEffects(POOL);
    const paint = effects.shards.material as THREE.MeshBasicMaterial;
    expect(paint.isMeshBasicMaterial).toBe(true);
    expect(paint.map).toBe(null);
    expect(paint.fog).toBe(false);
    expect(paint.transparent).toBe(false);
    expect(paint.opacity).toBe(1);
  });

  it('drifts in a straight line, off its own age', () => {
    // spec 10-14: nothing integrates between frames, so a frame allocates and
    // carries nothing.
    const effects = buildEffects(POOL);
    scatter(effects, PRIORITY.PLAIN, 1, 0, 1, 0, WHITE, 4, 1000, 100);
    placeShards(effects, 600);
    effects.shards.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    // half a second at four blocks a second, along whichever way it took
    expect(Math.hypot(SPOT.x, SPOT.y - 1, SPOT.z)).toBeCloseTo(2, 5);
  });
});

describe('the erasing', () => {
  it('lightens towards white, and never dissolves', () => {
    // spec 07-28: a shard goes out by lightening towards white.
    // spec 07-17: it is opaque the whole way, and it is the depth buffer that
    // ranges the scene.
    const effects = buildEffects(POOL);
    scatter(effects, PRIORITY.PLAIN, 1, 0, 1, 0, '#000000', 0, 600, 0);

    placeShards(effects, 0);
    effects.shards.getColorAt(0, PAINT);
    expect(PAINT.r).toBeCloseTo(0, 6);

    placeShards(effects, 300);
    effects.shards.getColorAt(0, PAINT);
    expect(PAINT.r).toBeCloseTo(0.5, 6);
    expect(PAINT.g).toBeCloseTo(0.5, 6);
    expect(PAINT.b).toBeCloseTo(0.5, 6);

    placeShards(effects, 540);
    effects.shards.getColorAt(0, PAINT);
    expect(PAINT.r).toBeCloseTo(0.9, 6);

    const paint = effects.shards.material as THREE.MeshBasicMaterial;
    expect(paint.opacity).toBe(1);
    expect(paint.transparent).toBe(false);
  });

  it('is white all along when it starts white', () => {
    // spec 07-36: the puff of a blow taken is white, and it lightens to nowhere.
    const effects = buildEffects(POOL);
    scatter(effects, PRIORITY.PLAIN, 1, 0, 1, 0, WHITE, 0, 600, 0);
    for (const now of [0, 200, 400, 599]) {
      placeShards(effects, now);
      effects.shards.getColorAt(0, PAINT);
      expect(PAINT.r).toBeCloseTo(1, 6);
      expect(PAINT.g).toBeCloseTo(1, 6);
      expect(PAINT.b).toBeCloseTo(1, 6);
    }
  });

  it('gives its slot back the moment its span runs out', () => {
    // spec 07, "Ce que chaque effet consomme": a span is what erases a cloud.
    const effects = buildEffects(POOL);
    scatter(effects, PRIORITY.PLAIN, 10, 0, 1, 0, WHITE, 3, 600, 1000);
    placeShards(effects, 1599);
    expect(effects.count).toBe(10);
    expect(effects.shards.count).toBe(10);
    placeShards(effects, 1600);
    expect(effects.count).toBe(0);
    expect(effects.shards.count).toBe(0);
  });
});

describe('a full pool', () => {
  it('reads its four priorities in the order of the spec', () => {
    // spec 07-29: fatal blow > mark > trail > plain.
    expect(PRIORITY.FATAL).toBeGreaterThan(PRIORITY.MARK);
    expect(PRIORITY.MARK).toBeGreaterThan(PRIORITY.TRAIL);
    expect(PRIORITY.TRAIL).toBeGreaterThan(PRIORITY.PLAIN);
  });

  it('gives the weaker up to the stronger, all the way down the four', () => {
    // spec 07-29, on a pool made small on purpose so a test can saturate it.
    const order = [PRIORITY.PLAIN, PRIORITY.TRAIL, PRIORITY.MARK, PRIORITY.FATAL];
    for (let low = 0; low < order.length; low += 1) {
      for (let high = low + 1; high < order.length; high += 1) {
        const effects = smallPool(8);
        scatter(effects, order[low], 8, 0, 1, 0, WHITE, 3, 600, 0);
        expect(effects.count).toBe(8);
        scatter(effects, order[high], 3, 0, 1, 0, WHITE, 3, 600, 100);
        expect(effects.count).toBe(8); // it never grows to make room
        expect(howMany(effects, order[high])).toBe(3);
        expect(howMany(effects, order[low])).toBe(5);
      }
    }
  });

  it('refuses outright what matters less than everything alive', () => {
    // spec 07-29, and spec 07-27: the pool never grows, so what is refused is
    // simply not thrown.
    const order = [PRIORITY.PLAIN, PRIORITY.TRAIL, PRIORITY.MARK, PRIORITY.FATAL];
    for (let high = 1; high < order.length; high += 1) {
      for (let low = 0; low < high; low += 1) {
        const effects = smallPool(8);
        scatter(effects, order[high], 8, 0, 1, 0, WHITE, 3, 600, 0);
        scatter(effects, order[low], 3, 0, 1, 0, WHITE, 3, 600, 100);
        expect(effects.count).toBe(8);
        expect(howMany(effects, order[high])).toBe(8);
        expect(howMany(effects, order[low])).toBe(0);
      }
    }
  });

  it('gives up the one nearest to being erased among its equals', () => {
    // spec 07-29 sets no order between two clouds of one priority; what is
    // almost gone gives way first, so the newest fatal blow always shows.
    const effects = smallPool(4);
    scatter(effects, PRIORITY.FATAL, 2, 0, 1, 0, WHITE, 0, 600, 0);
    scatter(effects, PRIORITY.FATAL, 2, 9, 1, 9, WHITE, 0, 600, 400);
    expect(effects.count).toBe(4);

    // At 500 the first two are 500/600 gone and the last two 100/600: the first
    // two are what a third cloud takes.
    scatter(effects, PRIORITY.FATAL, 2, 5, 1, 5, WHITE, 0, 600, 500);
    expect(effects.count).toBe(4);
    let stillThere = 0;
    for (let i = 0; i < effects.count; i += 1) if (effects.born[i] === 0) stillThere += 1;
    expect(stillThere).toBe(0);
  });
});

describe('a blow taken', () => {
  it('throws a puff of white shards and lights white for 80 ms', () => {
    // spec 07-36, and spec 07 "Ce que chaque effet consomme": the puff of a blow
    // taken is erased in 80 ms.
    expect(LIT_FOR).toBe(80);
    expect(PUFF_SPAN).toBe(80);
    const effects = buildEffects(POOL);
    strike(effects, STRUCK.ZOMBIE, 7, 2, 1.5, 3, 1000);

    expect(effects.count).toBe(PUFF);
    placeShards(effects, 1000);
    effects.shards.getColorAt(0, PAINT);
    expect(PAINT.r).toBeCloseTo(1, 6);
    expect(PAINT.g).toBeCloseTo(1, 6);
    expect(PAINT.b).toBeCloseTo(1, 6);

    expect(isLit(effects, STRUCK.ZOMBIE, 7, 1000)).toBe(true);
    expect(isLit(effects, STRUCK.ZOMBIE, 7, 1079)).toBe(true);
    expect(isLit(effects, STRUCK.ZOMBIE, 7, 1080)).toBe(false);

    placeShards(effects, 1080);
    expect(effects.count).toBe(0);
  });

  it('is the same call for the three things that take one', () => {
    // spec 07-36: a zombie, a block of the town hall, a cannon — and no fourth.
    const effects = buildEffects(POOL);
    strike(effects, STRUCK.ZOMBIE, 1, 0, 1, 0, 0);
    strike(effects, STRUCK.TOWN_HALL, 1, 0, 1, 0, 0);
    strike(effects, STRUCK.CANNON, 1, 0, 1, 0, 0);
    expect(effects.count).toBe(3 * PUFF);
    expect(isLit(effects, STRUCK.ZOMBIE, 1, 0)).toBe(true);
    expect(isLit(effects, STRUCK.TOWN_HALL, 1, 0)).toBe(true);
    expect(isLit(effects, STRUCK.CANNON, 1, 0)).toBe(true);
  });

  it('lights the one thing it names, and nothing beside it', () => {
    // spec 07-36: the white is on what took the blow, never on its neighbours.
    const effects = buildEffects(POOL);
    lightUp(effects, STRUCK.ZOMBIE, 3, 0);
    expect(isLit(effects, STRUCK.ZOMBIE, 3, 0)).toBe(true);
    expect(isLit(effects, STRUCK.ZOMBIE, 4, 0)).toBe(false);
    expect(isLit(effects, STRUCK.CANNON, 3, 0)).toBe(false);
  });

  it('puts the 80 ms back on a second blow rather than taking a second slot', () => {
    // spec 07-36: one signal, whatever lands on it.
    const effects = buildEffects(POOL);
    lightUp(effects, STRUCK.CANNON, 2, 0);
    lightUp(effects, STRUCK.CANNON, 2, 50);
    expect(isLit(effects, STRUCK.CANNON, 2, 100)).toBe(true);
    expect(isLit(effects, STRUCK.CANNON, 2, 130)).toBe(false);
  });
});

describe('the quality scale', () => {
  it('takes the pool from 600 down to 200 without allocating anything', () => {
    // spec 10-39, spec 10 "L'échelle de qualité": the third tier lowers the
    // shards, and the simulation hears nothing of it.
    const effects = buildEffects(POOL);
    const held = effects.born;
    for (let i = 0; i < 60; i += 1) scatter(effects, PRIORITY.PLAIN, 10, 0, 1, 0, WHITE, 3, 600, 0);
    expect(effects.count).toBe(POOL);

    holdShards(effects, LOWERED);
    expect(effects.count).toBe(LOWERED);
    expect(effects.born).toBe(held);
    expect(effects.born.length).toBe(POOL);

    placeShards(effects, 100);
    expect(effects.shards.count).toBe(LOWERED);

    // And a cloud thrown after it stays under the lowered ceiling.
    scatter(effects, PRIORITY.FATAL, 10, 0, 1, 0, WHITE, 3, 600, 100);
    expect(effects.count).toBe(LOWERED);
  });
});

describe('a frame', () => {
  it('replaces nothing, a thousand frames in', () => {
    // spec 10-14: the loop allocates nothing, so what a frame writes into was
    // made at load and is still the same object a thousand frames later.
    const effects = buildEffects(POOL);
    const pool = [effects.x, effects.dx, effects.born, effects.span, effects.priority];
    const mesh = effects.shards;
    const seats = mesh.instanceMatrix;

    for (let i = 0; i < 1000; i += 1) {
      strike(effects, STRUCK.ZOMBIE, i % 60, 0, 1, 0, i * 16.666);
      placeShards(effects, i * 16.666);
    }

    expect([effects.x, effects.dx, effects.born, effects.span, effects.priority]).toEqual(pool);
    expect(effects.shards).toBe(mesh);
    expect(mesh.instanceMatrix).toBe(seats);
    expect(effects.count).toBeLessThanOrEqual(POOL);
  });
});

describe('the arc of a sweep', () => {
  it('lays white shards along the sector, at the range of the blow', () => {
    // spec 07-31: the sweep is a white arc of opaque shards, erased in 150 ms.
    // spec 04-22: a sector of 120° on 3 blocks.
    const effects = buildEffects(POOL);
    const arc = (120 * Math.PI) / 180;
    sweepArc(effects, 10, 0, -4, 0, arc, 3, 1000);
    expect(effects.count).toBe(ARC);

    for (let i = 0; i < effects.count; i += 1) {
      // Every one of them at the range of the blow, from where it left.
      expect(Math.hypot(effects.x[i] - 10, effects.z[i] + 4)).toBeCloseTo(3, 6);
      // Inside the sector, and never behind it.
      const turn = Math.atan2(effects.z[i] + 4, effects.x[i] - 10);
      expect(Math.abs(turn)).toBeLessThanOrEqual(arc / 2 + 1e-6);
      expect(effects.span[i]).toBe(ARC_SPAN);
      // Laid still: what reads as a stroke is the shape they hold. (spec 07-31)
      expect(effects.dx[i]).toBeCloseTo(0, 12);
      expect(effects.dy[i]).toBeCloseTo(0, 12);
      expect(effects.dz[i]).toBeCloseTo(0, 12);
    }
    // White, one of the two colours of the action. (spec 07-12)
    PAINT.set(WHITE);
    expect(effects.red[0]).toBeCloseTo(PAINT.r, 6);
    expect(effects.green[0]).toBeCloseTo(PAINT.g, 6);
    expect(effects.blue[0]).toBeCloseTo(PAINT.b, 6);
  });

  it('opens the arc about the heading it was thrown on', () => {
    // spec 04-32: the blow leaves where it was launched.
    const effects = buildEffects(POOL);
    const arc = (120 * Math.PI) / 180;
    sweepArc(effects, 0, 0, 0, Math.PI / 2, arc, 3, 0);
    for (let i = 0; i < effects.count; i += 1) {
      const turn = Math.atan2(effects.z[i], effects.x[i]);
      expect(Math.abs(turn - Math.PI / 2)).toBeLessThanOrEqual(arc / 2 + 1e-6);
    }
  });

  it('is gone in 150 ms, and gives its slots back', () => {
    // spec 07-31: erased in 150 ms.
    const effects = buildEffects(POOL);
    sweepArc(effects, 0, 0, 0, 0, (120 * Math.PI) / 180, 3, 0);
    placeShards(effects, 149);
    expect(effects.count).toBe(ARC);
    placeShards(effects, 151);
    expect(effects.count).toBe(0);
  });
});
