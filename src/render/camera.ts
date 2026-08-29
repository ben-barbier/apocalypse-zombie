/**
 * The camera, which places itself and obeys nobody.
 *
 * It stands behind the player, 6,5 blocks back and 5,5 over the ground he walks
 * on, and it is **assisted**: it swings back behind him as soon as he runs, at
 * 2,4 radians a second, and it does so on its own. There is no command for it on
 * any platform — the right stick does nothing, no finger on the glass turns it,
 * no button recentres it, no setting inverts it — and the game never takes it
 * away from the child either: no cut scene, no framing imposed, at no instant of
 * a run. A free camera asks a child of eight to mind two things at once, and a
 * camera on notches breaks the tie between where the stick pushes and what one
 * sees the moment one runs on a slant. Both refusals were confirmed by a
 * playtest, where the child moved about without ever fighting the view, and they
 * are written here exactly as chapter 4 has them.
 * (spec 04-15, 04-16, 04-19, 04-20)
 *
 * It is never bound to the auto-aim. The aim turns the player on the very
 * instant he strikes, and he may strike two and a half times a second: a view
 * that followed those pivots would be giddiness itself. So the player pivots and
 * the camera does not, and the recentring is frozen for 1,2 second after each
 * blow of his sword — that freeze is the whole of the mechanism. (spec 04-17)
 *
 * When a building comes between it and him it **climbs** — up to ten blocks —
 * **before** it ever comes in, and it never comes under 3,2 blocks of recoil.
 * Pressing against his back is seeing nothing at all, whereas a roof reads from
 * above as well as from the front, so height costs no legibility. (spec 04-18)
 *
 * The six constants of chapter 4 are handed over rather than written twice: they
 * live in `game/balance.ts`, which is where the spec is executable and where a
 * test reads them back against the chapter. This module names all six of them,
 * and it is the only place any of them is ever put to work. (spec 10-15, 10-16)
 *
 * It reads the grid of heights the rules engender — the one collision structure
 * of the game — and never a plan of its own, walking it cell by cell so that
 * nothing this city holds ever slips between two readings (spec 04-8), and it
 * follows the spot the drawing sits between the two last steps rather than the
 * last one, without which it would judder on a screen faster than the step
 * (spec 10-24). Nothing here is allocated per frame. (spec 10-14)
 */
import * as THREE from 'three';
import type { CameraBalance } from '../game/balance';
import type { City, Player } from '../game/state';
import { hazeFar, type CityExtent } from './scene';

/**
 * How far over his feet it watches: the middle of a body, which stands two
 * blocks at a scale of one. It is also where the line of sight starts from, so
 * what hides his middle is what makes the camera climb. (spec 07-18)
 */
const LOOK = 1;

/**
 * The most cells a line of sight is ever walked over. A straight line of `n`
 * blocks crosses at most `2n` cell borders on a grid of one block, so a recoil
 * of six and a half touches fourteen cells at the very most; sixty-four holds
 * any recoil chapter 4 could be given, and the march stops there rather than
 * write past the end of its own arrays.
 */
const CROSSINGS = 64;

/** What counts as having moved at all between two steps, in blocks. (spec 04-16) */
const STIRRED = 1e-4;

/**
 * The bound on the gap between two frames, in seconds — the very one the loop
 * puts on its own, so a page that comes back after a minute swings the camera by
 * a tenth of a second of turn and not by a minute of it. (spec 10-23)
 */
const MOST_GAP = 0.1;

/**
 * The field of view, in degrees, and the two planes that bound it. The spec
 * settles none of the three: they are the drawing's own. The far one is read off
 * the haze rather than chosen — where the haze is total, what is clipped and
 * what is drawn are the same colour, so the cut cannot be seen. (spec 07-6)
 */
export const FIELD = 60;
export const NEAR = 0.1;

/** The one camera of the one scene, and what it carries between two frames. */
export interface CameraView {
  /** What the one scene is drawn through. */
  readonly lens: THREE.PerspectiveCamera;
  /** The six of chapter 4, injected like every other constant. (spec 10-15) */
  readonly rule: CameraBalance;
  /** The heading it watches along, in the frame the player heads in. (spec 04-15) */
  ang: number;
  /** Blocks behind him: `back` nominally, never under `minBack`. (spec 04-15, 04-18) */
  back: number;
  /** Blocks over his ground: `above`, and up to `climb` more. (spec 04-15, 04-18) */
  above: number;
  /** Seconds of recentring a blow has frozen. (spec 04-17) */
  freezeLeft: number;
  /** The timestamp of the frame before, in ms, or -1 before the first one. */
  last: number;
}

/**
 * What the sight asks for this frame, kept here rather than handed back in
 * something allocated. (spec 10-14)
 */
let askedBack = 0;
let askedAbove = 0;

/**
 * The one march of a frame: how far along the line of sight each cell it
 * crosses is entered, in blocks from his middle, and how high what stands in
 * that cell goes. They are laid down once at load and written over every frame,
 * never handed back and never grown. (spec 10-14)
 */
const enteredAt = new Float64Array(CROSSINGS);
const standsAt = new Float64Array(CROSSINGS);
let crossings = 0;

/**
 * Builds the one camera. The recoil and the height it opens on are the nominal
 * ones; `settleCamera` is what puts it behind a player. (spec 04-15)
 */
export function createCamera(rule: CameraBalance, city: CityExtent): CameraView {
  return {
    lens: new THREE.PerspectiveCamera(FIELD, 1, NEAR, hazeFar(city)),
    rule,
    ang: 0,
    back: rule.back,
    above: rule.above,
    freezeLeft: 0,
    last: -1,
  };
}

/** The screen it draws onto, whose shape is no business of the game. (spec 08) */
export function fitCamera(view: CameraView, width: number, height: number): void {
  view.lens.aspect = height === 0 ? 1 : width / height;
  view.lens.updateProjectionMatrix();
}

/**
 * Where a spot of the city falls across the screen: -1 at the left border, +1 at
 * the right, and past those when it is out of sight — which is the whole of what
 * a street arrow of chapter 8 asks of the camera. A spot behind it hands back the
 * border it lies beyond, so an arrow for a street one has turned one's back on
 * goes flat against that border rather than swinging about. (spec 08-32)
 *
 * It reads the heading and the seat of the lens and does its own trigonometry
 * rather than projecting a vector, because a vector would be an allocation once
 * a frame and there are three of these every frame. (spec 10-14)
 */
export function acrossOf(view: CameraView, x: number, z: number): number {
  const cos = Math.cos(view.ang);
  const sin = Math.sin(view.ang);
  const offX = x - view.lens.position.x;
  const offZ = z - view.lens.position.z;
  // Along the line of sight, and along the way the screen runs to the right.
  const along = offX * cos + offZ * sin;
  const sideways = -offX * sin + offZ * cos;
  const half = view.lens.aspect * Math.tan(((FIELD / 2) * Math.PI) / 180);
  if (along <= 0 || half <= 0) return sideways >= 0 ? 2 : -2;
  return sideways / (along * half);
}

/**
 * Freezes the recentring for 1,2 second, which is what a blow of his sword
 * costs it. It is armed where the buffer of events is read, because the renderer
 * takes types from the rules and never their constants — and it is armed by a
 * blow of the **sword** alone: the fatal blow of the buffer names whatever
 * landed it, a cannon included, and a camera frozen by every fatal blow of
 * every cannon would never recentre at all. (spec 04-17, 10-2, 10-19)
 */
export function freezeRecentring(view: CameraView): void {
  view.freezeLeft = view.rule.freezeAfterBlow;
}

/** Where a frame sits between the two last steps. (spec 10-24) */
function between(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/** The same, taking the shorter of the two ways about a circle. */
function betweenTurns(from: number, to: number, alpha: number): number {
  let gap = to - from;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  return from + gap * alpha;
}

/**
 * Walks the line of sight over the grid and lays down **every cell it touches**,
 * with the distance at which it enters each — not one reading every so often.
 *
 * Reading a spot every half block is what let the city hide behind its own
 * sampling: a line that clips the corner of a frontage is inside it over a
 * couple of tenths of a block and lands in no reading at all, so the camera
 * called the way clear where a wall stood and the child lost his own body behind
 * it. A march over the borders themselves cannot miss a cell however thin the
 * slice it takes off it — and it is the cheaper of the two into the bargain,
 * swept over the whole city: nine readings a frame against eighteen, and never
 * over fourteen where sampling nine recoils could take ninety-two.
 * (spec 04-8, 04-18)
 *
 * It is the crossing of the grid itself: the two distances to the next border,
 * whichever is nearer taken first, and neither ever recomputed. (spec 10-14)
 *
 * What it reads of a cell is the height alone and never the right to be there,
 * which is the whole of why the town hall and the shed carry theirs: a view is
 * stopped by what stands in the way, not by what one is allowed to walk on, and
 * those two are precisely the builds one is never allowed to walk on at all. It
 * is the very reading `game/state.ts` does, written again here because
 * `src/render/` takes types from the rules and never their functions — the two
 * read the same one grid, so they cannot part. Past the city there is nothing to
 * stop a view, and the march reads nought. (spec 02-9, 04-18, 10-2)
 */
function march(
  city: City,
  fromX: number,
  fromZ: number,
  wayX: number,
  wayZ: number,
  most: number,
): void {
  const half = city.side / 2;
  let i = Math.floor(fromX + half);
  let j = Math.floor(fromZ + half);
  const stepI = wayX < 0 ? -1 : 1;
  const stepJ = wayZ < 0 ? -1 : 1;
  // How far along the line one whole cell of either axis is worth.
  const overI = wayX === 0 ? Infinity : Math.abs(1 / wayX);
  const overJ = wayZ === 0 ? Infinity : Math.abs(1 / wayZ);
  const intoI = fromX + half - i;
  const intoJ = fromZ + half - j;
  let nextI = wayX === 0 ? Infinity : (wayX > 0 ? 1 - intoI : intoI) * overI;
  let nextJ = wayZ === 0 ? Infinity : (wayZ > 0 ? 1 - intoJ : intoJ) * overJ;
  let along = 0;

  crossings = 0;
  for (;;) {
    const inside = i >= 0 && j >= 0 && i < city.side && j < city.side;
    enteredAt[crossings] = along;
    standsAt[crossings] = inside ? city.height[i * city.side + j] : 0;
    crossings += 1;
    if (crossings >= CROSSINGS) return;
    if (nextI < nextJ) {
      along = nextI;
      i += stepI;
      nextI += overI;
    } else {
      along = nextJ;
      j += stepJ;
      nextJ += overJ;
    }
    if (along > most) return; // a cell touched right at the far end still counts
  }
}

/**
 * Settles the recoil and the height the sight asks for, in the order chapter 4
 * writes them: the climb first, as far as the ten blocks it is allowed, and a
 * shorter recoil only once those ten are spent — down to 3,2 blocks and never
 * under. (spec 04-18)
 *
 * One march answers for every recoil at once, because they all lie on the one
 * line and differ only in where they stop. A roof of `stands` blocks entered
 * `entered` blocks along asks a camera `back` blocks out to stand at
 * `eye + (stands - eye) × back / entered`, which grows with `back`: the further
 * out it stands, the higher it has to be. So the recoils that clear are exactly
 * those under a limit, and the limit is the one that spends the whole climb on
 * the roof that asks for most — `room × entered / rise` — or the entry itself,
 * where a roof so near that no climb clears it is simply not reached at all.
 * The largest recoil under every one of those limits is the answer, and it is
 * read off rather than tried, so nothing is discretised and nothing is walked
 * twice. (spec 04-8, 04-18, 10-14)
 */
function ask(view: CameraView, city: City, px: number, py: number, pz: number): void {
  const rule = view.rule;
  const eyeY = py + LOOK;
  const nominal = py + rule.above;
  const ceiling = nominal + rule.climb;
  const room = ceiling - eyeY; // all the height 04-18 grants over his middle

  march(city, px, pz, -Math.cos(view.ang), -Math.sin(view.ang), rule.back);

  // How far out it may still stand and have the whole climb clear the way.
  let back = rule.back;
  for (let n = 1; n < crossings; n += 1) {
    const rise = standsAt[n] - eyeY;
    if (rise <= 0) continue; // nothing his own middle does not already look over
    const entered = enteredAt[n];
    // Flush against it — he stands on the very border of a wall taller than he
    // is — and there is no recoil at all that gets the sight over it.
    if (entered <= 0) {
      back = rule.minBack;
      break;
    }
    const held = (room * entered) / rise;
    const limit = held > entered ? held : entered;
    if (limit < back) back = limit;
  }
  if (back < rule.minBack) back = rule.minBack; // never under 3,2 (spec 04-18)

  // And how high it has to stand at that recoil, which is the climb it buys.
  let asked = nominal;
  for (let n = 1; n < crossings; n += 1) {
    const entered = enteredAt[n];
    if (entered > back) break; // the march runs outwards, so the rest is behind it
    const rise = standsAt[n] - eyeY;
    if (rise <= 0) continue;
    const wants = entered > 0 ? eyeY + (rise * back) / entered : ceiling;
    if (wants > asked) asked = wants;
  }
  // Nothing clears, even in as close as it may come: it holds the shortest
  // recoil and the whole of the climb, and gives up neither. (spec 04-18)
  if (asked > ceiling) asked = ceiling;

  askedBack = back;
  askedAbove = asked - py;
}

/**
 * How fast the recoil and the height close on what the sight asks, in blocks a
 * second. The spec settles no such speed, and none is invented: it is read off
 * two of the six constants. At the nominal recoil, recentring already carries
 * the camera sideways at `recentre × back` — 15,6 blocks a second — so a climb
 * that closes at that same pace is the pace the camera is already granted, and
 * no seventh constant enters. (spec 04-16, 04-18)
 */
export function closingPace(rule: CameraBalance): number {
  return rule.recentre * rule.back;
}

/** Closes a gap by at most so much. */
function approach(from: number, to: number, most: number): number {
  const gap = to - from;
  if (gap > most) return from + most;
  if (gap < -most) return from - most;
  return to;
}

/** Turns it towards a heading by at most so much, the shorter way about. (spec 04-16) */
function turnTowards(view: CameraView, heading: number, most: number): void {
  let gap = heading - view.ang;
  if (gap > Math.PI) gap -= 2 * Math.PI;
  if (gap < -Math.PI) gap += 2 * Math.PI;
  if (gap > most) gap = most;
  if (gap < -most) gap = -most;
  view.ang += gap;
  if (view.ang > Math.PI) view.ang -= 2 * Math.PI;
  else if (view.ang < -Math.PI) view.ang += 2 * Math.PI;
}

/** Whether he ran over the step just gone. (spec 04-16) */
function runs(player: Readonly<Player>): boolean {
  const dx = player.x - player.xPrev;
  const dz = player.z - player.zPrev;
  return dx * dx + dz * dz > STIRRED * STIRRED;
}

/** Seats the lens behind a spot and turns it onto him. */
function seat(view: CameraView, px: number, py: number, pz: number): void {
  const cos = Math.cos(view.ang);
  const sin = Math.sin(view.ang);
  view.lens.position.set(px - cos * view.back, py + view.above, pz - sin * view.back);
  view.lens.lookAt(px, py + LOOK, pz);
}

/** How long this frame is, in seconds, bounded as the loop bounds its own. */
function sinceLast(view: CameraView, now: number): number {
  if (view.last < 0) {
    view.last = now;
    return 0;
  }
  const gap = (now - view.last) / 1000;
  view.last = now;
  if (!(gap > 0)) return 0;
  return gap > MOST_GAP ? MOST_GAP : gap;
}

/**
 * Puts it straight behind a player, with no swing and no climb to come: what a
 * run opens on, and what a lost context comes back to. (spec 04-15, 10-37)
 */
export function settleCamera(view: CameraView, city: City, player: Readonly<Player>): void {
  view.ang = player.ang;
  view.freezeLeft = 0;
  view.last = -1;
  ask(view, city, player.x, player.y, player.z);
  view.back = askedBack;
  view.above = askedAbove;
  seat(view, player.x, player.y, player.z);
}

/**
 * One frame of the camera: the freeze runs down, it swings back behind him if he
 * is running, it settles what the sight asks of it, and it closes on that. The
 * spot it follows is the one interpolated between the two last steps, so a
 * screen faster than the step sees no judder. (spec 04-16, 04-17, 04-18, 10-24)
 */
export function aimCamera(
  view: CameraView,
  city: City,
  player: Readonly<Player>,
  alpha: number,
  now: number,
): void {
  const seconds = sinceLast(view, now);
  const px = between(player.xPrev, player.x, alpha);
  const py = between(player.yPrev, player.y, alpha);
  const pz = between(player.zPrev, player.z, alpha);
  const heading = betweenTurns(player.angPrev, player.ang, alpha);

  if (view.freezeLeft > 0) {
    view.freezeLeft -= seconds;
    if (view.freezeLeft < 0) view.freezeLeft = 0;
  }

  // As soon as he runs, and never because a blow pivoted him. (spec 04-16, 04-17)
  if (view.freezeLeft <= 0 && runs(player)) {
    turnTowards(view, heading, view.rule.recentre * seconds);
  }

  ask(view, city, px, py, pz);
  const pace = closingPace(view.rule) * seconds;
  view.back = approach(view.back, askedBack, pace);
  view.above = approach(view.above, askedAbove, pace);
  seat(view, px, py, pz);
}
