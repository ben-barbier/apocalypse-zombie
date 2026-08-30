/**
 * The balance read back against the spec, chapter by chapter. Every number is
 * written out by hand from `docs/spec/`, with the address of the rule beside
 * it — this file is what makes a disagreement a red error. (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';

const sum = (numbers: readonly number[]): number => numbers.reduce((a, b) => a + b, 0);
const count = (numbers: readonly number[], wanted: number): number =>
  numbers.filter((n) => n === wanted).length;

describe('the balance itself', () => {
  it('is frozen all the way down, so nothing edits it while a game runs', () => {
    // spec 10-12: the balance branch is frozen and never serialized.
    expect(Object.isFrozen(BALANCE)).toBe(true);
    expect(Object.isFrozen(BALANCE.city.street)).toBe(true);
    expect(Object.isFrozen(BALANCE.waves)).toBe(true);
    expect(Object.isFrozen(BALANCE.waves[0])).toBe(true);
    expect(Object.isFrozen(BALANCE.economy.prices.reinforcements)).toBe(true);
  });

  it('holds nothing but finite numbers', () => {
    const walk = (value: unknown): void => {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      else if (typeof value === 'object' && value !== null) Object.values(value).forEach(walk);
      else expect(typeof value).toBe('number');
    };
    walk(BALANCE);
  });
});

describe('chapter 1 — the game', () => {
  it('runs ten waves, then overtime', () => {
    expect(BALANCE.pace.mainWaves).toBe(10); // spec 01-10
  });

  it('gives twenty-five seconds of prep, then thirty', () => {
    expect(BALANCE.pace.earlyPrep).toBe(25); // spec 01-15
    expect(BALANCE.pace.latePrep).toBe(30); // spec 01-15
    expect(BALANCE.pace.lastEarlyPrepWave).toBe(3); // spec 01-15
  });

  it('never lets a prep go under thirty seconds from wave four, overtime included', () => {
    // spec 01 "Les interdits": from the fourth wave a cannon is standing and the
    // prep is the resupply gradient of chapter 2 — the foot of a street at 10,9 s,
    // the middle at 19,8, the far end at 28,8. The forbidden guards that gradient,
    // and before the first cannon there is nothing to resupply.
    expect(BALANCE.pace.latePrep).toBeGreaterThanOrEqual(30);
    expect(BALANCE.pace.earlyPrep).toBeGreaterThanOrEqual(19.8);
  });

  it('fades out in under three seconds', () => {
    expect(BALANCE.pace.fadeOut).toBeLessThanOrEqual(3); // spec 01-29
  });
});

describe('chapter 2 — the city', () => {
  it('is one square of two hundred and sixteen blocks', () => {
    expect(BALANCE.city.side).toBe(216); // spec 02-1
  });

  it('opens on a hexagon of apothem sixteen', () => {
    expect(BALANCE.city.apothem).toBe(16); // spec 02-6
    expect(BALANCE.city.apothem * 2).toBe(32); // edge to edge, spec 02-6
  });

  it('puts the town hall and the base where the spec puts them', () => {
    expect(BALANCE.city.townHallSide).toBe(8); // spec 02-7
    expect(BALANCE.city.townHallHeight).toBe(7); // spec 02-7
    expect(BALANCE.city.mouthToTownHall).toBe(12); // spec 02-7
    expect(BALANCE.city.baseLength).toBe(6); // spec 02-8
    expect(BALANCE.city.baseWidth).toBe(4); // spec 02-8
    expect(BALANCE.city.baseHeight).toBe(3); // spec 02-8
  });

  it('rings the square with nine buildings, all of four blocks', () => {
    expect(BALANCE.city.perimeterCount).toBe(9); // spec 02-10
    expect(BALANCE.city.perimeterHeight).toBe(4); // spec 02-11
  });

  it('gives a street its length, its width and its rail', () => {
    expect(BALANCE.city.street.length).toBe(80); // spec 02-12
    expect(BALANCE.city.street.width).toBe(6); // spec 02-12
    expect(BALANCE.city.street.rail).toBe(92); // spec 02-13
    // The rail is the street plus the twelve blocks of the square. (spec 02-13)
    expect(BALANCE.city.street.rail).toBe(
      BALANCE.city.street.length + BALANCE.city.mouthToTownHall,
    );
  });

  it('holds the frontage, the bay and the shift', () => {
    expect(BALANCE.city.street.frontageDepth).toBe(8); // spec 02-14
    expect(BALANCE.city.street.bay).toBe(6); // spec 02-17
    expect(BALANCE.city.street.baysPerEdge).toBe(13); // spec 02-17
    expect(BALANCE.city.street.edgeShift).toBe(3); // spec 02-18
    expect(BALANCE.city.street.gatewayHeight).toBe(7); // spec 02-27
    expect(BALANCE.city.street.firstPackAt).toBe(20); // spec 02-30
  });

  it('carries the two bay sequences of the spec table', () => {
    // spec 02-19: twelve bays of six and one of eight on the aligned edge;
    // three, eleven of six, and eleven on the shifted one.
    expect(BALANCE.city.alignedBays).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8]);
    expect(BALANCE.city.shiftedBays).toEqual([3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11]);
    expect(sum(BALANCE.city.alignedBays)).toBe(80);
    expect(sum(BALANCE.city.shiftedBays)).toBe(80);
  });

  it('carries the two height sequences, and their three cuts each', () => {
    // spec 02-22 to 02-25, the two stretch runs of the chapter table.
    expect(BALANCE.city.alignedHeights).toEqual([4, 6, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8, 8]);
    expect(BALANCE.city.shiftedHeights).toEqual([4, 6, 8, 8, 4, 6, 8, 4, 6, 8, 4, 6, 8]);
    for (const heights of [BALANCE.city.alignedHeights, BALANCE.city.shiftedHeights]) {
      expect(heights).toHaveLength(BALANCE.city.street.baysPerEdge);
      for (const height of heights) expect([4, 6, 8]).toContain(height); // spec 02-20
      expect(heights[heights.length - 1]).toBe(8); // the far end is an eight, spec 02-24
      // A drop of four blocks is a cut, and there are three per edge. (spec 02-25)
      let cuts = 0;
      for (let i = 1; i < heights.length; i += 1) {
        if ((heights[i] ?? 0) < (heights[i - 1] ?? 0)) cuts += 1;
      }
      expect(cuts).toBe(3);
    }
  });

  it('adds up to eighty-seven buildings, thirty-three of them low', () => {
    // spec 02-17 and the chapter table: 78 along the streets, 9 on the perimeter.
    const perEdge = [...BALANCE.city.alignedHeights, ...BALANCE.city.shiftedHeights];
    const streets = 3;
    const buildings = perEdge.length * streets + BALANCE.city.perimeterCount;
    expect(buildings).toBe(87);
    expect(count(perEdge, 4) * streets + BALANCE.city.perimeterCount).toBe(33);
    expect(count(perEdge, 6) * streets).toBe(24);
    expect(count(perEdge, 8) * streets).toBe(30);
  });

  it('reaches sixteen blocks of halo from the base', () => {
    expect(BALANCE.city.halo).toBe(16); // spec 02-31
  });
});

describe('chapter 3 — the zombies', () => {
  it('holds four kinds and no more', () => {
    // spec 03-1: there will never be a fifth.
    const kinds = [BALANCE.shambler, BALANCE.sprinter, BALANCE.bruiser, BALANCE.colossus];
    expect(kinds).toHaveLength(4);
  });

  it('reads back the table of the four kinds', () => {
    // spec 03, "Les quatre types".
    expect(BALANCE.shambler).toEqual({
      speed: 1.5,
      hp: 1,
      shamblerHits: 1,
      scale: 1,
      appears: 1,
    });
    expect(BALANCE.sprinter).toEqual({
      speed: 4,
      hp: 1,
      shamblerHits: 1,
      scale: 0.8,
      appears: 4,
    });
    expect(BALANCE.bruiser).toEqual({ speed: 1, hp: 5, shamblerHits: 3, scale: 1.4, appears: 7 });
    expect(BALANCE.colossus).toEqual({
      speed: 0.8,
      hp: 25,
      shamblerHits: 10,
      scale: 2.2,
      appears: 10,
    });
  });

  it('lets nothing go over four blocks a second', () => {
    // spec 03 "Les interdits": the sprinter is the ceiling of the game.
    for (const kind of [BALANCE.shambler, BALANCE.sprinter, BALANCE.bruiser, BALANCE.colossus]) {
      expect(kind.speed).toBeLessThanOrEqual(4);
    }
    expect(BALANCE.assault.rushSpeed).toBeLessThanOrEqual(4); // spec 03-39
  });

  it('keeps the cadence at six seconds, and a pack at four', () => {
    expect(BALANCE.assault.cadence).toBe(6); // spec 03-22
    expect(BALANCE.assault.packSize).toBe(4); // spec 03-22
    expect(BALANCE.assault.streetStagger).toBe(8); // spec 03-25
    // Six seconds are nine blocks between two packs. (spec 03-27)
    expect(BALANCE.assault.cadence * BALANCE.shambler.speed).toBe(9);
  });

  it('holds the rail rules', () => {
    expect(BALANCE.assault.lateralSpread).toBe(2); // spec 03-7
    expect(BALANCE.assault.unstickAfter).toBe(3); // spec 03-11
    expect(BALANCE.assault.blowPeriod).toBe(1); // spec 03-4
    expect(BALANCE.assault.grazeRange).toBe(1.5); // spec 03-15
    expect(BALANCE.assault.shardsLast).toBe(0.6); // spec 03-19
  });

  it('escorts a colossus with six bruisers', () => {
    expect(BALANCE.assault.escortCount).toBe(6); // spec 03-34
    expect(BALANCE.assault.escortRadius).toBe(3); // spec 03-34
  });

  it('holds the three end-of-assault nets', () => {
    expect(BALANCE.assault.beaconsAt).toBe(3); // spec 03-38
    expect(BALANCE.assault.rushAfter).toBe(15); // spec 03-39
    expect(BALANCE.assault.rushSpeed).toBe(4); // spec 03-39
  });

  it('reads back the wave table, line by line', () => {
    // spec 03, "La table des vagues" — totals and active streets.
    const table = [
      [1, 4, 0, 0, 0, 4, 1],
      [2, 8, 0, 0, 0, 8, 1],
      [3, 14, 0, 0, 0, 14, 1],
      [4, 12, 4, 0, 0, 16, 1],
      [5, 14, 8, 0, 0, 22, 2],
      [6, 16, 14, 0, 0, 30, 2],
      [7, 18, 12, 4, 0, 34, 2],
      [8, 18, 16, 6, 0, 40, 2],
      [9, 20, 17, 8, 0, 45, 2],
      [10, 20, 14, 6, 1, 41, 2],
      [11, 16, 21, 8, 0, 45, 3],
      [12, 18, 25, 6, 1, 50, 3],
      [13, 20, 28, 6, 1, 55, 3],
      [14, 22, 31, 6, 1, 60, 3],
    ];
    expect(BALANCE.waves).toHaveLength(table.length);
    table.forEach(([wave, shamblers, sprinters, bruisers, colossi, total, streets], i) => {
      const row = BALANCE.waves[i];
      expect(row?.wave).toBe(wave);
      expect(row?.shamblers).toBe(shamblers);
      expect(row?.sprinters).toBe(sprinters);
      expect(row?.bruisers).toBe(bruisers);
      expect(row?.colossi).toBe(colossi);
      expect(row?.streets).toBe(streets);
      expect(
        (row?.shamblers ?? 0) + (row?.sprinters ?? 0) + (row?.bruisers ?? 0) + (row?.colossi ?? 0),
      ).toBe(total);
    });
  });

  it('never lets a wave total go over sixty', () => {
    // spec 03-42: the assertion `waves.ts` will carry, checked here on the table.
    for (const row of BALANCE.waves) {
      const total = row.shamblers + row.sprinters + row.bruisers + row.colossi;
      expect(total).toBeLessThanOrEqual(60);
      expect(total).toBeLessThanOrEqual(BALANCE.pools.zombies);
    }
  });

  it('never brings two colossi at once, and none before wave ten', () => {
    for (const row of BALANCE.waves) {
      expect(row.colossi).toBeLessThanOrEqual(1); // spec 03-35
      if (row.colossi > 0) expect(row.wave).toBeGreaterThanOrEqual(10); // spec 03-35
    }
  });

  it('absorbs every bruiser into the escort from wave twelve on', () => {
    // spec 03-36: past wave 12, no bruiser walks anywhere but the colossus street.
    for (const row of BALANCE.waves) {
      if (row.wave >= 12) expect(row.bruisers).toBe(BALANCE.assault.escortCount);
    }
  });

  it('opens the second street at five and the third at eleven', () => {
    // spec 03-28 and 01-35, read off the table.
    const streetsAt = (wave: number): number =>
      BALANCE.waves.find((row) => row.wave === wave)?.streets ?? 0;
    expect(streetsAt(4)).toBe(1);
    expect(streetsAt(5)).toBe(2);
    expect(streetsAt(10)).toBe(2);
    expect(streetsAt(11)).toBe(3);
    // The third street opens at an unchanged head count. (spec 01-35)
    const total = (wave: number): number => {
      const row = BALANCE.waves.find((r) => r.wave === wave);
      return (row?.shamblers ?? 0) + (row?.sprinters ?? 0) + (row?.bruisers ?? 0) + (row?.colossi ?? 0);
    };
    expect(total(11)).toBe(total(9));
  });

  it('makes wave fourteen the plateau', () => {
    expect(BALANCE.plateauWave).toBe(14); // spec 03-44
    expect(BALANCE.waves[BALANCE.waves.length - 1]?.wave).toBe(BALANCE.plateauWave);
  });

  it('adds up to the two hundred and fifty-four of the main game', () => {
    // spec 03, "La table des vagues": 254 zombies, 144 / 85 / 24 / 1.
    const main = BALANCE.waves.filter((row) => row.wave <= BALANCE.pace.mainWaves);
    expect(sum(main.map((r) => r.shamblers))).toBe(144);
    expect(sum(main.map((r) => r.sprinters))).toBe(85);
    expect(sum(main.map((r) => r.bruisers))).toBe(24);
    expect(sum(main.map((r) => r.colossi))).toBe(1);
    expect(
      sum(main.map((r) => r.shamblers + r.sprinters + r.bruisers + r.colossi)),
    ).toBe(254);
  });
});

describe('chapter 4 — the player', () => {
  it('runs at one pace and one only', () => {
    expect(BALANCE.player.runSpeed).toBe(6); // spec 04-6
    // It outruns the fastest zombie, so nothing ever catches it. (spec 04 "Pourquoi")
    expect(BALANCE.player.runSpeed).toBeGreaterThan(BALANCE.sprinter.speed);
  });

  it('jumps two blocks up and two across, and pays nothing to fall', () => {
    expect(BALANCE.player.jumpRise).toBe(2); // spec 04-10
    expect(BALANCE.player.jumpGap).toBe(2); // spec 04-10
    expect(BALANCE.player.fallCost).toBe(0); // spec 04-12
    // A jump never climbs from the ground: the lowest roof is four. (spec 04-11)
    expect(BALANCE.player.jumpRise).toBeLessThan(BALANCE.city.perimeterHeight);
    // And a street is wider than a jump. (spec 02-12, 04 "Pourquoi le saut")
    expect(BALANCE.player.jumpGap).toBeLessThan(BALANCE.city.street.width);
  });

  it('climbs a ladder in eight tenths of a second', () => {
    expect(BALANCE.player.ladderTime).toBe(0.8); // spec 04-13
  });

  it('holds five hp, and loses one per contact whatever the kind', () => {
    expect(BALANCE.player.hp).toBe(5); // spec 04-37
    expect(BALANCE.player.contactCost).toBe(1); // spec 04-37
    expect(BALANCE.player.stagger).toBe(1); // spec 04-39
    expect(BALANCE.player.invulnerable).toBe(1); // spec 04-39
    // One hp every two seconds, so ten seconds of contact. (spec 04-39)
    const perLoss = BALANCE.player.stagger + BALANCE.player.invulnerable;
    expect(perLoss).toBe(2);
    expect(BALANCE.player.hp * perLoss).toBe(10);
  });

  it('regains one hp every six seconds, and never at close quarters', () => {
    expect(BALANCE.player.regenPeriod).toBe(6); // spec 04-41
    // Six seconds are longer than the two of the loss ceiling. (spec 04 "Pourquoi")
    expect(BALANCE.player.regenPeriod).toBeGreaterThan(
      BALANCE.player.stagger + BALANCE.player.invulnerable,
    );
    // A thirty-second prep refills the whole bar. (spec 04, hp table)
    expect(BALANCE.pace.latePrep / BALANCE.player.regenPeriod).toBe(BALANCE.player.hp);
  });

  it('collapses on the spot for three seconds', () => {
    expect(BALANCE.player.collapseTime).toBe(3); // spec 04-42
    expect(BALANCE.player.riseInvulnerable).toBe(3); // spec 04-42
  });

  it('carries an armful of three, exactly one magazine', () => {
    expect(BALANCE.player.armful).toBe(3); // spec 04-47
    expect(BALANCE.player.armful).toBe(BALANCE.cannon.magazine); // spec 04-47
  });

  it('holds the six camera constants', () => {
    expect(BALANCE.camera.back).toBe(6.5); // spec 04-15
    expect(BALANCE.camera.above).toBe(5.5); // spec 04-15
    expect(BALANCE.camera.minBack).toBe(3.2); // spec 04-18
    expect(BALANCE.camera.climb).toBe(10); // spec 04-18
    expect(BALANCE.camera.recentre).toBe(2.4); // spec 04-16
    expect(BALANCE.camera.freezeAfterBlow).toBe(1.2); // spec 04-17
  });

  it('sweeps a sector of a hundred and twenty degrees', () => {
    expect(BALANCE.sword.arc).toBe(120); // spec 04-22
    expect(BALANCE.sword.range).toBe(3); // spec 04-22
    expect(BALANCE.sword.height).toBe(1.5); // spec 04-22
    expect(BALANCE.sword.rate).toBe(2.5); // spec 04-24
    expect(BALANCE.sword.interval).toBe(0.4); // spec 04-24
    expect(BALANCE.sword.swordHits).toBe(1); // spec 04-33
    expect(BALANCE.sword.grace).toBe(0.15); // spec 04-25
    expect(BALANCE.sword.rate * BALANCE.sword.interval).toBe(1);
  });

  it('keeps a roof a whole refuge', () => {
    // spec 04-26: the sweep never reaches the street from the lowest roof.
    expect(BALANCE.sword.height).toBeLessThan(BALANCE.city.perimeterHeight);
  });

  it('knocks a zombie sideways, never backwards', () => {
    // spec 04-35, and the recoil table of chapter 4.
    expect(BALANCE.knockback.shambler).toEqual({ shift: 0.75, paused: 0.3 });
    expect(BALANCE.knockback.sprinter).toEqual({ shift: 0.75, paused: 0.3 });
    expect(BALANCE.knockback.bruiser).toEqual({ shift: 0, paused: 0.15 });
    expect(BALANCE.knockback.colossus).toEqual({ shift: 0, paused: 0 });
    for (const back of Object.values(BALANCE.knockback)) {
      expect(back.shift).toBeGreaterThanOrEqual(0); // spec 03-8
    }
  });

  it('kills each kind in the time the spec says', () => {
    // spec 04, "À l'épée seule": 0,4 s, 0,4 s, 2 s, 10 s.
    const time = (hp: number): number => hp * BALANCE.sword.interval;
    expect(time(BALANCE.shambler.hp)).toBeCloseTo(0.4);
    expect(time(BALANCE.sprinter.hp)).toBeCloseTo(0.4);
    expect(time(BALANCE.bruiser.hp)).toBeCloseTo(2);
    expect(time(BALANCE.colossus.hp)).toBeCloseTo(10);
  });
});

describe('chapter 5 — the cannons', () => {
  it('has three tiers and no fourth', () => {
    expect(BALANCE.cannon.tiers).toBe(3); // spec 05-2
  });

  it('goes down in three tenths of a second, three blocks from the last one', () => {
    expect(BALANCE.cannon.placeTime).toBe(0.3); // spec 05-7
    expect(BALANCE.cannon.spacing).toBe(3); // spec 05-11
    // The same distance places, upgrades and pours: no dead zone. (spec 05-13)
    expect(BALANCE.cannon.pourRange).toBe(BALANCE.cannon.spacing);
  });

  it('takes twenty shambler hits on the ground', () => {
    expect(BALANCE.cannon.hp).toBe(20); // spec 05-44
    // Ten ground cannons are one fresh town hall. (spec 06-26)
    expect(BALANCE.cannon.hp * 10).toBe(BALANCE.economy.townHallHp);
  });

  it('holds the ball', () => {
    expect(BALANCE.cannon.ball.range).toBe(12); // spec 05-22
    expect(BALANCE.cannon.ball.perHeight).toBe(0.75); // spec 05-22
    expect(BALANCE.cannon.ball.period).toBe(2); // spec 05-23
    expect(BALANCE.cannon.ball.flight).toBe(0.6); // spec 05-25
    expect(BALANCE.cannon.ball.swordHits).toBe(1); // spec 05-24
  });

  it('lifts the range to fifteen, sixteen and a half, eighteen', () => {
    // spec 05, "La portée selon la hauteur".
    const reach = (height: number): number =>
      BALANCE.cannon.ball.range + BALANCE.cannon.ball.perHeight * height;
    expect(reach(0)).toBe(12);
    expect(reach(4)).toBe(15);
    expect(reach(6)).toBe(16.5);
    expect(reach(8)).toBe(18);
  });

  it('holds the flame', () => {
    expect(BALANCE.cannon.flame.arc).toBe(60); // spec 05-30
    expect(BALANCE.cannon.flame.range).toBe(6); // spec 05-30
    expect(BALANCE.cannon.flame.fed).toBe(2); // spec 05-34
    expect(BALANCE.cannon.flame.dry).toBe(0.5); // spec 05-34
    expect(BALANCE.cannon.flame.perFirebomb).toBe(6); // spec 05-35
    // A full magazine is eighteen seconds of fed flame. (spec 04, "Le ravitaillement")
    expect(BALANCE.cannon.magazine * BALANCE.cannon.flame.perFirebomb).toBe(18);
  });

  it('makes a cannon worth 0,5, then 1,0, then 2,5 sword hits a second', () => {
    // spec 05, "La puissance d'un canon".
    const ball = BALANCE.cannon.ball.swordHits / BALANCE.cannon.ball.period;
    expect(ball).toBe(0.5);
    expect(ball + BALANCE.cannon.flame.dry).toBe(1);
    expect(ball + BALANCE.cannon.flame.fed).toBe(2.5);
  });

  it('pours an armful in three tenths of a second', () => {
    expect(BALANCE.cannon.pourTime).toBe(0.3); // spec 04-49
  });

  it('runs the conveyor at exactly what a fed flame burns', () => {
    // spec 04-54: a cannon a conveyor serves never runs dry and never overflows.
    expect(BALANCE.cannon.conveyorPeriod).toBe(BALANCE.cannon.flame.perFirebomb);
    expect(BALANCE.cannon.conveyorRetract).toBe(1); // spec 04-55
  });
});

describe('chapter 6 — the money', () => {
  it('pays one, two, five and fifty', () => {
    expect(BALANCE.economy.coins).toEqual({
      shambler: 1,
      sprinter: 2,
      bruiser: 5,
      colossus: 50,
    }); // spec 06-2
  });

  it('doubles a coin the sword earned', () => {
    expect(BALANCE.economy.braveryFactor).toBe(2); // spec 06-3
    expect(BALANCE.economy.coins.shambler * BALANCE.economy.braveryFactor).toBe(2);
    expect(BALANCE.economy.coins.colossus * BALANCE.economy.braveryFactor).toBe(100);
  });

  it('closes an assault with ten coins', () => {
    expect(BALANCE.economy.assaultBonus).toBe(10); // spec 06-13
    expect(BALANCE.economy.magnet).toBe(4); // spec 06-7
  });

  it('holds the five prices, and no sixth', () => {
    // spec 06-17: five outlays, and it is a closed list — the cannon, the move
    // to tier two, the move to tier three, the armful of firebombs and the
    // reinforcement. The firebomb is written by the bomb, since an armful is
    // three of them, and the reinforcement carries its three steps and the price
    // it is bought back at for ever after. (spec 06-18, 06-28)
    expect(Object.keys(BALANCE.economy.prices)).toEqual([
      'cannon',
      'tierTwo',
      'tierThree',
      'firebomb',
      'reinforcements',
      'reinforcementAgain',
    ]);
    expect(BALANCE.economy.prices.cannon).toBe(40); // spec 06-18
    expect(BALANCE.economy.prices.tierTwo).toBe(60); // spec 06-18
    expect(BALANCE.economy.prices.tierThree).toBe(120); // spec 06-18
    expect(BALANCE.economy.prices.firebomb).toBe(1); // spec 06-18
    expect(BALANCE.economy.prices.reinforcements).toEqual([50, 80, 120]); // spec 06-18
    expect(BALANCE.economy.prices.reinforcementAgain).toBe(120); // spec 06-28
    // An armful costs three. (spec 06-18)
    expect(BALANCE.economy.prices.firebomb * BALANCE.player.armful).toBe(3);
  });

  it('keeps the reinforcement pegged to the price of a cannon', () => {
    // spec 06, "Le Renfort": 1,25, 2 and 3 cannons — the ratios are what is frozen.
    const inCannons = BALANCE.economy.prices.reinforcements.map(
      (price) => price / BALANCE.economy.prices.cannon,
    );
    expect(inCannons).toEqual([1.25, 2, 3]);
  });

  it('starts the town hall at two hundred and caps it at five hundred', () => {
    expect(BALANCE.economy.townHallHp).toBe(200); // spec 06-26
    expect(BALANCE.economy.townHallCaps).toEqual([300, 400, 500]); // spec 06-27
    expect(BALANCE.economy.townHallCaps).toHaveLength(
      BALANCE.economy.prices.reinforcements.length,
    );
    expect(BALANCE.economy.townHallSegments).toBe(10); // spec 08-13
  });

  it('leaves a margin over the hundred and sixty-six a good game spends', () => {
    // spec 03, "Les fuites, et les 200 de la mairie": 34 of margin.
    expect(BALANCE.economy.townHallHp - 166).toBe(34);
  });

  it('keeps the twenty-four cannons out of reach by substitution', () => {
    // spec 06, "Le garde-fou des 24 canons": the worst real case is 924 coins.
    const main = BALANCE.waves.filter((row) => row.wave <= BALANCE.pace.mainWaves);
    const worst =
      sum(main.map((r) => r.shamblers)) * BALANCE.economy.coins.shambler +
      sum(main.map((r) => r.sprinters)) *
        BALANCE.economy.coins.sprinter *
        BALANCE.economy.braveryFactor +
      sum(main.map((r) => r.bruisers)) *
        BALANCE.economy.coins.bruiser *
        BALANCE.economy.braveryFactor +
      sum(main.map((r) => r.colossi)) *
        BALANCE.economy.coins.colossus *
        BALANCE.economy.braveryFactor +
      BALANCE.pace.mainWaves * BALANCE.economy.assaultBonus;
    expect(worst).toBe(924);
    expect(worst / BALANCE.economy.prices.cannon).toBeLessThan(BALANCE.pools.cannons);
  });

  it('guarantees five hundred and eighty-four coins whatever the player does', () => {
    // spec 06-39: every zombie falls, so every coin drops.
    const main = BALANCE.waves.filter((row) => row.wave <= BALANCE.pace.mainWaves);
    const floor =
      sum(main.map((r) => r.shamblers)) * BALANCE.economy.coins.shambler +
      sum(main.map((r) => r.sprinters)) * BALANCE.economy.coins.sprinter +
      sum(main.map((r) => r.bruisers)) * BALANCE.economy.coins.bruiser +
      sum(main.map((r) => r.colossi)) * BALANCE.economy.coins.colossus +
      BALANCE.pace.mainWaves * BALANCE.economy.assaultBonus;
    expect(floor).toBe(584);
  });
});

describe('chapter 10 — the loop and the pools', () => {
  it('steps at sixty hertz', () => {
    // spec 10-21: a fixed step of 16,666 ms, which is one sixtieth of a second.
    expect(BALANCE.loop.hz).toBe(60);
    expect(1000 / BALANCE.loop.hz).toBeCloseTo(16.666, 2);
  });

  it('clamps a frame gap at a tenth of a second, so six steps at most', () => {
    expect(BALANCE.loop.frameClamp).toBe(0.1); // spec 10-23
    expect(BALANCE.loop.maxCatchUp).toBe(6); // spec 10-23
    expect(Math.floor(BALANCE.loop.frameClamp * BALANCE.loop.hz)).toBe(BALANCE.loop.maxCatchUp);
  });

  it('freezes sixty milliseconds on a fatal blow', () => {
    expect(BALANCE.loop.fatalBlowFreeze).toBeCloseTo(0.06); // spec 10-26
  });

  it('holds the four pools of the spec, and the cannons', () => {
    expect(BALANCE.pools.zombies).toBe(60); // spec 10, "Les pools"
    expect(BALANCE.pools.projectiles).toBe(96);
    expect(BALANCE.pools.shards).toBe(600);
    expect(BALANCE.pools.events).toBe(256);
    expect(BALANCE.pools.cannons).toBe(24); // spec 05-52
  });

  it('sizes the coins off the wave table, since no chapter sizes them', () => {
    // The derivation, written out: exactly one coin springs from every zombie
    // felled (spec 06-2), it lies where it fell until the end of the assault
    // (spec 06-8), the end of an assault pays every one still lying so a
    // preparation opens on a city with none (spec 06-14, 06-15) — so what can
    // lie at once is what one assault can fell, which is the head count of its
    // wave, and no line of the table walks more in than the zombie pool holds
    // (spec 03-42, 10-43). Hence exactly the sixty of the zombies.
    expect(BALANCE.pools.coins).toBe(60);
    expect(BALANCE.pools.coins).toBe(BALANCE.pools.zombies);
    for (const row of BALANCE.waves) {
      expect(
        row.shamblers + row.sprinters + row.bruisers + row.colossi,
      ).toBeLessThanOrEqual(BALANCE.pools.coins);
    }
  });
});
