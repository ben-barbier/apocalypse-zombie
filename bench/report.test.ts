/**
 * What the bench prints: the table, then the one line that pronounces, then
 * nothing. (spec 11-38, 11-39, 11-40)
 */
import { describe, expect, it } from 'vitest';
import type { Run } from './run';
import type { Crossed } from './thresholds';
import { crossedIn, linesOf, pronounce, said, tableOf } from './report';

function forged(profile: string, seed: number): Run {
  return {
    profile,
    seed,
    wave: 10,
    won: true,
    standing: true,
    steps: 54800,
    ended: true,
    indicators: {
      townHallHits: 166,
      minutes: 15.22,
      peak: 40,
      swordShare: 42.5,
      coins: 823,
      cannons: [6, 1, 0],
      collapses: 0,
      breaches: { count: 26, meanFor: 7.1, longestFor: 20.9 },
    },
    voided: false,
    reinforcements: 1,
    colossusAtTownHall: false,
  };
}

describe('the table', () => {
  it('writes one line per run and eight columns', () => {
    // A first column names the line; the eight that follow are the eight
    // indicators, and the list of them is closed. (spec 11-16, 11-38)
    const written = tableOf(linesOf([forged('child', 1), forged('child', 2)]));
    const head = written[0].split(/\s{2,}/).filter((cell) => cell !== '');
    expect(head).toEqual([
      'Dégâts',
      'Durée',
      'Pic',
      'Épée',
      'Pièces',
      'Canons',
      'Écroul.',
      'Fuites',
    ]);
    expect(written.length).toBe(4); // the head, the rule, and two runs
    expect(written[2]).toContain("L'enfant, graine 1");
  });

  it('writes the breaches in three figures and the cannons by tier', () => {
    // spec 11-18, 11-19
    const written = tableOf(linesOf([forged('child', 1)]));
    expect(written[2]).toContain('6/1/0');
    expect(written[2]).toContain('26 · 7,1 s · 20,9 s');
  });

  it('says a run is void rather than dropping it', () => {
    // Void counts neither for the balance nor against it, and it is still shown.
    // (spec 11-25)
    const run = forged('child', 3);
    const written = tableOf([
      { label: "L'enfant, graine 3", run: { ...run, voided: true }, marked: '' },
    ]);
    expect(written.join('\n')).toContain('partie nulle');
  });

  it('says a run fell, and at which wave', () => {
    // A duration of eleven minutes with the town hall down means nothing at all
    // unless the table says so. (spec 11-2)
    const run = forged('racer', 2);
    const written = tableOf([
      { label: '35 pièces', run: { ...run, standing: false, wave: 8 }, marked: '' },
    ]);
    expect(written.join('\n')).toContain('la mairie tombe à la vague 8');
  });

  it('says a run never ended rather than printing a duration that means nothing', () => {
    const run = forged('child', 1);
    const written = tableOf([{ label: '×0,80', run: { ...run, ended: false }, marked: '' }]);
    expect(written.join('\n')).toContain('ne se termine pas');
  });

  it('shows a marked variant, and hides nothing', () => {
    // spec 11-36
    const written = tableOf([{ label: '×1,20', run: null, marked: 'un total monte à 72' }]);
    expect(written.join('\n')).toContain('×1,20');
    expect(written.join('\n')).toContain('un total monte à 72');
  });
});

describe('the line that pronounces', () => {
  const crossed: Crossed = {
    profile: 'child',
    cell: 'Dégâts cumulés v1-10',
    counted: 'coups de Traînard',
    worst: 283,
    limit: 166,
    atMost: true,
    seed: 4,
  };

  it('says ACCEPTÉ when no cell was crossed', () => {
    expect(pronounce([])).toEqual(['VERDICT: ACCEPTÉ']); // spec 11-38
  });

  it('says REFUSÉ and lists only the cells that were crossed', () => {
    // Never the whole grid: a refusal is a list, and a list is what is acted on.
    // (spec 11-39)
    const written = pronounce([crossed]);
    expect(written[0]).toBe('VERDICT: REFUSÉ');
    expect(written.length).toBe(2);
  });

  it('writes a crossed cell in value against threshold', () => {
    // spec 11-39
    const written = crossedIn(crossed);
    expect(written).toContain('283');
    expect(written).toContain('≤ 166');
    expect(written).toContain('coups de Traînard');
    expect(written).toContain("L'enfant");
    expect(written).toContain('graine 4');
  });

  it('writes a figure the way chapter 11 writes one', () => {
    expect(said(15.216, 2)).toBe('15,22');
    expect(said(166)).toBe('166');
  });
});
