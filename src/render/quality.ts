/**
 * The quality scale, which settles itself and never asks anyone anything.
 *
 * It plays on the resolution and on the pool of shards, and it touches the
 * simulation nowhere: a ceiling on the population is a rule of the game, a
 * resolution is a setting of the drawing, and the two never meet. Were they to
 * meet, how hard the game is would depend on the heat of the iPad, and the
 * bench would measure nothing. (spec 10-39)
 *
 * Its sensor is the sliding median of the gap between two frames over 2 s: it
 * goes down a tier past 20 ms held for 2 s, and back up under 15 ms held for
 * 10 s. A median rather than a mean, because one long frame — a page coming
 * back, a scene built again — must not cost a tier. (spec 10-40)
 *
 * The word for a step of this scale is `tier`, the same one a cannon takes
 * (ADR-0002).
 */

/** What one tier does. The five of them are the whole scale. (spec 10, "L'échelle de qualité") */
export interface QualityTier {
  /** What `setPixelRatio` is handed, and it is never above 1. (spec 10, "Le budget de rendu") */
  readonly ratio: number;
  /** How many shards the pool holds. (spec 07-27) */
  readonly shards: number;
  /** Frames a second the drawing is held to, or 0 when nothing is held back. */
  readonly framesPerSecond: number;
}

/**
 * The five tiers, each one adding its action to the one before: nominal, then
 * the resolution, then the shards, then the resolution again, then the lock at
 * 30 frames a second. (spec 10, "L'échelle de qualité")
 */
export const QUALITY_TIERS: readonly QualityTier[] = [
  { ratio: 1, shards: 600, framesPerSecond: 0 },
  { ratio: 0.85, shards: 600, framesPerSecond: 0 },
  { ratio: 0.85, shards: 200, framesPerSecond: 0 },
  { ratio: 0.75, shards: 200, framesPerSecond: 0 },
  { ratio: 0.75, shards: 200, framesPerSecond: 30 },
];

/** How long the median slides over, in ms. (spec 10-40) */
export const SPAN = 2000;
/** Past this gap, held this long, the scale goes down a tier. (spec 10-40) */
export const DOWN_ABOVE = 20;
export const DOWN_FOR = 2000;
/** Under this gap, held this long, it goes back up. (spec 10-40) */
export const UP_BELOW = 15;
export const UP_FOR = 10000;

/**
 * How many gaps the ring holds. It covers the 2 s of the median up to 256 frames
 * a second; past that the median slides over a shorter run, which changes
 * nothing to what it reads. The scratch beside it is what the median sorts, so
 * the sensor allocates nothing per frame. (spec 10-14)
 */
const SAMPLES = 512;

export interface Quality {
  /** Which of the five tiers is in force, 0 to 4. */
  tier: number;
  /** The gaps of the last 2 s, in ms, in a ring that never grows. */
  readonly gaps: Float32Array;
  /** When each of them was measured, in ms of the frame timestamp. */
  readonly at: Float64Array;
  /** Where the next gap goes, and how many are live. */
  head: number;
  held: number;
  /** Where the median sorts, allocated once. */
  readonly scratch: Float32Array;
  /** The timestamp of the frame before, or -1 before the first one. */
  last: number;
  /** How long the sensor has been fed, up to the span of the median. */
  fedFor: number;
  /** How long the median has held above 20 ms, and under 15 ms. (spec 10-40) */
  overFor: number;
  underFor: number;
  /** When the last frame was drawn, which is what the last tier holds back. */
  drawnAt: number;
}

export function createQuality(): Quality {
  return {
    tier: 0,
    gaps: new Float32Array(SAMPLES),
    at: new Float64Array(SAMPLES),
    head: 0,
    held: 0,
    scratch: new Float32Array(SAMPLES),
    last: -1,
    fedFor: 0,
    overFor: 0,
    underFor: 0,
    drawnAt: -1,
  };
}

/** What is in force. */
export function tierOf(quality: Quality): QualityTier {
  return QUALITY_TIERS[quality.tier];
}

/** The median of the gaps the ring holds, in ms. Sorts in place, allocates nothing. */
export function medianOf(quality: Quality): number {
  if (quality.held === 0) return 0;
  const scratch = quality.scratch;
  scratch.fill(Number.POSITIVE_INFINITY);
  const first = (quality.head - quality.held + SAMPLES) % SAMPLES;
  for (let i = 0; i < quality.held; i += 1) scratch[i] = quality.gaps[(first + i) % SAMPLES];
  scratch.sort();
  return scratch[quality.held >> 1];
}

/**
 * Takes one frame timestamp, and answers whether the tier has just moved. The
 * timestamp is handed in, never read: the one clock of the game is the one
 * `requestAnimationFrame` gives the loop. (spec 10-22)
 */
export function senseQuality(quality: Quality, now: number): boolean {
  if (quality.last < 0) {
    quality.last = now;
    quality.drawnAt = now;
    return false;
  }
  const gap = now - quality.last;
  quality.last = now;
  if (!(gap > 0)) return false;

  quality.gaps[quality.head] = gap;
  quality.at[quality.head] = now;
  quality.head = (quality.head + 1) % SAMPLES;
  if (quality.held < SAMPLES) quality.held += 1;

  // Everything older than the span leaves, so the median stays a sliding one.
  while (quality.held > 1) {
    const oldest = (quality.head - quality.held + SAMPLES) % SAMPLES;
    if (now - quality.at[oldest] <= SPAN) break;
    quality.held -= 1;
  }

  quality.fedFor += gap;
  if (quality.fedFor < SPAN) return false; // the median is not full yet
  quality.fedFor = SPAN;

  const middle = medianOf(quality);
  if (middle > DOWN_ABOVE) {
    quality.overFor += gap;
    quality.underFor = 0;
  } else if (middle < UP_BELOW) {
    quality.underFor += gap;
    quality.overFor = 0;
  } else {
    quality.overFor = 0;
    quality.underFor = 0;
  }

  let moved = false;
  if (quality.overFor >= DOWN_FOR) {
    if (quality.tier < QUALITY_TIERS.length - 1) {
      quality.tier += 1;
      moved = true;
    }
    quality.overFor = 0;
  } else if (quality.underFor >= UP_FOR) {
    if (quality.tier > 0) {
      quality.tier -= 1;
      moved = true;
    }
    quality.underFor = 0;
  }
  return moved;
}

/**
 * Whether this frame is drawn. Every tier but the last draws them all; the last
 * holds the drawing to 30 a second, and the simulation keeps its 60 Hz
 * underneath, untouched. (spec 10-39, 10-21)
 */
export function mayDraw(quality: Quality, now: number): boolean {
  const held = tierOf(quality).framesPerSecond;
  if (held === 0) return true;
  // A millisecond of slack, so a display that is a hair short of the gap does
  // not cost every other frame.
  if (quality.drawnAt >= 0 && now - quality.drawnAt < 1000 / held - 1) return false;
  quality.drawnAt = now;
  return true;
}
