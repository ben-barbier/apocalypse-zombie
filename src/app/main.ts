/**
 * Where a run is composed, and the only file that names both a balance and a
 * canvas. It hands the constants to `createGame`, hangs the one context on the
 * one canvas, builds the one scene, wires the two entries onto the one
 * `InputState`, and gives the loop to the frames. Everything it wires is decided
 * elsewhere; nothing is decided here. (spec 10-15)
 *
 * The scene it opens holds the one hour, the city under it, the bodies that walk
 * it and the shards every effect of the game is made of; the cannons arrive with
 * their own chapter, into this same scene.
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
import { EVENT, type EventBuffer, createGame, createInput } from '../game/state';
import { loadAtlas } from '../render/atlas';
import {
  aimCamera,
  createCamera,
  fitCamera,
  freezeRecentring,
  settleCamera,
} from '../render/camera';
import { buildCharacters, placeCharacters } from '../render/characters';
import { buildCity } from '../render/city';
import { createContext, resize } from '../render/context';
import {
  STRUCK,
  type Struck,
  buildEffects,
  holdShards,
  placeShards,
  strike,
} from '../render/effects';
import { createScene } from '../render/scene';
import { createQuality, mayDraw, senseQuality, tierOf } from '../render/quality';
import { createPad } from './gamepad';
import { sampleInput } from './input';
import { createKeys, listenKeys } from './keyboard';
import { createLoop, startLoop } from './loop';

const canvas = document.getElementById('view') as HTMLCanvasElement;

// The seed of a real run arrives with the chapter that opens a game; nothing
// draws on the generator yet. (spec 10-27)
const game = createGame(BALANCE);
const input = createInput();
const quality = createQuality();

// He stands at the base, in front of the town hall, which is where a game opens
// and where a resumed one picks up. (spec 01-22, 08-71)
placePlayer(game);

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
// The six hundred shards, allocated at load and never again: the quality scale
// lowers what they hold, and the simulation hears nothing of it. (spec 07-27, 10-39)
const effects = buildEffects(BALANCE.pools.shards);
holdShards(effects, tierOf(quality).shards);
let scene = createScene(BALANCE.city);
raise();

/** Puts the city, the bodies and the shards into the scene, from the grid the rules engender. */
function raise(): void {
  scene.add(buildCity(game.assault.city, BALANCE.city, sheet).node);
  scene.add(characters.node);
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
      // A blow of his sword, whether it touches or not, freezes the recentring
      // of the camera — and the fatal blow is deliberately not one of them: it
      // names whatever landed it, a cannon included. (spec 04-17)
      const kind = events.type[i];
      if (kind === EVENT.SWORD_HIT || kind === EVENT.SWORD_MISS) freezeRecentring(camera);

      // Whatever takes a blow — a zombie, a block of the town hall, a cannon —
      // throws a puff of white shards and lights white for 80 ms. The same call
      // for the three of them, and no special case anywhere. (spec 07-36)
      if (kind === EVENT.SWORD_HIT) blow(events, STRUCK.ZOMBIE, i, now);
      else if (kind === EVENT.TOWN_HALL_HIT) blow(events, STRUCK.TOWN_HALL, i, now);
      else if (kind === EVENT.CANNON_HIT) blow(events, STRUCK.CANNON, i, now);
    }
  },
  draw: (held, alpha, now) => {
    if (senseQuality(quality, now)) {
      fit(); // a tier that moves moves the resolution
      holdShards(effects, tierOf(quality).shards); // and, one tier on, the shards
    }
    if (!mayDraw(quality, now)) return; // the last tier holds the drawing at 30
    placeCharacters(characters, held.assault.player, alpha);
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
