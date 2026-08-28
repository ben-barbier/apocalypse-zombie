/**
 * The balance constants, in domain terms — blocks, seconds, shambler hits,
 * coins — never in per-step terms: converting belongs to the simulation.
 *
 * This object is injected, never imported by a rules module: `createGame(BALANCE)`
 * stores it in `game.balance`. That is what lets the bench replay a hundred
 * variants without touching a line of rules. (spec 10-15, 10-16)
 */
export interface Balance {
  /** How fast the player runs, in blocks per second. */
  readonly runSpeed: number;
  /** How much the town hall takes before it falls, in shambler hits. */
  readonly townHallHp: number;
  /** Seconds between two packs entering an active street. */
  readonly cadence: number;
}

export const BALANCE: Balance = Object.freeze({
  runSpeed: 6,
  townHallHp: 200,
  cadence: 6,
});
