/**
 * The town hall read back against chapters 3, 6 and 1. Every number here is
 * written out by hand from `docs/spec/`, with the address of the rule beside it.
 * (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import {
  EVENT,
  type EventBuffer,
  type Game,
  ZOMBIE,
  type ZombieType,
  clearEvents,
  createGame,
} from './state';
import {
  reinforceTownHall,
  reinforcementNotch,
  reinforcementPrice,
  stepTownHall,
  strikeTownHall,
} from './townhall';
import { spawnZombie } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** From the entrance of a street to the face of the town hall. (spec 02-13, 03-6) */
const RAIL = 92;

/** Stands one at the face of the town hall, where it stops for good. (spec 03-17) */
function arrive(game: Game, type: ZombieType, street: number): number {
  const at = spawnZombie(game, type, street, RAIL);
  game.assault.zombies.blowLeft[at] = 0;
  return at;
}

function counted(events: EventBuffer, type: number): number {
  let found = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found += 1;
  return found;
}

describe('what it is worth', () => {
  it('opens at two hundred shambler hits, which is ten ground cannons', () => {
    // spec 06-26: a new town hall is 200 shambler hits, exactly ten cannons.
    const game = createGame(BALANCE);
    expect(game.snapshot.townHall.hp).toBe(200);
    expect(game.snapshot.townHall.cap).toBe(200);
    expect(game.snapshot.townHall.hp / BALANCE.cannon.hp).toBe(10); // spec 05-44
  });

  it('takes a blow worth the column of what lands it', () => {
    // spec 03-3, 03, "Les quatre types": blows are counted in shambler hits —
    // one, one, three and ten.
    const game = createGame(BALANCE);
    strikeTownHall(game, 3, 0, 1, 2, 3); // a bruiser
    expect(game.snapshot.townHall.hp).toBe(197);
    strikeTownHall(game, 10, 0, 1, 2, 3); // a colossus
    expect(game.snapshot.townHall.hp).toBe(187);
  });

  it('detaches a cube at every blow, and says so once', () => {
    // spec 03-18, 06-34: every blow taken puffs white shards and detaches a cube
    // that never comes back. The drawing hears it from the buffer. (spec 10-19)
    const game = createGame(BALANCE);
    strikeTownHall(game, 1, 7, 4, 0, 5);
    const events = game.assault.events;
    expect(counted(events, EVENT.TOWN_HALL_HIT)).toBe(1);
    expect(events.index[0]).toBe(7);
    expect(events.x[0]).toBe(4);
    expect(events.z[0]).toBe(5);
    expect(events.value[0]).toBe(1); // in shambler hits (spec 03-3)
  });

  it('drops a piece at every segment lost, a tenth of the ceiling each', () => {
    // spec 06-35: a segment is a tenth of the ceiling and its loss brings a piece
    // of the building down. spec 06-38: ten segments whatever the notch.
    const game = createGame(BALANCE);
    expect(BALANCE.economy.townHallSegments).toBe(10);

    // Nineteen of the twenty shambler hits of the first segment: nothing falls.
    for (let i = 0; i < 19; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_SEGMENT_LOST)).toBe(0);

    strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(180);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_SEGMENT_LOST)).toBe(1);

    // Nine segments are still standing, and that is what the fact carries.
    const events = game.assault.events;
    expect(events.value[events.count - 1]).toBe(9);
  });

  it('counts a segment against the ceiling a reinforcement moved', () => {
    // spec 06-27, 06-33: the ceiling climbs to 300, 400 and 500 and the bar keeps
    // its ten segments, so a segment is worth fifty on the last notch.
    const game = createGame(BALANCE);
    game.snapshot.townHall.cap = 500;
    game.snapshot.townHall.hp = 500;
    for (let i = 0; i < 49; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_SEGMENT_LOST)).toBe(0);
    strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_SEGMENT_LOST)).toBe(1);
  });

  it('never gives one back, and stops at nought', () => {
    // spec 01-19: it never heals — one hp lost is lost for good, and only a
    // reinforcement lifts its bar. spec 06-29: no mending, free or paid.
    const game = createGame(BALANCE);
    for (let i = 0; i < 300; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(0);

    // And a thousand steps with nothing standing at its face put nothing back.
    for (let i = 0; i < 1000; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(0);
  });
});

describe('the fall, which is the end of a game', () => {
  it('ends the game the moment it reaches nought, and shows the wave reached', () => {
    // spec 01-28: the game ends when the town hall reaches nought, and that is
    // the one end there is. spec 01-30: what the end shows is the number of the
    // wave reached, and nothing else.
    const game = createGame(BALANCE);
    game.snapshot.wave = 7;
    for (let i = 0; i < 199; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(1);
    expect(counted(game.assault.events, EVENT.GAME_ENDED)).toBe(0);

    clearEvents(game.assault.events);
    strikeTownHall(game, 1, 0, 0, 0, 0);
    const events = game.assault.events;
    expect(game.snapshot.townHall.hp).toBe(0);
    expect(counted(events, EVENT.GAME_ENDED)).toBe(1);
    // It comes after the blow and after the last segment, so the drawing has
    // seen the whole of the fall before it is told the game is over. (spec 10-18)
    expect(events.type[events.count - 1]).toBe(EVENT.GAME_ENDED);
    expect(events.value[events.count - 1]).toBe(7); // spec 01-30
  });

  it('says it once, however long it goes on being hammered', () => {
    // spec 01-28: one end, said once. spec 03-17: what arrived never goes away,
    // so it keeps hammering a town hall that has nothing left.
    const game = createGame(BALANCE);
    arrive(game, ZOMBIE.BRUISER, 0);
    let said = 0;
    for (let i = 0; i < 60 * 400; i += 1) {
      clearEvents(game.assault.events);
      stepTownHall(game, SECONDS);
      said += counted(game.assault.events, EVENT.GAME_ENDED);
    }
    expect(game.snapshot.townHall.hp).toBe(0);
    expect(said).toBe(1);
  });

  it('ends it under the hammering itself, and not by hand', () => {
    // spec 03-3, 03-4: a colossus takes ten shambler hits a second off it, so
    // two hundred hp go in twenty seconds of standing at its face.
    const game = createGame(BALANCE);
    game.snapshot.wave = 4;
    arrive(game, ZOMBIE.COLOSSUS, 0);
    let seen = -1;
    for (let i = 0; i < 60 * 40; i += 1) {
      clearEvents(game.assault.events);
      stepTownHall(game, SECONDS);
      const events = game.assault.events;
      for (let e = 0; e < events.count; e += 1) {
        if (events.type[e] === EVENT.GAME_ENDED) seen = events.value[e];
      }
    }
    expect(game.snapshot.townHall.hp).toBe(0);
    expect(seen).toBe(4); // the wave reached (spec 01-30)
  });

  it('never takes back a victory already won when it falls in overtime', () => {
    // spec 01-26: the victory is won for good, and the town hall may fall in
    // overtime without unmaking it.
    const game = createGame(BALANCE);
    game.snapshot.won = true;
    game.snapshot.wave = 13;
    for (let i = 0; i < 200; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    const events = game.assault.events;
    expect(game.snapshot.won).toBe(true);
    expect(counted(events, EVENT.GAME_ENDED)).toBe(1);
    expect(events.value[events.count - 1]).toBe(13); // spec 01-30
  });
});

describe('what strikes it', () => {
  it('strikes the moment it arrives, then once a second', () => {
    // spec 03-4, 03-17: at the contact it stops and strikes once a second,
    // for good.
    const game = createGame(BALANCE);
    arrive(game, ZOMBIE.SHAMBLER, 0);
    expect(BALANCE.assault.blowPeriod).toBe(1);

    stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(199); // the first blow, on arrival

    for (let i = 0; i < 59; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(199); // and nothing for a whole second
    stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(198);
  });

  it('lets a colossus take ten a second and a bruiser three', () => {
    // spec 03-4 and the table of chapter 3: the blow is the column of its kind.
    const game = createGame(BALANCE);
    arrive(game, ZOMBIE.COLOSSUS, 0);
    arrive(game, ZOMBIE.BRUISER, 1);
    for (let i = 0; i < 60; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(200 - 13);
  });

  it('leaves alone whatever has not come to its face yet', () => {
    // spec 03-6, 03-17: a rail is ninety-two blocks, and the blows start where
    // it ends.
    const game = createGame(BALANCE);
    spawnZombie(game, ZOMBIE.SHAMBLER, 0, RAIL - 1);
    for (let i = 0; i < 600; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(200);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_HIT)).toBe(0);
  });

  it('keeps hammering it, and stays in the pool while it does', () => {
    // spec 03-17: no vanishing, no burst, no end of the line — it goes on being
    // a target for as long as the assault lasts.
    const game = createGame(BALANCE);
    const at = arrive(game, ZOMBIE.SHAMBLER, 0);
    for (let i = 0; i < 60 * 30; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(200 - 30);
    expect(game.assault.zombies.count).toBe(1);
    expect(game.assault.zombies.hp[at]).toBe(1); // in sword hits, untouched
    expect(game.assault.zombies.progress[at]).toBe(RAIL);
  });
});

describe('the reinforcement', () => {
  it('does two things in one movement: whole again, and the ceiling up', () => {
    // spec 06-25: the one purchase that bears on the town hall makes it entirely
    // new again *and* moves its ceiling of hp.
    const game = createGame(BALANCE);
    for (let i = 0; i < 160; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(40);

    reinforceTownHall(game);
    expect(game.snapshot.townHall.cap).toBe(300); // spec 06-27
    expect(game.snapshot.townHall.hp).toBe(300); // whole again, in the same movement
  });

  it('carries the ceiling to 300, 400 and 500, at 50, 80 and 120 coins', () => {
    // spec 06-27, 06-18: three notches, and the prices are written out here by
    // hand from the chapter.
    const game = createGame(BALANCE);
    expect(reinforcementNotch(game)).toBe(0);
    expect(game.snapshot.townHall.cap).toBe(200); // spec 06-26

    expect(reinforcementPrice(game)).toBe(50);
    reinforceTownHall(game);
    expect(game.snapshot.townHall.cap).toBe(300);
    expect(reinforcementNotch(game)).toBe(1);

    expect(reinforcementPrice(game)).toBe(80);
    reinforceTownHall(game);
    expect(game.snapshot.townHall.cap).toBe(400);
    expect(reinforcementNotch(game)).toBe(2);

    expect(reinforcementPrice(game)).toBe(120);
    reinforceTownHall(game);
    expect(game.snapshot.townHall.cap).toBe(500);
    expect(reinforcementNotch(game)).toBe(3);
  });

  it('is bought back indefinitely at 120, and then only makes it whole again', () => {
    // spec 06-28: past the third notch the ceiling stays at 500 and the price
    // stays 120, for ever — the valve that leaves no coin stuck. There is no
    // fourth notch. (spec 06 "Les interdits")
    const game = createGame(BALANCE);
    for (let n = 0; n < 3; n += 1) reinforceTownHall(game);

    for (let n = 0; n < 20; n += 1) {
      for (let i = 0; i < 90; i += 1) strikeTownHall(game, 1, 0, 0, 0, 0);
      expect(game.snapshot.townHall.hp).toBe(410);
      expect(reinforcementPrice(game)).toBe(120);
      reinforceTownHall(game);
      expect(game.snapshot.townHall.hp).toBe(500);
      expect(game.snapshot.townHall.cap).toBe(500);
      expect(reinforcementNotch(game)).toBe(3);
    }
  });

  it('keeps one fixed price and a yield that is not: 2, 4 and 5 the coin', () => {
    // spec 06-32 and the table "Le rendement du Renfort": the same 50 coins buy
    // 100 on a full town hall, 200 on one at half and 250 on one at a quarter.
    // **That gap is the arbitration, and never a fault to be put right.**
    const yieldAt = (left: number): number => {
      const game = createGame(BALANCE);
      strikeTownHall(game, 200 - left, 0, 0, 0, 0);
      const price = reinforcementPrice(game);
      const before = game.snapshot.townHall.hp;
      reinforceTownHall(game);
      return (game.snapshot.townHall.hp - before) / price;
    };
    expect(yieldAt(200)).toBe(2); // full — 100 of ceiling for 50 coins
    expect(yieldAt(100)).toBe(4); // half — 100 given back, 100 of ceiling
    expect(yieldAt(50)).toBe(5); // a quarter — 150 given back, 100 of ceiling
  });

  it('asks the price of the notch alone, never of what the bar has left', () => {
    // spec 06-32: never a price of a reinforcement in proportion to the harm
    // taken. At one notch, the price is one number whatever the bar shows.
    for (let notch = 0; notch <= 4; notch += 1) {
      const asked = new Set<number>();
      for (const left of [1, 25, 60, 130, 199, 200]) {
        const game = createGame(BALANCE);
        for (let n = 0; n < notch; n += 1) reinforceTownHall(game);
        game.snapshot.townHall.hp = Math.min(left, game.snapshot.townHall.cap);
        asked.add(reinforcementPrice(game));
      }
      expect(asked.size).toBe(1);
    }
  });

  it('says it once, and the notch rides in the fact', () => {
    // spec 06-36, 06-37, 10-19: the drawing rebuilds the whole of it off this one
    // fact, and what it wears is read off the notch — never off a figure drawn
    // anywhere. It is thrown from the town hall, at the middle of the star.
    const game = createGame(BALANCE);
    reinforceTownHall(game);
    const events = game.assault.events;
    expect(counted(events, EVENT.REINFORCEMENT_BOUGHT)).toBe(1);
    expect(events.x[0]).toBe(0);
    expect(events.z[0]).toBe(0);
    expect(events.y[0]).toBe(BALANCE.city.townHallHeight); // spec 02-7
    expect(events.value[0]).toBe(1);

    reinforceTownHall(game);
    reinforceTownHall(game);
    reinforceTownHall(game);
    expect(events.value[events.count - 1]).toBe(3); // and never a fourth
  });

  it('changes nothing else at all: not a blow taken, not a segment', () => {
    // spec 06-33: no notch touches what the town hall takes, nor the ten
    // segments of its bar. A bruiser takes three at 200 and three at 500.
    const game = createGame(BALANCE);
    strikeTownHall(game, 3, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(197);

    for (let n = 0; n < 3; n += 1) reinforceTownHall(game);
    strikeTownHall(game, 3, 0, 0, 0, 0);
    expect(game.snapshot.townHall.hp).toBe(497);
    expect(BALANCE.economy.townHallSegments).toBe(10); // spec 06-38

    // A segment is a tenth of the ceiling, so fifty at the third notch.
    clearEvents(game.assault.events);
    strikeTownHall(game, 47, 0, 0, 0, 0);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_SEGMENT_LOST)).toBe(1);
    expect(game.assault.events.value[game.assault.events.count - 1]).toBe(9);
  });

  it('is the one door that ever puts an hp back: no mending, no armour', () => {
    // spec 01-19, 06-29: nothing heals with time, nothing mends on its own, and
    // there is no armour and no reduction of a blow anywhere.
    const game = createGame(BALANCE);
    strikeTownHall(game, 60, 0, 0, 0, 0);
    for (let i = 0; i < 60 * 60; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(140);

    reinforceTownHall(game);
    expect(game.snapshot.townHall.hp).toBe(300);
    for (let i = 0; i < 60 * 60; i += 1) stepTownHall(game, SECONDS);
    expect(game.snapshot.townHall.hp).toBe(300);
  });
});
