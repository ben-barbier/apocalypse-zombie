/**
 * The one shape of the entries, and the one way it is filled: sampled at the
 * step, never on an event, with the rising edges held by a flag that the reading
 * clears. (spec 10-30, 10-31)
 *
 * And the seam this file carries alone — a stick pushes in the frame of the
 * screen and the rules read the frame of the world, so the turn happens here,
 * where the pad, the keys and the camera are all three in reach. (spec 04-16)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../game/balance';
import { stepPlayer } from '../game/player';
import { createGame, createInput } from '../game/state';
import { createPad } from './gamepad';
import { clampStick, createEdge, sampleInput, setEdge, takeEdge, turnStick } from './input';
import { createKeys, pressKey } from './keyboard';
import { createLoop, frame } from './loop';
import { type Panel, createThumbs } from './touch';

/** A page that answers to what the thumbs write, and holds nothing of its own. */
const blank = (): Panel => ({ className: '', style: { setProperty: () => {} } });

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

/**
 * The eight headings a camera is read at: the four square ones and the four
 * slants, which is where a stick turned in the frame of the world and a stick
 * left in the frame of the picture part company the most.
 */
const HEADINGS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 2, -2, 2.4];

describe('the stick in the frame of the camera', () => {
  it('sends him to the back of the picture, whichever way the camera looks', () => {
    // spec 04-16 and chapter 4 "Pourquoi la caméra est assistée": the tie between
    // where the stick pushes and what one sees. The camera watches along
    // (cos ang, sin ang) — it seats itself that far behind him — so up the
    // screen is that very vector, whatever ang happens to be.
    for (const ang of HEADINGS) {
      const input = createInput();
      input.dz = -1; // up the screen, which is what a stick pushed forward says
      turnStick(input, ang);
      expect(input.dx).toBeCloseTo(Math.cos(ang), 12);
      expect(input.dz).toBeCloseTo(Math.sin(ang), 12);
    }
  });

  it('sends him across the picture on a push sideways, and keeps the norm', () => {
    // The right of a screen is (-sin ang, cos ang), the camera's own.
    for (const ang of HEADINGS) {
      const input = createInput();
      input.dx = 1;
      turnStick(input, ang);
      expect(input.dx).toBeCloseTo(-Math.sin(ang), 12);
      expect(input.dz).toBeCloseTo(Math.cos(ang), 12);
      expect(Math.hypot(input.dx, input.dz)).toBeCloseTo(1, 12); // spec 10-30
    }
  });

  it('leaves a stick at rest at rest', () => {
    const input = createInput();
    turnStick(input, 1.3);
    expect(input.dx).toBe(0);
    expect(input.dz).toBe(0);
  });

  it('walks him away from the camera whatever it is looking at', () => {
    // The whole of the defect, read on the body itself and not on the entries:
    // the same push, eight headings, and he covers one step of the one pace
    // straight away from the camera every time. (spec 04-6, 04-16)
    const stride = BALANCE.player.runSpeed / BALANCE.loop.hz; // spec 04-6, 10-21
    for (const ang of HEADINGS) {
      const game = createGame(BALANCE);
      const player = game.assault.player;
      // The middle of street one, well clear of both frontages and of every
      // ladder: sixteen blocks of square, then thirty of street. (spec 02-12)
      player.x = 30;
      player.z = 0;
      player.y = 0;
      player.xPrev = 30;
      player.zPrev = 0;

      const input = createInput();
      input.dz = -1;
      turnStick(input, ang);
      stepPlayer(game, input, 1 / BALANCE.loop.hz);

      const wentX = player.x - 30;
      const wentZ = player.z - 0;
      // Along the way the camera watches: the whole of the stride, and nothing
      // across it.
      expect(wentX * Math.cos(ang) + wentZ * Math.sin(ang)).toBeCloseTo(stride, 9);
      expect(-wentX * Math.sin(ang) + wentZ * Math.cos(ang)).toBeCloseTo(0, 9);
    }
  });
});

describe('one reading a step', () => {
  it('gathers every source into the one object', () => {
    // spec 10-30: one InputState, written indifferently by any of them.
    const input = createInput();
    const pad = createPad();
    const keys = createKeys();
    pressKey(keys, 'ArrowRight');
    pressKey(keys, 'Space');
    // A camera watching down the x of the world: its right is the z of it.
    sampleInput(input, pad, createThumbs(blank), keys, 0);
    expect(input.dx).toBeCloseTo(0, 12);
    expect(input.dz).toBeCloseTo(1, 12);
    expect(input.strike).toBe(true);
  });

  it('empties what the step before left behind', () => {
    const input = createInput();
    const pad = createPad();
    const keys = createKeys();
    input.strike = true;
    input.dx = 1;
    sampleInput(input, pad, createThumbs(blank), keys, 1.1);
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
        sampleInput(input, pad, createThumbs(blank), keys, 0);
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
