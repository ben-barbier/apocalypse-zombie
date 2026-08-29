/**
 * The gamepad read back against the table of chapter 4. Nothing here asks the
 * platform for anything: `readPad` takes the still picture it is handed, so the
 * whole table is driven from a test under node. (spec 10-45)
 *
 * The indices are the normative standard mapping — the right cluster runs
 * bottom, right, left, top, and the centre cluster sits at 8 and 9
 * (docs/research/entrees-manette-tactile.md §1.3) — and what each of them does
 * is chapter 4 and chapter 4 alone. (spec 04-57)
 */
import { describe, expect, it } from 'vitest';
import { createInput } from '../game/state';
import { type PadReading, createPad, readPad } from './gamepad';

const A = 0;
const B = 1;
const X = 2;
const Y = 3;
const START = 9;

/** A still picture of a pad, with the buttons named down and the sticks pushed. */
function reading(down: readonly number[], axes: readonly number[] = [0, 0, 0, 0]): PadReading {
  const buttons: { pressed: boolean }[] = [];
  for (let i = 0; i < 17; i += 1) buttons.push({ pressed: down.includes(i) });
  return { axes, buttons };
}

describe('the table of chapter 4', () => {
  it('strikes on A, acts on X, jumps on Y and opens the airlock on Start', () => {
    // spec 04-57: the left stick moves, A strikes, X acts, Y jumps, Start opens.
    const pad = createPad();
    const input = createInput();
    readPad(pad, reading([A, X, Y, START]), input);
    expect(input.strike).toBe(true);
    expect(input.action).toBe(true);
    expect(input.jump).toBe(true);
    expect(input.airlock).toBe(true);
  });

  it('does nothing at all on B', () => {
    // spec 04-57: B is never used — iPadOS catches it for its own navigation.
    const pad = createPad();
    const input = createInput();
    readPad(pad, reading([B]), input);
    expect(input).toEqual(createInput());
  });

  it('does nothing at all on the right stick', () => {
    // spec 04-19: there is no camera command on any platform, and nothing
    // replaces the right stick.
    const pad = createPad();
    const input = createInput();
    readPad(pad, reading([], [0, 0, 1, -1]), input);
    expect(input.dx).toBe(0);
    expect(input.dz).toBe(0);
  });

  it('walks on the left stick, and holds it to a norm of one', () => {
    // spec 10-30: dx and dz of a norm of at most one.
    const pad = createPad();
    const input = createInput();
    readPad(pad, reading([], [1, -1, 0, 0]), input);
    expect(Math.hypot(input.dx, input.dz)).toBeCloseTo(1, 6);
    expect(input.dz).toBeLessThan(0);
  });

  it('says nothing of a stick nobody is pushing', () => {
    // A stick at rest drifts on both browsers, and neither holds it.
    // (docs/research/entrees-manette-tactile.md §9)
    const pad = createPad();
    const input = createInput();
    readPad(pad, reading([], [0.08, -0.05, 0, 0]), input);
    expect(input.dx).toBe(0);
    expect(input.dz).toBe(0);
  });
});

describe('what a reading is', () => {
  it('loops the blows while A is held', () => {
    // spec 04-24: the button held strikes over and over.
    const pad = createPad();
    for (let i = 0; i < 5; i += 1) {
      const input = createInput();
      readPad(pad, reading([A]), input);
      expect(input.strike).toBe(true);
    }
  });

  it('hands a rising edge to one reading and to no other', () => {
    // spec 10-31: the edge is held by a flag, cleared by the reading.
    const pad = createPad();
    const first = createInput();
    readPad(pad, reading([Y]), first);
    expect(first.jump).toBe(true);
    const second = createInput();
    readPad(pad, reading([Y]), second); // still held down
    expect(second.jump).toBe(false);

    const third = createInput();
    readPad(pad, reading([]), third); // let go
    readPad(pad, reading([Y]), third); // and pressed again
    expect(third.jump).toBe(true);
  });

  it('lets go of everything when there is no pad to read', () => {
    const pad = createPad();
    readPad(pad, reading([Y]), createInput());
    readPad(pad, null, createInput());
    const input = createInput();
    readPad(pad, reading([Y]), input);
    expect(input.jump).toBe(true);
  });

  it('never counts on the length of the arrays it is handed', () => {
    // A pad may come back with sixteen buttons on iPadOS and eighteen on Chrome.
    // (docs/research/entrees-manette-tactile.md §1.3)
    const pad = createPad();
    const input = createInput();
    readPad(pad, { axes: [], buttons: [] }, input);
    expect(input).toEqual(createInput());
  });
});
