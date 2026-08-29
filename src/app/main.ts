/**
 * Where a run is composed, and the only file that names both a balance and a
 * canvas. It hands the constants to `createGame`, hangs the one context on the
 * one canvas, builds the one scene, wires the two entries onto the one
 * `InputState`, and gives the loop to the frames. Everything it wires is decided
 * elsewhere; nothing is decided here. (spec 10-15)
 *
 * The scene it opens holds the one hour, the city under it and the bodies that
 * walk it; the cannons and the effects each arrive with their own chapter, into
 * this same scene. The camera that watches all of it is handed its constants
 * here and then left entirely alone: nothing in this file, and nothing the child
 * can press, ever aims it. (spec 04-19, 04-20)
 */
import { BALANCE } from '../game/balance';
import { placePlayer } from '../game/player';
import { EVENT, createGame, createInput } from '../game/state';
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
let scene = createScene(BALANCE.city);
raise();

/** Puts the city and the bodies into the scene, from the grid the rules engender. */
function raise(): void {
  scene.add(buildCity(game.assault.city, BALANCE.city, sheet).node);
  scene.add(characters.node);
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

const loop = createLoop(game, input, {
  // Once per step, never once a frame: a rising edge belongs to one step alone.
  // (spec 10-31)
  sample: () => {
    sampleInput(input, pad, keys);
  },
  // The one reading of the buffer, before anything is drawn. The audio and the
  // effects join it here, with their chapters. (spec 10-18, 10-19)
  read: (held) => {
    const events = held.assault.events;
    for (let i = 0; i < events.count; i += 1) {
      // A blow of his sword, whether it touches or not, freezes the recentring
      // of the camera — and the fatal blow is deliberately not one of them: it
      // names whatever landed it, a cannon included. (spec 04-17)
      const kind = events.type[i];
      if (kind === EVENT.SWORD_HIT || kind === EVENT.SWORD_MISS) freezeRecentring(camera);
    }
  },
  draw: (held, alpha, now) => {
    if (senseQuality(quality, now)) fit(); // a tier that moves moves the resolution
    if (!mayDraw(quality, now)) return; // the last tier holds the drawing at 30
    placeCharacters(characters, held.assault.player, alpha);
    aimCamera(camera, held.assault.city, held.assault.player, alpha, now);
    context.renderer.render(scene, camera.lens);
  },
});

// A screen that changes size is not a reason to hold the game up. (spec 08)
window.addEventListener('resize', fit);
fit();
startLoop(loop);
