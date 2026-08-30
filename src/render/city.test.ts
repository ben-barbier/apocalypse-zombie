/**
 * The city read back against chapters 2, 7 and 10. Nothing here draws: it builds
 * the graph under node, with a stand-in sheet in place of the one image, and
 * counts what is in it — which is how the budget of calls and the alternation of
 * the storeys become red errors rather than good intentions. (spec 10-45)
 *
 * The grid is laid by hand here, and it is a stand-in too: `src/render/` takes
 * types from the rules and never their functions, so this file may not call the
 * one that engenders the real plan. What it holds instead is a piece of that
 * plan, written out from chapter 2, and the drawing rules it checks do not
 * depend on how large the grid is — which is the very thing the first test says.
 * (spec 10-2)
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { City } from '../game/state';
import { ATLAS_SIZE, TILE, TILES, type TileId, tileUv } from './atlas';
import { FIELD, NEAR } from './camera';
import {
  GATEWAY_COLOURS,
  NOTCHES,
  STOREY,
  TOP,
  buildCity,
  buildCrown,
  eachCrownFace,
  eachFace,
  showCrown,
  type CityPlan,
} from './city';
import { createScene, hazeNear } from './scene';

/** The plan of chapter 2, written out here from the spec. (spec 02 "La place", "Une rue") */
const PLAN: CityPlan = {
  apothem: 16, // spec 02-6
  townHallSide: 8, // spec 02-7
  townHallHeight: 7, // spec 02-7
  baseLength: 6, // spec 02-8
  baseWidth: 4, // spec 02-8
  baseHeight: 3, // spec 02-8
  halo: 16, // spec 02-31
  street: { width: 6, gatewayHeight: 7 }, // spec 02-12, 02-27
};

const SIDE = 216; // spec 02-1
const HALF = SIDE / 2;
const STREETS = 3; // spec 02-2
const MOUTH = PLAN.apothem; // the square ends where a street begins (spec 02-7)
const LENGTH = 80; // spec 02-12
const HEIGHTS = [4, 6, 8]; // spec 02-20

/**
 * A piece of the plan: the three streets down their middle, the paving of the
 * square around the town hall, and `bays` buildings of four, six and eight along
 * street one, each with its one ladder on the street face. (spec 02-2, 02-20, 02-26)
 */
function cityOf(bays: number): City {
  const height = new Uint8Array(SIDE * SIDE);
  const walkable = new Uint8Array(SIDE * SIDE);
  const put = (x: number, z: number, high: number): void => {
    const at = Math.floor(x + HALF) * SIDE + Math.floor(z + HALF);
    walkable[at] = 1;
    height[at] = high;
  };

  const buildings = {
    count: bays,
    x: new Float32Array(bays),
    z: new Float32Array(bays),
    height: new Uint8Array(bays),
    street: new Int8Array(bays),
    edge: new Uint8Array(bays),
    bay: new Uint8Array(bays),
    ladderX: new Float32Array(bays),
    ladderZ: new Float32Array(bays),
    ladderAng: new Float32Array(bays),
    haloed: new Uint8Array(bays),
  };

  const gateways = {
    x: new Float32Array(STREETS),
    z: new Float32Array(STREETS),
    ang: new Float32Array(STREETS),
  };

  for (let k = 0; k < STREETS; k += 1) {
    const ang = (k * 2 * Math.PI) / STREETS;
    gateways.x[k] = Math.cos(ang) * MOUTH;
    gateways.z[k] = Math.sin(ang) * MOUTH;
    gateways.ang[k] = ang;
    for (let along = MOUTH + 0.5; along < MOUTH + LENGTH; along += 1) {
      put(Math.cos(ang) * along, Math.sin(ang) * along, 0);
    }
  }

  // The paving of the square, less the town hall and the shed of the base, which
  // are never walked on and so never enter the grid. (spec 02-6, 02-9)
  for (let i = -PLAN.apothem; i < PLAN.apothem; i += 1) {
    for (let j = -PLAN.apothem; j < PLAN.apothem; j += 1) {
      const x = i + 0.5;
      const z = j + 0.5;
      if (Math.hypot(x, z) >= PLAN.apothem - 4) continue;
      if (Math.abs(x) < PLAN.townHallSide / 2 && Math.abs(z) < PLAN.townHallSide / 2) continue;
      if (x > PLAN.townHallSide / 2 && x < PLAN.townHallSide / 2 + PLAN.baseWidth) {
        if (Math.abs(z) < PLAN.baseLength / 2) continue;
      }
      put(x, z, 0);
    }
  }

  // The buildings, one block wide, off the side of street one: enough for the
  // three roofs, the spandrels, the cornices and the ladders. (spec 02-20, 02-26)
  for (let b = 0; b < bays; b += 1) {
    const high = HEIGHTS[b % HEIGHTS.length] ?? 4;
    const x = MOUTH + 4.5 + 3 * b; // clear of one another, so each shows four sides
    const z = 5.5;
    put(x, z, high);
    buildings.x[b] = x;
    buildings.z[b] = z;
    buildings.height[b] = high;
    buildings.street[b] = 0;
    buildings.ladderX[b] = x;
    buildings.ladderZ[b] = z - 0.5;
    buildings.ladderAng[b] = Math.PI / 2; // one pushes north to climb it
  }

  return {
    side: SIDE,
    height,
    walkable,
    // The base sits at the middle, and the halo reaches its sixteen blocks from
    // it, exactly as the plan has it. (spec 02-8, 02-31)
    baseX: 0,
    baseZ: 0,
    halo: 16,
    baseAng: 0,
    baseAlong: 2, // half the four blocks the shed runs out from the town hall
    baseAcross: 3, // half the six it is wide (spec 02-8)
    townHallHalf: PLAN.townHallSide / 2, // spec 02-7
    buildings,
    rails: {
      stops: 2,
      x: new Float32Array(STREETS * 2),
      z: new Float32Array(STREETS * 2),
      at: new Float32Array(STREETS * 2),
      length: 92, // spec 02-13
      // Street one stops at the face of the shed, the other two at the town
      // hall. (spec 03-45)
      faceAt: new Float32Array([88, 92, 92]),
    },
    gateways,
  };
}

interface Face {
  tile: TileId;
  x: number;
  y: number;
  z: number;
  way: number;
}

function facesOf(city: City): Face[] {
  const found: Face[] = [];
  eachFace(city, PLAN, (tile, x, y, z, way) => found.push({ tile, x, y, z, way }));
  return found;
}

const CITY = cityOf(3);
const FACES = facesOf(CITY);
/** The one image, in a stand-in: the tests run under node, with no GPU. (spec 10-45) */
const standIn = (): THREE.Texture => new THREE.Texture();

const drawnBy = (scene: THREE.Scene): THREE.InstancedMesh[] => {
  const found: THREE.InstancedMesh[] = [];
  scene.traverse((child) => {
    const mesh = child as THREE.InstancedMesh;
    if (mesh.isInstancedMesh === true && mesh.count > 0) found.push(mesh);
  });
  return found;
};

describe('what the city costs a frame', () => {
  it('draws one call for each tile of the sheet, and one for the three gateways', () => {
    // spec 07-44: thirteen tiles, and they all clothe built things.
    // spec 10 "Le budget de rendu": at most 80 calls a frame, for everything.
    const scene = createScene({ apothem: 16, outskirts: 12, street: { length: 80 } });
    const view = buildCity(CITY, PLAN, standIn());
    scene.add(view.node);

    const drawn = drawnBy(scene);
    expect(drawn.length).toBe(TILES.length + 1);
    expect(drawn.length).toBe(14);
    expect(drawn.length).toBeLessThanOrEqual(80);
    expect(view.draws.length).toBe(drawn.length);
  });

  it('never pays a call for a block', () => {
    // spec 10 "Le budget de rendu": the count follows the tiles, never the grid.
    const small = buildCity(cityOf(3), PLAN, standIn());
    const large = buildCity(cityOf(12), PLAN, standIn());
    const blocks = (view: { draws: readonly THREE.InstancedMesh[] }): number =>
      view.draws.reduce((total, mesh) => total + mesh.count, 0);
    expect(large.draws.length).toBe(small.draws.length);
    expect(blocks(large)).toBeGreaterThan(blocks(small));
  });

  it('hangs the whole city under one node', () => {
    const scene = createScene({ apothem: 16, outskirts: 12, street: { length: 80 } });
    scene.add(buildCity(CITY, PLAN, standIn()).node);
    expect(scene.children.length).toBe(3); // the sun, the ambient, and the city
  });
});

describe('the sheet on the blocks', () => {
  it('gives every block its own zero-to-one square inside its cell', () => {
    // spec 07-48: a tile repeats block by block, never across two of them.
    const view = buildCity(CITY, PLAN, standIn());
    for (const [index, tile] of TILES.entries()) {
      const mesh = view.draws[index];
      expect(mesh?.name).toBe(tile.id);
      const uv = mesh?.geometry.getAttribute('uv');
      expect(uv?.count).toBe(4);
      const us: number[] = [];
      const vs: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        us.push(uv?.getX(i) ?? 0);
        vs.push(uv?.getY(i) ?? 0);
      }
      const square = tileUv(tile.id);
      expect(Math.min(...us)).toBeCloseTo(square.u0, 10);
      expect(Math.max(...us)).toBeCloseTo(square.u1, 10);
      expect(Math.min(...vs)).toBeCloseTo(square.v0, 10);
      expect(Math.max(...vs)).toBeCloseTo(square.v1, 10);
      // One block reads one tile, and never a pixel of its neighbour.
      expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(TILE / ATLAS_SIZE, 10);
      expect(Math.max(...vs) - Math.min(...vs)).toBeCloseTo(TILE / ATLAS_SIZE, 10);
    }
  });

  it('carries every one of the thirteen, and nothing besides', () => {
    // spec 07-44, 07-45: the list is closed, and all of it clothes built things.
    const worn = new Set(FACES.map((face) => face.tile));
    expect(worn.size).toBe(TILES.length);
    for (const tile of TILES) expect(worn).toContain(tile.id);
  });
});

describe('the frontages', () => {
  it('counts the storey from the street: the spandrel, then the cornice', () => {
    // spec 07-55, 02-20: a storey is two blocks — `wall` is the spandrel and
    // `cornice` carries the window and the moulding, so there is one of each per
    // storey and never one per block.
    expect(STOREY).toBe(2);
    const walls = FACES.filter((face) => face.tile === 'wall');
    const cornices = FACES.filter((face) => face.tile === 'cornice');
    expect(walls.length).toBeGreaterThan(0);
    expect(walls.every((face) => face.y % 2 === 0)).toBe(true);
    expect(cornices.every((face) => face.y % 2 === 1)).toBe(true);
    expect(cornices.length).toBe(walls.length);
    // A facade of eight blocks therefore carries four cornices, on each of the
    // three sides the ladder does not take. (spec 02-20, 02-26)
    const tallest = FACES.filter((face) => face.tile === 'cornice' && face.x === MOUTH + 10.5);
    expect(tallest.length).toBe(3 * (8 / STOREY));
  });

  it('says the height of a roof by its tile, and by nothing else', () => {
    // spec 07-54, 02-20: the ramp of value is game information, and a building
    // is four, six or eight blocks tall and never anything else.
    for (const [tile, high] of [
      ['roof4', 4],
      ['roof6', 6],
      ['roof8', 8],
    ] as const) {
      const roofs = FACES.filter((face) => face.tile === tile);
      expect(roofs.length).toBeGreaterThan(0);
      expect(roofs.every((face) => face.y === high && face.way === TOP)).toBe(true);
    }
  });

  it('runs one ladder up each building, from the street to the roof', () => {
    // spec 02-26: one ladder each, in the middle of the one face that gives onto
    // walkable ground — here the street face of each of the three.
    const ladders = FACES.filter((face) => face.tile === 'ladder');
    const columns = new Set(ladders.map((face) => `${face.x}/${face.z}/${face.way}`));
    expect(columns.size).toBe(CITY.buildings.count);
    expect(ladders.length).toBe(4 + 6 + 8);
    // Each runs the whole height of its building, and all three look the one way
    // the rules said one climbs from, which is the street.
    expect(ladders.every((face) => face.z === 5.5)).toBe(true);
    expect(new Set(ladders.map((face) => face.way)).size).toBe(1);
  });
});

describe('the paving', () => {
  it('repaints the halo, six blocks into street one and none into the others', () => {
    // spec 02-31, 02-32: sixteen blocks from the base, which do not cover the
    // whole square and enter street one alone. spec 07-44: the same paving,
    // repainted on the reach of the halo.
    const halo = FACES.filter((face) => face.tile === 'halo');
    expect(halo.length).toBeGreaterThan(0);
    const into = [0, 0, 0];
    for (const face of halo) {
      for (let k = 0; k < STREETS; k += 1) {
        const ang = (k * 2 * Math.PI) / STREETS;
        const along = face.x * Math.cos(ang) + face.z * Math.sin(ang);
        const across = -face.x * Math.sin(ang) + face.z * Math.cos(ang);
        if (along <= MOUTH || Math.abs(across) >= PLAN.street.width / 2) continue;
        into[k] = Math.max(into[k] ?? 0, along - MOUTH + 0.5);
      }
    }
    expect(into).toEqual([6, 0, 0]);
  });

  it('leaves the far end of a street to be seen, and lays ground past it', () => {
    // spec 07-6: the haze erases the outskirts past the frontages but leaves the
    // far end of a street, which is where the zombies walk in from. It begins at
    // 96 blocks, which is the apothem plus the length of a street.
    const clear = hazeNear({ apothem: 16, outskirts: 12, street: { length: 80 } });
    const streets = FACES.filter((face) => face.tile === 'street');
    const far = Math.max(...streets.map((face) => Math.hypot(face.x, face.z)));
    expect(far).toBeLessThan(clear);
    // And the ground does not stop where the street does: past it lies the
    // outskirts, so the far end never opens onto a hole. (spec 02-4)
    const past = FACES.filter(
      (face) => face.tile === 'outskirts' && Math.hypot(face.x, face.z) > far,
    );
    expect(past.length).toBeGreaterThan(0);
  });
});

describe('the gateways', () => {
  it('raises three at the mouths, seven blocks tall, in the three colours', () => {
    // spec 02-27: at the mouth of a street and on the square side, seven blocks
    // tall. spec 02-28: cyan, magenta, lemon, and a street never changes colour.
    const view = buildCity(CITY, PLAN, standIn());
    const mesh = view.draws[view.draws.length - 1];
    expect(mesh?.name).toBe('gateways');
    expect(mesh?.count).toBe(STREETS * 3); // two uprights and the lintel each
    expect(GATEWAY_COLOURS.length).toBe(STREETS);
    expect(GATEWAY_COLOURS).toEqual(['#5fd8f2', '#f25fd8', '#e8f25f']);

    const seat = new THREE.Matrix4();
    const spot = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    let tallest = 0;
    for (let n = 0; n < (mesh?.count ?? 0); n += 1) {
      mesh?.getMatrixAt(n, seat);
      seat.decompose(spot, turn, scale);
      tallest = Math.max(tallest, spot.y + scale.y / 2);
      // On the square side of the mouth, never at the far end. (spec 02-27)
      expect(Math.hypot(spot.x, spot.z)).toBeLessThan(MOUTH + 1);
    }
    expect(tallest).toBeCloseTo(PLAN.street.gatewayHeight, 6);

    const paint = new THREE.Color();
    for (let k = 0; k < STREETS; k += 1) {
      mesh?.getColorAt(k * 3, paint);
      expect(`#${paint.getHexString()}`).toBe(GATEWAY_COLOURS[k]);
    }
  });
});

describe('which way the blocks look', () => {
  it('turns every face outward, and never one inward', () => {
    // spec 07-17: everything is opaque, and it is the depth buffer that ranges
    // the scene — which only holds if a face is seen from the side it clothes.
    const view = buildCity(CITY, PLAN, standIn());
    const eye = new THREE.Raycaster();

    // From the street, the ladder of the first building answers. (spec 02-26)
    eye.set(new THREE.Vector3(MOUTH + 4.5, 1.5, 0.5), new THREE.Vector3(0, 0, 1));
    const facade = eye.intersectObject(view.node, true)[0];
    expect(facade?.object.name).toBe('ladder');

    // From above, its roof answers at the height the grid gives it. (spec 04-9)
    eye.set(new THREE.Vector3(MOUTH + 4.5, 20, 5.5), new THREE.Vector3(0, -1, 0));
    const roof = eye.intersectObject(view.node, true)[0];
    expect(roof?.object.name).toBe('roof4');
    expect(roof?.distance).toBeCloseTo(16, 6);

    // From within the building, nothing answers at all.
    eye.set(new THREE.Vector3(MOUTH + 4.5, 1.5, 5.5), new THREE.Vector3(0, 0, -1));
    expect(eye.intersectObject(view.node, true).length).toBe(0);
  });
});

describe('what the city refuses', () => {
  it('is opaque throughout, and casts nothing', () => {
    // spec 07-17: nothing is translucent, and the depth buffer ranges the scene.
    // spec 07-3: nothing, ever, casts.
    const view = buildCity(CITY, PLAN, standIn());
    let cast = 0;
    let clear = 0;
    view.node.traverse((child) => {
      if (child.castShadow) cast += 1;
      const mesh = child as THREE.Mesh;
      const paint = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (paint === undefined) return;
      if (paint.transparent || paint.opacity < 1) clear += 1;
    });
    expect(cast).toBe(0);
    expect(clear).toBe(0);
  });

  it('puts down nothing but built things and the three gateways', () => {
    // spec 02-5, 10 "Les interdits": the city carries no object of decor, and
    // the one thing that is ever added to it is a cannon.
    const view = buildCity(CITY, PLAN, standIn());
    const names = view.draws.map((mesh) => mesh.name);
    expect(names).toEqual([...TILES.map((tile) => tile.id), 'gateways']);
  });
});

describe('what a reinforcement builds on the town hall', () => {
  const crownFaces = (notch: number): Face[] => {
    const found: Face[] = [];
    eachCrownFace(PLAN, notch, (tile, x, y, z, way) => found.push({ tile, x, y, z, way }));
    return found;
  };

  it('says the notch by the stuff it is made of, and by no figure at all', () => {
    // spec 06-37: bois et pierre claire, then boards of wood, then a wall of
    // stone, then thick stone and merlons. Nothing is drawn but blocks.
    expect(crownFaces(0)).toEqual([]); // nobody has reinforced it: wood and pale stone

    const wood = new Set(crownFaces(1).map((face) => face.tile));
    expect(wood).toEqual(new Set(['base'])); // the wood of the shed (spec 07, tiles)

    const stone = new Set(crownFaces(2).map((face) => face.tile));
    expect(stone).toEqual(new Set(['townHall', 'townHallRoof'])); // the pale stone

    const thick = new Set(crownFaces(NOTCHES).map((face) => face.tile));
    expect(thick).toEqual(stone);
  });

  it('stands higher and thicker at each notch, which is the whole reading', () => {
    // spec 06-37: low boards, then a wall, then that wall two blocks thick with
    // merlons over it.
    const cellsOf = (notch: number): Set<string> =>
      new Set(crownFaces(notch).map((face) => `${face.x},${face.z}`));
    const topOf = (notch: number): number =>
      crownFaces(notch).reduce((most, face) => Math.max(most, face.y), 0);

    expect(cellsOf(1).size).toBe(28); // the outer course of an eight by eight
    expect(cellsOf(2).size).toBe(28);
    expect(cellsOf(NOTCHES).size).toBe(48); // two courses thick (spec 06-37)

    expect(topOf(1)).toBe(PLAN.townHallHeight + 1);
    expect(topOf(2)).toBe(PLAN.townHallHeight + 2);
    expect(topOf(NOTCHES)).toBe(PLAN.townHallHeight + 3); // the merlons
  });

  it('lays not one block on ground the child walks, at any notch', () => {
    // spec 04-8, 02-9: this file draws what the grid says, and a block on
    // walkable paving would be a wall he walks straight through. The roof of the
    // town hall is climbed by nobody and carries nothing, so the crown takes it.
    const half = PLAN.townHallSide / 2;
    for (let notch = 1; notch <= NOTCHES; notch += 1) {
      for (const face of crownFaces(notch)) {
        expect(face.y).toBeGreaterThanOrEqual(PLAN.townHallHeight);
        expect(Math.abs(face.x)).toBeLessThan(half);
        expect(Math.abs(face.z)).toBeLessThan(half);
      }
    }
  });

  it('rebuilds the whole of it in one call, and leaves nothing of the one before', () => {
    // spec 06-36: the reinforcement rebuilds everything at once, and it is the
    // one thing that brings back what has come off. spec 10-37: and the scene is
    // built again from the state after a lost context.
    const crown = buildCrown(PLAN, standIn());
    const seated = (): number => crown.draws.reduce((total, mesh) => total + mesh.count, 0);
    expect(seated()).toBe(0); // it opens on a town hall nobody has reinforced

    for (let notch = 1; notch <= NOTCHES; notch += 1) {
      showCrown(crown, notch);
      expect(seated()).toBe(crownFaces(notch).length);
    }
    // The buy-back moves none of it: there is no fourth notch. (spec 06-28)
    showCrown(crown, NOTCHES);
    expect(seated()).toBe(crownFaces(NOTCHES).length);

    showCrown(crown, 0);
    expect(seated()).toBe(0);
  });

  it('costs three calls a frame, and never one for a block', () => {
    // spec 10 "Le budget de rendu": at most 80 calls a frame for everything, and
    // the count follows the tiles rather than the blocks.
    const crown = buildCrown(PLAN, standIn());
    showCrown(crown, NOTCHES);
    expect(crown.draws.length).toBe(3);
    expect(crown.draws.map((mesh) => mesh.name)).toEqual([
      'crown:townHall',
      'crown:townHallRoof',
      'crown:base',
    ]);

    const city = buildCity(CITY, PLAN, standIn());
    expect(city.draws.length + crown.draws.length).toBeLessThanOrEqual(80);
  });

  it('borrows two of the thirteen tiles, and asks for no fourteenth', () => {
    // spec 07-44, spec 06 "Les interdits": there is no fourteenth tile of the
    // sheet, and the whole reading is wood against stone, thin against thick.
    const worn = new Set<TileId>();
    for (let notch = 0; notch <= NOTCHES; notch += 1) {
      for (const face of crownFaces(notch)) worn.add(face.tile);
    }
    for (const tile of worn) expect(TILES.map((spec) => spec.id)).toContain(tile);
  });

  it('hangs under one node, and casts nothing', () => {
    // spec 07-3, 07-17: nothing casts and nothing is translucent.
    const crown = buildCrown(PLAN, standIn());
    showCrown(crown, NOTCHES);
    let cast = 0;
    let clear = 0;
    crown.node.traverse((child) => {
      if (child.castShadow) cast += 1;
      const mesh = child as THREE.Mesh;
      const paint = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (paint === undefined) return;
      if (paint.transparent || paint.opacity < 1) clear += 1;
    });
    expect(cast).toBe(0);
    expect(clear).toBe(0);
  });
});

// --------------------------------------------- what a frame keeps in the view

/**
 * The view of the one camera, and the very line `WebGLRenderer` reads it with
 * before it draws an object at all. It is written out here rather than asserted
 * as a flag, because what it stands against was a mesh that carried every right
 * flag, held its instances, said it was drawing them — and was thrown out of
 * every frame all the same.
 */
const VIEW = new THREE.Frustum();
const SEEN = new THREE.Matrix4();
const MIDDLE = new THREE.Vector3(0, 0, 0);

function watch(lens: THREE.PerspectiveCamera): void {
  lens.updateMatrixWorld(true);
  VIEW.setFromProjectionMatrix(
    SEEN.multiplyMatrices(lens.projectionMatrix, lens.matrixWorldInverse),
  );
}

const kept = (mesh: THREE.Object3D): boolean =>
  !mesh.frustumCulled || VIEW.intersectsObject(mesh as THREE.Mesh);

/**
 * The crown stands on the roof of the town hall, which is the middle of the
 * city, so no camera of this game ever leaves it far behind. This one stands on
 * the square beside the town hall and looks up at its roof: the paving at the
 * foot of the wall — the middle of the world, where an empty sphere sits —
 * falls under the view, and the crown fills it. (spec 02-7, 06-37)
 */
function lookingUp(plan: CityPlan): THREE.PerspectiveCamera {
  const lens = new THREE.PerspectiveCamera(FIELD, 16 / 9, NEAR, 200);
  lens.position.set(10, 2, 0);
  lens.lookAt(0, plan.townHallHeight + 2, 0);
  return lens;
}

describe('what a frame keeps in the view', () => {
  it('draws the crown at whatever notch it stands, and the middle of the world is not in it', () => {
    // spec 06-36, 06-37: every block of it is seated again at every notch, and
    // it opens on nought — three meshes seating nothing. The sphere measured
    // around that nothing is what a whole game was then culled against, and the
    // crown only ever showed because the town hall it stands on happens to sit
    // at the middle of the world.
    const crown = buildCrown(PLAN, standIn());
    crown.node.updateMatrixWorld(true);
    // The first frame of a game, and it is the whole of the defect: the crown
    // opens on nought, so at that instant its three meshes seat nothing, and it
    // is then that Three.js measures the sphere it will cull them by for the
    // rest of the run.
    watch(lookingUp(PLAN));
    for (const mesh of crown.draws) kept(mesh);

    showCrown(crown, NOTCHES);

    const lens = lookingUp(PLAN);
    watch(lens);
    expect(VIEW.containsPoint(MIDDLE)).toBe(false);
    expect(VIEW.containsPoint(new THREE.Vector3(0, PLAN.townHallHeight + 2, 0))).toBe(true);

    let seated = 0;
    for (const mesh of crown.draws) {
      if (mesh.count === 0) continue;
      seated += 1;
      expect([mesh.name, kept(mesh)]).toEqual([mesh.name, true]);
    }
    expect(seated).toBeGreaterThan(0);
  });
});
