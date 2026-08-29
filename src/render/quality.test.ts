/**
 * The quality scale read back against chapter 10: the five tiers, the sliding
 * median that moves them, and the promise that none of it ever reaches the
 * simulation. (spec 10-39, 10-40, 10-42)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DOWN_ABOVE,
  DOWN_FOR,
  QUALITY_TIERS,
  SPAN,
  UP_BELOW,
  UP_FOR,
  createQuality,
  mayDraw,
  medianOf,
  senseQuality,
  tierOf,
  type Quality,
} from './quality';

/** Feeds the sensor frames of one length, and hands back where the clock got to. */
function feed(quality: Quality, gap: number, ms: number, from: number): number {
  let now = from;
  const until = from + ms;
  while (now < until) {
    now += gap;
    senseQuality(quality, now);
  }
  return now;
}

describe('the five tiers', () => {
  it('are the table of chapter 10, and there is no sixth', () => {
    // spec 10, "L'échelle de qualité": 0 nominal, 1 ratio 0,85, 2 shards 200,
    // 3 ratio 0,75, 4 locked at 30 frames a second.
    expect(QUALITY_TIERS.length).toBe(5);
    expect(QUALITY_TIERS.map((tier) => tier.ratio)).toEqual([1, 0.85, 0.85, 0.75, 0.75]);
    expect(QUALITY_TIERS.map((tier) => tier.shards)).toEqual([600, 600, 200, 200, 200]);
    expect(QUALITY_TIERS.map((tier) => tier.framesPerSecond)).toEqual([0, 0, 0, 0, 30]);
  });

  it('never asks for a resolution above one', () => {
    // spec 10, "Le budget de rendu": setPixelRatio is 1, and the scale only
    // ever takes it down.
    for (const tier of QUALITY_TIERS) expect(tier.ratio).toBeLessThanOrEqual(1);
    expect(QUALITY_TIERS[0].ratio).toBe(1);
    expect(QUALITY_TIERS[0].shards).toBe(600); // spec 07-27: the pool is 600
  });

  it('opens at the nominal one', () => {
    const quality = createQuality();
    expect(quality.tier).toBe(0);
    expect(tierOf(quality)).toBe(QUALITY_TIERS[0]);
  });
});

describe('the sensor', () => {
  it('measures what chapter 10 says it measures', () => {
    // spec 10-40: the sliding median over 2 s, down past 20 ms held 2 s, up
    // under 17,5 ms held 10 s.
    expect(SPAN).toBe(2000);
    expect(DOWN_ABOVE).toBe(20);
    expect(DOWN_FOR).toBe(2000);
    expect(UP_BELOW).toBe(17.5);
    expect(UP_FOR).toBe(10000);
    // spec 10-21: and it stands above the 16,666 ms of a perfect frame at
    // 60 Hz, without which the scale could only ever go down.
    expect(UP_BELOW).toBeGreaterThan(1000 / 60);
  });

  it('says nothing before the median has two seconds to slide over', () => {
    // spec 10-40: the median is over 2 s, so nothing is judged before then.
    const quality = createQuality();
    senseQuality(quality, 0);
    feed(quality, 25, 1900, 0);
    expect(quality.tier).toBe(0);
  });

  it('goes down one tier past twenty milliseconds held two seconds', () => {
    // spec 10-40.
    const quality = createQuality();
    senseQuality(quality, 0);
    const now = feed(quality, 25, SPAN + DOWN_FOR + 50, 0);
    expect(quality.tier).toBe(1);
    // And it keeps going down while it stays that slow, one tier at a time.
    feed(quality, 25, DOWN_FOR + 50, now);
    expect(quality.tier).toBe(2);
  });

  it('goes back up under seventeen and a half milliseconds held ten seconds', () => {
    // spec 10-40.
    const quality = createQuality();
    senseQuality(quality, 0);
    const now = feed(quality, 25, SPAN + DOWN_FOR + 50, 0);
    expect(quality.tier).toBe(1);
    feed(quality, 10, UP_FOR + SPAN + 200, now);
    expect(quality.tier).toBe(0);
  });

  it('climbs back on a display that is merely perfect at sixty hertz', () => {
    // spec 10-40, 10-21: a flawless frame is 16,666 ms, so it must count as
    // calm — a threshold under the step would let the scale fall and never
    // climb.
    const quality = createQuality();
    senseQuality(quality, 0);
    const now = feed(quality, 25, SPAN + DOWN_FOR + 50, 0);
    expect(quality.tier).toBe(1);
    feed(quality, 1000 / 60, UP_FOR + SPAN + 200, now);
    expect(quality.tier).toBe(0);
  });

  it('does not cost a tier for one long frame, because it takes a median', () => {
    // spec 10-40: a median and not a mean — a page coming back or a scene built
    // again is one frame, and one frame must not cost a tier.
    const quality = createQuality();
    senseQuality(quality, 0);
    let now = 0;
    for (let i = 0; i < 2000; i += 1) {
      now += i % 200 === 199 ? 400 : 10;
      senseQuality(quality, now);
    }
    expect(quality.tier).toBe(0);
  });

  it('stays inside the five, at both ends', () => {
    const low = createQuality();
    senseQuality(low, 0);
    feed(low, 60, SPAN + 10 * DOWN_FOR, 0);
    expect(low.tier).toBe(4);

    const high = createQuality();
    senseQuality(high, 0);
    feed(high, 8, SPAN + 3 * UP_FOR, 0);
    expect(high.tier).toBe(0);
  });

  it('takes the median of the gaps it holds', () => {
    const quality = createQuality();
    senseQuality(quality, 0);
    senseQuality(quality, 10);
    senseQuality(quality, 40);
    senseQuality(quality, 60);
    expect(medianOf(quality)).toBe(20); // 10, 30, 20 sorted is 10, 20, 30
  });
});

describe('the last tier', () => {
  it('draws them all, everywhere but at the last one', () => {
    const quality = createQuality();
    for (let i = 0; i < 100; i += 1) expect(mayDraw(quality, i * (1000 / 144))).toBe(true);
  });

  it('holds the drawing at thirty a second, and the simulation keeps its sixty', () => {
    // spec 10, "L'échelle de qualité": tier 4 locks at 30 frames a second.
    // spec 10-39: and it never touches the simulation.
    const quality = createQuality();
    quality.tier = 4;
    let drawn = 0;
    for (let i = 0; i < 60; i += 1) if (mayDraw(quality, i * (1000 / 60))) drawn += 1;
    expect(drawn).toBe(30);
  });
});

describe('what it never touches', () => {
  it('knows nothing of the rules of the game', () => {
    // spec 10-39: it plays on the resolution and on the pool of shards, and it
    // touches the simulation nowhere.
    const source = readFileSync(fileURLToPath(new URL('./quality.ts', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/from\s*'\.\.\/game/);
    expect(source).not.toMatch(/\bzombies\b/);
    expect(source).not.toMatch(/\bstep\(/);
  });
});
