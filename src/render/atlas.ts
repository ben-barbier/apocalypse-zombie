/**
 * The one image the game loads, and the script that paints it.
 *
 * The source of truth is this file, never `public/atlas.png`: the PNG is a
 * build product, generated and committed so the game serves itself, and never
 * retouched by hand. `atlas.test.ts` compares what `paintAtlas()` returns to
 * what sits on disk, so a hand-edited PNG is a red error. (spec 07-58, 07-60)
 *
 * Thirteen tiles, and the list is closed: what is not here will never be
 * painted, and a fourteenth arrives by a PR on chapter 7 — never by an addition
 * to this script. (spec 07-44, 07-45)
 */
import * as THREE from 'three';

/** The whole sheet, in pixels. (spec 07-43) */
export const ATLAS_SIZE = 128;
/** One cell of the four-by-four grid. (spec 07-46) */
export const CELL = 32;
/** The painted tile at the middle of a cell. (spec 07-43) */
export const TILE = 16;
/** The cyclic margin around a tile, which covers three mipmaps. (spec 07-46, 07-47) */
export const MARGIN = 8;
/** Cells per side. (spec 07-46) */
export const GRID = 4;

/** A tile declares its plan: only a facade earns the vertical ramp. (spec 07-51) */
export type Plan = 'vertical' | 'horizontal';

export type TileId =
  | 'street'
  | 'square'
  | 'halo'
  | 'wall'
  | 'cornice'
  | 'ladder'
  | 'roof4'
  | 'roof6'
  | 'roof8'
  | 'townHall'
  | 'townHallRoof'
  | 'base'
  | 'outskirts';

interface TileSpec {
  readonly id: TileId;
  readonly plan: Plan;
  /** The warm base colour of chapter 7, "La palette de la ville". */
  readonly colour: string;
}

/**
 * The thirteen, in the cells this script gives them. Where a tile sits in the
 * grid has no consequence, as long as this table holds it. (spec 07-61)
 */
export const TILES: readonly TileSpec[] = [
  { id: 'street', plan: 'horizontal', colour: '#6d5344' },
  { id: 'square', plan: 'horizontal', colour: '#a98761' },
  { id: 'halo', plan: 'horizontal', colour: '#d9bb8c' },
  { id: 'wall', plan: 'vertical', colour: '#b17c52' },
  { id: 'cornice', plan: 'vertical', colour: '#b17c52' },
  { id: 'ladder', plan: 'vertical', colour: '#b17c52' },
  { id: 'roof4', plan: 'horizontal', colour: '#7a3a2e' },
  { id: 'roof6', plan: 'horizontal', colour: '#a2553d' },
  { id: 'roof8', plan: 'horizontal', colour: '#c8804f' },
  { id: 'townHall', plan: 'vertical', colour: '#e8cba0' },
  { id: 'townHallRoof', plan: 'horizontal', colour: '#3d2118' },
  { id: 'base', plan: 'vertical', colour: '#6e4526' },
  { id: 'outskirts', plan: 'horizontal', colour: '#8a7c4a' },
];

/**
 * The mean of the three roof tiles, and the whole reason they differ. Since
 * nothing in this game is ever thrown onto anything, nothing but the tile says a
 * roof stands over its neighbour — so the ramp is game information, and the
 * painter lands on it rather than hoping. A ramp of value, never of hue. (spec 07-54)
 */
export const ROOF_VALUES: {
  readonly roof4: number;
  readonly roof6: number;
  readonly roof8: number;
} = {
  roof4: 77.6,
  roof6: 102.7,
  roof8: 134.9,
};

/** A forgotten cell has to shout, so it is neither black nor clear. (spec 07-49) */
export const FREE_CELL = '#ff00ff';

/** The wood of the base, borrowed by the ladder rails. */
const WOOD = '#6e4526';
/** The warm hole of a window — never a reflection of the sky. (spec 07-56) */
const WINDOW = '#3a2418';

// ---------------------------------------------------------------- the chance

/**
 * The painter seeds its own chance from the identifier of the tile, so the
 * sheet is reproducible byte for byte. (spec 07-59)
 *
 * It carries its own generator rather than borrowing the one of the rules:
 * `src/render/` takes types from `src/game/`, never functions. (spec 10-2)
 */
function seedOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- the colour

type Rgb = readonly [number, number, number];

function rgbOf(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Neither pure white nor plain black exists in the city: they are the two
 * colours of the action, and a tile that reached one of them would steal a
 * signal. The painter holds every channel inside that range rather than
 * trusting each motif to. (spec 07-12)
 */
const clamp = (n: number): number => (n < 1 ? 1 : n > 254 ? 254 : Math.round(n));

/** Painting a tile writes here: sixteen by sixteen, three channels, opaque. */
class Face {
  readonly pixels = new Uint8Array(TILE * TILE * 3);

  put(x: number, y: number, [r, g, b]: Rgb, shift = 0): void {
    const at = (y * TILE + x) * 3;
    this.pixels[at] = clamp(r + shift);
    this.pixels[at + 1] = clamp(g + shift);
    this.pixels[at + 2] = clamp(b + shift);
  }

  /** The plain mean of the three channels over the whole tile. (spec 07-54) */
  mean(): number {
    let total = 0;
    for (const channel of this.pixels) total += channel;
    return total / this.pixels.length;
  }

  /** Shifts every channel alike, so the hue holds while the value lands. */
  lift(by: number): void {
    for (let i = 0; i < this.pixels.length; i += 1) {
      this.pixels[i] = clamp((this.pixels[i] ?? 0) + by);
    }
  }
}

// ----------------------------------------------------------------- the tiles

/**
 * The vertical ramp of a facade, in shift: light at the top, darker at the
 * foot. A horizontal tile never takes it — repeated block by block it would
 * turn a street into stripes. (spec 07-51)
 */
const rampAt = (y: number, plan: Plan, amplitude: number): number =>
  plan === 'vertical' ? amplitude * (1 - (2 * y) / (TILE - 1)) : 0;

/** A terrace: four slabs of eight, hollowed joints, gravel over. (spec 07-53) */
const isJoint = (x: number, y: number): boolean => x % 8 === 0 || y % 8 === 0;

function paintFace(spec: TileSpec): Face {
  const face = new Face();
  const base = rgbOf(spec.colour);
  const chance = mulberry32(seedOf(spec.id));
  const wood = rgbOf(WOOD);
  const hole = rgbOf(WINDOW);

  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const grain = (chance() - 0.5) * 2;
      let colour = base;
      let shift = rampAt(y, spec.plan, 6);

      switch (spec.id) {
        case 'street':
          // Coarse, and nothing else: a street carries no kerb and no slab.
          shift += grain * 10;
          break;

        case 'square':
        case 'halo':
          // The same paving, the halo one repainted lighter. (spec 07, tiles)
          shift += (isJoint(x, y) ? -20 : 0) + grain * 6;
          break;

        case 'outskirts':
          shift += grain * 14;
          break;

        case 'roof4':
        case 'roof6':
        case 'roof8':
        case 'townHallRoof':
          shift += (isJoint(x, y) ? -22 : 0) + grain * 12;
          break;

        case 'wall':
          // The spandrel: the full block of an étage, and no facade variant.
          shift += grain * 5 + (y === TILE - 1 ? -8 : 0);
          break;

        case 'cornice': {
          // The head of an étage: the moulding that crowns it, then the hole.
          const moulding = y < 3;
          const sill = y === 13;
          const opening = y >= 5 && y <= 12 && x >= 3 && x <= 12;
          if (opening) {
            colour = hole;
            shift = grain * 4;
          } else if (moulding) {
            shift += 16 + grain * 4;
          } else if (sill) {
            shift += 10 + grain * 3;
          } else {
            shift += grain * 5;
          }
          break;
        }

        case 'ladder': {
          // The one climb from the ground, in the middle of the street face.
          const rail = x === 4 || x === 5 || x === 10 || x === 11;
          const rung = (y - 1) % 4 === 0 && x >= 5 && x <= 10;
          if (rail || rung) {
            colour = wood;
            shift = (rung ? 14 : 0) + grain * 6;
          } else {
            shift += grain * 5;
          }
          break;
        }

        case 'townHall':
          // Pale stone in courses, four blocks tall, shifted every other one.
          shift += grain * 4 + (y % 4 === 0 ? -14 : 0) + ((x + (y < 8 ? 0 : 8)) % 8 === 0 ? -10 : 0);
          break;

        case 'base':
          // The shed: upright boards, seams between them.
          shift += grain * 8 + (x % 5 === 0 ? -16 : 0);
          break;
      }

      face.put(x, y, colour, shift);
    }
  }

  // The three roofs land on their published mean, because that mean is what
  // tells a child which roof carries further. (spec 07-54, 05-22)
  const target = (ROOF_VALUES as { readonly [id: string]: number | undefined })[spec.id];
  if (target !== undefined) face.lift(target - face.mean());

  return face;
}

// ----------------------------------------------------------------- the sheet

/** Where a tile sits: its cell, and the pixel its painted square starts at. */
export function cellOf(id: TileId): { readonly col: number; readonly row: number } {
  const index = TILES.findIndex((spec) => spec.id === id);
  if (index < 0) throw new Error(`no such tile: ${id}`);
  return { col: index % GRID, row: Math.floor(index / GRID) };
}

/**
 * The zero-to-one square a block reads. Every block carries its own coordinates
 * inside its cell, so a tile repeats block by block and never across two of
 * them. (spec 07-48)
 */
export function tileUv(id: TileId): { u0: number; v0: number; u1: number; v1: number } {
  const { col, row } = cellOf(id);
  const x = col * CELL + MARGIN;
  const y = row * CELL + MARGIN;
  return {
    u0: x / ATLAS_SIZE,
    v0: 1 - (y + TILE) / ATLAS_SIZE,
    u1: (x + TILE) / ATLAS_SIZE,
    v1: 1 - y / ATLAS_SIZE,
  };
}

/**
 * The whole sheet, three channels and no alpha — nothing in this game is
 * translucent. (spec 07-17)
 *
 * The margin is cyclic: it takes the opposite edge of the tile, so the seam
 * between two neighbouring blocks stays invisible and a tile cannot bleed onto
 * its neighbour when the mipmap comes down. That makes a cell the tile itself,
 * repeated with a period of sixteen and offset by the margin. (spec 07-47)
 */
export function paintAtlas(): Uint8Array {
  const sheet = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 3);
  const magenta = rgbOf(FREE_CELL);
  const faces = new Map<number, Face>();
  TILES.forEach((spec, index) => faces.set(index, paintFace(spec)));

  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      const face = faces.get(row * GRID + col);
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const at = ((row * CELL + y) * ATLAS_SIZE + col * CELL + x) * 3;
          if (face === undefined) {
            sheet[at] = magenta[0];
            sheet[at + 1] = magenta[1];
            sheet[at + 2] = magenta[2];
            continue;
          }
          const from = (((y + MARGIN) % TILE) * TILE + ((x + MARGIN) % TILE)) * 3;
          sheet[at] = face.pixels[from] ?? 0;
          sheet[at + 1] = face.pixels[from + 1] ?? 0;
          sheet[at + 2] = face.pixels[from + 2] ?? 0;
        }
      }
    }
  }
  return sheet;
}

// ---------------------------------------------------------------- the loading

/**
 * The two filterings, and they do not follow from one another: nearest keeps
 * the block under the nose of the player crisp, and the mipmap keeps the far
 * end of a street from sparkling at every step of the camera. (spec 07-50)
 */
export function loadAtlas(url = '/atlas.png'): THREE.Texture {
  const sheet = new THREE.TextureLoader().load(url);
  sheet.magFilter = THREE.NearestFilter;
  sheet.minFilter = THREE.NearestMipmapLinearFilter;
  sheet.generateMipmaps = true;
  sheet.anisotropy = 1;
  sheet.colorSpace = THREE.SRGBColorSpace;
  return sheet;
}
