/**
 * The town hall read back against chapters 3, 6 and 1. Every number here is
 * written out by hand from `docs/spec/`, with the address of the rule beside it.
 * (spec 10-42)
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { EVENT, type EventBuffer, type Game, ZOMBIE, type ZombieType, createGame } from './state';
import { stepTownHall, strikeTownHall } from './townhall';
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
    // of the building down. spec 06-38: ten segments whatever the step.
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
    // its ten segments, so a segment is worth fifty on the last step.
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
