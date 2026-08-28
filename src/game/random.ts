/**
 * The one seeded generator. Its whole state is two numbers, so it rides
 * inside `Game` and inside the snapshot: a game replays from (seed + the run of
 * inputs), which is what makes the bench possible. (spec 10-27, 10-29)
 *
 * mulberry32: 32 bits of state, one multiply-xor pass, no lookup table.
 */
export interface Random {
  /** The live state of the stream — mutated on every draw. */
  seed: number;
  /** How many draws have been taken since it was seeded. */
  draws: number;
}

export function createRandom(seed: number): Random {
  return { seed: seed | 0, draws: 0 };
}

/** The next number in [0, 1). Mutates `random` in place — no allocation. */
export function nextFloat(random: Random): number {
  random.seed = (random.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(random.seed ^ (random.seed >>> 15), 1 | random.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  random.draws += 1;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** The next whole number in [0, bound). */
export function nextInt(random: Random, bound: number): number {
  return Math.floor(nextFloat(random) * bound);
}
