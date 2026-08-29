/**
 * The cannons, the mark laid under his feet and the circle it draws.
 *
 * **The three tiers are read off the silhouette**, at a distance and with
 * nothing laid over them: small and grey stone with a short tube, medium in
 * copper with the three cells of its magazine emptying, large. There is no
 * figure anywhere on a cannon, no letter, and nothing floating above one — what
 * a cannon is, it is by its shape. (spec 05-5)
 *
 * Every box of every cannon rides in **one** `InstancedMesh` of cubes with a
 * colour per instance, exactly as the bodies do: twenty-four cannons cost one
 * call whatever they are made of, which is what the budget of chapter 7 counts
 * them at. They carry no tile — what moves and what is put down wears one plain
 * colour — and no blot: nothing but a character has one. (spec 07-10, 07-24,
 * 07 "Le budget de la scène la plus chargée")
 *
 * **Wear is read off the cannon and nowhere else.** A blow takes hp, plates come
 * off it for good, and it stands there smaller and more full of holes until an
 * upgrade puts it back whole. There is **no bar over a cannon, no blink, no
 * colour of alarm and nothing laid over it** — the puff of white shards that
 * chapter 7 throws at every blow taken is the whole of the moment, and the shape
 * is the whole of the state. That is also why nothing here asks `isLit`: the
 * white flash of 80 ms belongs to a zombie and to a block of the town hall, and
 * the table of white signals gives a cannon the puff alone. (spec 05-48, 05-49,
 * 07-42, 07 "Les signaux blancs")
 *
 * **The mark and the circle live in the world, never in the hud**, and they are
 * neither of them the state of a cannon: they follow the feet, so walking off a
 * spot takes both away at once. They are laid flat on the floor like the blot,
 * which is what a mark painted on the ground is in this game; the shard is the
 * one primitive of **effect**, and a question one is asking is not an effect.
 * (spec 05-17 to 05-20, 07-22, 07-25, 08-4)
 *
 * What is not here: the conveyor that runs to the base, which arrives with the
 * resupply, and the ball and the flame, which arrive with theirs. (spec 04-52,
 * 05-21, 05-30)
 */
import * as THREE from 'three';
import type { CannonBalance } from '../game/balance';
import type { CannonPool } from '../game/state';
import { BLACK, BLINK_SLOW, WHITE } from './effects';

/**
 * The one colour chapter 7 gives a cannon, off the palette of what is played:
 * cold grey metal, against a city that is warm throughout. (spec 07-9,
 * 07 "La palette de ce qui se joue")
 */
export const METAL = '#57616b';

/**
 * The copper a cannon wears from its second tier, which chapter 5 names and
 * chapter 7's palette does not carry: it is read off 05-5 and frankly saturated,
 * which is the other half of the rule of temperature — what is played is cold
 * **or** frankly saturated, never a second shade of the city's warmth. There is
 * no red in it, here or anywhere. (spec 05-5, 07-9, 07-15)
 */
export const COPPER = '#d1701f';

/** The three scales of 05-5: small, medium, large. They are the drawing's own. */
export const TIER_SCALES: readonly number[] = [0.8, 1, 1.25];

/**
 * How many plates a cannon carries, and they are the ones wear takes. What is
 * left of its hp says how many still stand, so a cannon on a roof — which never
 * loses one — keeps all of them for good, and a cannon on the ground comes apart
 * a plate at a time as the column goes by. They never come back on their own:
 * only an upgrade, which puts it back whole, brings one back. (spec 05-14,
 * 05-46, 05-48)
 */
export const PLATES = 8;

/** How far the mark and the circle float over the floor, so the two do not fight for it. */
const LIFT = 0.02;

/**
 * One box of a cannon: how large it is and where its middle sits, in blocks, for
 * a cannon at a scale of one, pointing along `ang` of nought. The spec settles
 * the three silhouettes and no measurement at all, and no rule of the game reads
 * one, so the table is the drawing's own and lives here alone. (spec 05-5)
 */
interface CannonBox {
  readonly id: string;
  readonly w: number;
  readonly h: number;
  readonly d: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Which tiers carry it. (spec 05-2, 05-3) */
  readonly tiers: readonly number[];
  /** Copper rather than grey stone, from the second tier on. (spec 05-5) */
  readonly copper: boolean;
  /** A plate wear takes, counted from the last of them. (spec 05-48) */
  readonly plate: boolean;
  /** One of the three cells of the magazine, counted from one, or nought. (spec 05-5) */
  readonly cell: number;
}

const ALL = [1, 2, 3];
const ARMED = [2, 3];

function plateAt(id: string, x: number, y: number, z: number): CannonBox {
  return { id, w: 0.2, h: 0.2, d: 0.2, x, y, z, tiers: ALL, copper: false, plate: true, cell: 0 };
}

function cellAt(id: string, z: number, cell: number): CannonBox {
  return {
    id,
    w: 0.18,
    h: 0.18,
    d: 0.18,
    x: -0.26,
    y: 0.84,
    z,
    tiers: ARMED,
    copper: true,
    plate: false,
    cell,
  };
}

/** One box of the trunk of a cannon, which stands on the axis of its heading. */
function boxOf(
  id: string,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  tiers: readonly number[],
  copper: boolean,
): CannonBox {
  return { id, w, h, d, x, y, z: 0, tiers, copper, plate: false, cell: 0 };
}

export const CANNON: readonly CannonBox[] = [
  // The footing, which wear never takes: a cannon at one hp still stands on it.
  boxOf('foot', 1, 0.24, 1, 0, 0.12, ALL, false),
  // The body, grey stone at the first tier and copper from the second. (spec 05-5)
  boxOf('body', 0.66, 0.5, 0.66, 0, 0.5, ALL, true),
  // The short tube of a first tier, and the long one the other two carry. (spec 05-5)
  boxOf('tubeShort', 0.62, 0.22, 0.22, 0.42, 0.62, [1], false),
  boxOf('tubeLong', 1.05, 0.26, 0.26, 0.62, 0.68, ARMED, true),
  // The mouth of the second arm, which is what the second tier adds. (spec 05-3)
  boxOf('mouth', 0.34, 0.2, 0.2, 0.32, 0.34, ARMED, true),
  plateAt('plateLowFrontLeft', 0.34, 0.36, -0.34),
  plateAt('plateLowFrontRight', 0.34, 0.36, 0.34),
  plateAt('plateLowBackLeft', -0.34, 0.36, -0.34),
  plateAt('plateLowBackRight', -0.34, 0.36, 0.34),
  plateAt('plateHighFrontLeft', 0.34, 0.66, -0.34),
  plateAt('plateHighFrontRight', 0.34, 0.66, 0.34),
  plateAt('plateHighBackLeft', -0.34, 0.66, -0.34),
  plateAt('plateHighBackRight', -0.34, 0.66, 0.34),
  cellAt('cellOne', -0.24, 1),
  cellAt('cellTwo', 0, 2),
  cellAt('cellThree', 0.24, 3),
];

/** How many boxes the largest of the three silhouettes ever asks for. */
export const MOST_BOXES = (() => {
  let most = 0;
  for (const tier of ALL) {
    let owed = 0;
    for (const box of CANNON) if (box.tiers.includes(tier)) owed += 1;
    if (owed > most) most = owed;
  }
  return most;
})();

/**
 * How deep a cannon sits while it goes down, in blocks. It rises out of the
 * ground over the 0,3 second 05-7 measures, and the floor of the city is what
 * hides the part still under it — so the whole of the placing is what the eye is
 * given, and no column of the Instantané carries a count that is nought at every
 * wave boundary anyway. (spec 05-7, 08-70)
 */
const SUNK = 1.3;

/**
 * How deep the mark breathes, and how fast. It takes the slow rate chapter 7
 * already owns for a blink rather than inventing a second one; how deep is the
 * drawing's own. (spec 05-17, 07-41)
 */
const PULSE_DEEP = 0.16;

/** What the cannons hand to the scene: one node, and the calls they cost a frame. */
export interface CannonView {
  /** Everything they draw, under one node the scene takes in one go. */
  readonly node: THREE.Group;
  /** One entry per call of a frame. (spec 10 "Le budget de rendu") */
  readonly draws: readonly THREE.Mesh[];
  /** Every box of every cannon, in one call. (spec 07-21) */
  readonly bodies: THREE.InstancedMesh;
  /** The mark under his feet, and the circle it draws. (spec 05-17, 05-19) */
  readonly mark: THREE.Mesh;
  readonly circle: THREE.Mesh;

  /**
   * The cannons still going down, held by the spot they went down at rather than
   * by their slot: a slot is handed on when a cannon is lost, a spot never moves,
   * and three blocks apart means no two of them share one. It is armed off the
   * one fact the rules write and never off a comparison of two states.
   * (spec 05-11, 10-19)
   */
  readonly riseX: Float32Array;
  readonly riseZ: Float32Array;
  readonly riseBorn: Float64Array;
  readonly riseSpan: Float32Array;
  riseCount: number;
}

// The one set of scratch objects of this file, made once at load: a frame writes
// hundreds of matrices and allocates none of them. (spec 10-14)
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SIZE = new THREE.Vector3();
const SEAT = new THREE.Matrix4();
const PAINT = new THREE.Color();
const UPRIGHT = new THREE.Vector3(0, 1, 0);

/**
 * Builds the mesh and the two marks, once, at load — and again after a lost
 * context, because the scene is a projection of the state and no datum of the
 * game lives only on the GPU. `holds` is the pool of cannons, which is a
 * technical bound and never a rule: nothing here counts them either.
 * (spec 05-52, 10-13, 10-37)
 */
export function buildCannons(holds: number): CannonView {
  const bodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    holds * MOST_BOXES,
  );
  bodies.name = 'cannons';
  bodies.count = 0;

  // A square laid flat and turned a quarter turn about the upright: that is the
  // whole of a diamond, and an instance carries only how wide it is. (spec 05-17)
  const lozenge = new THREE.PlaneGeometry(1, 1);
  lozenge.rotateX(-Math.PI / 2);
  lozenge.rotateY(Math.PI / 4);
  const mark = new THREE.Mesh(
    lozenge,
    // Unlit: a mark painted on the floor says what a button will do, and it must
    // read the same wherever he stands. (spec 05-17)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(WHITE) }),
  );
  mark.name = 'diamond';

  // The circle the ball would carry to, drawn as a thin ring on the floor. Its
  // thickness is a fraction of its radius, so it stays a line at twelve blocks
  // and at eighteen. (spec 05-19, 05-22)
  const ring = new THREE.RingGeometry(0.97, 1, 64);
  ring.rotateX(-Math.PI / 2);
  const circle = new THREE.Mesh(
    ring,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(WHITE), side: THREE.DoubleSide }),
  );
  circle.name = 'reach';

  const node = new THREE.Group();
  node.add(bodies);
  node.add(mark);
  node.add(circle);
  return {
    node,
    draws: [bodies, mark, circle],
    bodies,
    mark,
    circle,
    riseX: new Float32Array(holds),
    riseZ: new Float32Array(holds),
    riseBorn: new Float64Array(holds),
    riseSpan: new Float32Array(holds),
    riseCount: 0,
  };
}

/**
 * Arms the going down of one cannon, at the spot the buffer names for it. Past
 * the pool the rise is let go rather than anything growing: a cannon that skips
 * its rise stands there whole, which is what it was going to be anyway.
 * (spec 05-7, 10-14)
 */
export function raiseCannon(
  view: CannonView,
  x: number,
  z: number,
  span: number,
  now: number,
): void {
  const at = view.riseCount;
  if (at >= view.riseSpan.length) return;
  view.riseX[at] = x;
  view.riseZ[at] = z;
  view.riseBorn[at] = now;
  view.riseSpan[at] = span;
  view.riseCount = at + 1;
}

/** Moves one rise, whole, from one slot to another. */
function carryRise(view: CannonView, from: number, to: number): void {
  view.riseX[to] = view.riseX[from];
  view.riseZ[to] = view.riseZ[from];
  view.riseBorn[to] = view.riseBorn[from];
  view.riseSpan[to] = view.riseSpan[from];
}

/** Lets go of the rises that have run out, so the pool stays `[0, count)`. */
function ageRises(view: CannonView, now: number): void {
  let live = 0;
  for (let i = 0; i < view.riseCount; i += 1) {
    if (now - view.riseBorn[i] >= view.riseSpan[i]) continue;
    if (live !== i) carryRise(view, i, live);
    live += 1;
  }
  view.riseCount = live;
}

/** How far out of the ground the cannon at that spot has come, from nought to one. */
function risenAt(view: CannonView, x: number, z: number, now: number): number {
  for (let i = 0; i < view.riseCount; i += 1) {
    const offX = view.riseX[i] - x;
    const offZ = view.riseZ[i] - z;
    if (offX * offX + offZ * offZ > 0.01) continue;
    const done = (now - view.riseBorn[i]) / view.riseSpan[i];
    return done < 0 ? 0 : done;
  }
  return 1;
}

/**
 * How many plates still stand on a cannon, off what is left of its hp. A cannon
 * at full hp carries all of them, and one at nought carries none — but one at
 * nought is already gone, so what is ever seen is a shape that has come apart by
 * degrees and stays that way until an upgrade. (spec 05-48, 05-49, 05-50)
 */
export function platesOf(hp: number, whole: number): number {
  if (hp <= 0) return 0;
  const standing = Math.ceil((hp / whole) * PLATES);
  return standing > PLATES ? PLATES : standing;
}

/** Where a frame sits between the two last steps. (spec 10-24) */
function between(from: number, to: number, alpha: number): number {
  let gap = to - from;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  return from + gap * alpha;
}

/** Seats one box of one cannon, turned, scaled and coloured with it. */
function seatBox(
  view: CannonView,
  at: number,
  box: CannonBox,
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
  view.bodies.setMatrixAt(at, SEAT.compose(SPOT, TURN, SIZE));
  view.bodies.setColorAt(at, PAINT.set(colour));
}

/** Seats one whole cannon and says how many boxes it took. */
function seatCannon(
  view: CannonView,
  at: number,
  x: number,
  y: number,
  z: number,
  ang: number,
  tier: number,
  standing: number,
  held: number,
): number {
  const scale = TIER_SCALES[tier - 1] ?? 1;
  const turn = -ang;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  TURN.setFromAxisAngle(UPRIGHT, turn);

  let put = at;
  let plate = 0;
  for (let b = 0; b < CANNON.length; b += 1) {
    const box = CANNON[b];
    if (!box.tiers.includes(tier)) continue;
    if (box.plate) {
      plate += 1;
      // What has come off has come off for good: it is simply no longer there,
      // and the puff of white shards at the blow is what said it had gone.
      // (spec 05-48, 05-49)
      if (plate > standing) continue;
    }
    // An empty cell of the magazine is a hollow, which is how three cells show
    // that they empty. What fills them arrives with the resupply. (spec 05-5)
    if (box.cell > 0 && box.cell > held) continue;
    seatBox(view, put, box, x, y, z, cos, sin, scale, box.copper && tier > 1 ? COPPER : METAL);
    put += 1;
  }
  return put;
}

/**
 * Lays the mark under his feet and the circle it draws. Both are painted on the
 * floor, both are in the same colour, and both are gone from a spot the moment
 * he leaves it — because they are laid where he stands and nowhere else, every
 * frame. (spec 05-17, 05-19, 05-20)
 *
 * Wide and white, a cannon goes down; tight, white and breathing, the one within
 * three blocks moves up; wide and black, there is nothing left to do here. No
 * word and no figure — the three are told apart by size, by colour and by
 * movement, which are the three channels the city itself does not use.
 * (spec 05-17, 05-18, 07-14)
 *
 * Which of the three it is arrives already read: the rules settle it, and the
 * drawing takes the shape of the answer rather than the constant that names it.
 * (spec 10-2)
 */
export function layDiamond(
  view: CannonView,
  x: number,
  y: number,
  z: number,
  reach: number,
  white: boolean,
  tight: boolean,
  rule: CannonBalance,
  now: number,
): void {
  // Wide is the three blocks the spacing claims; tight is half of that. Both are
  // read off 05-11 rather than chosen. (spec 05-11, 05-17)
  const wide = rule.spacing / 2;
  let span = wide;
  if (tight) {
    const breath = Math.sin((2 * Math.PI * BLINK_SLOW * now) / 1000);
    span = (wide / 2) * (1 + PULSE_DEEP * breath);
  }

  const colour = white ? WHITE : BLACK;
  view.mark.position.set(x, y + LIFT, z);
  view.mark.scale.set(span * 2, 1, span * 2);
  (view.mark.material as THREE.MeshBasicMaterial).color.set(colour);

  view.circle.position.set(x, y + LIFT, z);
  view.circle.scale.set(reach, 1, reach);
  (view.circle.material as THREE.MeshBasicMaterial).color.set(colour);
}

/**
 * Places every cannon of the game for this frame. Nothing is allocated here, and
 * the count is what says how much of the mesh is drawn. (spec 10-14, 10-24)
 */
export function placeCannons(
  view: CannonView,
  cannons: Readonly<CannonPool>,
  rule: CannonBalance,
  alpha: number,
  now: number,
): void {
  ageRises(view, now);

  let put = 0;
  for (let c = 0; c < cannons.count; c += 1) {
    const tier = cannons.tier[c];
    const scale = TIER_SCALES[tier - 1] ?? 1;
    const x = cannons.x[c];
    const z = cannons.z[c];
    const risen = risenAt(view, x, z, now);
    put = seatCannon(
      view,
      put,
      x,
      cannons.y[c] - (1 - risen) * SUNK * scale,
      z,
      between(cannons.angPrev[c], cannons.ang[c], alpha),
      tier,
      platesOf(cannons.hp[c], rule.hp),
      cannons.magazine[c],
    );
  }

  view.bodies.count = put;
  view.bodies.instanceMatrix.needsUpdate = true;
  const painted = view.bodies.instanceColor;
  if (painted !== null) painted.needsUpdate = true;
}
