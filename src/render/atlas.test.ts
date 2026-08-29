/**
 * The guard of the sheet. It paints the atlas from the script and compares it
 * to `public/atlas.png`, so a PNG retouched by hand is a red error. (spec 07-60)
 *
 * The PNG codec lives here rather than beside the painter on purpose: the game
 * never encodes an image, it only loads one. And it is written out by hand
 * because the stack is closed — no runtime dependency, and no sixth npm script
 * either. (spec 10, "La stack" and 10-46)
 *
 * To rewrite the committed sheet after a deliberate change to the painter:
 *
 *     ATLAS_WRITE=1 npx vitest run src/render/atlas.test.ts
 *
 * Then read the diff. The bytes are never edited by hand.
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ATLAS_SIZE,
  CELL,
  FREE_CELL,
  GRID,
  MARGIN,
  ROOF_VALUES,
  TILE,
  TILES,
  cellOf,
  paintAtlas,
  tileUv,
} from './atlas';

const SHEET = fileURLToPath(new URL('../../public/atlas.png', import.meta.url));
const SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

// ------------------------------------------------------------------ the codec

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 255] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(kind: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(kind, 4, 'ascii');
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, tail]);
}

/** Three channels, eight bits, no interlacing — and no alpha. (spec 07-17) */
function encode(rgb: Uint8Array, side: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = side * 3;
  const raw = Buffer.alloc((stride + 1) * side);
  for (let y = 0; y < side; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgb.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

function decode(png: Buffer): { side: number; rgb: Uint8Array } {
  expect([...png.subarray(0, 8)]).toEqual([...SIGNATURE]);
  let at = 8;
  let side = 0;
  const parts: Buffer[] = [];
  while (at < png.length) {
    const size = png.readUInt32BE(at);
    const kind = png.toString('ascii', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + size);
    if (kind === 'IHDR') {
      side = data.readUInt32BE(0);
      expect(data.readUInt32BE(4)).toBe(side);
      expect(data[8]).toBe(8); // eight bits a channel
      expect(data[9]).toBe(2); // three channels, no alpha
      expect(data[12]).toBe(0); // no interlacing
    } else if (kind === 'IDAT') parts.push(Buffer.from(data));
    else if (kind === 'IEND') break;
    at += 12 + size;
  }

  const raw = inflateSync(Buffer.concat(parts));
  const stride = side * 3;
  const rgb = new Uint8Array(stride * side);
  for (let y = 0; y < side; y += 1) {
    const kind = raw[y * (stride + 1)] ?? 0;
    for (let i = 0; i < stride; i += 1) {
      const x = raw[y * (stride + 1) + 1 + i] ?? 0;
      const a = i >= 3 ? (rgb[y * stride + i - 3] ?? 0) : 0;
      const b = y > 0 ? (rgb[(y - 1) * stride + i] ?? 0) : 0;
      const c = i >= 3 && y > 0 ? (rgb[(y - 1) * stride + i - 3] ?? 0) : 0;
      const before =
        kind === 1 ? a : kind === 2 ? b : kind === 3 ? (a + b) >> 1 : kind === 4 ? paeth(a, b, c) : 0;
      rgb[y * stride + i] = (x + before) & 255;
    }
  }
  return { side, rgb };
}

// ------------------------------------------------------------------ the reads

const sheet = paintAtlas();
const at = (x: number, y: number): readonly [number, number, number] => {
  const i = (y * ATLAS_SIZE + x) * 3;
  return [sheet[i] ?? 0, sheet[i + 1] ?? 0, sheet[i + 2] ?? 0];
};

const hexOf = ([r, g, b]: readonly [number, number, number]): string =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;

function meanOf(id: (typeof TILES)[number]['id']): number {
  const { col, row } = cellOf(id);
  let total = 0;
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const [r, g, b] = at(col * CELL + MARGIN + x, row * CELL + MARGIN + y);
      total += r + g + b;
    }
  }
  return total / (TILE * TILE * 3);
}

// ------------------------------------------------------------------ the tests

describe('the sheet', () => {
  it('is one image of a hundred and twenty-eight pixels', () => {
    // spec 07-43: the game loads one image, and only one.
    expect(ATLAS_SIZE).toBe(128);
    expect(sheet).toHaveLength(ATLAS_SIZE * ATLAS_SIZE * 3);
  });

  it('lays a four-by-four grid of cells of thirty-two, tiles of sixteen', () => {
    expect(GRID).toBe(4); // spec 07-46
    expect(CELL).toBe(32); // spec 07-46
    expect(TILE).toBe(16); // spec 07-43
    expect(MARGIN).toBe(8); // spec 07-46
    expect(TILE + 2 * MARGIN).toBe(CELL);
    expect(GRID * CELL).toBe(ATLAS_SIZE);
  });

  it('paints thirteen tiles and leaves three cells', () => {
    // spec 07-44, 07-45: the list is closed.
    expect(TILES).toHaveLength(13);
    expect(GRID * GRID - TILES.length).toBe(3);
    expect(new Set(TILES.map((tile) => tile.id)).size).toBe(13);
  });

  it('names the thirteen the spec names, and no fourteenth', () => {
    expect(TILES.map((tile) => tile.id)).toEqual([
      'street',
      'square',
      'halo',
      'wall',
      'cornice',
      'ladder',
      'roof4',
      'roof6',
      'roof8',
      'townHall',
      'townHallRoof',
      'base',
      'outskirts',
    ]); // spec 07-44
  });

  it('repaints the same bytes every time it is asked', () => {
    // spec 07-59: the chance is seeded from the identifier of the tile.
    expect([...paintAtlas()]).toEqual([...sheet]);
  });
});

describe('the cyclic margin', () => {
  it('takes the opposite edge of the tile, never a stretched one', () => {
    // spec 07-47: the eight columns on the right become the margin on the left,
    // and the same above and below. So a cell is the tile, repeated.
    for (const tile of TILES) {
      const { col, row } = cellOf(tile.id);
      const x0 = col * CELL;
      const y0 = row * CELL;
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const from = at(x0 + MARGIN + ((x + MARGIN) % TILE), y0 + MARGIN + ((y + MARGIN) % TILE));
          expect(at(x0 + x, y0 + y)).toEqual(from);
        }
      }
    }
  });

  it('covers three mipmaps', () => {
    // spec 07, "La planche": eight pixels hold down to the third mipmap.
    expect(MARGIN).toBeGreaterThanOrEqual(2 ** 3);
  });
});

describe('the three free cells', () => {
  it('shout in plain magenta, never in black and never clear', () => {
    // spec 07-49: a forgotten cell has to shout.
    for (let cell = TILES.length; cell < GRID * GRID; cell += 1) {
      const col = cell % GRID;
      const row = Math.floor(cell / GRID);
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          expect(hexOf(at(col * CELL + x, row * CELL + y))).toBe(FREE_CELL);
        }
      }
    }
  });
});

describe('the roofs', () => {
  it('climb the ramp of value the spec publishes', () => {
    // spec 07-54: 77,6 · 102,7 · 134,9 — game information, not a taste.
    for (const [id, target] of Object.entries(ROOF_VALUES)) {
      expect(Math.abs(meanOf(id as 'roof4') - target)).toBeLessThan(0.5);
    }
  });

  it('reads by value alone, never by hue', () => {
    // spec 07-54: it survives an atypical sight of colour.
    expect(meanOf('roof4')).toBeLessThan(meanOf('roof6'));
    expect(meanOf('roof6')).toBeLessThan(meanOf('roof8'));
  });
});

describe('the paint', () => {
  it('declares a plan, and gives the vertical ramp to facades only', () => {
    // spec 07-51: a vertical ramp on a horizontal tile makes stripes.
    const columnSpread = (id: (typeof TILES)[number]['id']): number => {
      const { col, row } = cellOf(id);
      const rows: number[] = [];
      for (let y = 0; y < TILE; y += 1) {
        let total = 0;
        for (let x = 0; x < TILE; x += 1) {
          const [r, g, b] = at(col * CELL + MARGIN + x, row * CELL + MARGIN + y);
          total += r + g + b;
        }
        rows.push(total / (TILE * 3));
      }
      return (rows[0] ?? 0) - (rows[TILE - 1] ?? 0);
    };
    // `wall` is a plain facade: it falls off from head to foot.
    expect(columnSpread('wall')).toBeGreaterThan(8);
    // `street` is flat ground: nothing separates its head from its foot.
    expect(Math.abs(columnSpread('street'))).toBeLessThan(6);
  });

  it('keeps pure white and plain black out of the city', () => {
    // spec 07-12: they are the two colours of the action, and the city has none.
    for (const tile of TILES) {
      const { col, row } = cellOf(tile.id);
      for (let y = 0; y < TILE; y += 1) {
        for (let x = 0; x < TILE; x += 1) {
          const [r, g, b] = at(col * CELL + MARGIN + x, row * CELL + MARGIN + y);
          expect(Math.min(r, g, b)).toBeGreaterThan(0);
          expect(Math.max(r, g, b)).toBeLessThan(255);
        }
      }
    }
  });

  it('gives every block its own coordinates inside its cell', () => {
    // spec 07-48: a tile repeats block by block, never across two of them.
    for (const tile of TILES) {
      const uv = tileUv(tile.id);
      expect(uv.u1 - uv.u0).toBeCloseTo(TILE / ATLAS_SIZE);
      expect(uv.v1 - uv.v0).toBeCloseTo(TILE / ATLAS_SIZE);
      expect(uv.u0).toBeGreaterThanOrEqual(MARGIN / ATLAS_SIZE);
      expect(uv.v0).toBeGreaterThanOrEqual(MARGIN / ATLAS_SIZE);
    }
  });
});

describe('the committed sheet', () => {
  it('is the one this script paints', () => {
    if (process.env.ATLAS_WRITE) {
      writeFileSync(SHEET, encode(sheet, ATLAS_SIZE));
    }
    expect(existsSync(SHEET)).toBe(true);
    const onDisk = decode(readFileSync(SHEET));
    expect(onDisk.side).toBe(ATLAS_SIZE);
    expect([...onDisk.rgb]).toEqual([...sheet]);
  });

  it('survives a trip through the codec unchanged', () => {
    expect([...decode(encode(sheet, ATLAS_SIZE)).rgb]).toEqual([...sheet]);
  });
});
