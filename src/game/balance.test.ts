import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';

describe('the balance', () => {
  it('is frozen, so nothing edits it while a game runs', () => {
    // spec 10-12: the balance branch is frozen and never serialized.
    expect(Object.isFrozen(BALANCE)).toBe(true);
  });

  it('holds nothing but finite numbers, in domain terms', () => {
    // spec 10-16: blocks, seconds, shambler hits, coins — never per-step.
    for (const value of Object.values(BALANCE)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it('reads back the numbers the spec froze', () => {
    expect(BALANCE.runSpeed).toBe(6); // blocks per second
    expect(BALANCE.townHallHp).toBe(200); // shambler hits
    expect(BALANCE.cadence).toBe(6); // seconds between two packs
  });
});
