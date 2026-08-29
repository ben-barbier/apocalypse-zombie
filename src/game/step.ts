/**
 * The order of a step, written out in full and in one place. It is fixed:
 * entries, player, sword, zombies, cannons, projectiles, economy, waves, town
 * hall. Reading this file is how one learns what happens before what.
 * (spec 10-25)
 *
 * A step is 16,666 ms — 60 Hz — and it is fixed: a slow frame does not stretch
 * it, it makes the loop catch several up, six at most. (spec 10-21, 10-23)
 *
 * A step allocates nothing: no object, no array, no closure, no string. The nine
 * parts below are empty for now, and each one moves into its own module as its
 * chapter lands. (spec 10-14)
 */
import type { Game, InputState } from './state';

/** The one step, in the one order. (spec 10-25) */
export function step(game: Game, input: Readonly<InputState>): void {
  stepInput(game, input);
  stepPlayer(game);
  stepSword(game);
  stepZombies(game);
  stepCannons(game);
  stepProjectiles(game);
  stepEconomy(game);
  stepWaves(game);
  stepTownHall(game);
}

/** Reads the entries of this step — sampled at the step, never on an event. (spec 10-31) */
function stepInput(_game: Game, _input: Readonly<InputState>): void {}

/** Runs, jumps and climbs against the height grid, the one collision of the game. (spec 04-8) */
function stepPlayer(_game: Game): void {}

/** Sweeps the sector in front of him, and knocks what it touches sideways. (spec 04-22) */
function stepSword(_game: Game): void {}

/** Walks them along their rails, where progress never decreases. (spec 03-8) */
function stepZombies(_game: Game): void {}

/** Aims the ball and the flame, each on its own. (spec 05-40) */
function stepCannons(_game: Game): void {}

/** Flies the balls and lands the blows they booked. (spec 05-25) */
function stepProjectiles(_game: Game): void {}

/** Draws the coins to the player and pays what he buys. (spec 06-7) */
function stepEconomy(_game: Game): void {}

/** Walks the packs in, six seconds apart, and closes the assault. (spec 03-22) */
function stepWaves(_game: Game): void {}

/** Takes the blows of the breaches, and ends the game when it falls. (spec 01-28) */
function stepTownHall(_game: Game): void {}
