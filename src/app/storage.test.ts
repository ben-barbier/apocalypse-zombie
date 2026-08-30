/**
 * The three doors of the disk, read back against chapters 8 and 10.
 *
 * **This file cannot name the store of the browser, and that is deliberate**:
 * the guard of `src/architecture.test.ts` holds that name to `src/app/storage.ts`
 * alone, so a test that faked one would break the very rule it came to serve
 * (spec 10-7). What is left is the case that matters most and the one an iPad
 * really meets — a store that is not there at all, which is also what a Safari
 * set to block everything looks like from here: under node there is none, so
 * every door of this file walks the path of 10-34 and 08-81 and must come back
 * without a word.
 */
import { describe, expect, it } from 'vitest';
import { clearSnapshot, readSnapshot, writeSnapshot } from './storage';

describe('a store that will not answer', () => {
  it('never throws, whichever door is pushed (spec 10-34, 08-81)', () => {
    expect(() => readSnapshot()).not.toThrow();
    expect(() => writeSnapshot('{"wave":7}')).not.toThrow();
    expect(() => clearSnapshot()).not.toThrow();
  });

  it('reads as nothing kept, so the game plays on without a net (spec 08-81)', () => {
    expect(readSnapshot()).toBeNull();
  });

  it('holds a run up for nothing, whatever it is handed (spec 08-81)', () => {
    // A text of any length at all, and twice over: a writing that fails does
    // nothing, and it never says so.
    expect(() => writeSnapshot('')).not.toThrow();
    expect(() => writeSnapshot('x'.repeat(4096))).not.toThrow();
    expect(() => writeSnapshot('x'.repeat(4096))).not.toThrow();
    expect(readSnapshot()).toBeNull();
  });
});
