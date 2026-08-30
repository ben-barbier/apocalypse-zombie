/**
 * The scene read back against chapter 7. Nothing here draws anything: it builds
 * the graph under node and counts what is in it, which is how the two hardest
 * interdicts of the chapter — nothing cast, nothing lighting its neighbourhood —
 * become a red error rather than a good intention. (spec 07-3, 07-4, 10-45)
 *
 * The last two cases are of the same kind and about `alwaysDrawn`: they run the
 * very test Three.js runs before it draws an object, and hold the trap it sets
 * for a mesh whose instances arrive after the first frame.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FIELD, NEAR } from './camera';
import {
  AMBIENT_STRENGTH,
  HAZE_COLOUR,
  SUN_RISE,
  SUN_STRENGTH,
  alwaysDrawn,
  createScene,
  hazeFar,
  hazeNear,
} from './scene';

/** The city the haze measures itself against. (spec 02 "La ville", "La place", "Une rue") */
const CITY = { apothem: 16, outskirts: 12, street: { length: 80 } };

const lightsOf = (scene: THREE.Scene): THREE.Light[] =>
  scene.children.filter((child): child is THREE.Light => (child as THREE.Light).isLight === true);

describe('the light of the one hour', () => {
  it('is one directional and one ambient, and nothing else', () => {
    // spec 07-2: one directional sun, one violet ambient.
    const scene = createScene(CITY);
    const lights = lightsOf(scene);
    expect(lights.length).toBe(2);
    expect(lights.filter((light) => light.type === 'DirectionalLight').length).toBe(1);
    expect(lights.filter((light) => light.type === 'AmbientLight').length).toBe(1);
    expect(scene.children.length).toBe(2); // the scene is empty apart from its light
  });

  it('casts nothing, and lights no neighbourhood', () => {
    // spec 07-3: nothing, ever, casts. spec 07-4: nothing lights its neighbour.
    // spec 10 "Le budget de rendu": 0 and 0.
    const scene = createScene(CITY);
    let cast = 0;
    let neighbourly = 0;
    scene.traverse((child) => {
      if (child.castShadow) cast += 1;
      if (child.type === 'PointLight' || child.type === 'SpotLight') neighbourly += 1;
    });
    expect(cast).toBe(0);
    expect(neighbourly).toBe(0);
  });

  it('stands the sun sixty degrees above the horizon', () => {
    // spec 07-2: fixed at 60° above the horizon, and it never moves.
    expect(SUN_RISE).toBe(60);
    const scene = createScene(CITY);
    const sun = lightsOf(scene).find((light) => light.type === 'DirectionalLight');
    expect(sun).toBeDefined();
    const rise = Math.asin(sun!.position.y / sun!.position.length());
    expect((rise * 180) / Math.PI).toBeCloseTo(60, 6);
  });

  it('lands the top face on a neutral one, and nothing blows out', () => {
    // spec 07-5, 07 "La lumière et la brume": 0,577 × sin 60° + 0,5 = 1. The two
    // are written out here from the chapter, because it is the sum that is the
    // rule and either one alone would pass any test of its own.
    expect(SUN_STRENGTH).toBe(0.577);
    expect(AMBIENT_STRENGTH).toBe(0.5);
    const top = SUN_STRENGTH * Math.sin((SUN_RISE * Math.PI) / 180) + AMBIENT_STRENGTH;
    expect(top).toBeCloseTo(1, 3);
    // Cut short rather than up: the top face never goes over one, so it never burns.
    expect(top).toBeLessThanOrEqual(1);
    // A face turned away keeps the violet alone, and it carries half the light,
    // which is what a green body in a street is read by. (spec 07-2, 07-3, 07-4)
    expect(AMBIENT_STRENGTH).toBeCloseTo(top / 2, 3);
  });
});

describe('the haze', () => {
  it('starts at the far end of a street and is total at the edge of the city', () => {
    // spec 07-6: it erases the outskirts past the frontages, and it leaves the
    // far end of a street to be seen — that is where the zombies walk in.
    // spec 02: the apothem is 16, a street is 80 clear of the square, and the
    // outskirts run 12 further.
    expect(hazeNear(CITY)).toBe(96);
    expect(hazeFar(CITY)).toBe(108);
  });

  it('hangs on the scene, orange, and is the sky as well', () => {
    // spec 07-6: the haze is orange and thickens with the distance.
    const scene = createScene(CITY);
    const haze = scene.fog as THREE.Fog;
    expect(haze).toBeInstanceOf(THREE.Fog);
    expect(haze.near).toBe(96);
    expect(haze.far).toBe(108);
    expect(`#${haze.color.getHexString()}`).toBe(HAZE_COLOUR);
    expect(`#${(scene.background as THREE.Color).getHexString()}`).toBe(HAZE_COLOUR);
  });

  it('is warm: more red than green, more green than blue', () => {
    // spec 07-6, 07-11: orange belongs to the decor, and the decor is warm.
    const orange = new THREE.Color(HAZE_COLOUR);
    expect(orange.r).toBeGreaterThan(orange.g);
    expect(orange.g).toBeGreaterThan(orange.b);
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
 * A camera standing sixty blocks out in street one and looking further out
 * still, so that the middle of the world falls behind it. That is the whole of
 * what this view is for: a mesh that measured its sphere around nothing keeps an
 * empty one at that middle, and this camera cannot hold it. (spec 02-12)
 */
const OUT = 60;

function lookingOut(): THREE.PerspectiveCamera {
  const lens = new THREE.PerspectiveCamera(FIELD, 16 / 9, NEAR, 200);
  lens.position.set(OUT - 6, 4, 0);
  lens.lookAt(OUT, 1, 0);
  return lens;
}

/** One cube of a block, seated where it is asked for, in a mesh of a hundred. */
function oneCube(x: number, y: number, z: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
    100,
  );
  mesh.count = 0;
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(x, y, z));
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('what a frame keeps in the view', () => {
  it('throws away a mesh that measured its sphere around nothing', () => {
    // The trap, in six lines, and it is the defect this whole file answers:
    // Three.js measures the sphere of an InstancedMesh the first time it is
    // asked whether that mesh falls in the view, and never measures it again. A
    // mesh seating nothing at that instant keeps an empty sphere at the middle
    // of the world for the rest of the run.
    const lens = lookingOut();
    const mesh = oneCube(OUT, 1, 0);
    watch(lens);
    expect(VIEW.containsPoint(MIDDLE)).toBe(false); // the middle is behind it
    expect(kept(mesh)).toBe(false); // the one ask, and it seats nothing

    // And now it seats a cube six blocks in front of the camera and is thrown
    // away all the same, which is exactly what the browser was showing: shards
    // alive, shards counted as drawn, and not one of them on the screen.
    mesh.count = 1;
    expect(VIEW.containsPoint(new THREE.Vector3(OUT, 1, 0))).toBe(true);
    expect(kept(mesh)).toBe(false);
  });

  it('keeps one that has been taken out of the culling', () => {
    const lens = lookingOut();
    const mesh = oneCube(OUT, 1, 0);
    watch(lens);
    expect(kept(mesh)).toBe(false); // the ask that freezes the empty sphere
    mesh.count = 1;

    alwaysDrawn(mesh);
    expect(kept(mesh)).toBe(true);
  });
});
