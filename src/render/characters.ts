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
 * Over his head, and **never in the hud**, ride the firebombs he carries: one
 * cube a bomb, three at the very most, in the one colour the fire of this game
 * has. There is no counter of them anywhere — the armful is read on him, and a
 * magazine on its cannon. A carried bomb never falls, so nothing here can ever
 * put one on the ground: they are simply drawn or not. (spec 04-47, 04-48,
 * 08-4)
 *
 * Under each of them lies the **blot**: a dark square laid flat, which does not
 * orient, does not stretch, and depends neither on the sun nor on how high the
 * body stands. It is not a shade the light casts — the game has none of those —
 * it is what stands in for one, and all the bodies of the game together cost a
 * single call for it. Nothing but a character carries one. (spec 07-22 to 07-24)
 *
 * The **whole cast** goes through the one call below: the one body the child
 * drives, and every zombie standing in the city. They are the same fourteen
 * boxes and the same blot, told apart by the colour and the scale of their kind
 * and by nothing else — so a zombie is not a second drawing, it is the same one
 * seated again. (spec 03-2, 07-18, 07-19)
 *
 * So the whole cast of the game is **two calls**, whatever it holds.
 * (spec 10 "Le budget de rendu")
 */
import * as THREE from 'three';
import type { Player, ZombiePool } from '../game/state';
import { ARC_SPAN, type Effects, FIRE, STRUCK, WHITE, isLit } from './effects';
import { alwaysDrawn } from './scene';

/** The fourteen, and there will never be a fifteenth. (spec 07-18) */
export const BOXES = 14;

/**
 * The joints the fourteen hang on, and there are no others: a hip and a shoulder
 * each side, and the nape. Every other box — the belt, the torso, the two
 * shoulders — rides the body whole. (spec 07-63, 07 "La démarche")
 *
 * They are the whole of what makes a body move: there is no `SkinnedMesh`
 * anywhere and no file of animation, and a joint is three lines of arithmetic
 * written into the very matrix the box was going to take. (spec 07-20)
 */
const JOINT = {
  NONE: 0,
  LEG_LEFT: 1,
  LEG_RIGHT: 2,
  ARM_LEFT: 3,
  ARM_RIGHT: 4,
  NECK: 5,
} as const;

const JOINTS = 6;

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
  /** Which of the five joints carries it, or `NONE`. (spec 07-63) */
  readonly joint: number;
}

const NONE = JOINT.NONE;

export const BODY: readonly BodyBox[] = [
  { id: 'footLeft', w: 0.32, h: 0.1, d: 0.46, x: -0.17, y: 0.05, z: 0.06, bare: false, joint: JOINT.LEG_LEFT },
  { id: 'footRight', w: 0.32, h: 0.1, d: 0.46, x: 0.17, y: 0.05, z: 0.06, bare: false, joint: JOINT.LEG_RIGHT },
  { id: 'legLeft', w: 0.3, h: 0.68, d: 0.3, x: -0.17, y: 0.44, z: 0, bare: false, joint: JOINT.LEG_LEFT },
  { id: 'legRight', w: 0.3, h: 0.68, d: 0.3, x: 0.17, y: 0.44, z: 0, bare: false, joint: JOINT.LEG_RIGHT },
  { id: 'belt', w: 0.68, h: 0.14, d: 0.34, x: 0, y: 0.85, z: 0, bare: false, joint: NONE },
  { id: 'torso', w: 0.66, h: 0.56, d: 0.32, x: 0, y: 1.2, z: 0, bare: false, joint: NONE },
  { id: 'shoulderLeft', w: 0.18, h: 0.18, d: 0.34, x: -0.42, y: 1.39, z: 0, bare: false, joint: NONE },
  { id: 'shoulderRight', w: 0.18, h: 0.18, d: 0.34, x: 0.42, y: 1.39, z: 0, bare: false, joint: NONE },
  { id: 'armLeft', w: 0.18, h: 0.44, d: 0.22, x: -0.42, y: 1.08, z: 0, bare: true, joint: JOINT.ARM_LEFT },
  { id: 'armRight', w: 0.18, h: 0.44, d: 0.22, x: 0.42, y: 1.08, z: 0, bare: true, joint: JOINT.ARM_RIGHT },
  { id: 'handLeft', w: 0.2, h: 0.18, d: 0.24, x: -0.42, y: 0.77, z: 0, bare: true, joint: JOINT.ARM_LEFT },
  { id: 'handRight', w: 0.2, h: 0.18, d: 0.24, x: 0.42, y: 0.77, z: 0, bare: true, joint: JOINT.ARM_RIGHT },
  { id: 'jaw', w: 0.4, h: 0.14, d: 0.36, x: 0, y: 1.55, z: 0.03, bare: true, joint: JOINT.NECK },
  { id: 'head', w: 0.44, h: 0.38, d: 0.44, x: 0, y: 1.81, z: 0, bare: true, joint: JOINT.NECK },
];

/**
 * Where each joint sits, in blocks over the floor, for a body at a scale of one.
 * They are read off the table above rather than chosen: the **hip** is the top of
 * the leg, which is the underside of the belt; the **shoulder** is the top of the
 * arm, which is the underside of the shoulder box; the **nape** is the top of the
 * torso, which is the underside of the jaw. A joint at any other height would
 * take a box off the body it belongs to. (spec 07 "La démarche")
 */
const HIP = 0.78;
const SHOULDER = 1.3;
const NAPE = 1.48;
const JOINT_AT = [0, HIP, HIP, SHOULDER, SHOULDER, NAPE];

/**
 * Legs and arms turn about the axis across the body, so they walk; the nape turns
 * about the axis through it, so the head lolls rather than nods. (spec 07-63)
 */
const ACROSS = new THREE.Vector3(1, 0, 0);
const THROUGH = new THREE.Vector3(0, 0, 1);
const JOINT_AXIS = [ACROSS, ACROSS, ACROSS, ACROSS, ACROSS, THROUGH];

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
  // It rides the arm that holds it, and it is the whole reason a blow of his
  // sword can be seen at all. (spec 07-65)
  joint: JOINT.ARM_RIGHT,
};

/**
 * The gait, in the figures chapter 7 writes out. It is one calculation for the
 * whole cast — the one body the child drives and the four kinds alike — because
 * the silhouette never tells a kind from another: what differs is how fast a body
 * walks the stride, and nothing else. (spec 03-2, 07-19, 07-63)
 *
 * The stride runs on **blocks walked and never on seconds**, which is what makes
 * that one calculation enough: a colossus at 0,8 block a second and a sprinter at
 * 4 take the same steps, told apart by how often. It also settles what a body
 * standing still does — nothing. (spec 07 "La démarche")
 */
const STRIDE = 2.3;
const LEG_SWING = 0.52;
const ARM_SWING = 0.44;
const HEAD_SWING = 0.17;
const HEAD_OF_STRIDE = 0.63;
const BOB = 0.05;

/**
 * The blow of his sword, which is a swing of its own added to the arm that holds
 * it. It runs **150 ms**, the span the white arc is written over and the very
 * window a blow goes on touching in, and it opens the whole of the sector a blow
 * sweeps — 120°. The arc follows this blade rather than lighting whole: it is
 * laid one shard after another over exactly this span. (spec 07-66) Half a sine over that span, so it leaves the gait and comes back to it
 * with no break at either end, and so that a body walking and a body standing
 * still both strike the same blow. (spec 04-22, 04-24, 04-25, 07-31, 07-65)
 *
 * It fits inside the 0,4 second between two blows better than two and a half
 * times over: a button held down never cuts one gesture short and never runs two
 * into one,
 * which is what chapter 4 means by no blocking animation. (spec 04-24, 04-28)
 */
const SWING_SPAN = ARC_SPAN;
const SWING_ARC = (120 * Math.PI) / 180;

/**
 * Where he sits among the bodies: the one the child drives is laid first and the
 * zombies of the pool follow him, in the order the pool holds them. It is the
 * order the blots already went down in, and the gestures are read in it too.
 * (spec 07-22)
 */
const PLAYER = 0;

/** How wide the blot lies, in blocks, under a body at a scale of one. */
const BLOT_SIDE = 0.8;

/**
 * How large one firebomb is drawn over his head, how far two of them sit apart,
 * and how high the row floats — in blocks, for a body at a scale of one, whose
 * head tops out at two. Chapter 4 settles that the armful is read over his head,
 * one cube a bomb, and no measurement of it, so all three are the drawing's own.
 * (spec 04-47)
 */
const BOMB_SIDE = 0.24;
const BOMB_GAP = 0.3;
const BOMB_LIFT = 2.3;

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
  /** How many bodies the two meshes were sized for. (spec 10-13) */
  readonly holds: number;
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

  /**
   * How far the one body the child drives has walked, in blocks, which is the
   * whole of what his gait is made of. A zombie needs nothing of the sort — its
   * rail already counts the blocks it has come, and that count never goes back
   * (spec 03-8) — but he walks where he likes, so the drawing measures the ground
   * he covers between one frame and the next. It is a figure of the picture and
   * of nothing else: no rule of the game reads it, and the bench never sees it.
   * (spec 07-63, 07-64, 10-2)
   */
  walked: number;
  /** Where the last frame drew him, which is what that ground is measured off. */
  wasX: number;
  wasZ: number;
  /** Whether a frame has drawn him at all: the first one measures nothing. */
  seated: boolean;
  /**
   * When the last blow of each body went out, in ms of the frame clock — his at
   * nought, then one entry a zombie of the pool, in the order they are seated.
   * The gesture is read off that one instant, exactly as the white arc is:
   * nothing here compares two states, and a blow the buffer never announced is a
   * blow that is never drawn. (spec 07-65, 07-67, 10-19)
   *
   * A zombie carries an index into the pool and the rules fill the hole a fallen
   * one leaves, so a slot may change hands mid-gesture — exactly as the white of
   * a blow taken does, which is read the same way. What it costs is 150 ms of
   * arm on the wrong body, and what it buys is that nothing has to be tracked.
   */
  readonly swungAt: Float64Array;
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

// The pose of the body being seated: one angle a joint, and the turn each of them
// works out to once the body's own heading is folded in — five joints, plus the
// slot of a box that hangs on none. Made once at load like everything above: a
// frame poses sixty-one bodies through this one set and allocates nothing.
// (spec 10-14)
const ANGLES = new Float64Array(JOINTS);
const SWUNG: THREE.Quaternion[] = [];
const SWUNG_COS = new Float64Array(JOINTS);
const SWUNG_SIN = new Float64Array(JOINTS);
for (let j = 0; j < JOINTS; j += 1) SWUNG.push(new THREE.Quaternion());

/**
 * Builds the two meshes, once, at load — and again after a lost context, because
 * the scene is a projection of the state and no datum of the game lives only on
 * the GPU. `holds` is how many bodies they are sized for, which is the player
 * plus the pool of zombies. (spec 10-13, 10-37)
 */
export function buildCharacters(holds: number, carries = 0): CharacterView {
  const bodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    // The sword of the player, which is the only one, one thrown head per body
    // the game can hold — no blow ever fells more than there are bodies — and
    // the firebombs of one armful, which only he ever carries. (spec 04-47)
    holds * BOXES + 1 + holds + carries,
  );
  bodies.name = 'bodies';
  // A body walks where the game takes it, and the count of the mesh is written
  // by a frame: nothing measured around it at load says where it will be.
  alwaysDrawn(bodies);
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
  alwaysDrawn(blots);
  blots.count = 0;

  const node = new THREE.Group();
  node.add(bodies);
  node.add(blots);
  return {
    node,
    holds,
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
    walked: 0,
    wasX: 0,
    wasZ: 0,
    seated: false,
    // Long enough ago that the first frame draws no gesture at all.
    swungAt: new Float64Array(holds).fill(Number.NEGATIVE_INFINITY),
  };
}

/**
 * Marks the instant a blow of his sword went out, off the one fact the buffer
 * carries for it — touched or not, exactly like the white arc it is drawn with.
 * The gesture that follows is 150 ms of arm and nothing else: it takes no call,
 * holds nothing back, and the rules never hear of it. (spec 04-24, 07-31, 07-65)
 */
export function swingSword(view: CharacterView, now: number): void {
  view.swungAt[PLAYER] = now;
}

/**
 * Marks the instant one zombie struck the town hall, off the one fact the buffer
 * carries for it. **It is his gesture exactly** — the same half sine over the
 * same 150 ms, on the same arm — because there is one law of gesture in the whole
 * game and the silhouette never tells a kind from another: what it carries is a
 * blow once a second instead of one every four tenths, and it carries no white
 * arc, which is his sword's alone. (spec 03-2, 03-17, 07-19, 07-65, 07-67)
 */
export function swingZombie(view: CharacterView, at: number, now: number): void {
  const seat = PLAYER + 1 + at;
  if (seat < view.swungAt.length) view.swungAt[seat] = now;
}

/**
 * How far through its gesture a blow is, in radians on the arm that carries it:
 * half a sine over the 150 ms, nought before it and nought after. One law for
 * the whole cast — his blow of the sword and the blow a zombie lands on the town
 * hall go through this one line. (spec 07-65, 07-67)
 */
function swingOf(view: CharacterView, seat: number, now: number): number {
  const since = now - view.swungAt[seat];
  if (!(since >= 0) || since >= SWING_SPAN) return 0;
  return Math.sin((Math.PI * since) / SWING_SPAN) * SWING_ARC;
}

/**
 * Poses one body: the five joints off the blocks it has walked, plus whatever a
 * blow of the sword adds to the arm that holds it, and hands back how far the
 * body itself sits off its standing height.
 *
 * Legs and arms swing in opposition, one side against the other, the head lolls
 * at its own slower period, and the body **dips as the legs part** and is back at
 * its standing height when they meet — so a body that has walked nowhere stands
 * exactly on the floor with every box where the table put it. (spec 07-63)
 */
function poseOf(walked: number, swing: number): number {
  const phase = walked * STRIDE;
  const swung = Math.sin(phase);
  ANGLES[JOINT.LEG_LEFT] = swung * LEG_SWING;
  ANGLES[JOINT.LEG_RIGHT] = -swung * LEG_SWING;
  ANGLES[JOINT.ARM_LEFT] = -swung * ARM_SWING;
  ANGLES[JOINT.ARM_RIGHT] = swung * ARM_SWING + swing;
  ANGLES[JOINT.NECK] = Math.sin(phase * HEAD_OF_STRIDE) * HEAD_SWING;
  return -BOB * (1 - Math.abs(Math.cos(phase)));
}

/**
 * Works the pose out into one turn a joint, the body's own heading folded in, so
 * a box has nothing left to do but read the one that carries it. The joint with
 * no angle comes out as the heading alone, which is what an unarticulated box
 * takes. (spec 07-63)
 */
function turnJoints(heading: number): void {
  TURN.setFromAxisAngle(UPRIGHT, heading);
  for (let j = 0; j < JOINTS; j += 1) {
    const angle = ANGLES[j];
    SWUNG_COS[j] = Math.cos(angle);
    SWUNG_SIN[j] = Math.sin(angle);
    SWUNG[j].setFromAxisAngle(JOINT_AXIS[j], angle).premultiply(TURN);
  }
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

/**
 * Seats the firebombs he carries, in a row over his head, turning with him. One
 * cube a bomb and nothing else: no figure, no bar, and nothing in the hud.
 * (spec 04-47, 08-4)
 *
 * They keep their own colour while he blinks white: what a contact says is that
 * **he** was walked into, and a bomb in his arms is untouched by it — it never
 * falls, whatever happens to him, and the one thing that ever takes his armful
 * away is a collapse, which takes it in the rules. (spec 04-43, 04-48)
 */
function seatArmful(
  view: CharacterView,
  at: number,
  x: number,
  y: number,
  z: number,
  ang: number,
  carried: number,
): number {
  if (carried <= 0) return at;

  const turn = Math.PI / 2 - ang;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  TURN.setFromAxisAngle(UPRIGHT, turn);

  let put = at;
  const first = -((carried - 1) * BOMB_GAP) / 2;
  for (let i = 0; i < carried; i += 1) {
    const off = first + i * BOMB_GAP;
    SPOT.set(x + off * cos, y + BOMB_LIFT, z - off * sin);
    SIZE.set(BOMB_SIDE, BOMB_SIDE, BOMB_SIDE);
    view.bodies.setMatrixAt(put, SEAT.compose(SPOT, TURN, SIZE));
    view.bodies.setColorAt(put, PAINT.set(FIRE));
    put += 1;
  }
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

/**
 * Seats one box of one body, swung on its joint, then turned and scaled with the
 * body. The joint is the whole of the animation: the box is carried about its
 * pivot and turned by the same angle, which is exactly what a bone would have
 * done and costs a matrix the box was writing anyway. (spec 07-20, 07-63)
 */
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
  const joint = box.joint;
  const pivot = JOINT_AT[joint];
  const along = SWUNG_COS[joint];
  const across = SWUNG_SIN[joint];
  let bx = box.x;
  let by = box.y;
  let bz = box.z;
  if (joint !== JOINT.NONE) {
    const over = by - pivot;
    if (joint === JOINT.NECK) {
      // About the axis through the body: the head lolls sideways.
      bx = box.x * along - over * across;
      by = pivot + box.x * across + over * along;
    } else {
      // About the axis across the body: a limb walks.
      by = pivot + over * along - bz * across;
      bz = over * across + bz * along;
    }
  }
  SPOT.set(x + (bx * cos + bz * sin) * scale, y + by * scale, z + (-bx * sin + bz * cos) * scale);
  SIZE.set(box.w * scale, box.h * scale, box.d * scale);
  mesh.setMatrixAt(at, SEAT.compose(SPOT, SWUNG[joint], SIZE));
  mesh.setColorAt(at, PAINT.set(colour));
}

/**
 * Seats one whole body and its blot, and says how many boxes it took. The body
 * faces the way it heads: a turn about the upright takes its front, which is the
 * far side of the boxes, onto that heading.
 *
 * `walked` is how many blocks it has come, which is the whole of its gait, and
 * `swing` whatever a blow of the sword adds to the arm that holds one. The blot
 * takes neither: it lies where the feet are and it does not rise with the body,
 * because it is not a shade of it. (spec 07-23, 07-63)
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
  walked: number,
  swing: number,
): number {
  const turn = Math.PI / 2 - ang;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const rise = poseOf(walked, swing) * scale;
  turnJoints(turn);

  let put = at;
  for (let b = 0; b < BODY.length; b += 1) {
    const box = BODY[b];
    seatBox(view.bodies, put, box, x, y + rise, z, cos, sin, scale, box.bare ? skin : cloth);
    put += 1;
  }
  if (armed) {
    seatBox(view.bodies, put, SWORD, x, y + rise, z, cos, sin, scale, steel);
    put += 1;
  }

  SPOT.set(x, y + LIFT, z);
  SIZE.set(BLOT_SIDE * scale, 1, BLOT_SIDE * scale);
  view.blots.setMatrixAt(laid, SEAT.compose(SPOT, FLAT, SIZE));
  return put;
}

/**
 * Seats every zombie standing in the city, and hands back how many boxes they
 * took. They are the same fourteen boxes as the one body the child drives and
 * they lie in the same mesh, one after him: a zombie costs no call at all, and
 * sixty of them cost no more than one. (spec 03-2, 07-19, 07-21)
 *
 * What tells one kind from another is the colour of its line and the scale of
 * its line, and nothing else — never the silhouette. The blot of each goes into
 * the one mesh of blots, after his. (spec 03-2, 07-22)
 *
 * One that stands at the town hall hammering it swings the arm his blow of the
 * sword swings, over the same 150 ms: it is armed off the buffer, one blow at a
 * time, and a body that is not striking holds the gait alone. (spec 07-67)
 *
 * One that has **just taken a blow** is painted white all over for the 80 ms
 * chapter 7 grants it: `isLit` is what says so, off the one buffer of events the
 * frame has already been read, so nothing here compares two states.
 * (spec 07-36, 10-19)
 *
 * They stand on the floor of their street, which is the ground: a zombie holds
 * an advance along a rail and an offset across it, and no height at all.
 * (spec 03-7, 03-9)
 */
function seatZombies(
  view: CharacterView,
  effects: Effects,
  at: number,
  zombies: Readonly<ZombiePool>,
  scales: readonly number[],
  walking: number,
  alpha: number,
  now: number,
): number {
  let put = at;
  for (let i = 0; i < walking; i += 1) {
    const kind = zombies.type[i];
    const seat = PLAYER + 1 + i;
    // White all over while it is lit, exactly as he goes white all over: the
    // whole silhouette flashes, and no box of it keeps a colour of its own.
    // (spec 07-36, 07-41)
    const worn = isLit(effects, STRUCK.ZOMBIE, i, now) ? WHITE : KIND_COLOURS[kind];
    put = seatBody(
      view,
      put,
      // His blot is the first one laid; theirs follow it. (spec 07-22)
      seat,
      between(zombies.xPrev[i], zombies.x[i], alpha),
      0,
      between(zombies.zPrev[i], zombies.z[i], alpha),
      betweenTurns(zombies.angPrev[i], zombies.ang[i], alpha),
      scales[kind],
      worn,
      worn,
      worn,
      // The sword is his and his alone, and it is not one of the fourteen.
      // (spec 04-2)
      false,
      // How far it has come along its rail, in blocks, which is the one figure
      // its gait is made of: the rules already count it and it never goes back,
      // so a body knocked still or held at the town hall simply stops walking.
      // It is the same calculation the one body the child drives goes through —
      // the silhouette never tells a kind from another, and what differs is how
      // fast the blocks go by. (spec 03-8, 03-2, 07-19, 07-63)
      zombies.progress[i],
      // And the blow it is in the middle of, if it is standing at the town hall
      // hammering: his gesture exactly, on the same arm, once a second instead of
      // every four tenths. A body that is not striking swings nothing.
      // (spec 03-17, 07-67)
      swingOf(view, seat, now),
    );
  }
  return put;
}

/**
 * Places every body of the game for this frame — the one the child drives and
 * every zombie standing — interpolating between the two last steps. Nothing is
 * allocated here, and the two counts are what say how much of each mesh is
 * drawn. (spec 10-14, 10-24)
 *
 * `scales` is the scale each of the four kinds stands at, in the order chapter 3
 * names them. It is handed over by whoever names the balance, like every other
 * constant of the drawing, because it is a figure of the rules and not of the
 * picture. (spec 03-2, 03 "Les quatre types", 10-15)
 *
 * `white` is the blink of a body that has just been walked into: every box of
 * him goes white at once, sword included, so what reads is the whole silhouette
 * flashing and not a garment changing colour. Whether it is on this frame is
 * `isBlinking`'s to say, and how long it runs is chapter 4's. (spec 07-41)
 *
 * The **gait** is worked out here and nowhere else: it is a figure of the picture
 * from end to end, the rules never hear of it, and the bench of chapter 11 runs a
 * whole game without a single one of these angles. What it is made of is the
 * ground a body has covered — his measured off the two frames, theirs read off
 * the rail — so a body that has stopped stops walking, and no clock of any kind
 * comes into it. (spec 07-63, 07-64, 10-2)
 */
export function placeCharacters(
  view: CharacterView,
  effects: Effects,
  player: Readonly<Player>,
  zombies: Readonly<ZombiePool>,
  scales: readonly number[],
  alpha: number,
  now: number,
  white = false,
  carried = 0,
): void {
  const x = between(player.xPrev, player.x, alpha);
  const y = between(player.yPrev, player.y, alpha);
  const z = between(player.zPrev, player.z, alpha);
  const ang = betweenTurns(player.angPrev, player.ang, alpha);

  // The ground he has covered since the last frame drew him, which is what his
  // gait is made of. He walks where he likes and no rail counts it for him, so
  // the picture counts it: flat on the floor and never up it, so that a ladder
  // does not set his legs going, and from the second frame on, so that the first never takes the
  // whole of the city for one stride. (spec 04-13, 07-63)
  if (view.seated) {
    const eastward = x - view.wasX;
    const northward = z - view.wasZ;
    view.walked += Math.sqrt(eastward * eastward + northward * northward);
  }
  view.wasX = x;
  view.wasZ = z;
  view.seated = true;

  let put = seatBody(
    view,
    0,
    0,
    x,
    y,
    z,
    ang,
    1,
    white ? WHITE : TUNIC,
    white ? WHITE : SKIN,
    white ? WHITE : STEEL,
    // The sword is stowed for the whole of a ladder, and out again at the top.
    // (spec 04-13)
    player.climbLeft <= 0,
    view.walked,
    // And the blow he is in the middle of, on the arm that carries the sword.
    // (spec 07-65)
    swingOf(view, PLAYER, now),
  );

  // What he carries, over his head and nowhere else. (spec 04-47)
  put = seatArmful(view, put, x, y, z, ang, carried);

  // And every zombie standing, in the same two meshes. The meshes were sized for
  // the whole pool, so the cap never bites; should it ever, a body is left
  // unseated rather than anything growing. (spec 10-13, 10-14)
  const walking = Math.min(zombies.count, view.holds - 1);
  put = seatZombies(view, effects, put, zombies, scales, walking, alpha, now);

  // The heads a fatal blow threw, going up and turning over. They run on the
  // frame and not on the step: they are erased in fractions of a second, like the
  // shards they fall apart with. (spec 03-19, 10-22)
  view.bodies.count = seatHeads(view, put, now);
  // One blot a character, his and theirs. A head carries none: nothing but a
  // character does. (spec 07-22, 07-24)
  view.blots.count = 1 + walking;
  view.bodies.instanceMatrix.needsUpdate = true;
  view.blots.instanceMatrix.needsUpdate = true;
  const painted = view.bodies.instanceColor;
  if (painted !== null) painted.needsUpdate = true;
}
