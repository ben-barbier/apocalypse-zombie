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
import { stepCannons } from './cannons';
import { stepEconomy } from './economy';
import { stepPlayer } from './player';
import { stepProjectiles } from './projectiles';
import type { Game, InputState } from './state';
import { stepSword } from './sword';
import { stepTownHall } from './townhall';
import { stepWaves } from './waves';
import { stepZombies } from './zombies';

/** The one step, in the one order. (spec 10-25) */
export function step(game: Game, input: Readonly<InputState>): void {
  const seconds = 1 / game.balance.loop.hz; // spec 10-16, 10-21
  stepInput(game, input);
  stepPlayer(game, input, seconds);
  stepSword(game, input, seconds);
  stepZombies(game, seconds);
  stepCannons(game, input, seconds);
  stepProjectiles(game, seconds);
  stepEconomy(game);
  stepWaves(game, seconds);
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
