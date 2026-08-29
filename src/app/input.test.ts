/**
 * The one shape of the entries, and the one way it is filled: sampled at the
 * step, never on an event, with the rising edges held by a flag that the reading
 * clears. (spec 10-30, 10-31)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../game/balance';
import { createGame, createInput } from '../game/state';
import { createPad } from './gamepad';
import { clampStick, createEdge, sampleInput, setEdge, takeEdge } from './input';
import { createKeys, pressKey } from './keyboard';
import { createLoop, frame } from './loop';

describe('a rising edge', () => {
  it('is raised by going down, and cleared by the reading and nothing else', () => {
    // spec 10-31: a flag "pressed since the last reading", cleared at the reading.
    const edge = createEdge();
    expect(takeEdge(edge)).toBe(false);
    setEdge(edge, true);
    expect(takeEdge(edge)).toBe(true);
    expect(takeEdge(edge)).toBe(false);
    setEdge(edge, true); // still held, and it is not a second edge
    expect(takeEdge(edge)).toBe(false);
    setEdge(edge, false);
    setEdge(edge, true);
    expect(takeEdge(edge)).toBe(true);
  });

  it('survives until a reading comes, however long that takes', () => {
    const edge = createEdge();
    setEdge(edge, true);
    setEdge(edge, false);
    expect(takeEdge(edge)).toBe(true);
  });
});

describe('the stick', () => {
  it('is held to a norm of one radially, so a diagonal is not faster', () => {
    // spec 10-30: dx and dz of a norm of at most one. spec 04-6: one pace.
    const input = createInput();
    input.dx = 1;
    input.dz = 1;
    clampStick(input);
    expect(Math.hypot(input.dx, input.dz)).toBeCloseTo(1, 6);
    expect(input.dx).toBeCloseTo(input.dz, 6);
  });

  it('leaves a push shorter than one alone', () => {
    const input = createInput();
    input.dx = 0.3;
    input.dz = -0.4;
    clampStick(input);
    expect(input.dx).toBe(0.3);
    expect(input.dz).toBe(-0.4);
  });
});

describe('one reading a step', () => {
  it('gathers both sources into the one object', () => {
    // spec 10-30: one InputState, written indifferently by either.
    const input = createInput();
    const pad = createPad();
    const keys = createKeys();
    pressKey(keys, 'ArrowRight');
    pressKey(keys, 'Space');
    sampleInput(input, pad, keys);
    expect(input.dx).toBe(1);
    expect(input.strike).toBe(true);
  });

  it('empties what the step before left behind', () => {
    const input = createInput();
    const pad = createPad();
    const keys = createKeys();
    input.strike = true;
    input.dx = 1;
    sampleInput(input, pad, keys);
    expect(input).toEqual(createInput());
  });

  it('hands a jump to one step of a frame, and to none of the five behind it', () => {
    // spec 10-31, 10-23: a frame owing six steps must not jump six times.
    const game = createGame(BALANCE);
    const input = createInput();
    const pad = createPad();
    const keys = createKeys();
    const jumps: boolean[] = [];
    const loop = createLoop(game, input, {
      sample: () => {
        sampleInput(input, pad, keys);
        jumps.push(input.jump);
      },
      read: () => {},
      draw: () => {},
    });

    frame(loop, 0);
    pressKey(keys, 'KeyJ');
    frame(loop, 1000); // a whole second late: six steps caught up (spec 10-23)
    expect(jumps.length).toBe(BALANCE.loop.maxCatchUp);
    expect(jumps.filter(Boolean).length).toBe(1);
    expect(jumps[0]).toBe(true);
  });
});
