/**
 * The sword read back against chapter 4. Every number here is written out by hand
 * from `docs/spec/`, with the address of the rule beside it. (spec 10-42)
 *
 * A spot is what the sweep reads, and only `stepZombies` ever works one out again
 * from a rail and an offset, so a test that calls the sword alone may stand a body
 * exactly where it wants it. That is what lets the geometry of 04-22 be checked in
 * blocks rather than in advances.
 */
import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { placePlayer } from './player';
import {
  EVENT,
  type EventBuffer,
  type Game,
  type InputState,
  ZOMBIE,
  type ZombieType,
  clearEvents,
  createGame,
  createInput,
  railAng,
} from './state';
import { step } from './step';
import { knockbackOf, stepSword } from './sword';
import { beginAssault } from './waves';
import { spawnZombie, stepZombies } from './zombies';

/** One step of the one loop, in seconds. (spec 10-21) */
const SECONDS = 1 / 60;

/** Steps in the 0,4 second between two blows. (spec 04-24) */
const BETWEEN = 24;

const HELD: Readonly<InputState> = { ...createInput(), strike: true };
const IDLE: Readonly<InputState> = createInput();

/** Stands him at a spot, facing a heading, out of every other rule's way. */
function stand(game: Game, x: number, y: number, z: number, ang = 0): void {
  const player = game.assault.player;
  player.x = x;
  player.y = y;
  player.z = z;
  player.ang = ang;
  // Untouchable, so a body standing this close never staggers him mid-test.
  // (spec 04-39)
  player.invulnerableLeft = 1000;
}

/** Stands one body of a kind at a spot, whatever its rail would have said. */
function put(game: Game, type: ZombieType, x: number, z: number, progress = 0): number {
  const at = spawnZombie(game, type, 0, progress);
  game.assault.zombies.x[at] = x;
  game.assault.zombies.z[at] = z;
  return at;
}

/** One body of a kind at a heading and a distance from him, in blocks. */
function putAway(game: Game, type: ZombieType, turn: number, away: number): number {
  return put(game, type, Math.cos(turn) * away, Math.sin(turn) * away);
}

function swing(game: Game, steps = 1, input: Readonly<InputState> = HELD): void {
  for (let i = 0; i < steps; i += 1) stepSword(game, input, SECONDS);
}

/** How many facts of one type the buffer holds. */
function counted(events: Readonly<EventBuffer>, type: number): number {
  let found = 0;
  for (let i = 0; i < events.count; i += 1) if (events.type[i] === type) found += 1;
  return found;
}

/** A game with nobody in it, nothing walking in, and him standing at nought. */
function ready(): Game {
  const game = createGame(BALANCE, 20260829);
  stand(game, 0, 0, 0);
  clearEvents(game.assault.events);
  return game;
}

describe('the sweep', () => {
  it('takes the sector of 120° in front of him, and nothing beyond it', () => {
    // spec 04-22: a sector of 120° in front of the player. The heading is the one
    // the aim hands him, so a body is planted due east at half a block to hold it
    // there, and the sector is read off a second body around him. (spec 04-29)
    const inside = [0, 0.5, -0.5, (59 * Math.PI) / 180, (-59 * Math.PI) / 180];
    const beyond = [(61 * Math.PI) / 180, (-61 * Math.PI) / 180, Math.PI / 2, Math.PI];
    for (const turn of [...inside, ...beyond]) {
      const game = ready();
      put(game, ZOMBIE.BRUISER, 0.5, 0); // the nearest, so he faces due east
      const at = putAway(game, ZOMBIE.BRUISER, turn, 2);
      swing(game);
      expect(game.assault.player.ang).toBeCloseTo(0, 6);
      const touched = game.assault.zombies.hp[at] < BALANCE.bruiser.hp;
      expect(`${turn} ${touched}`).toBe(`${turn} ${inside.includes(turn)}`);
    }
  });

  it('reaches three blocks, measured to the edge of the box of the zombie', () => {
    // spec 04-22: 3 blocks, to the edge of the box. A body at a scale of one is
    // one block across, so its edge is half a block in from its middle — and a
    // colossus at 2,2 is caught from six tenths of a block further out.
    const table: [ZombieType, number, number, number][] = [
      [ZOMBIE.SHAMBLER, BALANCE.shambler.hp, 3.4, 3.6], // 3,5 blocks to its middle
      [ZOMBIE.COLOSSUS, BALANCE.colossus.hp, 4.0, 4.2], // 4,1 blocks to its middle
    ];
    for (const [type, hp, near, far] of table) {
      for (const away of [near, far]) {
        const game = ready();
        const at = put(game, type, away, 0);
        swing(game);
        const touched = game.assault.zombies.count === 0 || game.assault.zombies.hp[at] < hp;
        expect(`${type} ${away} ${touched}`).toBe(`${type} ${away} ${away === near}`);
      }
    }
  });

  it('goes a block and a half up and down, and no further', () => {
    // spec 04-22: 1,5 block above and below him.
    for (const y of [0, 1.4, 1.6, 3]) {
      const game = ready();
      stand(game, 0, y, 0);
      const at = put(game, ZOMBIE.BRUISER, 2, 0);
      swing(game);
      const touched = game.assault.zombies.hp[at] < BALANCE.bruiser.hp;
      expect(`${y} ${touched}`).toBe(`${y} ${y <= 1.5}`);
    }
  });
});

describe('one blow, every body in it', () => {
  it('lands one sword hit on each, without sharing and without falling off', () => {
    // spec 04-23, 04-33: everything in the sweep is touched by the same blow,
    // one sword hit each, and never a single target.
    const alone = ready();
    const one = put(alone, ZOMBIE.BRUISER, 1, 0);
    swing(alone);
    expect(alone.assault.zombies.hp[one]).toBe(BALANCE.bruiser.hp - 1);

    const many = ready();
    const all = [
      putAway(many, ZOMBIE.BRUISER, 0, 1),
      putAway(many, ZOMBIE.BRUISER, 0.4, 2),
      putAway(many, ZOMBIE.BRUISER, -0.4, 3),
      putAway(many, ZOMBIE.BRUISER, 0.7, 3.4),
      putAway(many, ZOMBIE.BRUISER, -0.2, 0.5),
    ];
    swing(many);
    // The same one hit apiece, whatever their number: five of them take exactly
    // what one of them took.
    for (const at of all) expect(many.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp - 1);
    expect(counted(many.assault.events, EVENT.SWORD_HIT)).toBe(all.length);
  });

  it('takes the bruiser at one block a second and the colossus together', () => {
    // spec 04 "Pourquoi on balaie au lieu de cibler": the arbitration dissolves —
    // both of them take the blow.
    const game = ready();
    const slow = putAway(game, ZOMBIE.BRUISER, 0.4, 1.5);
    const huge = putAway(game, ZOMBIE.COLOSSUS, -0.4, 3);
    swing(game);
    expect(game.assault.zombies.hp[slow]).toBe(BALANCE.bruiser.hp - 1);
    expect(game.assault.zombies.hp[huge]).toBe(BALANCE.colossus.hp - 1);
  });
});

describe('the cadence', () => {
  it('is 2,5 blows a second, and the held button loops', () => {
    // spec 04-24: one blow every 0,4 second, and the button held strikes on. Ten
    // seconds of it are twenty-five blows and not a step's worth more: what a
    // count overshoots by is carried, so the cadence does not drift onto a whole
    // number of steps of a sixtieth of a second. (spec 10-21)
    const game = ready();
    swing(game, 600);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(25);
  });

  it('holds 0,4 second between two blows, and nothing else to time', () => {
    // spec 04-24: no combo, no blocking animation.
    const game = ready();
    swing(game, 1);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(1);
    swing(game, BETWEEN);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(1);
    swing(game, 1);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(2);
  });

  it('strikes on the very first press, with nothing to wait for', () => {
    const game = ready();
    swing(game, 60, IDLE);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(0);
    swing(game, 1);
    expect(counted(game.assault.events, EVENT.SWEEP)).toBe(1);
  });
});

describe('the grace', () => {
  it('touches what walks in within 150 ms, and never twice for one blow', () => {
    // spec 04-25: what was in the sweep at the press, or what walks into it in
    // the 150 ms that follow. Nine steps of a sixtieth of a second.
    const game = ready();
    const at = put(game, ZOMBIE.BRUISER, 8, 0); // out of every reach at the press
    swing(game, 1);
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp);
    expect(counted(game.assault.events, EVENT.SWORD_MISS)).toBe(1);

    game.assault.zombies.x[at] = 2; // it walks into the sweep
    swing(game, 8);
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp - 1);

    // It stands in the sweep for the whole of the grace and takes one hit, once.
    swing(game, 16);
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp - 1);
    swing(game, 1); // and the next blow is a blow of its own
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp - 2);
  });

  it('stands where it was thrown, and does not follow him', () => {
    // spec 04-32: the blow leaves where it was launched.
    const game = ready();
    const at = put(game, ZOMBIE.BRUISER, 2, 0);
    swing(game, 1);
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp - 1);

    // He walks away and turns his back; the blow already in the air goes on
    // sweeping the sector it left on, and touches a second body that walks into
    // that sector rather than into the one he now faces.
    stand(game, 20, 0, 20, Math.PI);
    const late = put(game, ZOMBIE.BRUISER, 3, 0);
    swing(game, 5);
    expect(game.assault.zombies.hp[late]).toBe(BALANCE.bruiser.hp - 1);
  });

  it('runs out, and touches nothing after it', () => {
    const game = ready();
    swing(game, 12); // the blow, and the 150 ms of its grace, spent on nothing
    const at = put(game, ZOMBIE.BRUISER, 2, 0);
    swing(game, 13); // short of the next blow, and it stands there untouched
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp);
  });
});

describe('the roof, which is a whole refuge', () => {
  it('touches nothing in the street from the lowest roof, whatever kind stands there', () => {
    // spec 04-26: the sweep goes no more than 1,5 block up or down, so from a
    // roof one touches nothing in the street. The lowest roof of the city is four
    // blocks (spec 02-20), and a colossus stands 4,4 blocks tall: the height is
    // taken floor to floor, so the top of a box never reaches up either.
    const game = ready();
    stand(game, 0, 4, 0);
    const all = [
      putAway(game, ZOMBIE.SHAMBLER, 0, 1),
      putAway(game, ZOMBIE.SPRINTER, 0.3, 1.5),
      putAway(game, ZOMBIE.BRUISER, -0.3, 2),
      putAway(game, ZOMBIE.COLOSSUS, 0.1, 2.5),
    ];
    const hp = all.map((at) => game.assault.zombies.hp[at]);

    swing(game, 600); // ten seconds of the button held down
    expect(game.assault.zombies.count).toBe(all.length);
    for (let i = 0; i < all.length; i += 1) expect(game.assault.zombies.hp[all[i]]).toBe(hp[i]);
    expect(counted(game.assault.events, EVENT.SWORD_HIT)).toBe(0);
    expect(counted(game.assault.events, EVENT.FATAL_BLOW)).toBe(0);
  });

  it('touches nothing on a roof from the street either', () => {
    // spec 04-26: it goes down no further than it goes up.
    const game = ready();
    const at = put(game, ZOMBIE.BRUISER, 1, 0);
    stand(game, 0, 4, 0); // he stands on the roof, the body walks the street
    game.assault.zombies.x[at] = 1;
    swing(game, 60);
    expect(game.assault.zombies.hp[at]).toBe(BALANCE.bruiser.hp);
  });
});

describe('no friendly fire, in either direction', () => {
  it('touches neither the town hall, nor a cannon, nor anything but a zombie', () => {
    // spec 04-27: the sword never touches the town hall, a cannon or a conveyor.
    const game = ready();
    const cannons = game.snapshot.cannons;
    cannons.x[0] = 1;
    cannons.y[0] = 0;
    cannons.z[0] = 0;
    cannons.hp[0] = BALANCE.cannon.hp;
    cannons.tier[0] = 1;
    cannons.magazine[0] = BALANCE.cannon.magazine;
    cannons.count = 1;
    const hall = game.snapshot.townHall.hp;
    // A body pressed against the cannon: the one blow takes the body and leaves
    // the cannon exactly as it was.
    const at = put(game, ZOMBIE.BRUISER, 1.2, 0);

    swing(game, 600);
    expect(game.assault.zombies.hp[at]).toBeLessThan(BALANCE.bruiser.hp);
    expect(cannons.hp[0]).toBe(BALANCE.cannon.hp);
    expect(cannons.tier[0]).toBe(1);
    expect(cannons.magazine[0]).toBe(BALANCE.cannon.magazine);
    expect(cannons.count).toBe(1);
    expect(game.snapshot.townHall.hp).toBe(hall);
    expect(counted(game.assault.events, EVENT.CANNON_HIT)).toBe(0);
    expect(counted(game.assault.events, EVENT.TOWN_HALL_HIT)).toBe(0);
  });
});

describe('striking at nothing', () => {
  it('costs nothing: no dead time, no penalty, and the arc all the same', () => {
    // spec 04-28: one strikes again at once, at the very same cadence.
    const empty = ready();
    swing(empty, 600);
    const missed = counted(empty.assault.events, EVENT.SWEEP);
    expect(counted(empty.assault.events, EVENT.SWORD_MISS)).toBe(missed);

    const full = ready();
    putAway(full, ZOMBIE.COLOSSUS, 0, 2);
    swing(full, 600);
    expect(counted(full.assault.events, EVENT.SWEEP)).toBe(missed);
    expect(counted(full.assault.events, EVENT.SWORD_MISS)).toBe(0);
  });
});

describe('the aim', () => {
  it('orients him and designates nobody: the sector still sweeps whole', () => {
    // spec 04-29, 04-23: it turns him at the press, and elects no victim.
    const game = ready();
    const behind = put(game, ZOMBIE.BRUISER, -1.5, 0); // due west, he faces east
    const beside = put(game, ZOMBIE.BRUISER, -2, -1); // and this one goes with it
    swing(game);
    expect(game.assault.player.ang).toBeCloseTo(Math.PI, 6);
    expect(game.assault.zombies.hp[behind]).toBe(BALANCE.bruiser.hp - 1);
    expect(game.assault.zombies.hp[beside]).toBe(BALANCE.bruiser.hp - 1);
  });

  it('takes the nearest, and settles a tie by the highest advance', () => {
    // spec 04-30: the nearest to him, ties settled by the highest advance.
    const near = ready();
    put(near, ZOMBIE.BRUISER, 0, 3); // due north, three blocks
    put(near, ZOMBIE.BRUISER, 0, -1); // due south, one block
    swing(near);
    expect(near.assault.player.ang).toBeCloseTo(-Math.PI / 2, 6);

    const tied = ready();
    put(tied, ZOMBIE.BRUISER, 0, 2, 10);
    put(tied, ZOMBIE.BRUISER, 0, -2, 20); // as near, and further along its rail
    swing(tied);
    expect(tied.assault.player.ang).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('holds the one it has while it stands in the sweep', () => {
    // spec 04-31: the hysteresis, so the view does not swing at every step.
    const game = ready();
    const first = put(game, ZOMBIE.BRUISER, 0, -2);
    swing(game);
    expect(game.assault.player.ang).toBeCloseTo(-Math.PI / 2, 6);
    expect(game.assault.sword.aimAt).toBe(first);

    // A nearer one walks in, and he does not turn to it: the one he holds is
    // still in the sweep.
    put(game, ZOMBIE.BRUISER, 0, -0.8);
    swing(game, BETWEEN);
    expect(game.assault.sword.aimAt).toBe(first);
    expect(game.assault.player.ang).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('does not follow the one it holds once the blow has gone out', () => {
    // spec 04-32: the blow leaves where it was launched.
    const game = ready();
    const at = put(game, ZOMBIE.BRUISER, 0, -2);
    swing(game);
    const ang = game.assault.player.ang;
    game.assault.zombies.x[at] = 2;
    game.assault.zombies.z[at] = 0;
    swing(game, BETWEEN - 1);
    expect(game.assault.player.ang).toBe(ang);
  });

  it('turns him not at all when nothing stands within a blow', () => {
    // spec 04-28: a blow at nothing costs nothing, his heading included.
    const game = ready();
    stand(game, 0, 0, 0, 1.2);
    put(game, ZOMBIE.BRUISER, 40, 0);
    swing(game);
    expect(game.assault.player.ang).toBe(1.2);
    expect(game.assault.sword.aimAt).toBe(-1);
  });
});

describe('the recoil', () => {
  it('reads one table, with no branch per kind', () => {
    // spec 04-35: shifted 0,75 block and held 0,3 second, the bruiser held 0,15
    // and not shifted, the colossus not at all.
    expect(knockbackOf(BALANCE, ZOMBIE.SHAMBLER)).toEqual({ shift: 0.75, paused: 0.3 });
    expect(knockbackOf(BALANCE, ZOMBIE.SPRINTER)).toEqual({ shift: 0.75, paused: 0.3 });
    expect(knockbackOf(BALANCE, ZOMBIE.BRUISER)).toEqual({ shift: 0, paused: 0.15 });
    expect(knockbackOf(BALANCE, ZOMBIE.COLOSSUS)).toEqual({ shift: 0, paused: 0 });
  });

  it('shifts sideways in the sense of the blow, and carries the body away from him', () => {
    // spec 04-34, 04-35, 04-36: sideways and never backwards, 0,75 block, and the
    // shift takes the body further off — strike early and one is not touched. A
    // shambler falls to one blow, so this one is handed the two hp a flame would
    // have left it. (spec 05-34)
    for (const facing of [-Math.PI / 2, Math.PI / 2, 0.7]) {
      const game = ready();
      stand(game, 0, 0, 0, facing);
      const at = put(game, ZOMBIE.SHAMBLER, Math.cos(facing) * 1.4, Math.sin(facing) * 1.4, 40);
      game.assault.zombies.hp[at] = 2;
      const before = game.assault.zombies.offset[at];
      const gone = game.assault.zombies.progress[at];

      swing(game);
      expect(game.assault.zombies.hp[at]).toBe(1);
      expect(game.assault.zombies.knockedFor[at]).toBeCloseTo(0.3, 6);
      expect(game.assault.zombies.progress[at]).toBe(gone); // never backwards (spec 03-8)

      // An offset is measured across the rail, so this is what it moved by, in
      // blocks and in a heading. (spec 03-7)
      const shift = game.assault.zombies.offset[at] - before;
      expect(Math.abs(shift)).toBeCloseTo(0.75, 6);
      const rail = railAng(game.assault.city.rails, 0, gone);
      const movedX = -Math.sin(rail) * shift;
      const movedZ = Math.cos(rail) * shift;
      expect(movedX * Math.cos(facing) + movedZ * Math.sin(facing)).toBeGreaterThan(0);
    }
  });

  it('never takes an advance back, however long one strikes', () => {
    // spec 03-8, 04-34: an advance never decreases, and that is the formal reason
    // an assault always ends.
    const game = ready();
    const at = put(game, ZOMBIE.COLOSSUS, 0, 0, 30);
    let gone = game.assault.zombies.progress[at];
    for (let i = 0; i < 600; i += 1) {
      const px = game.assault.zombies.x[at];
      const pz = game.assault.zombies.z[at];
      stand(game, px - 1.5, 0, pz);
      stepSword(game, HELD, SECONDS);
      stepZombies(game, SECONDS);
      const now = game.assault.zombies.progress[at];
      expect(now).toBeGreaterThanOrEqual(gone);
      gone = now;
    }
  });

  it('holds the colossus not at all, and does not shift the bruiser', () => {
    // spec 04-35: the colossus does not flinch, and the bruiser takes 0,15
    // second of halted advance without being shifted an inch.
    const game = ready();
    const huge = put(game, ZOMBIE.COLOSSUS, 2, 0, 30);
    const stout = put(game, ZOMBIE.BRUISER, 1, 0, 30);
    const offsets = [game.assault.zombies.offset[huge], game.assault.zombies.offset[stout]];

    swing(game);
    expect(game.assault.zombies.knockedFor[huge]).toBe(0);
    expect(game.assault.zombies.knockedFor[stout]).toBeCloseTo(0.15, 6);
    expect(game.assault.zombies.offset[huge]).toBe(offsets[0]);
    expect(game.assault.zombies.offset[stout]).toBe(offsets[1]);
  });
});

describe('the fatal blow', () => {
  it('takes the body out of the world and leaves nothing on the ground', () => {
    // spec 03-19, 03-21: the head goes off, the body comes apart, and no corpse,
    // no mark and no blood is left anywhere.
    const game = ready();
    put(game, ZOMBIE.SHAMBLER, 2, 0);
    expect(game.assault.zombies.count).toBe(1);

    swing(game);
    expect(game.assault.zombies.count).toBe(0);
    expect(counted(game.assault.events, EVENT.FATAL_BLOW)).toBe(1);
    expect(counted(game.assault.events, EVENT.SWORD_HIT)).toBe(0);
    // The buffer says the fatal blow and the sweep, and nothing else at all: a
    // coin belongs to chapter 6, and nothing is put down. (spec 03-20, 03-21)
    expect(game.assault.events.count).toBe(2);
  });

  it('names the kind, so the shards fly in its colour', () => {
    // spec 07-30: the shards of a fatal blow are the colour of the kind.
    for (const type of [ZOMBIE.SHAMBLER, ZOMBIE.SPRINTER]) {
      const game = ready();
      put(game, type, 2, 0);
      swing(game);
      const events = game.assault.events;
      let said = -1;
      for (let i = 0; i < events.count; i += 1) {
        if (events.type[i] === EVENT.FATAL_BLOW) said = events.value[i];
      }
      expect(said).toBe(type);
    }
  });

  it('fells everything the one sweep held, and not one of them twice', () => {
    // spec 04-23: everything in the sweep is touched by the same blow.
    const game = ready();
    for (let i = 0; i < 5; i += 1) putAway(game, ZOMBIE.SHAMBLER, (i - 2) * 0.2, 1 + i * 0.4);
    swing(game);
    expect(game.assault.zombies.count).toBe(0);
    expect(counted(game.assault.events, EVENT.FATAL_BLOW)).toBe(5);
  });
});

describe('the attack button', () => {
  it('never does anything else, wherever he stands', () => {
    // spec 04-59: the attack button never does anything but strike.
    const game = ready();
    const cannons = game.snapshot.cannons;
    cannons.x[0] = 0.5;
    cannons.z[0] = 0;
    cannons.hp[0] = BALANCE.cannon.hp;
    cannons.tier[0] = 1;
    cannons.magazine[0] = 1;
    cannons.count = 1;
    game.snapshot.coins = 40;
    game.snapshot.armful = 3;
    const hall = game.snapshot.townHall.hp;
    const cap = game.snapshot.townHall.cap;

    swing(game, 600);
    expect(game.snapshot.coins).toBe(40);
    expect(game.snapshot.armful).toBe(3);
    expect(cannons.count).toBe(1);
    expect(cannons.tier[0]).toBe(1);
    expect(cannons.magazine[0]).toBe(1);
    expect(cannons.hp[0]).toBe(BALANCE.cannon.hp);
    expect(game.snapshot.townHall.hp).toBe(hall);
    expect(game.snapshot.townHall.cap).toBe(cap);
    expect(game.snapshot.wave).toBe(1);
  });

  it('strikes not at all on a ladder, nor staggered, nor down on the floor', () => {
    // spec 04-13, 04-39, 04-42: the sword is stowed on a ladder, a contact
    // staggers him for a second, and a collapse puts him on the floor for three.
    const table: [string, (game: Game) => void][] = [
      ['ladder', (game) => (game.assault.player.climbLeft = 0.8)],
      ['staggered', (game) => (game.assault.player.staggerLeft = 1)],
      ['collapsed', (game) => (game.assault.player.collapseLeft = 3)],
    ];
    for (const [name, hold] of table) {
      const game = ready();
      const at = put(game, ZOMBIE.BRUISER, 1, 0);
      hold(game);
      swing(game, 30);
      expect(`${name} ${game.assault.zombies.hp[at]}`).toBe(`${name} ${BALANCE.bruiser.hp}`);
      expect(`${name} ${counted(game.assault.events, EVENT.SWEEP)}`).toBe(`${name} 0`);
    }
  });
});

describe('the first blow of a new game', () => {
  it('falls towards the fourth second, with the button held from the start', () => {
    // spec 01-23: the first blow of the sword falls towards the fourth second.
    // spec 02-30, 03-31: the four shamblers of wave one stand twenty blocks up
    // street one when the curtain goes up, so the child who runs at them and
    // holds the button fells one before he has had time to wonder what to do.
    const game = createGame(BALANCE, 20260829);
    placePlayer(game);
    beginAssault(game);
    const input = createInput();
    input.strike = true;

    // He opens on the square, nine blocks off the axis of street one and turned
    // down it (spec 01-22), so running at them is the two legs of 04-8: out
    // through the mouth, which is the one way in, then straight at the four of
    // them. Standing off sideways is what keeps this blow in the fourth second —
    // stepping back along the axis instead would land it under three.
    const mouth = BALANCE.city.apothem; // 16 (spec 02-6)
    const packAt = mouth + BALANCE.city.street.firstPackAt; // 36 (spec 02-30)
    const player = game.assault.player;

    let fellAt = -1;
    for (let i = 0; i < 600 && fellAt < 0; i += 1) {
      const through = player.x > mouth - 0.5 && Math.abs(player.z) < BALANCE.city.street.width / 2;
      const toX = (through ? packAt : mouth) - player.x;
      const toZ = -player.z;
      const away = Math.hypot(toX, toZ);
      input.dx = toX / away;
      input.dz = toZ / away;
      clearEvents(game.assault.events);
      step(game, input);
      for (let e = 0; e < game.assault.events.count; e += 1) {
        if (game.assault.events.type[e] === EVENT.FATAL_BLOW) fellAt = i;
      }
    }
    expect(fellAt).toBeGreaterThan(0);
    expect(fellAt * SECONDS).toBeGreaterThan(3);
    expect(fellAt * SECONDS).toBeLessThan(5);
  });
});
