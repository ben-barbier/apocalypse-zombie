/**
 * The gamepad, which is one of the two entries the game is designed for — the
 * other is the touch screen, and the keyboard is only a shortcut for testing.
 * (spec 04-56)
 *
 * The table of chapter 4 is short and it is the whole of this file: the **left
 * stick** moves, **A** strikes, **X** acts, **Y** jumps, **Start** opens the
 * airlock. The **right stick does nothing**, and **B is never read** — iPadOS
 * catches it for its own navigation. Both absences are rules, not omissions, so
 * they are written out below rather than left to be noticed. (spec 04-57, 04-19)
 *
 * Everything else here is the hardware, and none of it is a decision of the
 * game: the indices are the normative standard mapping (bottom, right, left,
 * top for the right cluster, then the centre cluster at 8 and 9), a reading is a
 * still picture that has to be asked for again every step, and a stick at rest
 * drifts on both browsers with nothing native to hold it.
 * (docs/research/entrees-manette-tactile.md §1.3, §4)
 */
import type { InputState } from '../game/state';
import { type Edge, createEdge, setEdge, takeEdge } from './input';

/** A stick that is not being pushed still says something; below this it is nothing. */
const DRIFT = 0.2;

/** The right cluster, bottom then left then top: A, X, Y. (spec 04-57) */
const STRIKE = 0;
const ACTION = 2;
const JUMP = 3;
/** The right half of the centre cluster: Start. (spec 04-57) */
const AIRLOCK = 9;

/** The left stick, and it alone: 2 and 3 are the right one, which does nothing. (spec 04-19) */
const STICK_X = 0;
const STICK_Z = 1;

/** What a reading of a pad has to say. It matches what the browser hands back. */
export interface PadReading {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}

/**
 * What is kept between two readings, and it is deliberately thin: the index of
 * the pad, because the objects the browser hands back are recycled and must
 * never be held on to, and the three edges the table needs.
 * (docs/research/entrees-manette-tactile.md §4)
 */
export interface Pad {
  at: number;
  readonly action: Edge;
  readonly jump: Edge;
  readonly airlock: Edge;
}

export function createPad(): Pad {
  return { at: 0, action: createEdge(), jump: createEdge(), airlock: createEdge() };
}

/**
 * Asks the browser for a still picture of the pad. It is the one function of
 * this file that names the platform, and it hands back nothing where there is no
 * pad to read — a page with a keyboard alone, or a test under node.
 */
export function pollPad(pad: Pad): PadReading | null {
  if (typeof navigator === 'undefined') return null;
  const ask = navigator.getGamepads;
  if (typeof ask !== 'function') return null;
  const found = ask.call(navigator);
  for (let i = 0; i < found.length; i += 1) {
    const one = found[i];
    // Until a button has been pressed the list is empty by design, and an index
    // is handed back out when a pad leaves: the first live one wins, every step.
    if (one !== null && one.connected) {
      pad.at = one.index;
      return one;
    }
  }
  return null;
}

/** Whether a button of a reading is down, whatever length the array turned out to be. */
function isDown(reading: PadReading, at: number): boolean {
  return reading.buttons[at]?.pressed === true;
}

/**
 * Adds what the pad says to the entries of this step. It never writes over what
 * another source put there: the buttons gather, the stick adds, and the norm is
 * settled once by the caller.
 */
export function readPad(pad: Pad, reading: PadReading | null, input: InputState): void {
  if (reading === null) {
    setEdge(pad.action, false);
    setEdge(pad.jump, false);
    setEdge(pad.airlock, false);
    return;
  }

  setEdge(pad.action, isDown(reading, ACTION));
  setEdge(pad.jump, isDown(reading, JUMP));
  setEdge(pad.airlock, isDown(reading, AIRLOCK));

  // The strike is held and not an edge: the button loops the blows. (spec 04-24)
  if (isDown(reading, STRIKE)) input.strike = true;
  if (takeEdge(pad.action)) input.action = true;
  if (takeEdge(pad.jump)) input.jump = true;
  if (takeEdge(pad.airlock)) input.airlock = true;

  const dx = reading.axes[STICK_X] ?? 0;
  const dz = reading.axes[STICK_Z] ?? 0;
  const push = Math.hypot(dx, dz);
  if (push <= DRIFT) return;
  // What is left of the push is stretched back over the whole range, so coming
  // out of the drift is not a step and a child feels no ledge under the stick.
  const kept = Math.min(1, (push - DRIFT) / (1 - DRIFT)) / push;
  input.dx += dx * kept;
  input.dz += dz * kept;
}
