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
import {
  DIAMOND,
  EVENT,
  type EventBuffer,
  PHASE,
  STREETS,
  createGame,
  createInput,
} from '../game/state';
import { reinforcementNotch, reinforcementPrice } from '../game/townhall';
import { beginAssault } from '../game/waves';
import { loadAtlas } from '../render/atlas';
import {
  buildCannons,
  layDiamond,
  placeCannons,
  pourCells,
  raiseCannon,
  retractConveyor,
} from '../render/cannons';
import {
  acrossOf,
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
  swingSword,
  swingZombie,
} from '../render/characters';
import { buildCity, buildCrown, showCrown } from '../render/city';
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
  layArc,
  placeBalls,
  placeCoins,
  placeShards,
  scatter,
  strike,
  sweepArc,
} from '../render/effects';
import {
  createHud,
  loseSegments,
  reinforceBar,
  showNotch,
  strikeSegment,
  writeHud,
} from '../render/hud';
import { createScene } from '../render/scene';
import { createQuality, mayDraw, senseQuality, tierOf } from '../render/quality';
import { createAirlock, openAirlock, pressAirlock, senseWidth } from './airlock';
import { createPad, pollPad } from './gamepad';
import { sampleInput } from './input';
import { createKeys, listenKeys } from './keyboard';
import { createLoop, frame, startLoop, stopLoop } from './loop';
import { createThumbs, eraseThumbs, fitThumbs, listenThumbs, showAction } from './touch';

const canvas = document.getElementById('view') as HTMLCanvasElement;

// The seed of a real run arrives with the chapter that opens a game; until then
// every run draws the same offsets off the same stream. (spec 10-27)
const game = createGame(BALANCE);
const input = createInput();
const quality = createQuality();

// He stands on the square in front of the base, clear of the shed, which is
// where a game opens and where a resumed one picks up. (spec 01-22, 08-71)
placePlayer(game);

// A game opens on the assault of wave one, with its four shamblers already
// standing twenty blocks up street one: nothing at all comes before it, and
// nothing pops into being in plain view. (spec 01-16, 03-31)
beginAssault(game);

// The two entries the game is designed for — the gamepad and the touch screen —
// and the keyboard that is only a shortcut for testing. All three write the one
// `InputState`, and nothing below this floor can tell them apart.
// (spec 04-56, 10-30)
const pad = createPad();
const thumbs = createThumbs((name) => document.getElementById(name));
listenThumbs(thumbs);
const keys = createKeys();
listenKeys(keys);

// The one image of the whole game, and the one city it clothes. (spec 07-43)
const sheet = loadAtlas();
// Sized for every body the game can hold at once: the player and the pool of
// zombies. (spec 10-13)
// The armful he carries rides over his head in that same mesh, and only he ever
// carries one. (spec 04-47)
const characters = buildCharacters(1 + BALANCE.pools.zombies, BALANCE.player.armful);
// Sized for the pool of cannons, which is a technical bound and never a rule:
// nothing here counts them either. (spec 05-52, 10-13)
// The opening of the cone goes in here, where the balance is named, because it
// rides in the geometry rather than in an instance. (spec 05-30, 07-38)
const cannons = buildCannons(BALANCE.pools.cannons, BALANCE.cannon.flame.arc);
// The six hundred shards, allocated at load and never again: the quality scale
// lowers what they hold, and the simulation hears nothing of it. (spec 07-27, 10-39)
// The balls in the air ride in the same mesh, since a ball has no call of its
// own, and they are seats of their own past the six hundred. (spec 07-32)
const effects = buildEffects(
  BALANCE.pools.shards,
  BALANCE.pools.coins,
  BALANCE.pools.projectiles,
);
holdShards(effects, tierOf(quality).shards);
// What a reinforcement builds on the town hall, sized at load for the widest
// notch it will ever hold: putting one up seats blocks and allocates nothing.
// The notch is read off the stuff it wears and never off a figure. (spec 06-37)
const crown = buildCrown(BALANCE.city, sheet);
let scene = createScene(BALANCE.city);
raise();

/** Puts the city, the bodies and the shards into the scene, from the grid the rules engender. */
function raise(): void {
  scene.add(buildCity(game.assault.city, BALANCE.city, sheet).node);
  // The scene is a projection of the state, so the town hall comes back wearing
  // the notch it stands at, whatever asked for the scene. (spec 10-37)
  scene.add(crown.node);
  showCrown(crown, reinforcementNotch(game));
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

/**
 * The five displays over the world, and the five constants of the game they
 * read: ten segments whatever the notch, five pips, three streets at most, three
 * left at which the figure goes white, and the prices of chapter 6 which this
 * one only shows. They are handed over here, where the balance is named, exactly
 * as every other constant of the drawing is. (spec 08-13, 08-20, 08-36, 08-40,
 * 10-15)
 *
 * The nodes are found on the page rather than built, because the page carries
 * them and its sheet carries the two dispositions, every size and every colour:
 * this is the one file that knows a browser at all. (spec 08-11)
 */
const hud = createHud((name) => document.getElementById(name), {
  segments: BALANCE.economy.townHallSegments,
  pips: BALANCE.player.hp,
  streets: STREETS,
  few: BALANCE.assault.beaconsAt,
  prices: BALANCE.economy.prices,
});

// The picto takes the stuff of the notch the town hall stands at, and the fourth
// badge the price of the notch to come — read off the state at load exactly as
// the crown is, and off the one fact of the buffer ever after. (spec 08-15, 08-26)
showNotch(hud, reinforcementNotch(game), reinforcementPrice(game));

/**
 * The end of a game, which the rules say once and the drawing does the rest of:
 * the hud erases in one second, the fade closes over the world in under three,
 * and the one thing it carries is the number of the wave reached — no word of
 * text, no red, nothing tallied up. The look, the lengths and the ground it
 * stops on are all in the sheet of `index.html`, exactly as the hud's are.
 * (spec 01-28, 01-29, 01-30, 08-63)
 *
 * It lives here and not in `src/render/hud.ts` because it is not a sixth display
 * of the hud and never becomes one: 08-63 has the hud erase and the fade stay.
 * The Sas the fade opens on is at the foot of this file, with everything else
 * that opens it. (spec 01-31, 08-52, 08-63)
 */
const displays = document.getElementById('hud') as HTMLElement;
const veil = document.getElementById('fade') as HTMLElement;
const reached = document.getElementById('reached') as HTMLElement;

/**
 * Whether the town hall has fallen. From that moment there is nothing left to
 * resume, whatever else asks for the Sas: it opens on the one door of a new
 * game. (spec 08-63, 01-31)
 */
let fallen = false;

function closeGame(wave: number): void {
  fallen = true;
  displays.className = 'gone';
  // The targets go out with them, and stop taking a press at once: there is
  // nothing left to steer behind a fade. (spec 08-5, 08-63)
  eraseThumbs(thumbs);
  reached.textContent = String(wave);
  veil.className = 'on';
}

/**
 * Where each gateway falls across the screen, from -1 at the left border to +1 at
 * the right. It is the one thing an arrow takes from the camera, and it is filled
 * here, once a frame, into an array made at load. (spec 08-32, 10-14)
 */
const across = new Float32Array(STREETS);

const context = createContext(canvas, {
  // The scene is a projection of the state, so it is simply built again — the
  // city included, since no datum of the game lives only on the GPU. (spec 10-37)
  repopulate: () => {
    scene = createScene(BALANCE.city);
    raise();
    fit();
  },
  // The GPU has taken the context back: the Sas opens while the scene is put up
  // again, and it is **not** closed when the GPU comes back — nothing in this
  // game ever resumes on its own, so the child presses. (spec 10-38, 08-61, 08-62)
  onLost: () => {
    openAirlock(airlock);
  },
});

/** The screen, and the resolution the tier in force asks for. */
function fit(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  resize(context, width, height, tierOf(quality).ratio);
  fitCamera(camera, width, height);
  // A window that merely changes size never holds the game up: one threshold
  // does, and it is this one. (spec 08-9, 08-62)
  senseWidth(airlock, width);
  // And the swing of the floating stick, which is the one size of the touch
  // surface the sheet cannot settle on its own. (spec 08-10, 08-46)
  fitThumbs(thumbs, width, height);
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

/**
 * The scale each of the four kinds stands at — 1, 0,8, 1,4 and 2,2 — read off
 * those same four lines once, at load, and handed to the drawing every frame. It
 * is a figure of the rules, so it is named here and nowhere under `src/render/`,
 * exactly as every other constant of the balance is. (spec 03-2, 10-14, 10-15)
 */
const KIND_SCALES = KINDS.map((kind) => kind.scale);

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

/**
 * How long an armful takes to go into a magazine, and how long a belt takes to
 * pull back to the base, in ms. Both are chapter 4's, read here where the
 * balance is named: the cells fill over the one, and the line home shortens over
 * the other. (spec 04-49, 04-55)
 */
const POUR_SPAN = BALANCE.cannon.pourTime * 1000;
const RETRACT_SPAN = BALANCE.cannon.conveyorRetract * 1000;

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
  // The heading the camera watches is what a stick is turned onto, and this is
  // the one file that holds the pad and the camera at once. It is the reading
  // the last frame left, which is a frame of lag on a view that swings at 2,4
  // radians a second — a fortieth of a turn — and it is the only direction the
  // picture ever runs in: nothing here aims the camera, and the entries the
  // rules are handed carry no picture at all. (spec 04-16, 04-19, 10-29, 10-30)
  sample: () => {
    sampleInput(input, pad, thumbs, keys, camera.ang);
    // The one press that asks for the Sas: Start on a pad, the little door
    // under the phase strip, or the escape key. The steps this frame still owed
    // are dropped along with the rest of its time, so the step under way is the
    // last one that runs. (spec 04-57, 08-59, 08-68)
    if (input.airlock) openAirlock(airlock);
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
        // And the arm goes with it: the same 150 ms, on the one body the child
        // drives, so that what he presses is something he watches happen rather
        // than something he reads off the zombies that fall. (spec 07-65)
        swingSword(characters, now);
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
      // A ball landing its blow is the second way a body takes one, and it is a
      // fact of its own because the sound of the sword is not owed to it: there
      // is no sound of a ball landing at all.
      // (spec 05-24, 07-36, 09 "Ce qui déclenche chacun")
      else if (kind === EVENT.CANNONBALL_HIT) blow(events, STRUCK.ZOMBIE, i, now);
      else if (kind === EVENT.TOWN_HALL_HIT) {
        blow(events, STRUCK.TOWN_HALL, i, now);
        // And the arm of whatever landed it goes with it, which the `index` names:
        // the same 150 ms of half sine he strikes with, so a body hammering the
        // town hall is watched doing it rather than read off a bar going down.
        // (spec 03-17, 07-65, 07-67)
        swingZombie(characters, events.index[i], now);
        // And in the hud, the segment being eaten lights white for 80 ms. It
        // comes before the segment lost of the same blow, which is what makes
        // the segment being eaten the one still standing. (spec 08-16)
        strikeSegment(hud);
      }
      // A tenth of the ceiling gone: the segments past what is left go almost
      // black, and only a reinforcement brings one back. The count rides in the
      // fact, so nothing compares two states. (spec 08-18, 10-19)
      else if (kind === EVENT.TOWN_HALL_SEGMENT_LOST) loseSegments(hud, events.value[i]);
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
      // A reinforcement paid for: the whole of what it builds goes up in one
      // movement, at the notch the fact carries, and that is the one thing that
      // brings back what has come off the town hall. Nothing anywhere draws a
      // figure of it. (spec 06-36, 06-37)
      else if (kind === EVENT.REINFORCEMENT_BOUGHT) {
        showCrown(crown, events.value[i]);
        // And in the hud, the whole bar back with white filling it from left to
        // right in 400 ms, the picto on the stuff of its new notch, and the
        // fourth badge on the price of the notch to come. (spec 08-17, 08-26)
        reinforceBar(hud, events.value[i], reinforcementPrice(game));
      }
      // A cannon going down, which takes 0,3 second and comes up out of the
      // ground over it. What it looks like once it is up is read off the pool,
      // never off a comparison of two states. (spec 05-7, 10-19)
      else if (kind === EVENT.CANNON_PLACED) {
        raiseCannon(cannons, events.x[i], events.z[i], PLACE_SPAN, now);
      }
      // An armful going into a magazine: the cells that arrive come up over the
      // 0,3 second of the gesture, off what it held before. (spec 04-49)
      else if (kind === EVENT.ARMFUL_POURED) {
        pourCells(cannons, events.x[i], events.z[i], events.value[i], POUR_SPAN, now);
      }
      // A cannon gone. A third tier had a belt, and the belt pulls back to the
      // base over one second: it never goes on its own account, since nothing in
      // this game can take one down. (spec 04-55, 05-50)
      else if (kind === EVENT.CANNON_LOST && events.value[i] >= BALANCE.cannon.tiers) {
        retractConveyor(cannons, events.x[i], events.y[i], events.z[i], RETRACT_SPAN, now);
      }
      // The town hall at nought: the game is over, and it is the one end there
      // is. The wave reached rides in the fact, so nothing here reads the state
      // to find out which one it was. (spec 01-28, 01-30, 10-19)
      else if (kind === EVENT.GAME_ENDED) closeGame(events.value[i]);
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
    // The hud, before the tier of quality has its say: it is DOM over the canvas
    // and costs no draw call at all, so a frame held back at 30 is no reason for
    // a figure to go stale. It writes only what has moved, and a game standing
    // still writes nothing. (spec 08-11, 08-12)
    //
    // The gateways are read against the camera where the last frame left it,
    // which is a frame of lag on a spot quantised to a hundredth of the screen.
    const gateways = held.assault.city.gateways;
    for (let s = 0; s < STREETS; s += 1) {
      across[s] = acrossOf(camera, gateways.x[s], gateways.z[s]);
    }
    writeHud(hud, held, held.assault.phase === PHASE.PREP, across);
    // And the act target with it, for the same reason: it is DOM over the
    // canvas, it costs no draw call, and it writes only when the answer under
    // his feet has moved. It is there only when an action is possible, and it
    // wears the picto of what it will do. (spec 08-48, 04-58)
    showAction(thumbs, held.assault.diamond.shows);

    if (!mayDraw(quality, now)) return; // the last tier holds the drawing at 30
    // The whole cast in one call: the one body the child drives, and every
    // zombie standing in the city — the same fourteen boxes, told apart by the
    // colour and the scale of their kind. The white flash of 80 ms on whichever
    // of them has just taken a blow is read off the lights the buffer armed a
    // moment ago, so nothing here compares two states.
    // (spec 03-2, 07-19, 07-21, 07-36, 10-19)
    placeCharacters(
      characters,
      effects,
      held.assault.player,
      held.assault.zombies,
      KIND_SCALES,
      alpha,
      now,
      isBlinking(effects, now),
      // What he carries, one cube a bomb over his head and never in the hud.
      // (spec 04-47)
      held.snapshot.armful,
    );
    // The cannons, and under his feet the question he is asking: wide and white
    // a cannon goes down, tight white and breathing the one within three blocks
    // moves up, wide and black there is nothing left to do here. The rules
    // settled which; the drawing takes the shape of the answer and never the
    // constant that names it. (spec 05-17, 05-18, 10-2)
    placeCannons(
      cannons,
      held.snapshot.cannons,
      BALANCE.cannon,
      alpha,
      now,
      // Where every belt runs home to, which is the middle of the shed.
      // (spec 02-8, 04-52)
      held.assault.city.baseX,
      held.assault.city.baseZ,
    );
    const asking = held.assault.diamond;
    layDiamond(
      cannons,
      asking.x,
      asking.y,
      asking.z,
      asking.reach,
      asking.shows !== DIAMOND.NONE,
      // Tight and breathing wherever a press acts on what stands here — pouring
      // into a cannon, upgrading one, filling his arms at the shed, reinforcing
      // the town hall at one of its three free faces — and wide only where a
      // cannon goes down. Three readings, more senses than three.
      // (spec 05-17, 06-30, 06-31)
      asking.shows !== DIAMOND.PLACE && asking.shows !== DIAMOND.NONE,
      BALANCE.cannon,
      now,
    );
    // The coins lying in the city, and the ones on their way to him. (spec 06-8, 07-35)
    placeCoins(effects, held.assault.coins, held.assault.player, alpha, now);
    // Whatever of the arc of a sweep this frame owes: it is written along the
    // blade over the 150 ms of the gesture rather than laid whole, so a frame
    // of it comes before the shards are placed. (spec 07-31, 07-66)
    layArc(effects, now);
    // The shards run on the frame, not on the step: they are erased in ms.
    // (spec 07-28, 10-22)
    placeShards(effects, now);
    // The balls in the air, their trails and their marks, in the same mesh and
    // after them: a ball is read off the rules like a coin lying in the city, and
    // the bell it flies is the whole of what is added here. (spec 05-25, 07-32)
    placeBalls(effects, held.assault.projectiles, BALANCE.cannon.ball.flight, alpha);
    aimCamera(camera, held.assault.city, held.assault.player, alpha, now);
    context.renderer.render(scene, camera.lens);
  },
});

/**
 * The Sas, and the one thing it is: the only screen there is when the game is
 * not running. It is wired here because this is the one file that holds the
 * loop, the pad, the page and the state all four at once — the Sas freezes the
 * first, reads the second every frame, wears the third, and shows the number of
 * the wave off the fourth. (spec 08-52, 08-54)
 */
let played = false;

const airlock = createAirlock((name) => document.getElementById(name), {
  wave: () => game.snapshot.wave,
  // A game that has fallen has nothing left to resume, and a page that has just
  // loaded has nothing yet: the door of a new game stands alone in both.
  // (spec 08-57, 08-63)
  standing: () => played && !fallen,
  // Asked for every frame the Sas stands open: without this reading, Safari
  // never hands a pad over and `gamepadconnected` never fires. (spec 08-54)
  pads: () => pollPad(pad),
  // Time never crosses it: the loop stops where it stands, and the steps this
  // frame still owed are dropped rather than run behind the veil.
  // (spec 08-55, 08-68)
  freeze: () => {
    loop.clock.steps = 0;
    stopLoop(loop);
  },
  // And it starts again owing nothing at all, however long the Sas stood open:
  // the gap it leaves is not a gap of the game. (spec 08-68, 10-22)
  thaw: () => {
    loop.clock.last = -1;
    loop.clock.owed = 0;
    played = true;
    startLoop(loop);
  },
  /*
   * A new game. The one `Game` is allocated at load and never replaced (spec
   * 10-10), so a game already played is let go of by throwing away the
   * Instantané and asking the page for itself again: it comes back on the Sas
   * with nothing to resume, one door and one press — which is also the press
   * Safari wants. A game not yet played **is** the new one, and the press that
   * leaves is the whole of it.
   *
   * The throwing away is the Instantané's own — `clearSnapshot()` of
   * `src/app/storage.ts`, which arrives with its chapter — and this is where it
   * hangs: a game is left by the fall of the town hall or by a new game, and by
   * nothing else. (spec 08-76)
   */
  renew: () => {
    if (!played) return;
    location.reload();
  },
  // The `AudioContext` comes back in the very handler of the press that leaves
  // the Sas — `sound` of `AirlockHooks` — and never on `visibilitychange`. It
  // is left unwired until the sounds themselves arrive. (spec 08-83)
});

/*
 * Everything that opens the Sas, and it is the table of chapter 8 entire. Not
 * one of them ever closes it: it is always a press that leaves, and a window
 * that merely changes size is not an interruption at all.
 * (spec 08-9, 08-61, 08-62)
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') openAirlock(airlock);
});
window.addEventListener('pagehide', () => {
  // Nothing is written here, and nothing ever will be: the disk is already up
  // to date at every moment the browser stops promising anything.
  // (spec 08-73, 10-36)
  openAirlock(airlock);
});
// A pad gone, and only if a pad was the last entry used: a child playing with
// his fingers is not interrupted by a pad running flat three rooms away.
// (spec 08-62, 08 "Les interruptions")
window.addEventListener('gamepaddisconnected', () => {
  if (airlock.onPad) openAirlock(airlock);
});
window.addEventListener('gamepadconnected', () => {
  airlock.onPad = true;
});
window.addEventListener('pointerdown', () => {
  airlock.onPad = false;
});
// The keyboard is a shortcut for testing, here as everywhere else: it leaves
// the Sas by the door put forward, and it says a pad is not what is in hand.
// (spec 04-56)
window.addEventListener('keydown', () => {
  airlock.onPad = false;
  pressAirlock(airlock);
});
// The town hall at nought: the hud erases, the fade closes over the world
// carrying the number of the wave reached, and the Sas opens on what it leaves
// — with the one door of a new game, since there is nothing left to resume.
// (spec 01-31, 08-63)
veil.addEventListener('animationend', () => {
  openAirlock(airlock);
});

// A screen that changes size is not a reason to hold the game up. (spec 08-9)
window.addEventListener('resize', fit);

// A page opens on the Sas, always: it is the press that leaves it that hands
// Safari the pad, the sound its gesture and the wake lock back. Nothing has
// been played yet, so the door of a new game stands alone.
// (spec 08-52, 08-53, 08-57, 08-62)
openAirlock(airlock);
fit();
// One picture of the city before anything runs, so the Sas has a game to darken
// behind it at the first screen exactly as it has at every other. It owes no
// step: the clock has no frame before this one to measure from.
// (spec 08-55, 10-22)
frame(loop, 0);
