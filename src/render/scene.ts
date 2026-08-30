/**
 * The one scene, under the one hour of the game. It holds the light and the
 * haze: the city, the bodies, the cannons and the effects arrive with their own
 * chapters, each into this same scene. The one thing the four of them share —
 * that a mesh of this game is never eliminated from the view — is settled here
 * as well, in `alwaysDrawn`, and settled once.
 *
 * The whole lighting of the game is two objects — one directional sun, fixed at
 * 60° above the horizon, and one violet ambient that fills the faces turned away
 * from it. Nothing is ever cast by either, and nothing lights its neighbourhood:
 * that is the largest performance gain of the project, and it is bought by a
 * decision of art direction, not by a setting. (spec 07-2, 07-3, 07-4)
 *
 * The haze is orange, it thickens with the distance, and it is structural: it is
 * what excuses the game from detailing what is not played. It stops exactly
 * where the street stops, so the far end of a street — where the zombies walk in
 * from — stays plain to read. (spec 07-6, 07-7)
 */
import * as THREE from 'three';

/** What the haze needs of the city to know how far it must let one see. */
export interface CityExtent {
  /** The apothem of the hexagonal square, in blocks. (spec 02-6) */
  readonly apothem: number;
  /** How far the outskirts run past the end of a street, in blocks. (spec 02) */
  readonly outskirts: number;
  readonly street: {
    /** Length clear of the square, in blocks. (spec 02-12) */
    readonly length: number;
  };
}

/** How high the sun stands, in degrees, and it never moves. (spec 07-2, "La lumière et la brume") */
export const SUN_RISE = 60;

/**
 * Which way it comes from, in degrees off the first street, so the three
 * branches of the star are not lit alike. (spec 07, "La lumière et la brume")
 */
export const SUN_TURN = 45;

/**
 * The two strengths, read off the value rule rather than off a table: the top
 * face lands on a neutral 1, the sides fall back to the violet alone, and
 * nothing blows out — 0,577 × sin 60° + 0,5 = 1.
 *
 * The ambient carries half of that on its own, because a vertical face has
 * nothing else at all: with no cast light and no lamp anywhere, whatever the sun
 * does not strike is lit by the violet and by nothing more, and any less of it
 * takes a green body in a street down to near black. What the directional is
 * worth is then settled and not chosen — it is what tops the ambient up to one
 * at 60° — and it is cut short rather than up, so the top face never goes over
 * one and nothing burns. (spec 07-2, 07-3, 07-4, 07-5, 07 "La lumière et la brume")
 */
export const SUN_STRENGTH = 0.577;
export const AMBIENT_STRENGTH = 0.5;

/**
 * The three colours of the hour, read off chapter 7 and nowhere else: a
 * near-white sun so a tile keeps its own colour on the top face, the violet of
 * the ambient, and the orange of the haze — lighter and less saturated than the
 * highest roof, so the ramp of the roofs still reads against it.
 * (spec 07, "La lumière et la brume"; 07-2, 07-6, 07-54)
 */
export const SUN_COLOUR = '#fff2dd';
export const AMBIENT_COLOUR = '#6d5ac4';
export const HAZE_COLOUR = '#d9955c';

/**
 * Where the haze starts: the far end of a street, which stays plain. 96 blocks,
 * and it is derived from the city rather than chosen.
 * (spec 07-6, "La lumière et la brume")
 */
export function hazeNear(city: CityExtent): number {
  return city.apothem + city.street.length;
}

/**
 * Where it is total: the edge of the city, past the frontages. 108 blocks, and
 * derived the same way. (spec 07-6, "La lumière et la brume")
 */
export function hazeFar(city: CityExtent): number {
  return hazeNear(city) + city.outskirts;
}

/**
 * Builds the one scene. It is called again after a lost context, because the
 * scene is a projection of the state and nothing of the game lives only on the
 * GPU. (spec 10-37)
 */
export function createScene(city: CityExtent): THREE.Scene {
  const scene = new THREE.Scene();
  const haze = new THREE.Color(HAZE_COLOUR);

  // The sky is the haze itself, so what the haze eats dissolves into it rather
  // than into a second colour nobody chose. (spec 07-6)
  scene.background = haze;
  scene.fog = new THREE.Fog(haze, hazeNear(city), hazeFar(city));

  const sun = new THREE.DirectionalLight(new THREE.Color(SUN_COLOUR), SUN_STRENGTH);
  const rise = (SUN_RISE * Math.PI) / 180;
  const turn = (SUN_TURN * Math.PI) / 180;
  sun.position.set(Math.cos(rise) * Math.sin(turn), Math.sin(rise), Math.cos(rise) * Math.cos(turn));
  // A direction of light, and nothing more: it never casts. (spec 07-3)
  sun.castShadow = false;
  scene.add(sun);

  // The violet that fills what the sun does not reach. (spec 07-2)
  scene.add(new THREE.AmbientLight(new THREE.Color(AMBIENT_COLOUR), AMBIENT_STRENGTH));

  return scene;
}

/**
 * Takes one mesh out of the culling of the view, for good — and it is the whole
 * of what this file has to say about what is seen.
 *
 * Three.js measures a sphere around an `InstancedMesh` **once**, the first frame
 * it has to ask whether the mesh falls in the view, and never measures it again.
 * A mesh seating nothing at that instant keeps an empty sphere at the middle of
 * the world for the rest of the run, and is thrown away by every frame that does
 * not look at the middle of the world — which is how every effect of this game
 * came to be drawn six hundred at a time and seen by nobody. Every mesh whose
 * instances move, or whose count is written by a frame rather than at load, is
 * in that case; the ones that were seen were seen by luck, off a sphere frozen
 * on the first frame that happened to be wide enough.
 *
 * There were two ways out and this is the one taken. The sphere could be
 * measured again every frame instead — but a mesh of this game covers the city
 * in the general case, the shards falling in the three streets and the bodies
 * walking them, so a sphere kept true measures out half the city and eliminates
 * very nearly nothing. Measuring it is a pass over six hundred seats a frame;
 * one test of the view costs a tenth of a microsecond. The paying test is the
 * one that is dropped.
 *
 * What a frame draws does not move either: Three.js draws nothing at all of a
 * mesh whose count is nought, so a mesh that seats nothing still costs no call,
 * and the calls of a frame stay the ones chapter 10 budgets.
 * (spec 10-14, 10 "Le budget de rendu")
 *
 * The city keeps its culling, and is the one thing that does: every face of it
 * is seated at load and none of them ever moves again, so its sphere is right
 * the first time it is measured and right for the rest of the game.
 */
export function alwaysDrawn(mesh: THREE.Object3D): void {
  mesh.frustumCulled = false;
}
