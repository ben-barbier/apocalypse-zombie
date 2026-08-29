/**
 * The keyboard read back against what it is for: a shortcut for testing, writing
 * the very same `InputState` as the pad, with the same rising edges held by the
 * same flag. Nothing here hangs a listener: `pressKey` and `releaseKey` are what
 * the two listeners call, so the whole of it is driven from a test under node.
 * (spec 04-56, 10-30, 10-31)
 */
import { describe, expect, it } from 'vitest';
import { createInput } from '../game/state';
import { createKeys, pressKey, readKeys, releaseKey, releaseKeys } from './keyboard';

describe('the keyboard', () => {
  it('writes the very same entries as the pad', () => {
    // spec 10-30: one InputState, written indifferently by either.
    const keys = createKeys();
    pressKey(keys, 'Space');
    pressKey(keys, 'KeyE');
    pressKey(keys, 'KeyJ');
    pressKey(keys, 'Escape');
    pressKey(keys, 'ArrowRight');
    const input = createInput();
    readKeys(keys, input);
    expect(input.strike).toBe(true);
    expect(input.action).toBe(true);
    expect(input.jump).toBe(true);
    expect(input.airlock).toBe(true);
    expect(input.dx).toBe(1);
  });

  it('walks on the arrows and on both letter rows', () => {
    for (const [code, dx, dz] of [
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
    ] as const) {
      const keys = createKeys();
      pressKey(keys, code);
      const input = createInput();
      readKeys(keys, input);
      expect([input.dx, input.dz]).toEqual([dx, dz]);
    }
  });

  it('cancels two opposite keys held together', () => {
    const keys = createKeys();
    pressKey(keys, 'ArrowLeft');
    pressKey(keys, 'ArrowRight');
    const input = createInput();
    readKeys(keys, input);
    expect(input.dx).toBe(0);
  });

  it('loops the blows while the space bar is held', () => {
    // spec 04-24: the button held strikes over and over.
    const keys = createKeys();
    pressKey(keys, 'Space');
    for (let i = 0; i < 5; i += 1) {
      const input = createInput();
      readKeys(keys, input);
      expect(input.strike).toBe(true);
    }
  });

  it('hands a rising edge to one reading, whatever the key repeat does', () => {
    // spec 10-31: pressed since the last reading, cleared by that reading.
    const keys = createKeys();
    pressKey(keys, 'KeyJ');
    pressKey(keys, 'KeyJ'); // the browser repeating a held key
    const first = createInput();
    readKeys(keys, first);
    expect(first.jump).toBe(true);

    pressKey(keys, 'KeyJ'); // still repeating
    const second = createInput();
    readKeys(keys, second);
    expect(second.jump).toBe(false);

    releaseKey(keys, 'KeyJ');
    pressKey(keys, 'KeyJ');
    const third = createInput();
    readKeys(keys, third);
    expect(third.jump).toBe(true);
  });

  it('lets go of every key at once, which is what losing the keyboard means', () => {
    const keys = createKeys();
    pressKey(keys, 'ArrowRight');
    pressKey(keys, 'Space');
    releaseKeys(keys);
    const input = createInput();
    readKeys(keys, input);
    expect(input).toEqual(createInput());
  });
});
