/**
 * The three profiles, held against chapter 11 figure by figure. Every number
 * below is written out by hand from the spec and quotes where it comes from:
 * the tables are the authority, this file is not. (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/game/balance';
import { BUY, CHILD, PROFILES, RACER, RESUPPLY, WATCHER } from './profiles';

describe('the three profiles', () => {
  it('are three, and there is no fourth', () => {
    expect(PROFILES.length).toBe(3); // spec 11-10, 11-15
    expect(PROFILES.map((profile) => profile.name)).toEqual(['watcher', 'child', 'racer']);
  });

  it('are five settings each, and not one more', () => {
    for (const profile of PROFILES) {
      // The name is what the tables call it, not a setting of the pilot.
      const settings = Object.keys(profile).filter((key) => key !== 'name');
      expect(settings.sort()).toEqual(['care', 'reflex', 'resupply', 'spend', 'venture']);
    }
  });

  it('carry the ventures of the table', () => {
    // spec 11, "Les cinq réglages"
    expect(WATCHER.venture).toBe(0.05);
    expect(CHILD.venture).toBe(0.35);
    expect(RACER.venture).toBe(0.95);
  });

  it('carry the resupplies of the table', () => {
    expect(WATCHER.resupply).toBe(RESUPPLY.NEVER); // spec 11-12
    expect(CHILD.resupply).toBe(RESUPPLY.HALO); // spec 11-13
    expect(RACER.resupply).toBe(RESUPPLY.ALWAYS); // spec 11-14
  });

  it('carry the pips of care of the table', () => {
    // spec 11, "Les cinq réglages"
    expect(WATCHER.care).toBe(0);
    expect(CHILD.care).toBe(2);
    expect(RACER.care).toBe(4);
  });

  it('carry the reflexes of the table, in steps of a sixtieth of a second', () => {
    // One second, half a second, nothing. (spec 11, "Les cinq réglages")
    expect(WATCHER.reflex).toBe(60);
    expect(CHILD.reflex).toBe(30);
    expect(RACER.reflex).toBe(0);
    expect(CHILD.reflex / BALANCE.loop.hz).toBe(0.5);
  });

  it('carry the orders of preference of the table', () => {
    // "un Renfort dès que la mairie passe sous la moitié ; sinon un canon"
    expect(WATCHER.spend.order).toEqual([BUY.REINFORCEMENT, BUY.CANNON]);
    // "un canon …, puis le niveau 2, puis le niveau 3, puis un Renfort sous la moitié"
    expect(CHILD.spend.order).toEqual([
      BUY.CANNON,
      BUY.TIER_TWO,
      BUY.TIER_THREE,
      BUY.REINFORCEMENT,
    ]);
    // "un canon, son niveau 2 …, le niveau 3 dans le halo, une brassée … —
    // jamais un Renfort"
    expect(RACER.spend.order).toEqual([BUY.CANNON, BUY.TIER_TWO, BUY.TIER_THREE, BUY.ARMFUL]);
    expect(RACER.spend.order).not.toContain(BUY.REINFORCEMENT);
  });

  it('keep the reserves of the table, and hold them from the wave it names', () => {
    expect(WATCHER.spend.reserve).toBe(50);
    expect(CHILD.spend.reserve).toBe(50);
    expect(RACER.spend.reserve).toBe(3);
    expect(WATCHER.spend.reserveFromWave).toBe(1);
    expect(CHILD.spend.reserveFromWave).toBe(7); // "50 à partir de la vague 7"
    expect(RACER.spend.reserveFromWave).toBe(1);
  });

  it('keep the reserve chapter 11 says they keep, read against the prices', () => {
    // "la réserve du guetteur et de l'enfant est le prix du Renfort 1, celle du
    // pressé le prix d'une brassée" (spec 11, table of `spend`, and 06-19)
    const prices = BALANCE.economy.prices;
    expect(WATCHER.spend.reserve).toBe(prices.reinforcements[0]);
    expect(CHILD.spend.reserve).toBe(prices.reinforcements[0]);
    expect(RACER.spend.reserve).toBe(prices.firebomb * BALANCE.cannon.magazine);
  });

  it('spend on the five posts of chapter 6, and there is no sixth', () => {
    expect(Object.keys(BUY).length).toBe(5); // spec 06, "Jamais un sixième poste de dépense"
  });
});
