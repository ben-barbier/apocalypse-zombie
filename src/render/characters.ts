/**
 * The bodies, and what anchors them to the ground.
 *
 * Every character of the game — the player and the four kinds of zombie — is the
 * same fourteen boxes: torso, head, jaw, two shoulders, two arms, two hands,
 * belt, two legs, two feet. Only the colour, the scale, the pace and the
 * behaviour tell one from another; never the silhouette. (spec 07-18, 07-19)
 *
 * All of those boxes, of all of those bodies, ride in **one** `InstancedMesh` of
 * cubes of one block with a colour per instance: going from six boxes to
 * fourteen costs no call at all, only processor time, and it is what pays for a
 * body that reads at a glance. There is no `SkinnedMesh` and no file of
 * animation anywhere — a body is placed by arithmetic, every frame.
 * (spec 07-20, 07-21)
 *
 * Under each of them lies the **blot**: a dark square laid flat, which does not
 * orient, does not stretch, and depends neither on the sun nor on how high the
 * body stands. It is not a shade the light casts — the game has none of those —
 * it is what stands in for one, and all the bodies of the game together cost a
 * single call for it. Nothing but a character carries one. (spec 07-22 to 07-24)
 *
 * So the whole cast of the game is **two calls**, whatever it holds.
 * (spec 10 "Le budget de rendu")
 */
import * as THREE from 'three';
import type { Player } from '../game/state';
import { WHITE } from './effects';

/** The fourteen, and there will never be a fifteenth. (spec 07-18) */
export const BOXES = 14;

/**
 * The player, in the only two cold colours a character wears, so he is never
 * taken for an assailant: a blue tunic and the light steel of his sword.
 * (spec 04-3, 07 "La palette de ce qui se joue")
 */
export const TUNIC = '#1f6fd8';
export const SKIN = '#f4c79a';
export const STEEL = '#f2f6f9';

/**
 * The colour of each kind, in the order the rules name them — pale green, bright
 * saturated green, blue-violet, gold. They are what a body wears, and what its
 * shards and its thrown head fly in when it falls. (spec 03-2, 07-30,
 * 07 "La palette de ce qui se joue")
 */
export const KIND_COLOURS: readonly string[] = ['#7ec24a', '#b6ff3d', '#9b6bff', '#ffd24a'];

/**
 * The blot, in the darkest colour the city owns — the roof of the town hall. It
 * is read off the palette rather than chosen, and it is neither the pure black
 * of what is picked up nor a shade of anything. (spec 07-13, 07-23,
 * 07 "La palette de la ville")
 */
export const BLOT = '#3d2118';

/** How far the blot floats over the floor, so the two do not fight for it. */
const LIFT = 0.02;

/**
 * One box of a body: how large it is and where its middle sits, in blocks, for a
 * body at a scale of one. `bare` says skin rather than cloth, which is all a
 * colour ever asks of the table.
 *
 * The spec settles the fourteen boxes, their names, and the scale each kind of
 * body wears; it settles no measurement, and no rule of the game reads one. What
 * follows is therefore the drawing's own, and it lives here alone. A body at a
 * scale of one stands exactly one storey — two blocks — so a colossus at 2,2
 * overtops the lowest roof of the city. (spec 07-18, 07-55, 03 "Les quatre types")
 */
interface BodyBox {
  readonly id: string;
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bare: boolean;
}

export const BODY: readonly BodyBox[] = [
  { id: 'footLeft', w: 0.32, h: 0.1, d: 0.46, x: -0.17, y: 0.05, z: 0.06, bare: false },
  { id: 'footRight', w: 0.32, h: 0.1, d: 0.46, x: 0.17, y: 0.05, z: 0.06, bare: false },
  { id: 'legLeft', w: 0.3, h: 0.68, d: 0.3, x: -0.17, y: 0.44, z: 0, bare: false },
  { id: 'legRight', w: 0.3, h: 0.68, d: 0.3, x: 0.17, y: 0.44, z: 0, bare: false },
  { id: 'belt', w: 0.68, h: 0.14, d: 0.34, x: 0, y: 0.85, z: 0, bare: false },
  { id: 'torso', w: 0.66, h: 0.56, d: 0.32, x: 0, y: 1.2, z: 0, bare: false },
  { id: 'shoulderLeft', w: 0.18, h: 0.18, d: 0.34, x: -0.42, y: 1.39, z: 0, bare: false },
  { id: 'shoulderRight', w: 0.18, h: 0.18, d: 0.34, x: 0.42, y: 1.39, z: 0, bare: false },
  { id: 'armLeft', w: 0.18, h: 0.44, d: 0.22, x: -0.42, y: 1.08, z: 0, bare: true },
  { id: 'armRight', w: 0.18, h: 0.44, d: 0.22, x: 0.42, y: 1.08, z: 0, bare: true },
  { id: 'handLeft', w: 0.2, h: 0.18, d: 0.24, x: -0.42, y: 0.77, z: 0, bare: true },
  { id: 'handRight', w: 0.2, h: 0.18, d: 0.24, x: 0.42, y: 0.77, z: 0, bare: true },
  { id: 'jaw', w: 0.4, h: 0.14, d: 0.36, x: 0, y: 1.55, z: 0.03, bare: true },
  { id: 'head', w: 0.44, h: 0.38, d: 0.44, x: 0, y: 1.81, z: 0, bare: true },
];

/**
 * The sword he holds in his hand, which is a fifteenth box and belongs to the
 * player alone: the fourteen are the body, the sword is not counted among them.
 * It is stowed while he climbs a ladder, and out again at the top.
 * (spec 04-2, 04-13, 07 "Le corps et le déplacement")
 */
export const SWORD: BodyBox = {
  id: 'sword',
  w: 0.1,
  h: 0.9,
  d: 0.1,
  x: 0.42,
  y: 1.22,
  z: 0.18,
  bare: false,
};

/** How wide the blot lies, in blocks, under a body at a scale of one. */
const BLOT_SIDE = 0.8;

/**
 * The head, which is the one box a fatal blow throws — it is the last of the
 * fourteen above. Where its middle sits is also how high a body's own middle
 * stands: a body at a scale of one is exactly one storey, so half of it is one
 * block up. (spec 03-19, 07-18)
 */
const HEAD = BODY[BODY.length - 1];
export const BODY_MIDDLE = 1;

/**
 * How fast a thrown head leaves the body, in blocks a second, and how fast it
 * turns, in radians a second, about an axis tilted off the upright so it reads as
 * a tumble rather than a spin. Both are the drawing's own: chapter 3 settles that
 * the head is thrown and tumbles, and no measurement of it. It never falls back —
 * it is gone with the shards, and **nothing is left on the ground**, which is a
 * rule and not an omission. (spec 03-19, 03-21)
 */
const HEAD_UP = 4;
const HEAD_SPIN = 8;

/** What the bodies hand to the scene: one node, and the calls they cost a frame. */
export interface CharacterView {
  /** Everything they draw, under one node the scene takes in one go. */
  readonly node: THREE.Group;
  /** One entry per call of a frame. (spec 10 "Le budget de rendu") */
  readonly draws: readonly THREE.InstancedMesh[];
  /** All the boxes of all the bodies, the sword, and the heads in the air. (spec 07-21) */
  readonly bodies: THREE.InstancedMesh;
  /** All the blots, and there is one mesh of them for the whole game. (spec 07-22) */
  readonly blots: THREE.InstancedMesh;

  /**
   * The heads a fatal blow has thrown, in structures of arrays like every pool of
   * this game. They ride in the same mesh as every other box, so they cost no
   * call of their own, and they carry no blot: nothing but a character does.
   * (spec 07-21, 07-24, 10-11)
   */
  readonly headX: Float32Array;
  readonly headY: Float32Array;
  readonly headZ: Float32Array;
  /** One of the four kinds, which is what says the colour it flies in. (spec 07-30) */
  readonly headKind: Uint8Array;
  readonly headScale: Float32Array;
  /** The frame timestamp it was thrown at, in ms, and how long until it is gone. */
  readonly headBorn: Float64Array;
  readonly headSpan: Float32Array;
  /** Heads in the air are `[0, count)`. */
  headCount: number;
}

// The one set of scratch objects of this file, made once at load: a frame writes
// hundreds of matrices and allocates none of them. (spec 10-14)
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const FLAT = new THREE.Quaternion();
const SIZE = new THREE.Vector3();
const SEAT = new THREE.Matrix4();
const PAINT = new THREE.Color();
const UPRIGHT = new THREE.Vector3(0, 1, 0);
/** Tilted off the upright, so a thrown head goes over and over rather than about. */
const TUMBLE = new THREE.Vector3(0.6, 0.5, 0.62).normalize();

/**
 * Builds the two meshes, once, at load — and again after a lost context, because
 * the scene is a projection of the state and no datum of the game lives only on
 * the GPU. `holds` is how many bodies they are sized for, which is the player
 * plus the pool of zombies. (spec 10-13, 10-37)
 */
export function buildCharacters(holds: number): CharacterView {
  const bodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    // The sword of the player, which is the only one, and one thrown head per
    // body the game can hold: no blow ever fells more than there are bodies.
    holds * BOXES + 1 + holds,
  );
  bodies.name = 'bodies';
  bodies.count = 0;

  // Laid flat once in the geometry, so an instance carries a spot and a size and
  // never a turn: the blot does not orient. (spec 07-23)
  const square = new THREE.PlaneGeometry(1, 1);
  square.rotateX(-Math.PI / 2);
  const blots = new THREE.InstancedMesh(
    square,
    // It takes no light: it is not a shade, so neither the sun nor the violet
    // has anything to say about it. (spec 07-23)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(BLOT) }),
    holds,
  );
  blots.name = 'blots';
  blots.count = 0;

  const node = new THREE.Group();
  node.add(bodies);
  node.add(blots);
  return {
    node,
    draws: [bodies, blots],
    bodies,
    blots,
    headX: new Float32Array(holds),
    headY: new Float32Array(holds),
    headZ: new Float32Array(holds),
    headKind: new Uint8Array(holds),
    headScale: new Float32Array(holds),
    headBorn: new Float64Array(holds),
    headSpan: new Float32Array(holds),
    headCount: 0,
  };
}

/**
 * Throws the head of a body that has just fallen, from the spot its feet stood
 * at. It goes up, turning over, in the colour of its kind, and it is gone when
 * its span runs out — it never lands, and nothing is left where it stood.
 * (spec 03-19, 03-21, 07-30)
 *
 * The pool holds one head per body the game can carry, so it never fills; should
 * it ever, the head is let go rather than anything growing. (spec 10-14)
 */
export function flingHead(
  view: CharacterView,
  x: number,
  y: number,
  z: number,
  scale: number,
  kind: number,
  span: number,
  now: number,
): void {
  const at = view.headCount;
  if (at >= view.headKind.length) return;
  view.headX[at] = x;
  view.headY[at] = y + HEAD.y * scale;
  view.headZ[at] = z;
  view.headKind[at] = kind;
  view.headScale[at] = scale;
  view.headBorn[at] = now;
  view.headSpan[at] = span;
  view.headCount = at + 1;
}

/** Moves one head, whole, from one slot to another. */
function carryHead(view: CharacterView, from: number, to: number): void {
  view.headX[to] = view.headX[from];
  view.headY[to] = view.headY[from];
  view.headZ[to] = view.headZ[from];
  view.headKind[to] = view.headKind[from];
  view.headScale[to] = view.headScale[from];
  view.headBorn[to] = view.headBorn[from];
  view.headSpan[to] = view.headSpan[from];
}

/**
 * Seats the heads still in the air and hands back how many boxes they took. They
 * go into the same mesh as every other box, one after the player's, so the cast
 * of the game still costs two calls whatever falls. (spec 07-21)
 */
function seatHeads(view: CharacterView, at: number, now: number): number {
  let put = at;
  let live = 0;

  for (let i = 0; i < view.headCount; i += 1) {
    const span = view.headSpan[i];
    if (!(span > 0) || now - view.headBorn[i] >= span) continue; // gone, and nothing is left
    if (live !== i) carryHead(view, i, live);

    const seconds = (now - view.headBorn[live]) / 1000;
    const scale = view.headScale[live];
    TURN.setFromAxisAngle(TUMBLE, seconds * HEAD_SPIN);
    SPOT.set(view.headX[live], view.headY[live] + HEAD_UP * seconds, view.headZ[live]);
    SIZE.set(HEAD.w * scale, HEAD.h * scale, HEAD.d * scale);
    view.bodies.setMatrixAt(put, SEAT.compose(SPOT, TURN, SIZE));
    view.bodies.setColorAt(put, PAINT.set(KIND_COLOURS[view.headKind[live]]));
    put += 1;
    live += 1;
  }

  view.headCount = live;
  return put;
}

/** Where a frame sits between the two last steps. (spec 10-24) */
function between(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/** The same, the short way about, so a body turning past due south does not spin. */
function betweenTurns(from: number, to: number, alpha: number): number {
  let gap = to - from;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  return from + gap * alpha;
}

/** Seats one box of one body, turned and scaled with it. */
function seatBox(
  mesh: THREE.InstancedMesh,
  at: number,
  box: BodyBox,
  x: number,
  y: number,
  z: number,
  cos: number,
  sin: number,
  scale: number,
  colour: string,
): void {
  SPOT.set(
    x + (box.x * cos + box.z * sin) * scale,
    y + box.y * scale,
    z + (-box.x * sin + box.z * cos) * scale,
  );
  SIZE.set(box.w * scale, box.h * scale, box.d * scale);
  mesh.setMatrixAt(at, SEAT.compose(SPOT, TURN, SIZE));
  mesh.setColorAt(at, PAINT.set(colour));
}

/**
 * Seats one whole body and its blot, and says how many boxes it took. The body
 * faces the way it heads: a turn about the upright takes its front, which is the
 * far side of the boxes, onto that heading.
 */
function seatBody(
  view: CharacterView,
  at: number,
  laid: number,
  x: number,
  y: number,
  z: number,
  ang: number,
  scale: number,
  cloth: string,
  skin: string,
  steel: string,
  armed: boolean,
): number {
  const turn = Math.PI / 2 - ang;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  TURN.setFromAxisAngle(UPRIGHT, turn);

  let put = at;
  for (let b = 0; b < BODY.length; b += 1) {
    const box = BODY[b];
    seatBox(view.bodies, put, box, x, y, z, cos, sin, scale, box.bare ? skin : cloth);
    put += 1;
  }
  if (armed) {
    seatBox(view.bodies, put, SWORD, x, y, z, cos, sin, scale, steel);
    put += 1;
  }

  SPOT.set(x, y + LIFT, z);
  SIZE.set(BLOT_SIDE * scale, 1, BLOT_SIDE * scale);
  view.blots.setMatrixAt(laid, SEAT.compose(SPOT, FLAT, SIZE));
  return put;
}

/**
 * Places every body of the game for this frame, interpolating between the two
 * last steps. Nothing is allocated here, and the two counts are what say how
 * much of each mesh is drawn. (spec 10-14, 10-24)
 *
 * `white` is the blink of a body that has just been walked into: every box of
 * him goes white at once, sword included, so what reads is the whole silhouette
 * flashing and not a garment changing colour. Whether it is on this frame is
 * `isBlinking`'s to say, and how long it runs is chapter 4's. (spec 07-41)
 */
export function placeCharacters(
  view: CharacterView,
  player: Readonly<Player>,
  alpha: number,
  now: number,
  white = false,
): void {
  const put = seatBody(
    view,
    0,
    0,
    between(player.xPrev, player.x, alpha),
    between(player.yPrev, player.y, alpha),
    between(player.zPrev, player.z, alpha),
    betweenTurns(player.angPrev, player.ang, alpha),
    1,
    white ? WHITE : TUNIC,
    white ? WHITE : SKIN,
    white ? WHITE : STEEL,
    // The sword is stowed for the whole of a ladder, and out again at the top.
    // (spec 04-13)
    player.climbLeft <= 0,
  );

  // The heads a fatal blow threw, going up and turning over. They run on the
  // frame and not on the step: they are erased in fractions of a second, like the
  // shards they fall apart with. (spec 03-19, 10-22)
  view.bodies.count = seatHeads(view, put, now);
  // A head carries no blot: nothing but a character does. (spec 07-24)
  view.blots.count = 1;
  view.bodies.instanceMatrix.needsUpdate = true;
  view.blots.instanceMatrix.needsUpdate = true;
  const painted = view.bodies.instanceColor;
  if (painted !== null) painted.needsUpdate = true;
}
