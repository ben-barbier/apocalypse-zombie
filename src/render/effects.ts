/**
 * The shards, and the white light of a blow taken.
 *
 * The shard — a small cube of a quarter of a block — is the one primitive of
 * effect of the whole game: everything that happens at a moment is a cloud of
 * them. There is no flat picture turned towards the camera anywhere, no machine
 * of its own for a cloud of specks, no shader of its own, and nothing
 * translucent: a shard is a cube like everything else here. (spec 07-25, 07-26)
 *
 * One `InstancedMesh` carries them all, over a fixed pool of six hundred
 * allocated at load, and a frame allocates none of them: what is erased hands
 * its slot back. The pool never grows. When it is full it gives up the weakest
 * shard alive, in the order chapter 7 sets — a fatal blow before the mark, the
 * mark before a trail, a trail before the plain sort — and refuses outright when
 * nothing alive matters less than what is asked for. (spec 07-27, 07-29, 10-14)
 *
 * A shard is erased by lightening towards white, never by dissolving: nothing in
 * this game is translucent, and that is what lets the depth buffer range the
 * scene on its own. (spec 07-17, 07-28)
 *
 * It takes neither the light nor the haze: a cannon firing at the far end of a
 * street must be seen to fire, and the pure white of "it has just happened" must
 * stay pure white. (spec 07-8, 07-11, 07-12)
 *
 * The one effect this file carries is the one every chapter shares: whatever
 * takes a blow — a zombie, a block of the town hall, a cannon — throws a puff of
 * white shards and lights white for 80 ms. What each chapter throws of its own
 * arrives with that chapter, through `scatter`, and adds nothing here.
 * (spec 07-36)
 *
 * Nothing here ever compares two states. The facts come from the buffer of
 * events, which `src/app/main.ts` reads once a frame and deals out: the drawing
 * takes types from the rules and never their constants, so the one reading of
 * the buffer keeps its one home. (spec 10-2, 10-18, 10-19)
 *
 * The pool is not in `Game`, and that is the whole reason it lives here: the
 * quality scale takes it from 600 down to 200 without the simulation ever
 * hearing of it. (spec 10-39)
 */
import * as THREE from 'three';
import type { CoinPool, Player } from '../game/state';

/** A quarter of a block, and the one size a shard ever has. (spec 07-25) */
export const SHARD_SIDE = 0.25;

/**
 * Pure white, one of the two colours of the action, and the colour a blow taken
 * throws. (spec 07-12, 07-36)
 */
export const WHITE = '#ffffff';

/**
 * Matte black, the second of the two colours of the action. It says one thing
 * and one thing only — **this is picked up** — so it is the colour of the rim
 * and of nothing else here. (spec 07-12, 07-13)
 */
export const BLACK = '#000000';

/**
 * The gold a coin is drawn in. It is read off the palette of what is played
 * rather than chosen: that palette owns exactly one gold, and the three other
 * yellows in the game each name a street, so a coin wearing one of those would
 * read as a street. It is the colour a colossus wears as well, and that costs
 * nothing — one is a quarter of a block lying on the floor, the other is two
 * blocks and a half walking down it.
 * (spec 07-35, 07 "La palette de ce qui se joue")
 */
export const COIN = '#ffd24a';

/**
 * What is asked for first when the pool is full: a fatal blow, then the mark,
 * then a trail, then everything else. The higher gives way to nothing below it.
 * (spec 07-29)
 */
export const PRIORITY = {
  /** Everything that is only there to be seen, and the first to give up its slot. */
  PLAIN: 0,
  /** What follows a ball through the air. (spec 07-33) */
  TRAIL: 1,
  /** What says where a ball is going to land. (spec 07-34) */
  MARK: 2,
  /** What a fatal blow throws, and it gives way to nothing. (spec 07-30) */
  FATAL: 3,
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

/**
 * The three things that take a blow, and there are no others: a zombie, a block
 * of the town hall, a cannon. Each of them lights white for 80 ms, and the
 * drawing that carries it asks `isLit` whether to paint it white this frame.
 * (spec 07-36, 07-40)
 */
export const STRUCK = {
  ZOMBIE: 0,
  TOWN_HALL: 1,
  CANNON: 2,
} as const;

export type Struck = (typeof STRUCK)[keyof typeof STRUCK];

/** How long what takes a blow stays white, in ms. (spec 07-36) */
export const LIT_FOR = 80;

/**
 * The two rates the one body the child drives blinks at, in blinks a second.
 *
 * He is the fourth thing that takes a blow and the only one that answers with a
 * rhythm rather than with a flash: white at **2 Hz while he is staggered**, then
 * **the same accelerated to 6 Hz while he is untouchable** — two states told
 * apart by one signal, which is why the fast one is the slow one sped up and not
 * a second colour: white is the one colour of "it has just happened", and there
 * is no red anywhere in this game to say anything else with. (spec 07-12, 07-15,
 * 07-41)
 *
 * How long each of the two runs is not written here: it is chapter 4's, read off
 * the balance by whoever reads the buffer of events — a second and a second
 * after a contact, three seconds of the fast one after he gets up. This file
 * knows the two rates and nothing else. (spec 04-39, 04-42)
 */
export const BLINK_SLOW = 2;
export const BLINK_FAST = 6;

/**
 * The puff of a blow taken, erased in the same 80 ms the white light lasts.
 * (spec 07-36, 07 "Ce que chaque effet consomme")
 *
 * Chapter 7 counts the clouds it counts — ten and the head for a fatal blow,
 * four for a trail, four for the mark — and calls this one a puff without a
 * number. Six sits where the word puts it: under the ten of a fatal blow, over
 * the four of a mark, so a blow taken never reads as a body coming apart. The
 * speed goes with it — three blocks a second opens the puff by about a shard's
 * own side in the 80 ms it lives, which is a burst and not a throw. Both are the
 * drawing's own, and no rule of the game reads either.
 */
export const PUFF = 6;
export const PUFF_SPEED = 3;
export const PUFF_SPAN = 80;

/**
 * How large a coin lies, in blocks, for what it is worth.
 *
 * A coin of one is **exactly a shard** — a quarter of a block — and the side
 * grows as the fourth root of what the coin is worth: 0,25 for a shambler,
 * 0,30 for a sprinter, 0,37 for a bruiser, 0,45 for a bruiser the sword felled,
 * 0,66 for the colossus and 0,79 for the colossus the sword felled.
 *
 * The spec settles the **order** and no measurement at all — a bruiser's is
 * larger than a shambler's, and one the sword earned larger still — so the law
 * is the drawing's own, and it is the one place the bravery bonus is ever shown:
 * there is no multiplier, no floating figure and no combo, here or anywhere.
 * The fourth root is what folds a hundredfold worth into a threefold side, so
 * the largest coin of the game still lies well under one block, which is the one
 * measure this city gives anything. (spec 06-9, 06-10, 07-25, 07-35)
 */
export function coinSide(worth: number): number {
  return SHARD_SIDE * Math.pow(worth < 1 ? 1 : worth, 0.25);
}

/**
 * How thick the black rim runs around a coin, in blocks. The rim is the whole of
 * "take me", it rings the coin and the firebomb and nothing else in the game, and
 * it is drawn as the far faces of a slightly larger black cube — so it shows as a
 * border and never hides what it rings. (spec 07-13, 07-16)
 */
export const RIM = 0.03;

/**
 * How fast a coin turns, in radians a second, and how far it floats over the
 * floor. Chapter 7 settles that it turns and no measurement of it, so both are
 * the drawing's own. (spec 07-35)
 */
const COIN_SPIN = 2.4;
const COIN_LIFT = 0.02;

/**
 * How long a coin takes to be drawn into him, in ms, and how high up his body it
 * lands. In the rules the coin is his the instant he passes, which is what lets
 * him buy in the middle of a fight; what these two say is only how long the eye
 * is given to see it go. (spec 06-12, 07-35)
 */
export const COIN_FLIGHT = 180;
const COIN_TO = 1;

/**
 * How many things can be white at once. 80 ms is under five frames at 60 Hz, an
 * assault holds sixty zombies at the very most (spec 10 "Les pools"), and one
 * blow lights one thing: sixty-four is well past what a twelfth of a second of
 * blows can light. Should it ever fill, the one that goes out soonest gives up
 * its slot rather than anything growing. (spec 10-13, 10-14)
 */
const LITS = 64;

/**
 * The directions a cloud opens along: a fixed spiral over the sphere, walked
 * from a cursor that moves on, so two clouds in a row do not open the same way.
 * No chance is drawn here — the one generator of this game lives in the rules,
 * and the drawing has none of its own.
 */
const SPREADS = 64;
const SPREAD_X = new Float32Array(SPREADS);
const SPREAD_Y = new Float32Array(SPREADS);
const SPREAD_Z = new Float32Array(SPREADS);

{
  // The golden angle, which is what keeps the spiral from ever lining up.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < SPREADS; i += 1) {
    const high = 1 - (2 * (i + 0.5)) / SPREADS;
    const ring = Math.sqrt(1 - high * high);
    const about = i * golden;
    SPREAD_X[i] = Math.cos(about) * ring;
    SPREAD_Y[i] = high;
    SPREAD_Z[i] = Math.sin(about) * ring;
  }
}

/**
 * The pool and the white lights, in structures of arrays like every pool of this
 * game. A shard holds where it started and where it drifts, so a frame reads its
 * place off its age and integrates nothing: there is no gap between frames to
 * carry, and a shard placed twice at the same moment lands twice in the same
 * spot. Live shards are `[0, count)`. (spec 10-11, 10-13)
 */
export interface Effects {
  /** Everything they draw, under one node the scene takes in one go. */
  readonly node: THREE.Group;
  /** One entry per call of a frame. (spec 10 "Le budget de rendu") */
  readonly draws: readonly THREE.InstancedMesh[];
  /** All the shards of the game, in one call. (spec 07-27) */
  readonly shards: THREE.InstancedMesh;
  /**
   * The coins lying in the city and the ones on their way to him, in one call,
   * and the black rims that ring them in a second. Two calls for every coin the
   * game can hold, however many lie about. (spec 07-16, 07-35)
   */
  readonly coins: THREE.InstancedMesh;
  readonly rims: THREE.InstancedMesh;

  /** Where a shard was thrown from, in blocks. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  /** Where it goes, in blocks a second, and it never bends. */
  readonly dx: Float32Array;
  readonly dy: Float32Array;
  readonly dz: Float32Array;
  /** The colour it leaves from, before it lightens towards white. (spec 07-28) */
  readonly red: Float32Array;
  readonly green: Float32Array;
  readonly blue: Float32Array;
  /** The frame timestamp it was thrown at, in ms, and how long until it is gone. */
  readonly born: Float64Array;
  readonly span: Float32Array;
  /** Which of the four priorities of 07-29 it holds. */
  readonly priority: Uint8Array;
  /** Live shards are `[0, count)`. */
  count: number;
  /** How many the quality tier in force allows, 600 or 200. (spec 10-39) */
  holds: number;
  /** Where the next cloud takes its directions from. */
  spreadAt: number;

  /** What is white just now: what it is, which one, and until when. (spec 07-36) */
  readonly litWhat: Uint8Array;
  readonly litIndex: Uint16Array;
  readonly litUntil: Float64Array;

  /**
   * The blink of the one body the child drives: when it was armed, in ms, and
   * how long each of its two rates runs. There is one such body and there will
   * never be a second, so this is three numbers and not a pool. (spec 04-1, 07-41)
   */
  blinkFrom: number;
  blinkSlowFor: number;
  blinkFastFor: number;

  /**
   * The coins on their way to him, in structures of arrays like every pool of
   * this game. They ride in the same two meshes as the ones still lying, so they
   * cost no call of their own, and no rule of the game knows of them: a coin is
   * his the instant he passes it, and what flies here is what the eye is shown
   * of that. It is armed off the buffer of events and never off a second state.
   * (spec 06-12, 07-35, 10-11, 10-19)
   */
  readonly takenX: Float32Array;
  readonly takenY: Float32Array;
  readonly takenZ: Float32Array;
  /** What it was worth, which is how large it flies. (spec 06-9) */
  readonly takenValue: Float32Array;
  /** The frame timestamp it was taken at, in ms, and how long until it is home. */
  readonly takenBorn: Float64Array;
  readonly takenSpan: Float32Array;
  /** Coins in the air are `[0, count)`. */
  takenCount: number;
}

// The one set of scratch objects of this file, made once at load: a frame writes
// hundreds of matrices and allocates none of them. (spec 10-14)
const SPOT = new THREE.Vector3();
const FLAT = new THREE.Quaternion();
const SIZE = new THREE.Vector3(SHARD_SIDE, SHARD_SIDE, SHARD_SIDE);
const SEAT = new THREE.Matrix4();
const PAINT = new THREE.Color();
const TURN = new THREE.Quaternion();
const UPRIGHT = new THREE.Vector3(0, 1, 0);
const SPAN = new THREE.Vector3();

/**
 * Builds the meshes and the pools, at load — and again after a lost context,
 * because the scene is a projection of the state and no datum of the game lives
 * only on the GPU. `holds` is the six hundred of chapter 7, which the quality
 * scale then lowers without ever allocating again; `coins` is how many can lie
 * in the city at once, and the quality scale never touches it — it is a datum of
 * the game and not an effect. (spec 07-27, 10-13, 10-37, 10-39)
 */
export function buildEffects(holds: number, coins: number): Effects {
  const shards = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    // Unlit, opaque, and blind to the haze: white must come out pure white, and
    // a cannon firing at the far end of a street must be seen to fire.
    // (spec 07-8, 07-12, 07-17)
    new THREE.MeshBasicMaterial(),
    holds,
  );
  shards.name = 'shards';
  const paint = shards.material as THREE.MeshBasicMaterial;
  paint.fog = false;
  shards.count = 0;

  // The colour of every slot is written once here, so the attribute exists
  // before the first frame and no frame ever makes one. (spec 10-14)
  PAINT.set(WHITE);
  for (let i = 0; i < holds; i += 1) shards.setColorAt(i, PAINT);

  // A coin lying and a coin on its way to him ride in the same mesh, so the
  // whole of the money of an assault is two calls whatever falls. (spec 07-21)
  const held = coins * 2;
  const lying = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    // Unlit and blind to the haze, like everything else in this file: a coin at
    // the far end of a street must be seen to be there. (spec 07-8, 07-17)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(COIN) }),
    held,
  );
  lying.name = 'coins';
  (lying.material as THREE.MeshBasicMaterial).fog = false;
  lying.count = 0;

  const rims = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    // The far faces of a slightly larger black cube, which is the whole of the
    // rim: the near ones are dropped, so what shows is a border around the coin
    // and never a black box over it. It is opaque like everything else, and the
    // depth buffer is what ranges the two. (spec 07-16, 07-17)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(BLACK), side: THREE.BackSide }),
    held,
  );
  rims.name = 'rims';
  (rims.material as THREE.MeshBasicMaterial).fog = false;
  rims.count = 0;

  const node = new THREE.Group();
  node.add(shards);
  node.add(lying);
  node.add(rims);

  return {
    node,
    draws: [shards, lying, rims],
    shards,
    coins: lying,
    rims,
    x: new Float32Array(holds),
    y: new Float32Array(holds),
    z: new Float32Array(holds),
    dx: new Float32Array(holds),
    dy: new Float32Array(holds),
    dz: new Float32Array(holds),
    red: new Float32Array(holds),
    green: new Float32Array(holds),
    blue: new Float32Array(holds),
    born: new Float64Array(holds),
    span: new Float32Array(holds),
    priority: new Uint8Array(holds),
    count: 0,
    holds,
    spreadAt: 0,
    litWhat: new Uint8Array(LITS),
    litIndex: new Uint16Array(LITS),
    litUntil: new Float64Array(LITS),
    blinkFrom: 0,
    blinkSlowFor: 0,
    blinkFastFor: 0,
    takenX: new Float32Array(coins),
    takenY: new Float32Array(coins),
    takenZ: new Float32Array(coins),
    takenValue: new Float32Array(coins),
    takenBorn: new Float64Array(coins),
    takenSpan: new Float32Array(coins),
    takenCount: 0,
  };
}

/**
 * How many shards the quality tier in force allows — 600 at the top, 200 from
 * the third tier on. Nothing is allocated and nothing is freed: what is over the
 * new ceiling is simply let go. The simulation hears nothing of it. (spec 10-39)
 */
export function holdShards(effects: Effects, holds: number): void {
  const most = effects.priority.length;
  effects.holds = holds < 0 ? 0 : holds > most ? most : holds;
  if (effects.count > effects.holds) effects.count = effects.holds;
}

/** Moves one shard, whole, from one slot to another. */
function carryShard(effects: Effects, from: number, to: number): void {
  effects.x[to] = effects.x[from];
  effects.y[to] = effects.y[from];
  effects.z[to] = effects.z[from];
  effects.dx[to] = effects.dx[from];
  effects.dy[to] = effects.dy[from];
  effects.dz[to] = effects.dz[from];
  effects.red[to] = effects.red[from];
  effects.green[to] = effects.green[from];
  effects.blue[to] = effects.blue[from];
  effects.born[to] = effects.born[from];
  effects.span[to] = effects.span[from];
  effects.priority[to] = effects.priority[from];
}

/** How far a shard has gone towards being erased, from 0 to 1 and past it. */
function erasedBy(effects: Effects, at: number, now: number): number {
  const span = effects.span[at];
  if (!(span > 0)) return 1;
  return (now - effects.born[at]) / span;
}

/**
 * Finds the slot a new shard takes, or -1 when it is refused. A free slot first;
 * failing that the weakest shard alive — the lowest priority, and among equals
 * the one nearest to being erased — and nothing at all when even the weakest
 * matters more than what is asked for. The pool never grows. (spec 07-29, 10-14)
 */
function takeSlot(effects: Effects, asked: number, now: number): number {
  if (effects.count < effects.holds) {
    const free = effects.count;
    effects.count = free + 1;
    return free;
  }

  let weakest = -1;
  let weakestOf = 0;
  let mostErased = 0;
  for (let i = 0; i < effects.count; i += 1) {
    const priority = effects.priority[i];
    const erased = erasedBy(effects, i, now);
    if (weakest < 0 || priority < weakestOf || (priority === weakestOf && erased > mostErased)) {
      weakest = i;
      weakestOf = priority;
      mostErased = erased;
    }
  }
  if (weakest < 0 || weakestOf > asked) return -1;
  return weakest;
}

/**
 * Throws a cloud of shards from one spot: `many` of them, opening at `speed`
 * blocks a second along the fixed spiral, in `colour`, erased over `span` ms by
 * lightening towards white. This is the one way anything in this game makes an
 * effect happen — a fatal blow, an arc, a trail, a mark, a coin, a puff — and no
 * chapter adds a second one. (spec 07-25, 07-26, 07-28)
 *
 * A cloud the pool refuses is dropped whole rather than half thrown: every shard
 * of it holds the same priority, so what refuses the first refuses them all.
 * (spec 07-29)
 */
export function scatter(
  effects: Effects,
  priority: Priority,
  many: number,
  x: number,
  y: number,
  z: number,
  colour: string,
  speed: number,
  span: number,
  now: number,
): void {
  PAINT.set(colour);
  const red = PAINT.r;
  const green = PAINT.g;
  const blue = PAINT.b;
  let thrown = 0;

  for (let n = 0; n < many; n += 1) {
    const at = takeSlot(effects, priority, now);
    if (at < 0) break;
    const way = (effects.spreadAt + n) % SPREADS;
    effects.x[at] = x;
    effects.y[at] = y;
    effects.z[at] = z;
    effects.dx[at] = SPREAD_X[way] * speed;
    effects.dy[at] = SPREAD_Y[way] * speed;
    effects.dz[at] = SPREAD_Z[way] * speed;
    effects.red[at] = red;
    effects.green[at] = green;
    effects.blue[at] = blue;
    effects.born[at] = now;
    effects.span[at] = span;
    effects.priority[at] = priority;
    thrown += 1;
  }

  effects.spreadAt = (effects.spreadAt + thrown) % SPREADS;
}

/** Which slot holds the white light of this one thing, or where to put it. */
function litSlot(effects: Effects, what: Struck, index: number, now: number): number {
  let free = -1;
  let soonest = 0;
  let soonestAt = 0;
  for (let i = 0; i < LITS; i += 1) {
    const until = effects.litUntil[i];
    if (until <= now) {
      if (free < 0) free = i;
      continue;
    }
    if (effects.litWhat[i] === what && effects.litIndex[i] === index) return i;
    if (soonestAt === 0 || until < soonestAt) {
      soonestAt = until;
      soonest = i;
    }
  }
  return free >= 0 ? free : soonest;
}

/**
 * Lights one thing white for 80 ms. A second blow on the same thing puts the
 * 80 ms back rather than taking a second slot. (spec 07-36)
 */
export function lightUp(effects: Effects, what: Struck, index: number, now: number): void {
  const at = litSlot(effects, what, index, now);
  effects.litWhat[at] = what;
  effects.litIndex[at] = index;
  effects.litUntil[at] = now + LIT_FOR;
}

/**
 * Whether this one thing is white this frame. The drawing that carries it — the
 * bodies, the town hall, the cannons — asks once per thing and paints white
 * instead of its own colour while the answer is yes. (spec 07-36)
 */
export function isLit(effects: Effects, what: Struck, index: number, now: number): boolean {
  for (let i = 0; i < LITS; i += 1) {
    if (effects.litUntil[i] <= now) continue;
    if (effects.litWhat[i] === what && effects.litIndex[i] === index) return true;
  }
  return false;
}

/**
 * The arc of a sweep: white shards laid along the sector in front of him, at the
 * range of the blow, erased in 150 ms. It is drawn at every blow, whether it
 * touched anything or not. (spec 04-22, 07-31)
 *
 * It adds no primitive of its own — it is `scatter` called one shard at a time
 * along the arc, which is the whole of "an arc of shards" and the reason the
 * pool never sees anything new. They are laid still rather than thrown: what
 * reads as a stroke is the shape they hold for those 150 ms.
 *
 * How many, and how high he holds the sword, are the drawing's own: no rule of
 * the game reads either.
 */
export const ARC = 9;
export const ARC_SPAN = 150;
const ARC_AT = 1.2;

export function sweepArc(
  effects: Effects,
  x: number,
  y: number,
  z: number,
  ang: number,
  arc: number,
  range: number,
  now: number,
): void {
  const half = arc / 2;
  for (let i = 0; i < ARC; i += 1) {
    const turn = ang - half + (arc * i) / (ARC - 1);
    scatter(
      effects,
      PRIORITY.PLAIN,
      1,
      x + Math.cos(turn) * range,
      y + ARC_AT,
      z + Math.sin(turn) * range,
      WHITE,
      0,
      ARC_SPAN,
      now,
    );
  }
}

/**
 * A blow taken, and the one effect this file carries for every chapter that will
 * ever land one: a puff of white shards, and the thing struck white for 80 ms.
 * Zombie, block of the town hall or cannon, it is the same two lines — there is
 * no special case per chapter. (spec 07-36)
 */
export function strike(
  effects: Effects,
  what: Struck,
  index: number,
  x: number,
  y: number,
  z: number,
  now: number,
): void {
  scatter(effects, PRIORITY.PLAIN, PUFF, x, y, z, WHITE, PUFF_SPEED, PUFF_SPAN, now);
  lightUp(effects, what, index, now);
}

/**
 * Sends one coin off to him, from the spot it lay at. It is armed off the one
 * fact the rules write when he passes within four blocks of a coin, and it is
 * gone when its span runs out — it lands nowhere and nothing is left where it
 * lay. In the rules the coin was his the instant he passed; this is only what
 * the eye is shown of that. (spec 06-7, 06-12, 07-35, 10-19)
 *
 * The pool holds one entry per coin the city can hold, so it fills only if he
 * walks past every coin of an assault inside a fifth of a second; should it ever,
 * the coin is let go rather than anything growing. (spec 10-14)
 */
export function flyCoin(
  effects: Effects,
  x: number,
  y: number,
  z: number,
  worth: number,
  span: number,
  now: number,
): void {
  const at = effects.takenCount;
  if (at >= effects.takenValue.length) return;
  effects.takenX[at] = x;
  effects.takenY[at] = y;
  effects.takenZ[at] = z;
  effects.takenValue[at] = worth;
  effects.takenBorn[at] = now;
  effects.takenSpan[at] = span;
  effects.takenCount = at + 1;
}

/** Moves one coin in the air, whole, from one slot to another. */
function carryTaken(effects: Effects, from: number, to: number): void {
  effects.takenX[to] = effects.takenX[from];
  effects.takenY[to] = effects.takenY[from];
  effects.takenZ[to] = effects.takenZ[from];
  effects.takenValue[to] = effects.takenValue[from];
  effects.takenBorn[to] = effects.takenBorn[from];
  effects.takenSpan[to] = effects.takenSpan[from];
}

/**
 * Seats one coin and its rim, turning about the upright, and hands back the slot
 * that comes next. The rim is the same cube grown by its thickness on every side
 * and drawn back faces first, which is what makes a border of it. (spec 07-16,
 * 07-35)
 */
function seatCoin(
  effects: Effects,
  at: number,
  x: number,
  y: number,
  z: number,
  worth: number,
  now: number,
): number {
  const side = coinSide(worth);
  TURN.setFromAxisAngle(UPRIGHT, (now / 1000) * COIN_SPIN);
  SPOT.set(x, y + side / 2 + COIN_LIFT, z);

  SPAN.set(side, side, side);
  effects.coins.setMatrixAt(at, SEAT.compose(SPOT, TURN, SPAN));
  const ringed = side + RIM * 2;
  SPAN.set(ringed, ringed, ringed);
  effects.rims.setMatrixAt(at, SEAT.compose(SPOT, TURN, SPAN));
  return at + 1;
}

/** Where a frame sits between two spots. (spec 10-24) */
function between(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/**
 * Places every coin of the frame: the ones lying in the city, read straight off
 * the pool of the rules, and the ones on their way to him, read off this file's
 * own. It allocates nothing and it grows nothing. (spec 10-14)
 *
 * A coin lying does not move at all — it has no `Prev` buffer to sit between,
 * because it lies still until he passes — so only the ones in the air are
 * interpolated, and they are interpolated onto him. (spec 06-8, 10-24)
 *
 * What is drawn says two things and no more: **the rim says it is picked up, the
 * size says what it is worth.** There is no figure over it, no multiplier and no
 * combo, and the bravery bonus is shown here and nowhere else in the whole game.
 * (spec 06-9, 06-10, 06-11, 07-13)
 */
export function placeCoins(
  effects: Effects,
  lying: Readonly<CoinPool>,
  player: Readonly<Player>,
  alpha: number,
  now: number,
): void {
  let put = 0;
  for (let at = 0; at < lying.count; at += 1) {
    put = seatCoin(effects, put, lying.x[at], lying.y[at], lying.z[at], lying.value[at], now);
  }

  const toX = between(player.xPrev, player.x, alpha);
  const toY = between(player.yPrev, player.y, alpha) + COIN_TO;
  const toZ = between(player.zPrev, player.z, alpha);
  let live = 0;

  for (let i = 0; i < effects.takenCount; i += 1) {
    const span = effects.takenSpan[i];
    if (!(span > 0)) continue;
    const gone = (now - effects.takenBorn[i]) / span;
    if (gone >= 1) continue; // it is home, and nothing is left where it lay
    if (live !== i) carryTaken(effects, i, live);

    const flown = gone < 0 ? 0 : gone;
    put = seatCoin(
      effects,
      put,
      between(effects.takenX[live], toX, flown),
      between(effects.takenY[live], toY, flown),
      between(effects.takenZ[live], toZ, flown),
      effects.takenValue[live],
      now,
    );
    live += 1;
  }

  effects.takenCount = live;
  effects.coins.count = put;
  effects.rims.count = put;
  effects.coins.instanceMatrix.needsUpdate = true;
  effects.rims.instanceMatrix.needsUpdate = true;
}

/**
 * Arms the blink of the one body the child drives: `slowFor` ms at 2 Hz, then
 * `fastFor` ms at 6 Hz. The two spans come from chapter 4 and arrive with the
 * fact that armed them, so this file settles the rhythm and never the length.
 * A second call replaces the first outright rather than queueing behind it: what
 * has just happened to him is what is shown. Two zeros put it out. (spec 07-41)
 *
 * It throws no shards. What takes a blow in the world puffs and lights white for
 * 80 ms; he answers with a rhythm instead, which is what tells the two states
 * apart without a word and without a colour of alarm. (spec 07-36, 07-41)
 */
export function blink(effects: Effects, slowFor: number, fastFor: number, now: number): void {
  effects.blinkFrom = now;
  effects.blinkSlowFor = slowFor;
  effects.blinkFastFor = fastFor;
}

/**
 * Whether he is white this frame. The drawing that carries him asks once a frame
 * and paints him white instead of his own blue while the answer is yes.
 *
 * A blink is a square wave: on for the first half of each of its 1/`rate`
 * seconds, off for the second. The fast run picks up where the slow one leaves
 * off, on its own count, so its first half-blink is a full one however long the
 * slow run was. (spec 07-41)
 */
export function isBlinking(effects: Readonly<Effects>, now: number): boolean {
  const since = now - effects.blinkFrom;
  if (since < 0) return false;
  const slow = effects.blinkSlowFor;
  if (since < slow) return Math.floor((since / 1000) * BLINK_SLOW * 2) % 2 === 0;
  const fast = since - slow;
  if (fast >= effects.blinkFastFor) return false;
  return Math.floor((fast / 1000) * BLINK_FAST * 2) % 2 === 0;
}

/**
 * Places every shard alive for this frame: it reads each one's place off its
 * age, lightens it towards white by how far it is erased, lets go of what has
 * run out, and packs what is left down to the front of the pool. It allocates
 * nothing and it grows nothing. (spec 07-28, 10-14)
 */
export function placeShards(effects: Effects, now: number): void {
  const mesh = effects.shards;
  let live = 0;

  for (let i = 0; i < effects.count; i += 1) {
    const erased = erasedBy(effects, i, now);
    if (erased >= 1) continue; // it is gone, and its slot goes back to the pool
    if (live >= effects.holds) break; // the quality tier in force (spec 10-39)
    if (live !== i) carryShard(effects, i, live);

    const seconds = (now - effects.born[live]) / 1000;
    SPOT.set(
      effects.x[live] + effects.dx[live] * seconds,
      effects.y[live] + effects.dy[live] * seconds,
      effects.z[live] + effects.dz[live] * seconds,
    );
    mesh.setMatrixAt(live, SEAT.compose(SPOT, FLAT, SIZE));

    // It goes out by lightening towards white, and never by dissolving: no
    // shard is ever the least bit translucent. (spec 07-17, 07-28)
    const gone = erased < 0 ? 0 : erased;
    const red = effects.red[live];
    const green = effects.green[live];
    const blue = effects.blue[live];
    PAINT.setRGB(red + (1 - red) * gone, green + (1 - green) * gone, blue + (1 - blue) * gone);
    mesh.setColorAt(live, PAINT);
    live += 1;
  }

  effects.count = live;
  mesh.count = live;
  mesh.instanceMatrix.needsUpdate = true;
  const painted = mesh.instanceColor;
  if (painted !== null) painted.needsUpdate = true;
}
