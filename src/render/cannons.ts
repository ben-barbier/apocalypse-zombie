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
 * **Both are drawn as an outline, and neither is ever a plate of colour** — a
 * diamond is a ring of four sides and the circle a ring of sixty-four, so the
 * two are the same shape twice over and are built the same way. The hollow is
 * made by the shape and never by an alpha: nothing in this game is see-through.
 * A mark filled in would have painted the whole of the floor he stands on, and
 * the white arc of a sweep — laid along the blade, three blocks ahead of him and
 * a block and a fifth up — would have been read against white. The outline holds
 * **one thickness in blocks whatever the state asks**, so a tight mark is a
 * smaller mark and never a fainter one. (spec 05-17, 05-19, 05-54, 05-55, 07-17,
 * 07-31)
 *
 * **The cone is the one continuous effect of the game**, so it is the one thing
 * here that is not made of shards: an instanced cone attached to the cannon, one
 * instance per cannon that burns, and **the scale carries the length**. Short
 * dry, long fed — and never a second colour, since the fire of this game is
 * white-blue throughout. It is alight only where a zombie stands, so a cone on
 * the screen is a zombie on the screen. (spec 05-33, 05-36, 07-38, 07-39)
 *
 * **The belt of a third tier rides in the same mesh as the boxes of a cannon**,
 * a single stretched cube from the base to the cannon it serves: it appears
 * whole at the purchase, nothing traces it and nothing steers it, and it pulls
 * back to the base over one second when the cannon it served is gone. It never
 * goes on its own account — nothing in this game can take it down.
 * (spec 04-53, 04-55, 05-5, 05-50)
 *
 * The ball is not here, and it never will be — it is a shard like every other
 * effect, and it rides in the one mesh of `effects.ts` rather than in a call of
 * its own. (spec 07-32)
 */
import * as THREE from 'three';
import type { CannonBalance } from '../game/balance';
import type { CannonPool } from '../game/state';
import { BLACK, BLINK_SLOW, FIRE, SHARD_SIDE, WHITE } from './effects';

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
 * How thick the outline of the mark runs, in blocks, and it is **the same in
 * the three states**.
 *
 * It is the side of a shard, and that is where it is read off rather than
 * chosen: a shard is a quarter of a block and the smallest thing this game
 * already asks the eye to make out, so at the ×3 chapter 7 takes as its scale
 * of legibility it comes to twelve pixels across. A stroke any thinner than
 * the arc laid over it would say less than the arc. (spec 05-55,
 * 05 "Le trait du losange", 07-25, 07 "La planche")
 */
const MARK_LINE = SHARD_SIDE;

/** Four sides make a diamond, sixty-four make a circle. (spec 05-17, 05-19) */
const MARK_SIDES = 4;
const REACH_SIDES = 64;

/**
 * How far a corner of the mark sits from its middle, in the mesh, for a shape
 * whose half-width is a half: a square stood on its point. What the mesh is
 * drawn at is therefore the width of the mark, in blocks, flat side to flat
 * side. (spec 05-17)
 */
const MARK_CORNER = Math.SQRT1_2;

/**
 * How thick the circle runs, as a share of its own radius, so it stays a line
 * at twelve blocks and at eighteen — 0,36 and 0,54 of a block, both of them
 * over the shard the eye is given. (spec 05-19, 05-22, 07-25)
 */
const REACH_LINE = 0.03;

/**
 * A flat ring laid on the floor: `sides` of them, an outer edge at `outer` and
 * an inner edge at `inner`, both measured from the middle out to a corner.
 *
 * It is the one shape this file draws twice over — **a diamond is a ring of
 * four sides**, the circle is a ring of sixty-four — so the mark and the circle
 * are made the same way and cost the same one call each. The hollow is the
 * shape itself and never an alpha, which is the only way to hollow anything in
 * a game where everything is opaque. (spec 05-17, 05-19, 05-54, 07-17)
 */
function flatRing(sides: number, inner: number, outer: number): THREE.BufferGeometry {
  const spots = new Float32Array(sides * 6);
  const facing = new Float32Array(sides * 6);
  const woven: number[] = [];
  for (let i = 0; i < sides; i += 1) {
    const turn = (i / sides) * 2 * Math.PI;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    spots[i * 3] = inner * cos;
    spots[i * 3 + 2] = inner * sin;
    spots[(sides + i) * 3] = outer * cos;
    spots[(sides + i) * 3 + 2] = outer * sin;
    // Laid flat and facing the sky, which is what makes it read from above.
    facing[i * 3 + 1] = 1;
    facing[(sides + i) * 3 + 1] = 1;
    const next = (i + 1) % sides;
    woven.push(i, sides + next, sides + i, i, next, sides + next);
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.BufferAttribute(spots, 3));
  shape.setAttribute('normal', new THREE.BufferAttribute(facing, 3));
  shape.setIndex(woven);
  return shape;
}

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

/**
 * The mouth of the second arm, which is what the second tier adds — and where
 * the cone leaves from, which is why it is named rather than left in the table.
 * (spec 05-3, 07-38)
 */
export const MOUTH = boxOf('mouth', 0.34, 0.2, 0.2, 0.32, 0.34, ARMED, true);

export const CANNON: readonly CannonBox[] = [
  // The footing, which wear never takes: a cannon at one hp still stands on it.
  boxOf('foot', 1, 0.24, 1, 0, 0.12, ALL, false),
  // The body, grey stone at the first tier and copper from the second. (spec 05-5)
  boxOf('body', 0.66, 0.5, 0.66, 0, 0.5, ALL, true),
  // The short tube of a first tier, and the long one the other two carry. (spec 05-5)
  boxOf('tubeShort', 0.62, 0.22, 0.22, 0.42, 0.62, [1], false),
  boxOf('tubeLong', 1.05, 0.26, 0.26, 0.62, 0.68, ARMED, true),
  MOUTH,
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

/**
 * How long a dry cone runs, as a fraction of the six blocks a fed one shows.
 *
 * The spec settles that the state is read off the **length** — short dry, long
 * fed — and no measurement of it, so this is derived rather than picked: a dry
 * cone lands half a sword hit a second against the two of a fed one, a quarter,
 * and the length says that ratio. It is never nought, because a flame **never
 * goes out**: dry it weakens, and that is the whole of the difference.
 * (spec 05-34, 05-36)
 */
const DRY_OF = 0.25;

/** How wide and how thick the belt of a third tier runs, in blocks. (spec 05-5) */
const BELT_WIDE = 0.5;
const BELT_THICK = 0.16;

/** How high over the floor the belt leaves the base, so it does not fight it. */
const BELT_LIFT = 0.3;

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
   * The corners of the mark, held here so a frame can draw its hollow in again
   * without going looking for them: the inner four move with the width the
   * state asks, the outer four never move at all. (spec 05-55, 10-14)
   */
  readonly markSpots: THREE.BufferAttribute;
  /**
   * One cone per cannon that burns, and the second of the two instanced systems
   * of effect chapter 7 counts — the shards are the other. (spec 07-38,
   * 07 "Les éclats")
   */
  readonly flames: THREE.InstancedMesh;

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

  /**
   * The magazines filling, held by the spot of their cannon like the rises
   * above, and armed off the one fact the rules write when an armful goes in.
   * `pourFrom` is what the magazine held before it, so the cells that arrive
   * come up over the 0,3 second of the gesture rather than blinking into being.
   * (spec 04-49, 10-19)
   */
  readonly pourX: Float32Array;
  readonly pourZ: Float32Array;
  readonly pourFrom: Uint8Array;
  readonly pourBorn: Float64Array;
  readonly pourSpan: Float32Array;
  pourCount: number;

  /**
   * The belts pulling back to the base, one second each, because the cannon they
   * served is gone. They outlive their cannon, so they are held here by the spot
   * it stood at rather than by a slot of a pool that no longer holds it.
   * (spec 04-55, 05-50)
   */
  readonly pullX: Float32Array;
  readonly pullY: Float32Array;
  readonly pullZ: Float32Array;
  readonly pullBorn: Float64Array;
  readonly pullSpan: Float32Array;
  pullCount: number;
}

// The one set of scratch objects of this file, made once at load: a frame writes
// hundreds of matrices and allocates none of them. (spec 10-14)
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SIZE = new THREE.Vector3();
const SEAT = new THREE.Matrix4();
const PAINT = new THREE.Color();
const UPRIGHT = new THREE.Vector3(0, 1, 0);
const ALONG = new THREE.Vector3();
const AXIS = new THREE.Vector3(1, 0, 0);

/**
 * Builds the mesh and the two marks, once, at load — and again after a lost
 * context, because the scene is a projection of the state and no datum of the
 * game lives only on the GPU. `holds` is the pool of cannons, which is a
 * technical bound and never a rule: nothing here counts them either.
 * (spec 05-52, 10-13, 10-37)
 *
 * `arc` is the opening of the cone, in degrees, and it is handed in rather than
 * written here: it belongs to the balance, and a figure written twice ends up
 * differing. It rides in the geometry, so an instance carries one scale and
 * that scale is the whole of what says fed or dry. (spec 05-30, 07-38, 10-15)
 */
export function buildCannons(holds: number, arc: number): CannonView {
  const bodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    // Every box of every cannon, one belt per cannon of the third tier, and one
    // more per belt still pulling back to the base after its cannon has gone.
    // (spec 04-55, 05-5)
    holds * (MOST_BOXES + 2),
  );
  bodies.name = 'cannons';
  bodies.count = 0;

  // One cone, of a length of one and of the opening chapter 5 settles, so an
  // instance carries a spot, a heading and **one scale** — and that scale is the
  // whole of what says fed or dry. Its point sits at the origin and it opens
  // along `+x`, which is the heading every box of this file is laid along.
  // (spec 05-30, 07-38)
  const cone = new THREE.ConeGeometry(Math.tan((arc / 2) * (Math.PI / 180)), 1, 12);
  cone.rotateZ(Math.PI / 2);
  cone.translate(0.5, 0, 0);
  const flames = new THREE.InstancedMesh(
    cone,
    // It takes neither the light nor the haze: a cone at the far end of a street
    // must be seen to burn, and the fire is one colour and one only.
    // (spec 07-8, 07-11, 07-39)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(FIRE) }),
    holds,
  );
  flames.name = 'flames';
  flames.count = 0;
  (flames.material as THREE.MeshBasicMaterial).fog = false;

  // A ring of four sides laid flat, its corners on the axes: that is the whole
  // of a diamond, and what it is drawn at is how wide it is. It is made with no
  // thickness at all, the hollow being written in at the width every frame asks,
  // so a mark that has not been laid yet shows nothing rather than a plate of
  // white. (spec 05-17, 05-54)
  const lozenge = flatRing(MARK_SIDES, MARK_CORNER, MARK_CORNER);
  const mark = new THREE.Mesh(
    lozenge,
    // Unlit: a mark painted on the floor says what a button will do, and it must
    // read the same wherever he stands. Opaque like everything else here — what
    // it does not cover, it does not cover because it is not there. (spec 05-17,
    // 07-17)
    new THREE.MeshBasicMaterial({ color: new THREE.Color(WHITE) }),
  );
  mark.name = 'diamond';

  // The circle the ball would carry to, the same ring at sixty-four sides. Its
  // thickness is a share of its radius, so it stays a line at twelve blocks and
  // at eighteen. (spec 05-19, 05-22)
  const circle = new THREE.Mesh(
    flatRing(REACH_SIDES, 1 - REACH_LINE, 1),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(WHITE), side: THREE.DoubleSide }),
  );
  circle.name = 'reach';

  const node = new THREE.Group();
  node.add(bodies);
  node.add(flames);
  node.add(mark);
  node.add(circle);
  return {
    node,
    draws: [bodies, flames, mark, circle],
    bodies,
    mark,
    circle,
    markSpots: lozenge.getAttribute('position') as THREE.BufferAttribute,
    flames,
    riseX: new Float32Array(holds),
    riseZ: new Float32Array(holds),
    riseBorn: new Float64Array(holds),
    riseSpan: new Float32Array(holds),
    riseCount: 0,
    pourX: new Float32Array(holds),
    pourZ: new Float32Array(holds),
    pourFrom: new Uint8Array(holds),
    pourBorn: new Float64Array(holds),
    pourSpan: new Float32Array(holds),
    pourCount: 0,
    pullX: new Float32Array(holds),
    pullY: new Float32Array(holds),
    pullZ: new Float32Array(holds),
    pullBorn: new Float64Array(holds),
    pullSpan: new Float32Array(holds),
    pullCount: 0,
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
 * Arms the filling of one magazine, at the spot the buffer names for it, and
 * `from` is what it held before. Past the pool the filling is let go rather than
 * anything growing: the cells are simply there, which is what they were about to
 * be. (spec 04-49, 10-14)
 */
export function pourCells(
  view: CannonView,
  x: number,
  z: number,
  from: number,
  span: number,
  now: number,
): void {
  const at = view.pourCount;
  if (at >= view.pourSpan.length) return;
  view.pourX[at] = x;
  view.pourZ[at] = z;
  view.pourFrom[at] = from;
  view.pourBorn[at] = now;
  view.pourSpan[at] = span;
  view.pourCount = at + 1;
}

/** Moves one filling, whole, from one slot to another. */
function carryPour(view: CannonView, from: number, to: number): void {
  view.pourX[to] = view.pourX[from];
  view.pourZ[to] = view.pourZ[from];
  view.pourFrom[to] = view.pourFrom[from];
  view.pourBorn[to] = view.pourBorn[from];
  view.pourSpan[to] = view.pourSpan[from];
}

/** Lets go of the fillings that have run out, so the pool stays `[0, count)`. */
function agePours(view: CannonView, now: number): void {
  let live = 0;
  for (let i = 0; i < view.pourCount; i += 1) {
    if (now - view.pourBorn[i] >= view.pourSpan[i]) continue;
    if (live !== i) carryPour(view, i, live);
    live += 1;
  }
  view.pourCount = live;
}

/**
 * How many cells of the magazine at that spot show this frame: what it holds
 * now, or fewer while an armful is still going in. The cells arrive one whole
 * cell at a time over the 0,3 second, which is the one place that span is ever
 * spent. (spec 04-49, 05-5)
 */
function filledAt(view: CannonView, x: number, z: number, held: number, now: number): number {
  for (let i = 0; i < view.pourCount; i += 1) {
    const offX = view.pourX[i] - x;
    const offZ = view.pourZ[i] - z;
    if (offX * offX + offZ * offZ > 0.01) continue;
    const done = (now - view.pourBorn[i]) / view.pourSpan[i];
    const was = view.pourFrom[i];
    const shown = was + Math.floor((held - was) * (done < 0 ? 0 : done));
    return shown > held ? held : shown;
  }
  return held;
}

/**
 * Arms the pulling back of one belt, from the spot the cannon it served stood
 * at. It is the one thing that ever takes a belt away: nothing in this game can
 * destroy one, and it goes because its cannon has. (spec 04-55, 05-50)
 */
export function retractConveyor(
  view: CannonView,
  x: number,
  y: number,
  z: number,
  span: number,
  now: number,
): void {
  const at = view.pullCount;
  if (at >= view.pullSpan.length) return;
  view.pullX[at] = x;
  view.pullY[at] = y;
  view.pullZ[at] = z;
  view.pullBorn[at] = now;
  view.pullSpan[at] = span;
  view.pullCount = at + 1;
}

/** Moves one pulling belt, whole, from one slot to another. */
function carryPull(view: CannonView, from: number, to: number): void {
  view.pullX[to] = view.pullX[from];
  view.pullY[to] = view.pullY[from];
  view.pullZ[to] = view.pullZ[from];
  view.pullBorn[to] = view.pullBorn[from];
  view.pullSpan[to] = view.pullSpan[from];
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
    // A cell that holds a firebomb is painted in the one colour the fire of this
    // game has, so the three cells say what they hold and never how much of
    // anything: they are cells, not a gauge. (spec 05-5, 07-39)
    const paint = box.cell > 0 ? FIRE : box.copper && tier > 1 ? COPPER : METAL;
    seatBox(view, put, box, x, y, z, cos, sin, scale, paint);
    put += 1;
  }
  return put;
}

/**
 * Seats one belt, a single cube stretched between two spots, and says whether it
 * took a slot. There is no path here and no waypoint: a belt is the straight
 * line from the base to the cannon it serves, and nothing traces it, steers it
 * or takes it down. It is grey metal rather than the copper of the cannon —
 * cold against a city warm throughout, which is what makes the third silhouette
 * read from the far side of the square. (spec 04-53, 04-55, 05-5, 07-9)
 */
function seatBelt(
  view: CannonView,
  at: number,
  fromX: number,
  fromY: number,
  fromZ: number,
  toX: number,
  toY: number,
  toZ: number,
): boolean {
  ALONG.set(toX - fromX, toY - fromY, toZ - fromZ);
  const run = ALONG.length();
  if (run < 0.001) return false; // pulled all the way back, and there is nothing left to draw
  ALONG.divideScalar(run);
  TURN.setFromUnitVectors(AXIS, ALONG);
  SPOT.set((fromX + toX) / 2, (fromY + toY) / 2, (fromZ + toZ) / 2);
  SIZE.set(run, BELT_THICK, BELT_WIDE);
  view.bodies.setMatrixAt(at, SEAT.compose(SPOT, TURN, SIZE));
  view.bodies.setColorAt(at, PAINT.set(METAL));
  return true;
}

/**
 * Seats the belts still pulling back to the base, after the cannons they served.
 * The far end slides home over the one second of 04-55, and what is left is
 * nothing at all. (spec 04-55, 05-50)
 */
function seatPulls(
  view: CannonView,
  at: number,
  baseX: number,
  baseZ: number,
  now: number,
): number {
  let put = at;
  let live = 0;

  for (let i = 0; i < view.pullCount; i += 1) {
    const span = view.pullSpan[i];
    if (!(span > 0) || now - view.pullBorn[i] >= span) continue;
    if (live !== i) carryPull(view, i, live);

    const left = 1 - (now - view.pullBorn[live]) / span;
    const toX = baseX + (view.pullX[live] - baseX) * left;
    const toY = BELT_LIFT + view.pullY[live] * left;
    const toZ = baseZ + (view.pullZ[live] - baseZ) * left;
    if (seatBelt(view, put, baseX, BELT_LIFT, baseZ, toX, toY, toZ)) put += 1;
    live += 1;
  }

  view.pullCount = live;
  return put;
}

/**
 * Seats one cone, at the mouth of the second arm and on the heading of what it
 * burns. **One instance, one scale, and that scale is the whole of the state**:
 * six blocks fed, a quarter of that dry, and never a second colour. The opening
 * rides in the geometry, so a cone of any length is the same 60°.
 * (spec 05-30, 05-36, 07-38, 07-39)
 */
function seatFlame(
  view: CannonView,
  at: number,
  x: number,
  y: number,
  z: number,
  ang: number,
  scale: number,
  length: number,
): void {
  const turn = -ang;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  TURN.setFromAxisAngle(UPRIGHT, turn);
  SPOT.set(x + MOUTH.x * cos * scale, y + MOUTH.y * scale, z - MOUTH.x * sin * scale);
  SIZE.set(length, length, length);
  view.flames.setMatrixAt(at, SEAT.compose(SPOT, TURN, SIZE));
}

/**
 * Draws the hollow of the mark in again for this frame, so the outline keeps
 * the one thickness of `MARK_LINE` at whatever width the state asks. The outer
 * four corners never move, which is what leaves the width of the mark carried
 * by what the mesh is drawn at; only the inner four are written over, in a
 * buffer made at load, so a frame allocates nothing. (spec 05-55, 10-14)
 *
 * Were the thickness a share of the width instead, a tight mark would be drawn
 * at half the stroke of a wide one — an eighth of a block, half a shard — and
 * would say less exactly where it is asked the most. (spec 05-17, 07-25)
 */
function hollowMark(view: CannonView, span: number): void {
  // The mesh is drawn at twice `span`, so an outline `MARK_LINE` thick around a
  // shape whose half-width is `span` leaves its corners at this much of one.
  const left = span - MARK_LINE;
  const inner = left > 0 ? (MARK_CORNER * left) / span : 0;
  for (let i = 0; i < MARK_SIDES; i += 1) {
    const turn = (i / MARK_SIDES) * 2 * Math.PI;
    view.markSpots.setXYZ(i, inner * Math.cos(turn), 0, inner * Math.sin(turn));
  }
  view.markSpots.needsUpdate = true;
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
 * All three are an **outline** and none of them a plate: what the mark says, it
 * says with its edge, and the floor it stands on stays the floor. (spec 05-54)
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
  hollowMark(view, span);
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
  baseX: number,
  baseZ: number,
): void {
  ageRises(view, now);
  agePours(view, now);

  let put = 0;
  let lit = 0;
  for (let c = 0; c < cannons.count; c += 1) {
    const tier = cannons.tier[c];
    const scale = TIER_SCALES[tier - 1] ?? 1;
    const x = cannons.x[c];
    const z = cannons.z[c];
    const risen = risenAt(view, x, z, now);
    const floor = cannons.y[c] - (1 - risen) * SUNK * scale;
    put = seatCannon(
      view,
      put,
      x,
      floor,
      z,
      between(cannons.angPrev[c], cannons.ang[c], alpha),
      tier,
      platesOf(cannons.hp[c], rule.hp),
      filledAt(view, x, z, cannons.magazine[c], now),
    );

    // The belt of a third tier, whole from the instant of the purchase and
    // straight from the base: it is the third silhouette. (spec 04-53, 05-5)
    if (tier >= rule.tiers && seatBelt(view, put, baseX, BELT_LIFT, baseZ, x, floor + BELT_LIFT, z)) {
      put += 1;
    }

    // One cone per cannon that burns, and **none at all over an empty street**:
    // the rules say which are alight, and nothing here guesses. (spec 05-33, 07-38)
    if (cannons.flameLit[c] === 1) {
      seatFlame(
        view,
        lit,
        x,
        floor,
        z,
        between(cannons.flameAngPrev[c], cannons.flameAng[c], alpha),
        scale,
        rule.flame.range * (cannons.burnLeft[c] > 0 ? 1 : DRY_OF),
      );
      lit += 1;
    }
  }

  put = seatPulls(view, put, baseX, baseZ, now);

  view.bodies.count = put;
  view.flames.count = lit;
  view.bodies.instanceMatrix.needsUpdate = true;
  view.flames.instanceMatrix.needsUpdate = true;
  const painted = view.bodies.instanceColor;
  if (painted !== null) painted.needsUpdate = true;
}
