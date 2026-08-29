/**
 * The loop read back against the spec. Every number here is written out by hand
 * from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * Nothing here asks for a frame: `frame()` takes the timestamp it is handed, so
 * the whole loop is driven from a test under node, and the one place that reads
 * `requestAnimationFrame` is `startLoop`. (spec 10-22)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../game/balance';
import { EVENT, createGame, createInput, pushEvent } from '../game/state';
import { advance, createClock, createLoop, frame, takeFreeze } from './loop';

const LOOP = BALANCE.loop;
/** 16,666 ms — the one step. (spec 10-21) */
const STEP_MS = 1000 / 60;

describe('the clock', () => {
  it('runs one step per frame at sixty a second', () => {
    // spec 10-21: the step is fixed at 16,666 ms, 60 Hz, with an accumulator.
    const clock = createClock();
    advance(clock, 0, LOOP);
    expect(clock.steps).toBe(0); // there is no frame before the first to measure

    let steps = 0;
    for (let i = 1; i <= 600; i += 1) {
      advance(clock, i * STEP_MS, LOOP);
      // One step a frame, give or take what a sixtieth of a second cannot say
      // in binary and the accumulator carries over to the frame after.
      expect(clock.steps).toBeLessThanOrEqual(2);
      steps += clock.steps;
    }
    // Ten seconds of frames, six hundred steps: what the steps did not run is
    // still owed, and nothing of the ten seconds is lost on the way.
    expect(steps).toBeGreaterThanOrEqual(599);
    expect(steps).toBeLessThanOrEqual(600);
    expect(steps / 60 + clock.owed).toBeCloseTo(10, 6);
  });

  it('holds sixty steps a second whatever the rate of the display', () => {
    // spec 10-21: it never depends on the rate of the display.
    const fast = createClock();
    const slow = createClock();
    for (let ms = 0; ms <= 1000; ms += 1000 / 144) advance(fast, ms, LOOP);
    for (let ms = 0; ms <= 1000; ms += 1000 / 30) advance(slow, ms, LOOP);
    // Both owe the same second of simulation, to within one step.
    expect(Math.abs(fast.owed - slow.owed)).toBeLessThan(1 / 60);
  });

  it('clamps the gap at a hundred milliseconds, so six steps at most', () => {
    // spec 10-23: the gap is clamped at 100 ms, six steps caught up at most.
    expect(LOOP.frameClamp).toBe(0.1);
    expect(LOOP.maxCatchUp).toBe(6);

    const clock = createClock();
    advance(clock, 0, LOOP);
    advance(clock, 60_000, LOOP); // a minute in the background
    expect(clock.steps).toBe(6);
    expect(clock.owed).toBeLessThan(1 / 60);
  });

  it('never runs more than six steps, whatever the frames do', () => {
    // spec 10-23: six is the ceiling, and it is a ceiling on every frame.
    const clock = createClock();
    let now = 0;
    advance(clock, now, LOOP);
    for (let i = 0; i < 500; i += 1) {
      now += (i % 7) * 40; // frames of 0, 40, 80 … 240 ms, over and over
      advance(clock, now, LOOP);
      expect(clock.steps).toBeLessThanOrEqual(6);
    }
  });

  it('owes nothing for a timestamp that walks backwards', () => {
    const clock = createClock();
    advance(clock, 1000, LOOP);
    advance(clock, 900, LOOP);
    expect(clock.steps).toBe(0);
    expect(clock.owed).toBe(0);
  });

  it('says where the frame sits between the two last steps', () => {
    // spec 10-24: the drawing interpolates between the two last steps.
    const clock = createClock();
    advance(clock, 0, LOOP);
    advance(clock, STEP_MS / 2, LOOP);
    expect(clock.steps).toBe(0);
    expect(clock.alpha).toBeCloseTo(0.5, 6);

    advance(clock, STEP_MS, LOOP);
    expect(clock.steps).toBe(1);
    expect(clock.alpha).toBeCloseTo(0, 6);
    expect(clock.alpha).toBeGreaterThanOrEqual(0);
    expect(clock.alpha).toBeLessThan(1);
  });
});

describe('the freeze of a fatal blow', () => {
  it('lasts sixty milliseconds and is never caught up', () => {
    // spec 10-26: the freeze stops feeding the accumulator, and it is never
    // caught up. spec 10, "La boucle": 60 ms.
    expect(LOOP.fatalBlowFreeze).toBe(0.06);

    const plain = createClock();
    advance(plain, 0, LOOP);
    advance(plain, 100, LOOP);
    expect(plain.steps).toBe(6); // a full 100 ms frame is six steps

    const held = createClock();
    advance(held, 0, LOOP);
    held.frozen = LOOP.fatalBlowFreeze;
    advance(held, 100, LOOP);
    // 60 of the 100 ms are eaten and handed to no one: 40 ms are left, two steps.
    expect(held.steps).toBe(2);
    expect(held.frozen).toBe(0);
    expect(held.owed).toBeCloseTo(0.04 - 2 / 60, 6);
  });

  it('holds the picture where it stands while it lasts', () => {
    const clock = createClock();
    advance(clock, 0, LOOP);
    advance(clock, STEP_MS, LOOP);
    const alpha = clock.alpha;
    clock.frozen = LOOP.fatalBlowFreeze;
    advance(clock, 2 * STEP_MS, LOOP);
    expect(clock.steps).toBe(0);
    expect(clock.alpha).toBe(alpha);
  });

  it('is armed by a fatal blow, and by nothing else', () => {
    // spec 10-26, and the one type of the enumeration that concerns the loop.
    const game = createGame(BALANCE);
    const events = game.assault.events;
    const clock = createClock();

    pushEvent(events, EVENT.SWORD_HIT, 0, 0, 0, 0, 1);
    takeFreeze(clock, events, LOOP.fatalBlowFreeze);
    expect(clock.frozen).toBe(0);

    pushEvent(events, EVENT.FATAL_BLOW, 0, 0, 0, 0, 1);
    takeFreeze(clock, events, LOOP.fatalBlowFreeze);
    expect(clock.frozen).toBe(LOOP.fatalBlowFreeze);
  });
});

describe('a frame', () => {
  it('empties the buffer, fills it, reads it once, then draws', () => {
    // spec 10-18: emptied at the start of the frame, filled by the steps of that
    // frame, read once before the drawing.
    const game = createGame(BALANCE);
    const order: string[] = [];
    const loop = createLoop(game, createInput(), {
      read: (held) => {
        order.push(`read ${held.assault.events.count}`);
      },
      draw: () => {
        order.push('draw');
      },
    });

    // Whatever the frame before left behind is gone before a step runs.
    pushEvent(game.assault.events, EVENT.MOAN, 3, 0, 0, 0, 0);
    expect(game.assault.events.count).toBe(1);

    frame(loop, 0);
    expect(game.assault.events.count).toBe(0);
    expect(order).toEqual(['read 0', 'draw']);

    frame(loop, STEP_MS);
    expect(order).toEqual(['read 0', 'draw', 'read 0', 'draw']);
  });

  it('hands the drawing the timestamp and the place between the two steps', () => {
    // spec 10-22, 10-24.
    const game = createGame(BALANCE);
    const seen: number[] = [];
    const loop = createLoop(game, createInput(), {
      read: () => {},
      draw: (_game, alpha, now) => {
        seen.push(alpha, now);
      },
    });
    frame(loop, 0);
    frame(loop, STEP_MS / 4);
    expect(seen[2]).toBeCloseTo(0.25, 6);
    expect(seen[3]).toBeCloseTo(STEP_MS / 4, 6);
  });

  it('replaces nothing, a thousand frames in', () => {
    // spec 10-10, 10-14: one object, and a frame allocates nothing.
    const game = createGame(BALANCE);
    const loop = createLoop(game, createInput(), { read: () => {}, draw: () => {} });
    const clock = loop.clock;
    const events = game.assault.events;
    const onFrame = loop.onFrame;

    for (let i = 0; i < 1000; i += 1) frame(loop, i * STEP_MS);

    expect(loop.clock).toBe(clock);
    expect(loop.game).toBe(game);
    expect(game.assault.events).toBe(events);
    expect(loop.onFrame).toBe(onFrame);
  });
});

describe('the one clock', () => {
  it('is the timestamp of a frame, and nothing anywhere reads another', () => {
    // spec 10-22: the clock is the timestamp requestAnimationFrame hands over,
    // and it alone. spec 10-1: no clock at all reaches the rules.
    const src = fileURLToPath(new URL('..', import.meta.url));
    const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((name) =>
      name.endsWith('.ts'),
    );
    const broken: string[] = [];
    for (const name of files) {
      const text = readFileSync(join(src, name), 'utf8');
      if (name.endsWith('architecture.test.ts')) continue; // it quotes them to forbid them
      if (/\bDate\s*\.\s*now\b|\bperformance\s*\.\s*now\b/.test(text)) broken.push(name);
    }
    expect(broken).toEqual([]);
  });

  it('is asked for by the one call to requestAnimationFrame', () => {
    // spec 10-22, and spec 10-14: one callback, made once, so a frame allocates
    // nothing.
    const source = readFileSync(fileURLToPath(new URL('./loop.ts', import.meta.url)), 'utf8');
    const asked = source.match(/requestAnimationFrame\s*\(/g) ?? [];
    expect(asked.length).toBe(2); // the first frame, and every one after it
  });
});
