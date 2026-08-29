/**
 * The city, drawn from the very grid the rules engender: the paving of the
 * square and of the three streets, the frontages with their storeys and their
 * ladders, the roofs at their three values, the town hall, the shed of the base
 * and the three gateways. Nothing here moves, and nothing here is added to the
 * city — the one thing that is ever put down on it is a cannon. (spec 02-5)
 *
 * It reads `City` — the grid of heights and the pool of buildings the rules
 * engender — and never a second plan of its own: were the two to part by one
 * block, the child would walk through a wall. What the grid cannot say, and only
 * that, comes from the plan of chapter 2: where the town hall and the shed
 * stand, how far the halo reaches, how tall a gateway is. (spec 02-6 to 02-9,
 * 02-27, 02-31, 04-8)
 *
 * Every block carries its own zero-to-one coordinates inside its cell, so a tile
 * repeats block by block and never across two of them; the cyclic margin of the
 * sheet is what makes the seam between two neighbours invisible. (spec 07-47,
 * 07-48)
 *
 * One `InstancedMesh` per tile of the sheet, plus one for the three gateways:
 * the count of calls follows the thirteen tiles and never the number of blocks,
 * so the whole city costs fourteen. (spec 07-44, 10 "Le budget de rendu")
 */
import * as THREE from 'three';
import type { City } from '../game/state';
import { TILES, type TileId, tileUv } from './atlas';

/** What the drawing needs of the plan of chapter 2, and nothing the grid says. */
export interface CityPlan {
  /** The apothem of the hexagonal square, in blocks. (spec 02-6) */
  readonly apothem: number;
  /** The town hall at the exact middle: eight by eight, seven tall. (spec 02-7) */
  readonly townHallSide: number;
  readonly townHallHeight: number;
  /** The shed, against the face of the town hall that watches street one. (spec 02-8) */
  readonly baseLength: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  /** How far the halo reaches from the base, in horizontal blocks. (spec 02-31) */
  readonly halo: number;
  readonly street: {
    /** How wide a street runs, in blocks. (spec 02-12) */
    readonly width: number;
    /** How tall a gateway stands at the mouth. (spec 02-27) */
    readonly gatewayHeight: number;
  };
}

/**
 * A storey is two blocks: `wall` is the spandrel, `cornice` carries the window
 * and the moulding that crowns it — so one window and one cornice per storey,
 * never one per block, and the storey counts from the street. (spec 07-55, 02-20)
 */
export const STOREY = 2;

/**
 * The three streets, and the colour each keeps for the whole game. They are the
 * one cold thing the city itself carries, and they carry no tile: what is put
 * down is plain, what is built is tiled. (spec 02-28, 07-10, 07 "La palette de
 * ce qui se joue")
 */
export const GATEWAY_COLOURS: readonly string[] = ['#5fd8f2', '#f25fd8', '#e8f25f'];

/**
 * The four sides of a block, and the turn about the upright that aims a face
 * that way. An underside is never drawn: nothing in this city is seen from below.
 */
const SIDES = [
  { x: 1, z: 0, turn: Math.PI / 2 },
  { x: -1, z: 0, turn: -Math.PI / 2 },
  { x: 0, z: 1, turn: 0 },
  { x: 0, z: -1, turn: Math.PI },
] as const;

/** The face one walks on: a floor, a roof, the ground of the outskirts. */
export const TOP = SIDES.length;

const UPRIGHT = new THREE.Vector3(0, 1, 0);
const SIDEWAYS = new THREE.Vector3(1, 0, 0);

/**
 * A roof says its own height, and that reading is game information: with no
 * cast light anywhere, nothing but the tile tells a child that this roof stands
 * over its neighbour, so a cannon on it carries further. (spec 07-54, 05-22)
 */
function roofOf(high: number): TileId {
  if (high <= 4) return 'roof4';
  if (high <= 6) return 'roof6';
  return 'roof8';
}

/** What one face of one block asks to be drawn: its tile, its spot, its way. */
export type FaceVisit = (tile: TileId, x: number, y: number, z: number, way: number) => void;

/**
 * Walks the whole city once and names every face that is drawn. It runs twice —
 * once to count what each tile owes, once to place it — so the two passes can
 * never disagree, and a test can read the city off it without a renderer.
 */
export function eachFace(city: City, plan: CityPlan, look: FaceVisit): void {
  const side = city.side;
  const half = side / 2;
  const streets = city.gateways.x.length;

  // Street one is the one the base watches, and it gives the frame the shed and
  // the halo are measured in. (spec 02-8, 02-31)
  const heading = city.gateways.ang[0];
  const ux = Math.cos(heading);
  const uz = Math.sin(heading);

  const townHall = plan.townHallSide / 2;
  const baseX = ux * (townHall + plan.baseWidth / 2);
  const baseZ = uz * (townHall + plan.baseWidth / 2);

  const at = (i: number, j: number): number => i * side + j;
  const heightBeside = (i: number, j: number): number =>
    i < 0 || j < 0 || i >= side || j >= side ? 0 : city.height[at(i, j)];

  /**
   * How far a spot sits from the middle on the three axes of the hexagon — the
   * same reading the rules take to cut the square out of the plan. (spec 02-6)
   */
  const hexAt = (x: number, z: number): number => {
    let most = 0;
    for (let s = 0; s < streets; s += 1) {
      const a = (s * Math.PI) / streets;
      const d = Math.abs(x * Math.cos(a) + z * Math.sin(a));
      if (d > most) most = d;
    }
    return most;
  };

  /**
   * The paving under one's feet. The hexagon tells the square from a street,
   * which carries no kerb and no verge; and the halo repaints whatever paving it
   * covers, which is a piece of the square and six blocks of street one.
   * (spec 02-15, 02-31, 02-32, 07-44)
   */
  const groundOf = (x: number, z: number): TileId => {
    if (Math.hypot(x - baseX, z - baseZ) < plan.halo) return 'halo';
    return hexAt(x, z) < plan.apothem ? 'square' : 'street';
  };

  /**
   * The two builds the grid leaves out, because neither is ever walked on and
   * nothing is ever put down on them. They are drawn from the plan instead.
   * (spec 02-7, 02-8, 02-9)
   */
  const inTownHall = (x: number, z: number, y: number): boolean =>
    Math.abs(x) < townHall && Math.abs(z) < townHall && y < plan.townHallHeight;
  const inShed = (x: number, z: number, y: number): boolean => {
    const along = x * ux + z * uz;
    const across = -x * uz + z * ux;
    return (
      along > townHall &&
      along < townHall + plan.baseWidth &&
      Math.abs(across) < plan.baseLength / 2 &&
      y < plan.baseHeight
    );
  };

  /**
   * Which face of which cell carries the one ladder of a building: the middle of
   * the one face that gives onto walkable ground, which the rules already worked
   * out. Of the faces that cell shows, the ladder takes the one that looks the
   * most towards that ground. (spec 02-26)
   */
  const ladders = new Map<number, number>();
  for (let b = 0; b < city.buildings.count; b += 1) {
    const into = city.buildings.ladderAng[b];
    const intoX = Math.cos(into);
    const intoZ = Math.sin(into);
    const i = Math.floor(city.buildings.ladderX[b] + intoX / 2 + half);
    const j = Math.floor(city.buildings.ladderZ[b] + intoZ / 2 + half);
    if (i < 0 || j < 0 || i >= side || j >= side) continue;
    const high = city.height[at(i, j)];
    let pick = -1;
    let nearest = -Infinity;
    for (let s = 0; s < SIDES.length; s += 1) {
      const face = SIDES[s];
      if (heightBeside(i + face.x, j + face.z) >= high) continue;
      const aim = -(face.x * intoX + face.z * intoZ);
      if (aim > nearest) {
        nearest = aim;
        pick = s;
      }
    }
    if (pick >= 0) ladders.set(at(i, j), pick);
  }

  // ---- the grid, cell by cell: the paving, the roofs, the frontages
  for (let i = 0; i < side; i += 1) {
    for (let j = 0; j < side; j += 1) {
      const x = i + 0.5 - half;
      const z = j + 0.5 - half;
      const cell = at(i, j);
      const high = city.height[cell];

      if (city.walkable[cell] !== 1) {
        // Whatever the grid leaves out and the two builds do not claim is the
        // outskirts, past the frontages, which the haze eats. (spec 02-4, 07-6)
        if (!inTownHall(x, z, 0) && !inShed(x, z, 0)) look('outskirts', x, 0, z, TOP);
        continue;
      }

      if (high === 0) {
        look(groundOf(x, z), x, 0, z, TOP);
        continue;
      }

      look(roofOf(high), x, high, z, TOP);
      const ladder = ladders.get(cell);
      for (let s = 0; s < SIDES.length; s += 1) {
        const face = SIDES[s];
        for (let y = heightBeside(i + face.x, j + face.z); y < high; y += 1) {
          // The storey counts from the street and not from the neighbour it
          // stands beside: `wall` is the spandrel, `cornice` crowns it, and one
          // ladder runs the whole height. (spec 07-55, 02-20, 02-26)
          const climbing = s === ladder;
          look(climbing ? 'ladder' : y % STOREY === 0 ? 'wall' : 'cornice', x, y, z, s);
        }
      }
    }
  }

  // ---- the town hall and the shed, from the plan and not from the grid
  const reach = Math.ceil(townHall + plan.baseWidth + 1);
  const tall = Math.max(plan.townHallHeight, plan.baseHeight);
  for (let i = -reach; i < reach; i += 1) {
    for (let j = -reach; j < reach; j += 1) {
      const x = i + 0.5;
      const z = j + 0.5;
      for (let y = 0; y < tall; y += 1) {
        const hall = inTownHall(x, z, y);
        if (!hall && !inShed(x, z, y)) continue;
        for (let s = 0; s < SIDES.length; s += 1) {
          const face = SIDES[s];
          const bx = x + face.x;
          const bz = z + face.z;
          if (inTownHall(bx, bz, y) || inShed(bx, bz, y)) continue;
          look(hall ? 'townHall' : 'base', x, y, z, s);
        }
        // The shed has no tile of its own overhead: its wood closes it, and its
        // roof is never climbed. (spec 02-9, 07-44)
        if (!inTownHall(x, z, y + 1) && !inShed(x, z, y + 1)) {
          look(hall ? 'townHallRoof' : 'base', x, y + 1, z, TOP);
        }
      }
    }
  }
}

/**
 * The zero-to-one square one block reads, cut straight out of the sheet: the
 * sixteen painted pixels at the middle of the cell, never the margin around
 * them. (spec 07-46, 07-48)
 */
function quadOf(id: TileId): THREE.PlaneGeometry {
  const quad = new THREE.PlaneGeometry(1, 1);
  const { u0, v0, u1, v1 } = tileUv(id);
  quad.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([u0, v1, u1, v1, u0, v0, u1, v0], 2),
  );
  return quad;
}

/**
 * The scratch the seating of a face borrows: allocated once, at load, and
 * written over ever after — nothing here is ever built a second time.
 * (spec 10-14)
 */
const SPOT = new THREE.Vector3();
const TURN = new THREE.Quaternion();
const SCALE = new THREE.Vector3(1, 1, 1);
const SEAT = new THREE.Matrix4();

/**
 * Seats one face of one block in a mesh: a face one walks on lies flat, a face of
 * a side stands half a block out and looks away from what it clothes. It is the
 * one place that matrix is composed, so the city and what a reinforcement builds
 * on it can never come to disagree about which way a block looks. (spec 07-17)
 */
function seatFace(
  mesh: THREE.InstancedMesh,
  n: number,
  x: number,
  y: number,
  z: number,
  way: number,
): void {
  if (way === TOP) {
    SPOT.set(x, y, z);
    TURN.setFromAxisAngle(SIDEWAYS, -Math.PI / 2);
  } else {
    const face = SIDES[way];
    SPOT.set(x + face.x / 2, y + 0.5, z + face.z / 2);
    TURN.setFromAxisAngle(UPRIGHT, face.turn);
  }
  mesh.setMatrixAt(n, SEAT.compose(SPOT, TURN, SCALE));
}

/** What the city hands to the scene: one node, and the calls it costs a frame. */
export interface CityView {
  /** Everything the city draws, under one node the scene takes in one go. */
  readonly node: THREE.Group;
  /** One entry per call of a frame. (spec 10 "Le budget de rendu") */
  readonly draws: readonly THREE.InstancedMesh[];
}

/**
 * Builds the whole city, once, at load. It is built again after a lost context,
 * because the scene is a projection of the state and no datum of the game lives
 * only on the GPU. (spec 10-37)
 */
export function buildCity(city: City, plan: CityPlan, sheet: THREE.Texture): CityView {
  const owed = new Map<TileId, number>();
  eachFace(city, plan, (tile) => owed.set(tile, (owed.get(tile) ?? 0) + 1));

  const node = new THREE.Group();
  const draws: THREE.InstancedMesh[] = [];
  const meshes = new Map<TileId, THREE.InstancedMesh>();
  // One sheet, one setting of it, and every tile of the city shares it. (spec 07-43)
  const paint = new THREE.MeshLambertMaterial({ map: sheet });

  for (const tile of TILES) {
    const count = owed.get(tile.id) ?? 0;
    if (count === 0) continue;
    const mesh = new THREE.InstancedMesh(quadOf(tile.id), paint, count);
    mesh.name = tile.id;
    meshes.set(tile.id, mesh);
    node.add(mesh);
    draws.push(mesh);
  }

  const filled = new Map<TileId, number>();
  eachFace(city, plan, (tile, x, y, z, way) => {
    const mesh = meshes.get(tile);
    if (mesh === undefined) return;
    const n = filled.get(tile) ?? 0;
    seatFace(mesh, n, x, y, z, way);
    filled.set(tile, n + 1);
  });

  const gateways = gatewaysOf(city, plan);
  node.add(gateways);
  draws.push(gateways);
  return { node, draws };
}

/**
 * The three gateways: two uprights and the lintel that crowns them, seven blocks
 * tall, at the mouth of a street and on the square side of it — never at the far
 * end, since it is from the square that a street has to announce itself. They
 * take a colour of their own and no tile, and all nine pieces cost one call.
 * (spec 02-27, 02-28, 07-10)
 */
function gatewaysOf(city: City, plan: CityPlan): THREE.InstancedMesh {
  const streets = city.gateways.x.length;
  const pieces = 3;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    streets * pieces,
  );
  mesh.name = 'gateways';

  const spot = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const seat = new THREE.Matrix4();
  const paint = new THREE.Color();
  const high = plan.street.gatewayHeight;
  const span = plan.street.width / 2 + 0.5;

  for (let k = 0; k < streets; k += 1) {
    const heading = city.gateways.ang[k];
    const alongX = Math.cos(heading);
    const alongZ = Math.sin(heading);
    // Half a block back from the mouth, so it stands on the square. (spec 02-27)
    const x = city.gateways.x[k] - alongX / 2;
    const z = city.gateways.z[k] - alongZ / 2;
    // The lintel lies across the street, so the local sideways of a piece is the
    // way across it.
    turn.setFromAxisAngle(UPRIGHT, -heading - Math.PI / 2);
    paint.set(GATEWAY_COLOURS[k % GATEWAY_COLOURS.length]);

    for (let piece = 0; piece < pieces; piece += 1) {
      const lintel = piece === 2;
      const off = lintel ? 0 : piece === 0 ? span : -span;
      spot.set(x - alongZ * off, lintel ? high - 0.5 : (high - 1) / 2, z + alongX * off);
      scale.set(lintel ? 2 * span + 1 : 1, lintel ? 1 : high - 1, 1);
      const n = k * pieces + piece;
      mesh.setMatrixAt(n, seat.compose(spot, turn, scale));
      mesh.setColorAt(n, paint);
    }
  }

  return mesh;
}

/**
 * The crown of the town hall: what a reinforcement builds on it, and the one
 * thing in this game that says which **notch** it stands at.
 *
 * **It is read off the stuff it is made of, and never off a figure.** 06-37
 * writes the four looks in order and this is them, one for one: nothing at all
 * on a town hall nobody has reinforced — it is wood and pale stone already —,
 * then boards of wood, then a wall of stone, then that wall two blocks thick
 * with one merlon out of two standing over it. No number is drawn anywhere near
 * it, and none ever will be. (spec 06-37)
 *
 * **It stands on the roof and nowhere else, and that is not a matter of taste.**
 * This file draws what the grid the rules engender says, and a block laid on
 * walkable paving would be a wall the child walks straight through — the one
 * mistake this whole file is written to make impossible. The roof of the town
 * hall is climbed by nobody and carries nothing, so it is the one ground in the
 * middle of the city that a build may take. (spec 02-9, 04-8)
 *
 * It runs the four edges and not three: 06-31 names three faces to say where the
 * child **presses**, while 06-37 says what the building **wears**, and a
 * building wears one thing all over. What the shed hides of it, the shed hides.
 *
 * **The reinforcement rebuilds the whole of it in one movement**, which is
 * literally what `showCrown` is: every block of a notch seated in one call, off
 * the one fact the rules wrote. Nothing is faded in and nothing grows; and past
 * the third notch the buy-back moves none of it, since there is no fourth.
 * (spec 06-28, 06-36)
 */
export const NOTCHES = 3;

/** How thick the crown stands, in blocks: thick stone at the third. (spec 06-37) */
function ringOf(notch: number): number {
  return notch >= NOTCHES ? 2 : 1;
}

/** How tall it stands: boards are low, a wall of stone stands. (spec 06-37) */
function tallOf(notch: number): number {
  return notch >= 2 ? 2 : 1;
}

/**
 * Which tile clothes it: the wood of the shed at the first notch, the pale stone
 * of the town hall from the second on. Both are of the thirteen — there is no
 * fourteenth, and none is wanted: the whole reading is wood against stone, thin
 * against thick. (spec 06-37, 07-44)
 */
function wearsOf(notch: number, way: number): TileId {
  if (notch <= 1) return 'base';
  return way === TOP ? 'townHallRoof' : 'townHall';
}

/**
 * Whether a merlon stands over that cell: one block out of two along the outer
 * course, which is the whole of the crenellations of the third notch. The two
 * cell numbers taken together alternate along every edge at once, so no edge and
 * no corner is a case of its own. (spec 06-37)
 */
function merlonAt(plan: CityPlan, x: number, z: number): boolean {
  const half = plan.townHallSide / 2;
  return (Math.floor(x + half) + Math.floor(z + half)) % 2 === 0;
}

/**
 * Whether a block of the crown of that notch fills that cell, `up` counting
 * blocks over the roof of the town hall. It is the one shape of the thing, and
 * both passes below read it.
 */
function inCrown(plan: CityPlan, notch: number, x: number, z: number, up: number): boolean {
  if (notch <= 0 || up < 0) return false;
  const half = plan.townHallSide / 2;
  const out = Math.max(Math.abs(x), Math.abs(z));
  if (out > half || out < half - ringOf(notch)) return false;
  if (up < tallOf(notch)) return true;
  // Over the wall, only the merlons of the third, and only on the outer course.
  if (notch < NOTCHES || up > tallOf(notch)) return false;
  return out > half - 1 && merlonAt(plan, x, z);
}

/**
 * Names every face the crown of a notch draws. As in the city itself, a face is
 * drawn only where the block beside it is not one of ours, so nothing is ever
 * seated inside the build; the underside is never drawn, since it sits on the
 * roof.
 */
export function eachCrownFace(plan: CityPlan, notch: number, look: FaceVisit): void {
  const half = plan.townHallSide / 2;
  const roof = plan.townHallHeight;
  const over = tallOf(NOTCHES) + 1; // as high as any notch ever goes

  for (let i = -half; i < half; i += 1) {
    for (let j = -half; j < half; j += 1) {
      const x = i + 0.5;
      const z = j + 0.5;
      for (let up = 0; up < over; up += 1) {
        if (!inCrown(plan, notch, x, z, up)) continue;
        const y = roof + up;
        for (let s = 0; s < SIDES.length; s += 1) {
          const face = SIDES[s];
          if (inCrown(plan, notch, x + face.x, z + face.z, up)) continue;
          look(wearsOf(notch, s), x, y, z, s);
        }
        if (!inCrown(plan, notch, x, z, up + 1)) look(wearsOf(notch, TOP), x, y + 1, z, TOP);
      }
    }
  }
}

/** What the crown hands to the scene: one node, and the calls it costs a frame. */
export interface CrownView {
  /** Everything it draws, under one node the scene takes in one go. */
  readonly node: THREE.Group;
  /** One entry per call of a frame. (spec 10 "Le budget de rendu") */
  readonly draws: readonly THREE.InstancedMesh[];
  readonly plan: CityPlan;
  readonly meshes: ReadonlyMap<TileId, THREE.InstancedMesh>;
}

/**
 * Allocates the crown, once, at load: every mesh is sized for the widest notch
 * it will ever have to hold, so putting one up allocates nothing at all — and
 * neither does taking one back down after a lost context. (spec 10-14, 10-37)
 *
 * It opens on nought, which is a town hall nobody has reinforced yet: three
 * meshes seating nothing.
 */
export function buildCrown(plan: CityPlan, sheet: THREE.Texture): CrownView {
  const owed = new Map<TileId, number>();
  for (let notch = 1; notch <= NOTCHES; notch += 1) {
    const wanted = new Map<TileId, number>();
    eachCrownFace(plan, notch, (tile) => wanted.set(tile, (wanted.get(tile) ?? 0) + 1));
    for (const [tile, count] of wanted) {
      if (count > (owed.get(tile) ?? 0)) owed.set(tile, count);
    }
  }

  const node = new THREE.Group();
  const draws: THREE.InstancedMesh[] = [];
  const meshes = new Map<TileId, THREE.InstancedMesh>();
  // The one sheet, shared with the city under it. (spec 07-43)
  const paint = new THREE.MeshLambertMaterial({ map: sheet });

  for (const tile of TILES) {
    const count = owed.get(tile.id) ?? 0;
    if (count === 0) continue;
    const mesh = new THREE.InstancedMesh(quadOf(tile.id), paint, count);
    mesh.name = `crown:${tile.id}`;
    meshes.set(tile.id, mesh);
    node.add(mesh);
    draws.push(mesh);
  }

  const crown: CrownView = { node, draws, plan, meshes };
  showCrown(crown, 0);
  return crown;
}

/**
 * Rebuilds the whole crown at a notch, in **one movement** — which is 06-36 read
 * literally: every block of it is seated again in this one call, and it is the
 * one thing that brings back what has come off the town hall. It runs when the
 * rules say a reinforcement was paid for, and when a lost context asks for the
 * scene again, and at no other time. (spec 06-36, 10-19, 10-37)
 */
export function showCrown(crown: CrownView, notch: number): void {
  const filled = new Map<TileId, number>();
  eachCrownFace(crown.plan, notch, (tile, x, y, z, way) => {
    const mesh = crown.meshes.get(tile);
    if (mesh === undefined) return;
    const n = filled.get(tile) ?? 0;
    if (n >= mesh.instanceMatrix.count) return;
    seatFace(mesh, n, x, y, z, way);
    filled.set(tile, n + 1);
  });

  for (const [tile, mesh] of crown.meshes) {
    mesh.count = filled.get(tile) ?? 0;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
