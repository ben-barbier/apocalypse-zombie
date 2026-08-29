/**
 * The step read back against the spec: it allocates nothing, it replaces
 * nothing, and it copies nothing. What a pure test can watch is identity — the
 * one object, its three branches and every column of every pool are the same
 * things ten thousand steps later, and none of them has grown a field.
 * (spec 10-10, 10-14, 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { createGame, createInput, type Game } from './state';
import { step } from './step';

/** Everything the step could replace, gathered by walking the one object. */
function partsOf(game: Game): unknown[] {
  const parts: unknown[] = [];
  const walk = (value: unknown): void => {
    if (typeof value !== 'object' || value === null) return;
    parts.push(value);
    if (ArrayBuffer.isView(value)) return;
    for (const child of Object.values(value)) walk(child);
  };
  walk(game);
  return parts;
}

/** The shape of the one object, so a field that appears is a red error. */
function shapeOf(game: Game): string {
  const shape = (value: unknown): unknown => {
    if (ArrayBuffer.isView(value)) return `view:${(value as Uint8Array).length}`;
    if (typeof value !== 'object' || value === null) return typeof value;
    const out: [string, unknown][] = [];
    for (const [name, child] of Object.entries(value)) out.push([name, shape(child)]);
    return out;
  };
  return JSON.stringify(shape(game));
}

describe('the step', () => {
  it('replaces nothing and copies nothing, ten thousand steps in', () => {
    // spec 10-10: one object, allocated at load, never replaced, never copied.
    // spec 10-14: the loop allocates nothing — no object, no array, no closure.
    const game = createGame(BALANCE, 20260829);
    const input = createInput();
    const before = partsOf(game);
    const shape = shapeOf(game);

    for (let i = 0; i < 10_000; i += 1) step(game, input);

    const after = partsOf(game);
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i += 1) expect(after[i]).toBe(before[i]);
    expect(shapeOf(game)).toBe(shape);
  });

  it('leaves the balance frozen and untouched', () => {
    // spec 10-12: the constants are frozen, and nothing edits one while a game runs.
    const game = createGame(BALANCE);
    const input = createInput();
    for (let i = 0; i < 100; i += 1) step(game, input);
    expect(game.balance).toBe(BALANCE);
    expect(Object.isFrozen(BALANCE)).toBe(true);
  });

  it('reads the entries it is handed, and never an object of its own', () => {
    // spec 10-30, 10-31: one InputState, sampled at the step, handed in by the
    // gamepad, the touch screen, the keyboard or the pilot of the bench.
    const game = createGame(BALANCE);
    const input = createInput();
    input.dx = 1;
    input.strike = true;
    step(game, input);
    expect(input.dx).toBe(1);
    expect(input.strike).toBe(true);
  });
});
