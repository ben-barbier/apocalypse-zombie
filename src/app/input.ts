/**
 * The one shape of the entries, and the one way it is filled.
 *
 * There is a single `InputState`, and the gamepad, the touch screen, the
 * keyboard and the pilot of the bench all write the same one: nothing below the
 * app ever learns which of them is holding the stick. (spec 10-30)
 *
 * What comes out of it is a heading **of the world**, and never of the screen: a
 * pad and a keyboard push in the frame of the picture, so this file turns what
 * they push onto the heading the camera watches before a step ever sees it — see
 * `turnStick` for why that seam lies here and nowhere else. A pilot with no
 * screen at all writes the world straight in.
 *
 * It is sampled **at the step** and never on an event. A browser event is not
 * allowed to reach into a step, so what an event does is raise a flag — pressed
 * since the last reading — and the reading, one per step, hands that flag over
 * and clears it. A frame that owes six steps therefore hands one jump to the
 * first of them and none to the five that follow, which is the whole reason the
 * sampling sits here and not once a frame. (spec 10-31, 10-23)
 */
import type { InputState } from '../game/state';
import { type Pad, pollPad, readPad } from './gamepad';
import { type Keys, readKeys } from './keyboard';
import { type Thumbs, readThumbs } from './touch';

/**
 * A button whose rising edge has to survive until a step reads it. `down` is
 * what the hardware says now, `since` is the flag of 10-31 — raised when it goes
 * down, lowered by the reading and by nothing else.
 */
export interface Edge {
  down: boolean;
  since: boolean;
}

export function createEdge(): Edge {
  return { down: false, since: false };
}

/**
 * Tells a button what the hardware says. A key that repeats while held, and a
 * pad polled every step, both come through here, and neither raises a second
 * edge: only a fall to up and back down does. (spec 10-31)
 */
export function setEdge(edge: Edge, down: boolean): void {
  if (down && !edge.down) edge.since = true;
  edge.down = down;
}

/** Hands the edge over and clears it, which is what a reading is. (spec 10-31) */
export function takeEdge(edge: Edge): boolean {
  const since = edge.since;
  edge.since = false;
  return since;
}

/** Empties the one object before the sources add themselves to it. */
export function clearInput(input: InputState): void {
  input.dx = 0;
  input.dz = 0;
  input.strike = false;
  input.action = false;
  input.jump = false;
  input.airlock = false;
}

/**
 * Holds the stick to a norm of at most one, radially and never axis by axis:
 * cut each axis on its own and the diagonals come out square, so running at an
 * angle would be faster than running straight — and there is one pace.
 * (spec 10-30, 04-6)
 */
export function clampStick(input: InputState): void {
  const push = Math.hypot(input.dx, input.dz);
  if (push <= 1) return;
  input.dx /= push;
  input.dz /= push;
}

/**
 * Turns the stick out of the frame of the screen and into the frame of the
 * world, along the heading the camera watches: pushing up the screen sends him
 * away from the camera whichever way it happens to be looking, and pushing
 * sideways sends him across the picture. It is the tie chapter 4 leans on
 * without ever writing it down — *a camera on notches breaks the tie between
 * where the stick pushes and what one sees* — and it is what the child was shown
 * and kept. (spec 04-16, and chapter 4 "Pourquoi la caméra est assistée")
 *
 * **It is here and not in the rules, and that is the whole of the decision.**
 * `src/game/` imports nothing and knows of no camera, so it can never be the one
 * to turn a stick; `src/app/` holds the pad, the keys and the camera all three,
 * so it is the one floor of the house where both are in the same room. What
 * crosses the boundary is therefore already a heading **of the world**, which is
 * what `game/` has always read it as — and it is what the bench of chapter 11
 * writes straight in, with no camera anywhere and no seventh field to fill. A
 * run still replays from a seed and the entries it was handed, since the picture
 * never reaches the step. (spec 10-1, 10-29, 10-30, ADR-0001)
 *
 * The two frames meet by their vectors alone. The camera sits at
 * `(cos ang, sin ang)` behind him and watches along that, so up the screen is
 * that vector and screen right is `(-sin ang, cos ang)`; and up the screen is
 * `dz` below nought, which is what a stick pushed forward hands over and what
 * the arrow keys write.
 */
export function turnStick(input: InputState, ang: number): void {
  if (input.dx === 0 && input.dz === 0) return; // a stick at rest has no way to turn
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const ahead = -input.dz;
  const across = input.dx;
  input.dx = ahead * cos - across * sin;
  input.dz = ahead * sin + across * cos;
}

/**
 * One reading, for the step about to run. The three sources add themselves to
 * the same emptied object, so a child holding the pad while a thumb leans on the
 * floating stick gets one body and not two, and the norm is settled once at the
 * end — then the whole of it is turned onto the heading handed over, which is
 * the camera's. A turn keeps a norm, so the two orders would agree; the clamp
 * comes first because it belongs to the stick and the turn to the world.
 */
export function sampleInput(
  input: InputState,
  pad: Pad,
  thumbs: Thumbs,
  keys: Keys,
  ang: number,
): void {
  clearInput(input);
  readPad(pad, pollPad(pad), input);
  readThumbs(thumbs, input);
  readKeys(keys, input);
  clampStick(input);
  turnStick(input, ang);
}
