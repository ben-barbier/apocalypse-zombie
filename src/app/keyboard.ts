/**
 * The keyboard, which is a shortcut for testing and nothing more. The two
 * entries the game is designed for are the gamepad and the touch screen, and a
 * balanced keyboard is one of the things chapter 1 refuses outright: what is
 * here exists so a run can be driven on a development machine with no pad
 * plugged in. (spec 04-56, 01)
 *
 * It writes the very same `InputState` as the pad, which is why nothing below
 * the app can tell them apart, and it holds its rising edges the same way: a key
 * that goes down raises a flag, and the reading of a step clears it. A key held
 * down repeats in every browser, and the flag is deaf to the repeats.
 * (spec 10-30, 10-31)
 *
 * The keys are chosen here and nowhere else, because no chapter decides them.
 * The arrows and the two letter rows walk — the letters twice over, so a French
 * and an English layout both come out under the same fingers — the space bar
 * strikes, `E` acts, `J` jumps and the escape key opens the airlock.
 */
import type { InputState } from '../game/state';
import { type Edge, createEdge, setEdge, takeEdge } from './input';

/** Which way each walking key pushes, in the frame of the world. */
const WALK: readonly (readonly [string, number, number])[] = [
  ['ArrowUp', 0, -1],
  ['ArrowDown', 0, 1],
  ['ArrowLeft', -1, 0],
  ['ArrowRight', 1, 0],
  ['KeyW', 0, -1],
  ['KeyZ', 0, -1],
  ['KeyS', 0, 1],
  ['KeyA', -1, 0],
  ['KeyQ', -1, 0],
  ['KeyD', 1, 0],
];

const STRIKE = 'Space';
const ACTION = 'KeyE';
const JUMP = 'KeyJ';
const AIRLOCK = 'Escape';

/** What is kept between two readings: which keys are down, and the three edges. */
export interface Keys {
  readonly down: Set<string>;
  readonly action: Edge;
  readonly jump: Edge;
  readonly airlock: Edge;
}

export function createKeys(): Keys {
  return {
    down: new Set<string>(),
    action: createEdge(),
    jump: createEdge(),
    airlock: createEdge(),
  };
}

/** A key goes down. Repeats while it is held raise no second edge. (spec 10-31) */
export function pressKey(keys: Keys, code: string): void {
  keys.down.add(code);
  if (code === ACTION) setEdge(keys.action, true);
  if (code === JUMP) setEdge(keys.jump, true);
  if (code === AIRLOCK) setEdge(keys.airlock, true);
}

export function releaseKey(keys: Keys, code: string): void {
  keys.down.delete(code);
  if (code === ACTION) setEdge(keys.action, false);
  if (code === JUMP) setEdge(keys.jump, false);
  if (code === AIRLOCK) setEdge(keys.airlock, false);
}

/** Everything comes up, which is what a page losing the keyboard has to mean. */
export function releaseKeys(keys: Keys): void {
  keys.down.clear();
  setEdge(keys.action, false);
  setEdge(keys.jump, false);
  setEdge(keys.airlock, false);
}

/**
 * Adds what the keys say to the entries of this step, alongside whatever the pad
 * put there. Two opposite keys held together cancel out, which is what a stick
 * pushed nowhere does too.
 */
export function readKeys(keys: Keys, input: InputState): void {
  if (keys.down.has(STRIKE)) input.strike = true; // held, never an edge (spec 04-24)
  if (takeEdge(keys.action)) input.action = true;
  if (takeEdge(keys.jump)) input.jump = true;
  if (takeEdge(keys.airlock)) input.airlock = true;

  for (let i = 0; i < WALK.length; i += 1) {
    const key = WALK[i];
    if (!keys.down.has(key[0])) continue;
    input.dx += key[1];
    input.dz += key[2];
  }
}

/**
 * Hangs the two listeners of the page. They do one thing each — raise a flag —
 * because an entry is sampled at the step and never on an event, and a page that
 * loses the keyboard lets go of every key rather than leaving one leaning.
 * (spec 10-31)
 */
export function listenKeys(keys: Keys): void {
  window.addEventListener('keydown', (fired) => {
    pressKey(keys, fired.code);
  });
  window.addEventListener('keyup', (fired) => {
    releaseKey(keys, fired.code);
  });
  window.addEventListener('blur', () => {
    releaseKeys(keys);
  });
}
