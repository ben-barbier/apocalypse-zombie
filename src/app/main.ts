/**
 * Where a run is composed, and the only file that names both a balance and a
 * canvas. It hands the constants to `createGame`, hangs the one context on the
 * one canvas, builds the one scene, wires the two entries onto the one
 * `InputState`, and gives the loop to the frames. Everything it wires is decided
 * elsewhere; nothing is decided here. (spec 10-15)
 *
 * The scene it opens holds the one hour, the city under it, the bodies that walk
 * it, the cannons they walk past and the shards every effect of the game is made
 * of.
 *
 * The one reading of the buffer of events lives here, and it deals out what it
 * finds: the drawing takes types from the rules and never their constants, so
 * the enumeration is named in this file and nowhere under `src/render/`.
 * (spec 10-2, 10-18, 10-19)
 *
 * The camera that watches all of it is handed its constants here and then left
 * entirely alone: nothing in this file, and nothing the child can press, ever
 * aims it. (spec 04-19, 04-20)
 */
import { BALANCE } from '../game/balance';
import { placePlayer } from '../game/player';
import { DIAMOND, EVENT, type EventBuffer, createGame, createInput } from '../game/state';
import { beginAssault } from '../game/waves';
import { loadAtlas } from '../render/atlas';
import { buildCannons, layDiamond, placeCannons, raiseCannon } from '../render/cannons';
import {
  aimCamera,
  createCamera,
  fitCamera,
  freezeRecentring,
  settleCamera,
} from '../render/camera';
import {
  BODY_MIDDLE,
  KIND_COLOURS,
  buildCharacters,
  flingHead,
  placeCharacters,
} from '../render/characters';
import { buildCity } from '../render/city';
import { createContext, resize } from '../render/context';
import {
  COIN,
  COIN_FLIGHT,
  PRIORITY,
  STRUCK,
  type Struck,
  blink,
  buildEffects,
  flyCoin,
  holdShards,
  isBlinking,
  placeCoins,
  placeShards,
  scatter,
  strike,
  sweepArc,
} from '../render/effects';
import { createScene } from '../render/scene';
import { createQuality, mayDraw, senseQuality, tierOf } from '../render/quality';
import { createPad } from './gamepad';
import { sampleInput } from './input';
import { createKeys, listenKeys } from './keyboard';
import { createLoop, startLoop } from './loop';

const canvas = document.getElementById('view') as HTMLCanvasElement;

// The seed of a real run arrives with the chapter that opens a game; until then
// every run draws the same offsets off the same stream. (spec 10-27)
const game = createGame(BALANCE);
const input = createInput();
const quality = createQuality();

// He stands at the base, in front of the town hall, which is where a game opens
// and where a resumed one picks up. (spec 01-22, 08-71)
placePlayer(game);

// A game opens on the assault of wave one, with its four shamblers already
// standing twenty blocks up street one: nothing at all comes before it, and
// nothing pops into being in plain view. (spec 01-16, 03-31)
beginAssault(game);

// The two entries that write the one `InputState`: the gamepad the game is
// designed for, and the keyboard that is only a shortcut for testing. The touch
// screen arrives with chapter 8, into this same object. (spec 04-56, 10-30)
const pad = createPad();
const keys = createKeys();
listenKeys(keys);

// The one image of the whole game, and the one city it clothes. (spec 07-43)
const sheet = loadAtlas();
// Sized for every body the game can hold at once: the player and the pool of
// zombies. (spec 10-13)
const characters = buildCharacters(1 + BALANCE.pools.zombies);
// Sized for the pool of cannons, which is a technical bound and never a rule:
// nothing here counts them either. (spec 05-52, 10-13)
const cannons = buildCannons(BALANCE.pools.cannons);
// The six hundred shards, allocated at load and never again: the quality scale
// lowers what they hold, and the simulation hears nothing of it. (spec 07-27, 10-39)
const effects = buildEffects(BALANCE.pools.shards, BALANCE.pools.coins);
holdShards(effects, tierOf(quality).shards);
let scene = createScene(BALANCE.city);
raise();

/** Puts the city, the bodies and the shards into the scene, from the grid the rules engender. */
function raise(): void {
  scene.add(buildCity(game.assault.city, BALANCE.city, sheet).node);
  scene.add(characters.node);
  scene.add(cannons.node);
  scene.add(effects.node);
}

/**
 * The one camera, assisted and commanded by nobody: it takes the six constants
 * of chapter 4 and places itself from there on. Nothing in this file ever aims
 * it, and no entry reaches it. (spec 04-15 to 04-20)
 */
const camera = createCamera(BALANCE.camera, BALANCE.city);
settleCamera(camera, game.assault.city, game.assault.player);

const context = createContext(canvas, {
  // The scene is a projection of the state, so it is simply built again — the
  // city included, since no datum of the game lives only on the GPU. (spec 10-37)
  repopulate: () => {
    scene = createScene(BALANCE.city);
    raise();
    fit();
  },
});

/** The screen, and the resolution the tier in force asks for. */
function fit(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  resize(context, width, height, tierOf(quality).ratio);
  fitCamera(camera, width, height);
}

/**
 * One blow taken, at the spot the buffer names for it. The three kinds of blow
 * differ by what lights white, and by nothing else. (spec 07-36)
 */
function blow(events: Readonly<EventBuffer>, what: Struck, at: number, now: number): void {
  strike(effects, what, events.index[at], events.x[at], events.y[at], events.z[at], now);
}

/** The four lines of the balance, in the order the rules name the kinds. (spec 03-2) */
const KINDS = [BALANCE.shambler, BALANCE.sprinter, BALANCE.bruiser, BALANCE.colossus];

/** The sector of a blow in radians: the balance writes it in degrees. (spec 04-22, 10-16) */
const SWEEP_ARC = (BALANCE.sword.arc * Math.PI) / 180;

/**
 * A body felled: about ten shards in the colour of its kind, and the head thrown
 * spinning. The count and the span are chapter 3's — gone in 0,6 second — and how
 * fast they open is the drawing's own. Nothing is put down on
 * the ground, here or anywhere: no corpse, no mark, no blood. The picture holds
 * 60 ms on it, and the loop arms that itself off this same fact.
 * (spec 03-19, 03-21, 07-30, 10-26)
 */
const FELLED_SHARDS = 10;
const FELLED_SPEED = 3;
const FELLED_SPAN = BALANCE.assault.shardsLast * 1000;

/**
 * The two states of a body that has been walked into, in ms, and they are
 * chapter 4's: a second staggered, then a second untouchable — and three
 * seconds of that second state alone when he gets back up, which is the one
 * exception the chapter grants itself. The rates they blink at are chapter 7's
 * and live with the drawing; the lengths are read here, where the balance is
 * named. (spec 04-39, 04-42, 07-41)
 */
const STAGGER_BLINK = BALANCE.player.stagger * 1000;
const UNTOUCHABLE_BLINK = BALANCE.player.invulnerable * 1000;
const RISEN_BLINK = BALANCE.player.riseInvulnerable * 1000;

/**
 * The spray of the payment that closes an assault, thrown from the town hall in
 * the gold of the coins it pays. How many, how fast and how long are the
 * drawing's own: chapter 7 settles that it is a spray of shards from the town
 * hall and no measurement of it, and chapter 6 settles that the spray and the
 * purse going up are the whole of what is seen — no screen, no tally, no text.
 * (spec 06-16, 07-37)
 */
const SPRAY = 24;
const SPRAY_SPEED = 6;
const SPRAY_SPAN = 900;

/**
 * How long a cannon takes to go down, in ms. It is chapter 5's 0,3 second, read
 * here where the balance is named, and it is the whole of what the placing costs:
 * a cannon comes up out of the ground over it. (spec 05-7)
 */
const PLACE_SPAN = BALANCE.cannon.placeTime * 1000;

function fell(events: Readonly<EventBuffer>, at: number, now: number): void {
  const kind = events.value[at];
  const scale = KINDS[kind].scale;
  const x = events.x[at];
  const y = events.y[at];
  const z = events.z[at];
  scatter(
    effects,
    PRIORITY.FATAL,
    FELLED_SHARDS,
    x,
    y + BODY_MIDDLE * scale,
    z,
    KIND_COLOURS[kind],
    FELLED_SPEED,
    FELLED_SPAN,
    now,
  );
  flingHead(characters, x, y, z, scale, kind, FELLED_SPAN, now);
}

const loop = createLoop(game, input, {
  // Once per step, never once a frame: a rising edge belongs to one step alone.
  // (spec 10-31)
  sample: () => {
    sampleInput(input, pad, keys);
  },
  // The one reading of the buffer, before anything is drawn. The audio and the
  // effects join it here, with their chapters. (spec 10-18, 10-19)
  read: (held, now) => {
    const events = held.assault.events;
    for (let i = 0; i < events.count; i += 1) {
      const kind = events.type[i];

      // Every blow of his sword, touched or not, draws its white arc and freezes
      // the recentring of the camera for 1,2 s — which is why the sweep is one
      // fact of its own and not read off what the blow happened to find. A fatal
      // blow is deliberately not one of them: it names whatever landed it, a
      // cannon included. (spec 04-17, 07-31)
      if (kind === EVENT.SWEEP) {
        freezeRecentring(camera);
        sweepArc(
          effects,
          events.x[i],
          events.y[i],
          events.z[i],
          events.value[i],
          SWEEP_ARC,
          BALANCE.sword.range,
          now,
        );
      }

      // Whatever takes a blow — a zombie, a block of the town hall, a cannon —
      // throws a puff of white shards and lights white for 80 ms. The same call
      // for the three of them, and no special case anywhere. (spec 07-36)
      if (kind === EVENT.SWORD_HIT) blow(events, STRUCK.ZOMBIE, i, now);
      else if (kind === EVENT.TOWN_HALL_HIT) blow(events, STRUCK.TOWN_HALL, i, now);
      else if (kind === EVENT.CANNON_HIT) blow(events, STRUCK.CANNON, i, now);
      // The one thing a fatal blow puts into the world, and it puts it in the air.
      // (spec 03-19, 03-21, 07-30)
      else if (kind === EVENT.FATAL_BLOW) fell(events, i, now);
      // A coin he has just walked past, on its way to him. It is his already —
      // the rules paid the purse the instant he passed — and this is only what
      // the eye is shown of it. (spec 06-7, 06-12, 07-35)
      else if (kind === EVENT.COIN_TAKEN) {
        flyCoin(effects, events.x[i], events.y[i], events.z[i], events.value[i], COIN_FLIGHT, now);
      }
      // The town hall paying what closes an assault: one spray of shards, and
      // the purse going up. Nothing else says it. (spec 06-16, 07-37)
      else if (kind === EVENT.ASSAULT_BONUS) {
        scatter(
          effects,
          PRIORITY.PLAIN,
          SPRAY,
          events.x[i],
          events.y[i],
          events.z[i],
          COIN,
          SPRAY_SPEED,
          SPRAY_SPAN,
          now,
        );
      }
      // A cannon going down, which takes 0,3 second and comes up out of the
      // ground over it. What it looks like once it is up is read off the pool,
      // never off a comparison of two states. (spec 05-7, 10-19)
      else if (kind === EVENT.CANNON_PLACED) {
        raiseCannon(cannons, events.x[i], events.z[i], PLACE_SPAN, now);
      }
      // The one body the child drives answers a blow with a rhythm rather than
      // with a flash: white at 2 Hz while he is staggered, then the same sped up
      // to 6 Hz while he is untouchable. He goes down with neither — being on
      // the floor is its own state — and gets up with three seconds of the fast
      // one alone. (spec 04-39, 04-42, 07-41)
      else if (kind === EVENT.CONTACT) blink(effects, STAGGER_BLINK, UNTOUCHABLE_BLINK, now);
      else if (kind === EVENT.COLLAPSE) blink(effects, 0, 0, now);
      else if (kind === EVENT.RISE) blink(effects, 0, RISEN_BLINK, now);
    }
  },
  draw: (held, alpha, now) => {
    if (senseQuality(quality, now)) {
      fit(); // a tier that moves moves the resolution
      holdShards(effects, tierOf(quality).shards); // and, one tier on, the shards
    }
    if (!mayDraw(quality, now)) return; // the last tier holds the drawing at 30
    placeCharacters(characters, held.assault.player, alpha, now, isBlinking(effects, now));
    // The cannons, and under his feet the question he is asking: wide and white
    // a cannon goes down, tight white and breathing the one within three blocks
    // moves up, wide and black there is nothing left to do here. The rules
    // settled which; the drawing takes the shape of the answer and never the
    // constant that names it. (spec 05-17, 05-18, 10-2)
    placeCannons(cannons, held.snapshot.cannons, BALANCE.cannon, alpha, now);
    const asking = held.assault.diamond;
    layDiamond(
      cannons,
      asking.x,
      asking.y,
      asking.z,
      asking.reach,
      asking.shows !== DIAMOND.NONE,
      asking.shows === DIAMOND.UPGRADE,
      BALANCE.cannon,
      now,
    );
    // The coins lying in the city, and the ones on their way to him. (spec 06-8, 07-35)
    placeCoins(effects, held.assault.coins, held.assault.player, alpha, now);
    // The shards run on the frame, not on the step: they are erased in ms.
    // (spec 07-28, 10-22)
    placeShards(effects, now);
    aimCamera(camera, held.assault.city, held.assault.player, alpha, now);
    context.renderer.render(scene, camera.lens);
  },
});

// A screen that changes size is not a reason to hold the game up. (spec 08)
window.addEventListener('resize', fit);
fit();
startLoop(loop);
