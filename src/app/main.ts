/**
 * Where a run is composed, and the only file that names both a balance and a
 * canvas. It hands the constants to `createGame`, hangs the one context on the
 * one canvas, builds the one scene, and gives the loop to the frames. Everything
 * it wires is decided elsewhere; nothing is decided here. (spec 10-15)
 *
 * The scene it opens is empty on purpose: the city, the bodies, the cannons and
 * the effects each arrive with their own chapter, into this same scene.
 */
import * as THREE from 'three';
import { BALANCE } from '../game/balance';
import { createGame, createInput } from '../game/state';
import { createContext, resize } from '../render/context';
import { createScene } from '../render/scene';
import { createQuality, mayDraw, senseQuality, tierOf } from '../render/quality';
import { createLoop, startLoop } from './loop';

const canvas = document.getElementById('view') as HTMLCanvasElement;

// The seed of a real run arrives with the chapter that opens a game; nothing
// draws on the generator yet. (spec 10-27)
const game = createGame(BALANCE);
const input = createInput();
const quality = createQuality();

let scene = createScene(BALANCE.city);

/**
 * The one camera, and it is provisional: chapter 4 decides the assisted camera,
 * and it will land in `render/camera.ts`. Its far plane clears the haze, which
 * stops at the edge of the city. (spec 07-6)
 */
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, BALANCE.city.side);
camera.position.set(0, 12, 24);
camera.lookAt(0, 0, 0);

const context = createContext(canvas, {
  // The scene is a projection of the state, so it is simply built again. For now
  // the state has nothing in it to build. (spec 10-37)
  repopulate: () => {
    scene = createScene(BALANCE.city);
    fit();
  },
});

/** The screen, and the resolution the tier in force asks for. */
function fit(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  resize(context, width, height, tierOf(quality).ratio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const loop = createLoop(game, input, {
  // The audio and the effects read the buffer here, with their chapters. (spec 10-19)
  read: () => {},
  draw: (_game, _alpha, now) => {
    if (senseQuality(quality, now)) fit(); // a tier that moves moves the resolution
    if (!mayDraw(quality, now)) return; // the last tier holds the drawing at 30
    context.renderer.render(scene, camera);
  },
});

// A screen that changes size is not a reason to hold the game up. (spec 08)
window.addEventListener('resize', fit);
fit();
startLoop(loop);
