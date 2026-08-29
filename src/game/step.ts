/**
 * The order of a step, written out in full and in one place. It is fixed:
 * entries, player, sword, zombies, cannons, projectiles, economy, waves, town
 * hall. Reading this file is how one learns what happens before what.
 * (spec 10-25)
 *
 * A step is 16,666 ms — 60 Hz — and it is fixed: a slow frame does not stretch
 * it, it makes the loop catch several up, six at most. (spec 10-21, 10-23)
 *
 * The balance is written in blocks, seconds, sword hits and coins, never in what
 * a step is worth; turning one into the other is the business of this file and
 * of what it calls, and of nothing else. (spec 10-16)
 *
 * A step allocates nothing: no object, no array, no closure, no string. The
 * parts below that are still empty move into their own modules as their chapters
 * land. (spec 10-14)
 */
import { stepPlayer } from './player';
import type { Game, InputState } from './state';
import { stepTownHall } from './townhall';
import { stepZombies } from './zombies';

/** The one step, in the one order. (spec 10-25) */
export function step(game: Game, input: Readonly<InputState>): void {
  const seconds = 1 / game.balance.loop.hz; // spec 10-16, 10-21
  stepInput(game, input);
  stepPlayer(game, input, seconds);
  stepSword(game);
  stepZombies(game, seconds);
  stepCannons(game);
  stepProjectiles(game);
  stepEconomy(game);
  stepWaves(game);
  stepTownHall(game, seconds);
}

/**
 * The entries of this step. They arrive already sampled: whoever fills the one
 * `InputState` — the gamepad, the touch screen, the keyboard or the pilot of the
 * bench — does it once per step and clears its rising edges by that very
 * reading, so the rules have nothing left to do but read what they are handed.
 * (spec 10-30, 10-31)
 */
function stepInput(_game: Game, _input: Readonly<InputState>): void {}

/** Sweeps the sector in front of him, and knocks what it touches sideways. (spec 04-22) */
function stepSword(_game: Game): void {}

/** Aims the ball and the flame, each on its own. (spec 05-40) */
function stepCannons(_game: Game): void {}

/** Flies the balls and lands the blows they booked. (spec 05-25) */
function stepProjectiles(_game: Game): void {}

/** Draws the coins to the player and pays what he buys. (spec 06-7) */
function stepEconomy(_game: Game): void {}

/** Walks the packs in, six seconds apart, and closes the assault. (spec 03-22) */
function stepWaves(_game: Game): void {}
