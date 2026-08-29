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
import type { CoinPool, Player, ProjectilePool } from '../game/state';
import {
  ARC,
  ARC_SPAN,
  BLACK,
  BLINK_FAST,
  BLINK_SLOW,
  COIN,
  COIN_FLIGHT,
  type Effects,
  LIT_FOR,
  PER_BALL,
  PRIORITY,
  PUFF,
  PUFF_SPAN,
  RIM,
  SHARD_SIDE,
  STRUCK,
  WHITE,
  blink,
  buildEffects,
  coinSide,
  flyCoin,
  holdShards,
  isBlinking,
  isLit,
  layArc,
  lightUp,
  placeBalls,
  placeCoins,
  placeShards,
  scatter,
  strike,
  sweepArc,
} from './effects';

/** The pool, allocated at load. (spec 07-27, 10 "Les pools") */
const POOL = 600;

/**
 * How many coins can lie in the city at once. It is derived and not settled by
 * any chapter: one springs from every zombie felled (spec 06-2), it lies until
 * the end of the assault (spec 06-8), the end of an assault pays every one of
 * them (spec 06-14), and no line of the wave table walks more than sixty in
 * (spec 03-42, 10-43).
 */
const COINS = 60;

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
  const effects = buildEffects(POOL, COINS);
  holdShards(effects, holds);
  return effects;
}

describe('the pool', () => {
  it('costs one call, whatever it holds', () => {
    // spec 07-27: one InstancedMesh carries them all — and the coins ride in two
    // more, whatever number of them lies about. (spec 07-16, 07-35)
    const effects = buildEffects(POOL, COINS);
    expect(effects.draws.length).toBe(3);
    expect(effects.draws[0]).toBe(effects.shards);
    expect(effects.draws[1]).toBe(effects.coins);
    expect(effects.draws[2]).toBe(effects.rims);
    for (const mesh of effects.draws) expect(mesh.isInstancedMesh).toBe(true);
  });

  it('is six hundred, allocated at load and empty', () => {
    // spec 07-27, spec 10-13.
    const effects = buildEffects(POOL, COINS);
    expect(effects.shards.instanceMatrix.count).toBe(POOL);
    expect(effects.x.length).toBe(POOL);
    expect(effects.priority.length).toBe(POOL);
    expect(effects.count).toBe(0);
    expect(effects.shards.count).toBe(0);
  });

  it('never grows, whatever is asked of it', () => {
    // spec 07-27, 10-14: the pool is fixed, and saturation applies the order of
    // 07-29 instead of making room.
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
    lightUp(effects, STRUCK.ZOMBIE, 3, 0);
    expect(isLit(effects, STRUCK.ZOMBIE, 3, 0)).toBe(true);
    expect(isLit(effects, STRUCK.ZOMBIE, 4, 0)).toBe(false);
    expect(isLit(effects, STRUCK.CANNON, 3, 0)).toBe(false);
  });

  it('puts the 80 ms back on a second blow rather than taking a second slot', () => {
    // spec 07-36: one signal, whatever lands on it.
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
    const effects = buildEffects(POOL, COINS);
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
  /** The sector of a blow: 120° on 3 blocks. (spec 04-22) */
  const OPEN = (120 * Math.PI) / 180;
  const REACH = 3;
  /** One frame at 60 Hz, and one at 30. (spec 10-21, 10 "L'échelle de qualité") */
  const FRAME = 1000 / 60;
  /** The 0,4 second between two blows, button held. (spec 04-24) */
  const CADENCE = 400;

  /** How wide an opening the shards alive cover, in radians, about a heading. */
  function coveredBy(effects: Effects, x: number, z: number, ang: number): number {
    let least = Infinity;
    let most = -Infinity;
    for (let i = 0; i < effects.count; i += 1) {
      let turn = Math.atan2(effects.z[i] - z, effects.x[i] - x) - ang;
      while (turn > Math.PI) turn -= 2 * Math.PI;
      while (turn < -Math.PI) turn += 2 * Math.PI;
      if (turn < least) least = turn;
      if (turn > most) most = turn;
    }
    return effects.count === 0 ? 0 : most - least;
  }

  /** Runs the frames of one whole gesture, at whatever rate is asked. */
  function writeArc(effects: Effects, from: number, frame: number): void {
    for (let now = from; now <= from + ARC_SPAN + frame; now += frame) layArc(effects, now);
  }

  it('lays white shards along the sector, at the range of the blow', () => {
    // spec 07-31: the sweep is a white arc of opaque shards, one shard after
    // another along the blade. spec 04-22: a sector of 120° on 3 blocks.
    const effects = buildEffects(POOL, COINS);
    sweepArc(effects, 10, 0, -4, 0, OPEN, REACH, 1000);
    writeArc(effects, 1000, FRAME);
    expect(effects.count).toBe(ARC);

    for (let i = 0; i < effects.count; i += 1) {
      // Every one of them at the range of the blow, from where it left.
      expect(Math.hypot(effects.x[i] - 10, effects.z[i] + 4)).toBeCloseTo(REACH, 6);
      // Inside the sector, and never behind it.
      const turn = Math.atan2(effects.z[i] + 4, effects.x[i] - 10);
      expect(Math.abs(turn)).toBeLessThanOrEqual(OPEN / 2 + 1e-6);
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

  it('is twenty-five shards, laid end to end along the outer edge', () => {
    // spec 07-31, 07 "Le geste de la fauchée": twenty-five, because the outer
    // edge of the sector measures 3 × 2,094 = 6,28 blocks and a shard is a
    // quarter of a block — 0,262 apart, which leaves no gap the eye can read.
    expect(ARC).toBe(25);
    const edge = REACH * OPEN;
    expect(edge).toBeCloseTo(6.283, 3);
    expect(edge / (ARC - 1)).toBeCloseTo(0.262, 3);
    expect(edge / (ARC - 1)).toBeLessThan(SHARD_SIDE * 1.06);
  });

  it('writes the arc along the blade instead of laying it whole', () => {
    // spec 07-66: a third of the way through the gesture, a third of the
    // opening is white and no more. The whole point of the correction: the eye
    // is given a stroke that grows, and never a blotch that lights at once.
    const effects = buildEffects(POOL, COINS);
    sweepArc(effects, 0, 0, 0, 0, OPEN, REACH, 0);
    // Its head goes down on the very frame of the blow, and its head only.
    expect(effects.count).toBe(1);

    layArc(effects, ARC_SPAN / 3);
    expect(effects.count).toBeLessThan(ARC);
    expect(coveredBy(effects, 0, 0, 0)).toBeCloseTo(OPEN / 3, 6);
    // And nothing at all past that third: the far edge is still untouched.
    for (let i = 0; i < effects.count; i += 1) {
      expect(Math.atan2(effects.z[i], effects.x[i])).toBeLessThan(-OPEN / 2 + OPEN / 3 + 1e-6);
    }

    layArc(effects, (2 * ARC_SPAN) / 3);
    expect(coveredBy(effects, 0, 0, 0)).toBeCloseTo((2 * OPEN) / 3, 6);

    // Home at the end of the gesture, and the whole opening is white.
    layArc(effects, ARC_SPAN);
    expect(effects.count).toBe(ARC);
    expect(coveredBy(effects, 0, 0, 0)).toBeCloseTo(OPEN, 6);
  });

  it('costs twenty-five shards a blow, at any rate of the display', () => {
    // spec 07 "Ce que chaque effet consomme": 25 for one arc, and 25 whether the
    // display runs at 30 frames a second or at 144. (spec 10-22)
    for (const frame of [1000 / 144, FRAME, 1000 / 30]) {
      const effects = buildEffects(POOL, COINS);
      sweepArc(effects, 0, 0, 0, 0, OPEN, REACH, 0);
      writeArc(effects, 0, frame);
      expect(effects.sweepLaid).toBe(ARC);
      expect(effects.count).toBe(ARC);
      // And it lays no more, however long the frames go on.
      writeArc(effects, ARC_SPAN, frame);
      expect(effects.count).toBe(ARC);
    }
  });

  it('opens the arc about the heading it was thrown on', () => {
    // spec 04-32: the blow leaves where it was launched.
    const effects = buildEffects(POOL, COINS);
    sweepArc(effects, 0, 0, 0, Math.PI / 2, OPEN, REACH, 0);
    writeArc(effects, 0, FRAME);
    for (let i = 0; i < effects.count; i += 1) {
      const turn = Math.atan2(effects.z[i], effects.x[i]);
      expect(Math.abs(turn - Math.PI / 2)).toBeLessThanOrEqual(OPEN / 2 + 1e-6);
    }
  });

  it('goes out by its root, and is gone 300 ms after the blow', () => {
    // spec 07-31: every shard erased 150 ms after it goes down, so the whole of
    // it is gone 300 ms after the blow — a hundred short of the next one.
    const effects = buildEffects(POOL, COINS);
    sweepArc(effects, 0, 0, 0, 0, OPEN, REACH, 0);
    writeArc(effects, 0, FRAME);
    // The root is erased while the head is still white: the stroke slides on.
    placeShards(effects, 160);
    expect(effects.count).toBeGreaterThan(0);
    expect(effects.count).toBeLessThan(ARC);
    placeShards(effects, ARC_SPAN * 2 + 1);
    expect(effects.count).toBe(0);
    expect(ARC_SPAN * 2).toBeLessThan(CADENCE);
  });

  it('leaves at every blow of a series held down', () => {
    // spec 04-24: the button held strikes in a loop, one blow every 0,4 second,
    // and every blow draws its arc whether it touched anything or not
    // (spec 04 "Ce qu'on voit"). Ten seconds of it: twenty-five blows,
    // twenty-five whole arcs.
    const effects = buildEffects(POOL, COINS);
    const written: number[] = [];
    let blows = 0;
    let nextBlow = 0;
    for (let f = 0; f < 600; f += 1) {
      const now = f * FRAME;
      if (now >= nextBlow) {
        if (blows > 0) written.push(effects.sweepLaid);
        sweepArc(effects, 0, 0, 0, 0, OPEN, REACH, now);
        blows += 1;
        nextBlow += CADENCE;
      } else layArc(effects, now);
      placeShards(effects, now);
    }
    written.push(effects.sweepLaid);
    expect(blows).toBe(25);
    expect(written).toHaveLength(25);
    expect(written.every((laid) => laid === ARC)).toBe(true);
  });

  it('gives way before a fatal blow when the pool is full', () => {
    // spec 07-29: the arc is the last served of the four ranks, so twenty-five
    // shards a blow can never starve what a body felled throws.
    const effects = buildEffects(POOL, COINS);
    sweepArc(effects, 0, 0, 0, 0, OPEN, REACH, 0);
    writeArc(effects, 0, FRAME);
    holdShards(effects, ARC);
    scatter(effects, PRIORITY.FATAL, 10, 9, 1, 9, WHITE, 3, 600, 10);
    let fatal = 0;
    for (let i = 0; i < effects.count; i += 1) {
      if (effects.priority[i] === PRIORITY.FATAL) fatal += 1;
    }
    expect(fatal).toBe(10);
  });
});

describe('the blink of the one body the child drives', () => {
  /** How many times it goes on and off over a span, sampled a step at a time. */
  function blinksOver(effects: Effects, from: number, to: number): number {
    let turns = 0;
    let was = false;
    for (let now = from; now < to; now += 1000 / 60) {
      const on = isBlinking(effects, now);
      if (on && !was) turns += 1;
      was = on;
    }
    return turns;
  }

  it('goes white at two a second while he is staggered', () => {
    // spec 07-41: a white blink at 2 Hz for a second — the second being chapter
    // 4's stagger, which arrives with the fact rather than being written here.
    expect(BLINK_SLOW).toBe(2);
    const effects = buildEffects(POOL, COINS);
    blink(effects, 1000, 0, 0);
    expect(blinksOver(effects, 0, 1000)).toBe(BLINK_SLOW);
    expect(isBlinking(effects, 0)).toBe(true); // it starts on, so it is seen at once
    expect(isBlinking(effects, 1001)).toBe(false);
  });

  it('is the same signal sped up to six a second while he is untouchable', () => {
    // spec 07-41: two states, one signal — the fast one is the slow one
    // accelerated, and never a second colour. Nothing red is drawn anywhere.
    expect(BLINK_FAST).toBe(6);
    const effects = buildEffects(POOL, COINS);
    blink(effects, 1000, 1000, 0);
    expect(blinksOver(effects, 0, 1000)).toBe(BLINK_SLOW);
    expect(blinksOver(effects, 1000, 2000)).toBe(BLINK_FAST);
    expect(isBlinking(effects, 2001)).toBe(false);
  });

  it('takes the fast one alone, for as long as it is given', () => {
    // spec 04-42: three seconds of being untouchable when he gets up, and no
    // stagger with them — he is not staggered by getting up.
    const effects = buildEffects(POOL, COINS);
    blink(effects, 0, 3000, 0);
    expect(isBlinking(effects, 0)).toBe(true);
    expect(blinksOver(effects, 0, 3000)).toBe(BLINK_FAST * 3);
    expect(isBlinking(effects, 3001)).toBe(false);
  });

  it('is replaced outright by the next fact, and two zeros put it out', () => {
    // What has just happened to him is what is shown: a blink never queues
    // behind the one before it.
    const effects = buildEffects(POOL, COINS);
    blink(effects, 1000, 1000, 0);
    blink(effects, 0, 0, 500);
    expect(isBlinking(effects, 500)).toBe(false);
    expect(isBlinking(effects, 1200)).toBe(false);
  });

  it('throws no shard, because a rhythm is not a puff', () => {
    // spec 07-36, 07-41: what takes a blow in the world puffs and lights white
    // for 80 ms; he answers with a rhythm instead.
    const effects = buildEffects(POOL, COINS);
    blink(effects, 1000, 1000, 0);
    expect(effects.count).toBe(0);
    expect(isLit(effects, STRUCK.ZOMBIE, 0, 0)).toBe(false);
  });
});

// ------------------------------------------------------------------- the coins

/** A pool of coins lying where a test puts them, in the shape the rules hold. */
function lying(spots: readonly (readonly [number, number, number, number])[]): CoinPool {
  const pool: CoinPool = {
    count: spots.length,
    x: new Float32Array(COINS),
    y: new Float32Array(COINS),
    z: new Float32Array(COINS),
    value: new Float32Array(COINS),
  };
  spots.forEach(([x, y, z, worth], at) => {
    pool.x[at] = x;
    pool.y[at] = y;
    pool.z[at] = z;
    pool.value[at] = worth;
  });
  return pool;
}

/** Him, standing still, which is all the flight of a coin ever asks of him. */
function standing(x: number, y: number, z: number): Player {
  return {
    x,
    y,
    z,
    ang: 0,
    xPrev: x,
    yPrev: y,
    zPrev: z,
    angPrev: 0,
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

/** How large the coin in one slot is drawn, on a side. */
function sideOf(mesh: THREE.InstancedMesh, at: number): number {
  mesh.getMatrixAt(at, SEAT);
  SEAT.decompose(SPOT, TURN, SIZE);
  return SIZE.x;
}

describe('a coin', () => {
  it('is a shard when it is worth one, and grows with what it is worth', () => {
    // spec 06-9: the size says the value, and it is the only thing that says it.
    // spec 07-25: a shard is a quarter of a block.
    expect(coinSide(1)).toBeCloseTo(SHARD_SIDE, 6);
    const worths = [1, 2, 4, 5, 10, 50, 100];
    for (let i = 1; i < worths.length; i += 1) {
      expect(coinSide(worths[i])).toBeGreaterThan(coinSide(worths[i - 1]));
    }
    // A bruiser's coin is larger than a shambler's, and one the sword earned
    // larger still. (spec 06-9)
    expect(coinSide(5)).toBeGreaterThan(coinSide(1));
    expect(coinSide(10)).toBeGreaterThan(coinSide(5));
    // The largest coin of the game still lies under one block. (spec 06-3)
    expect(coinSide(100)).toBeLessThan(1);
  });

  it('wears the gold of the palette and a rim of matte black', () => {
    // spec 07-12, 07-13, 07-16, 07-35: a yellow shard ringed in black, and the
    // rim is the far faces of a larger cube so it never hides what it rings.
    const effects = buildEffects(POOL, COINS);
    const coins = effects.coins.material as THREE.MeshBasicMaterial;
    const rims = effects.rims.material as THREE.MeshBasicMaterial;
    expect(`#${coins.color.getHexString()}`).toBe(COIN);
    expect(`#${rims.color.getHexString()}`).toBe(BLACK);
    expect(rims.side).toBe(THREE.BackSide);
    // Neither takes the haze: a coin at the far end of a street is still there.
    // (spec 07-8)
    expect(coins.fog).toBe(false);
    expect(rims.fog).toBe(false);
  });

  it('rings every coin, and by the same thickness whatever it is worth', () => {
    // spec 07-16: the rim is what says "take me", and it says nothing else.
    const effects = buildEffects(POOL, COINS);
    placeCoins(effects, lying([[3, 0, 0, 1], [-3, 0, 0, 100]]), standing(40, 0, 40), 1, 0);
    expect(effects.coins.count).toBe(2);
    expect(effects.rims.count).toBe(2);
    for (let at = 0; at < 2; at += 1) {
      expect(sideOf(effects.rims, at) - sideOf(effects.coins, at)).toBeCloseTo(RIM * 2, 6);
    }
    expect(sideOf(effects.coins, 0)).toBeCloseTo(coinSide(1), 6);
    expect(sideOf(effects.coins, 1)).toBeCloseTo(coinSide(100), 6);
  });

  it('lies where the rules say it lies, and sits on the floor', () => {
    // spec 06-8: it lies where it fell. It is lifted by half its own side so it
    // sits on the floor instead of sinking into it.
    const effects = buildEffects(POOL, COINS);
    placeCoins(effects, lying([[7, 0, -4, 5]]), standing(40, 0, 40), 1, 0);
    effects.coins.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(7, 6);
    expect(SPOT.z).toBeCloseTo(-4, 6);
    expect(SPOT.y).toBeGreaterThan(0);
    expect(SPOT.y).toBeLessThan(coinSide(5));
  });

  it('turns, and it never stands still', () => {
    // spec 07-35: it turns before it is drawn in.
    const effects = buildEffects(POOL, COINS);
    const pool = lying([[0, 0, 0, 1]]);
    placeCoins(effects, pool, standing(40, 0, 40), 1, 0);
    effects.coins.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    const first = TURN.clone();
    placeCoins(effects, pool, standing(40, 0, 40), 1, 300);
    effects.coins.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    expect(TURN.angleTo(first)).toBeGreaterThan(0.1);
  });

  it('costs two calls, however many lie about', () => {
    // spec 10 "Le budget de rendu": one mesh of coins and one of rims, whatever
    // an assault leaves on the floor.
    const effects = buildEffects(POOL, COINS);
    const many: [number, number, number, number][] = [];
    for (let i = 0; i < COINS; i += 1) many.push([i, 0, 0, 1]);
    placeCoins(effects, lying(many), standing(400, 0, 400), 1, 0);
    expect(effects.draws.length).toBe(3);
    expect(effects.coins.count).toBe(COINS);
    expect(effects.rims.count).toBe(COINS);
  });
});

describe('a coin on its way to him', () => {
  it('leaves where it lay and is gone when its span runs out', () => {
    // spec 06-12, 07-35: in the rules it is his the instant he passes; this is
    // what the eye is shown of it, and it lands nowhere.
    const effects = buildEffects(POOL, COINS);
    const none = lying([]);
    const him = standing(0, 0, 0);
    flyCoin(effects, 10, 0, 0, 2, COIN_FLIGHT, 0);
    expect(effects.takenCount).toBe(1);

    placeCoins(effects, none, him, 1, 0);
    effects.coins.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(10, 6);

    placeCoins(effects, none, him, 1, COIN_FLIGHT / 2);
    effects.coins.getMatrixAt(0, SEAT);
    SEAT.decompose(SPOT, TURN, SIZE);
    expect(SPOT.x).toBeCloseTo(5, 6);

    placeCoins(effects, none, him, 1, COIN_FLIGHT);
    expect(effects.takenCount).toBe(0);
    expect(effects.coins.count).toBe(0);
    expect(effects.rims.count).toBe(0);
  });

  it('flies at the size of what it was worth', () => {
    // spec 06-9, 06-10: the size is the whole of what a coin ever says, in the
    // air as on the floor — there is no figure over it anywhere.
    const effects = buildEffects(POOL, COINS);
    flyCoin(effects, 4, 0, 0, 100, COIN_FLIGHT, 0);
    placeCoins(effects, lying([]), standing(0, 0, 0), 1, 0);
    expect(sideOf(effects.coins, 0)).toBeCloseTo(coinSide(100), 6);
  });

  it('never grows its pool, whatever is asked of it', () => {
    // spec 10-14: nothing in a frame allocates, and nothing grows.
    const effects = buildEffects(POOL, COINS);
    for (let i = 0; i < COINS * 3; i += 1) flyCoin(effects, i, 0, 0, 1, COIN_FLIGHT, 0);
    expect(effects.takenCount).toBe(COINS);
    expect(effects.takenX.length).toBe(COINS);
  });
});

// ------------------------------------------------------------------- the balls

/** The pool of chapter 10, allocated at load. (spec 10 "Les pools") */
const BALLS = 96;

/** The flight of a ball, in seconds. (spec 05-25) */
const FLIGHT = 0.6;

/**
 * One ball in the air at a fraction of its flight, in a pool of one. The rules
 * write a straight interpolation between the two spots, so that is what this
 * writes, and the bell is what the drawing adds to it. (spec 05-26)
 */
function oneBall(
  from: readonly number[],
  to: readonly number[],
  flown: number,
): ProjectilePool {
  const at = (k: number): number => from[k] + (to[k] - from[k]) * flown;
  const one = (value: number): Float32Array => Float32Array.from([value]);
  return {
    count: 1,
    x: one(at(0)),
    y: one(at(1)),
    z: one(at(2)),
    xPrev: one(at(0)),
    yPrev: one(at(1)),
    zPrev: one(at(2)),
    fromX: one(from[0]),
    fromY: one(from[1]),
    fromZ: one(from[2]),
    toX: one(to[0]),
    toY: one(to[1]),
    toZ: one(to[2]),
    left: one(FLIGHT * (1 - flown)),
    target: Uint16Array.from([0]),
  };
}

/** Where one instance of the mesh sits. */
function seatedAt(effects: Effects, at: number): THREE.Vector3 {
  effects.shards.getMatrixAt(at, SEAT);
  return SPOT.setFromMatrixPosition(SEAT).clone();
}

describe('the ball, its trail and its mark', () => {
  it('seats nine shards a ball, past the six hundred and in the same one call', () => {
    // spec 07-32, 07-33, 07-34: the ball is a black shard with no call of its
    // own, its trail is four and its mark is four.
    expect(PER_BALL).toBe(9);
    const effects = buildEffects(POOL, COINS, BALLS);
    expect(effects.shards.instanceMatrix.count).toBe(POOL + BALLS * PER_BALL);
    expect(effects.draws.length).toBe(3);

    placeBalls(effects, oneBall([0, 1, 0], [12, 0, 0], 0.5), FLIGHT, 1);
    expect(effects.shards.count).toBe(PER_BALL);
    expect(effects.count).toBe(0); // not one slot of the pool was taken
  });

  it('paints all nine black, which is the one colour in flight', () => {
    // spec 07-13, 07-32: black says "this is going to fall here", and a ball is
    // the only black thing in flight in the whole game.
    const effects = buildEffects(POOL, COINS, BALLS);
    placeBalls(effects, oneBall([0, 1, 0], [12, 0, 0], 0.5), FLIGHT, 1);
    const black = new THREE.Color(BLACK);
    for (let i = 0; i < PER_BALL; i += 1) {
      effects.shards.getColorAt(i, PAINT);
      expect(PAINT.getHex()).toBe(black.getHex());
    }
  });

  it('rides over the straight line and comes back down onto its spot', () => {
    // spec 05-25: the shot is a bell, and where it lands is where it was due.
    const effects = buildEffects(POOL, COINS, BALLS);
    placeBalls(effects, oneBall([0, 0, 0], [12, 0, 0], 0.5), FLIGHT, 1);
    const top = seatedAt(effects, 0);
    expect(top.x).toBeCloseTo(6, 6);
    expect(top.y).toBeGreaterThan(1);

    placeBalls(effects, oneBall([0, 0, 0], [12, 0, 0], 1), FLIGHT, 1);
    const down = seatedAt(effects, 0);
    expect(down.x).toBeCloseTo(12, 6);
    expect(down.y).toBeCloseTo(0, 6);
  });

  it('trails four behind it, never in front of it', () => {
    // spec 07-33: four black shards that space out behind it.
    const effects = buildEffects(POOL, COINS, BALLS);
    placeBalls(effects, oneBall([0, 0, 0], [12, 0, 0], 0.8), FLIGHT, 1);
    const ball = seatedAt(effects, 0);
    let last = ball.x;
    for (let k = 1; k <= 4; k += 1) {
      const behind = seatedAt(effects, k);
      expect(behind.x).toBeLessThan(last);
      last = behind.x;
    }
  });

  it('closes its mark on the spot as the ball comes down', () => {
    // spec 07-34: four black shards laid flat at the four corners of where it
    // falls, which tighten during the descent.
    const effects = buildEffects(POOL, COINS, BALLS);
    const at = 1 + 4; // the ball, then its four trailing shards

    placeBalls(effects, oneBall([0, 0, 0], [12, 0, 0], 0), FLIGHT, 1);
    const open = seatedAt(effects, at);
    expect(Math.abs(open.x - 12)).toBeCloseTo(0.5, 6);
    expect(Math.abs(open.z)).toBeCloseTo(0.5, 6);

    placeBalls(effects, oneBall([0, 0, 0], [12, 0, 0], 1), FLIGHT, 1);
    const shut = seatedAt(effects, at);
    expect(shut.x).toBeCloseTo(12, 6);
    expect(shut.z).toBeCloseTo(0, 6);
  });

  it('never takes a slot the pool of shards was going to use', () => {
    // spec 07-27, 07-29: the six hundred are the pool's, and a ball is a datum
    // of the game read off the rules — it can never be given up when the pool
    // fills, and it never crowds a fatal blow out of it.
    const effects = buildEffects(POOL, COINS, BALLS);
    scatter(effects, PRIORITY.FATAL, 10, 0, 1, 0, WHITE, 3, 600, 0);
    placeShards(effects, 0);
    expect(effects.count).toBe(10);

    placeBalls(effects, oneBall([0, 1, 0], [12, 0, 0], 0.5), FLIGHT, 1);
    expect(effects.count).toBe(10);
    expect(effects.shards.count).toBe(10 + PER_BALL);
    effects.shards.getColorAt(0, PAINT);
    expect(PAINT.getHex()).toBe(new THREE.Color(WHITE).getHex());
  });
});
