import { describe, expect, it } from 'vitest';
import { createRandom, nextFloat, nextInt } from './random';

/** The pool bytes a replay compares, standing in for the real ones. (spec 10-29) */
function play(seed: number, draws: number): Uint8Array {
  const random = createRandom(seed);
  const pool = new Float64Array(draws);
  for (let i = 0; i < draws; i += 1) pool[i] = nextFloat(random);
  return new Uint8Array(pool.buffer);
}

describe('the seeded generator', () => {
  it('draws in [0, 1)', () => {
    const random = createRandom(1);
    for (let i = 0; i < 10_000; i += 1) {
      const drawn = nextFloat(random);
      expect(drawn).toBeGreaterThanOrEqual(0);
      expect(drawn).toBeLessThan(1);
    }
  });

  it('replays byte for byte from the same seed', () => {
    expect(play(20260828, 5_000)).toEqual(play(20260828, 5_000));
  });

  it('parts ways on a different seed', () => {
    expect(play(1, 64)).not.toEqual(play(2, 64));
  });

  it('carries its whole state in two numbers, so a snapshot restores the stream', () => {
    const first = createRandom(7);
    for (let i = 0; i < 1_234; i += 1) nextFloat(first);

    // What the snapshot writes, and what it reads back. (spec 10-27, 10-32)
    const written = JSON.parse(JSON.stringify({ seed: first.seed, draws: first.draws }));
    const restored = { seed: written.seed as number, draws: written.draws as number };

    expect(restored.draws).toBe(1_234);
    const tailOfFirst = new Float64Array(256);
    const tailOfRestored = new Float64Array(256);
    for (let i = 0; i < 256; i += 1) tailOfFirst[i] = nextFloat(first);
    for (let i = 0; i < 256; i += 1) tailOfRestored[i] = nextFloat(restored);
    expect(new Uint8Array(tailOfRestored.buffer)).toEqual(new Uint8Array(tailOfFirst.buffer));
    expect(restored.draws).toBe(first.draws);
  });

  it('spreads whole numbers over the whole range', () => {
    const random = createRandom(42);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i += 1) seen.add(nextInt(random, 4));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('never allocates while drawing', () => {
    const random = createRandom(3);
    const before = { ...random };
    nextFloat(random);
    expect(random.draws).toBe(before.draws + 1);
    expect(Object.keys(random)).toEqual(['seed', 'draws']);
  });
});
