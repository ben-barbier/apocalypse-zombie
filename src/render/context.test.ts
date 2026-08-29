/**
 * The one context, read back against chapter 10. The tests run under node and
 * there is no GPU here, so the canvas and the renderer are both stood in for:
 * what is being read is the handling of the two facts, not a picture. There is
 * no rendering test in this project, and this is not one. (spec 10-45)
 *
 * It also holds the two lines of the budget that a test can keep: exactly one
 * context in the whole of `src/`, and a resolution that is never above 1.
 * (spec 10, "Le budget de rendu")
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GRACE,
  closeContext,
  createContext,
  resize,
  type Renderer,
  type Surface,
  type SurfaceFact,
} from './context';

// ------------------------------------------------------------- the stand-ins

function stand() {
  const handlers = new Map<string, (fact: SurfaceFact) => void>();
  const surface: Surface = {
    addEventListener: (kind, handler) => {
      handlers.set(kind, handler);
    },
    removeEventListener: (kind) => {
      handlers.delete(kind);
    },
  };
  const ratios: number[] = [];
  const sizes: number[][] = [];
  let dropped = 0;
  const renderer: Renderer = {
    setPixelRatio: (ratio) => {
      ratios.push(ratio);
    },
    setSize: (width, height) => {
      sizes.push([width, height]);
    },
    render: () => {},
    dispose: () => {
      dropped += 1;
    },
  };
  let prevented = 0;
  const fact: SurfaceFact = {
    preventDefault: () => {
      prevented += 1;
    },
  };
  return {
    surface,
    renderer,
    ratios,
    sizes,
    fact,
    send: (kind: string) => handlers.get(kind)?.(fact),
    knows: (kind: string) => handlers.has(kind),
    prevented: () => prevented,
    dropped: () => dropped,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// ------------------------------------------------------------------ the facts

describe('a context that goes away', () => {
  it('asks for it back, which is what preventDefault says and nothing else does', () => {
    // spec 10-38: webglcontextlost with preventDefault().
    const parts = stand();
    const seen: string[] = [];
    createContext(parts.surface, {
      make: () => parts.renderer,
      repopulate: () => seen.push('repopulate'),
      onLost: () => seen.push('lost'),
      onBack: () => seen.push('back'),
      reload: () => seen.push('reload'),
    });

    expect(parts.knows('webglcontextlost')).toBe(true);
    expect(parts.knows('webglcontextrestored')).toBe(true);

    parts.send('webglcontextlost');
    expect(parts.prevented()).toBe(1);
    expect(seen).toEqual(['lost']);
  });

  it('builds the scene again from the state when it comes back', () => {
    // spec 10-37: the scene is a projection of the state, and no datum of the
    // game lives only on the GPU. spec 10-38: the Sas closes after it.
    vi.useFakeTimers();
    const parts = stand();
    const seen: string[] = [];
    const context = createContext(parts.surface, {
      make: () => parts.renderer,
      repopulate: () => seen.push('repopulate'),
      onLost: () => seen.push('lost'),
      onBack: () => seen.push('back'),
      reload: () => seen.push('reload'),
    });

    parts.send('webglcontextlost');
    expect(context.lost).toBe(true);
    parts.send('webglcontextrestored');
    expect(context.lost).toBe(false);
    expect(seen).toEqual(['lost', 'repopulate', 'back']);

    vi.advanceTimersByTime(10 * GRACE);
    expect(seen).toEqual(['lost', 'repopulate', 'back']); // nothing reloads
  });

  it('reloads the page when nothing comes back in three seconds', () => {
    // spec 10-38: three seconds, then the page reloads rather than sit black.
    expect(GRACE).toBe(3000);
    vi.useFakeTimers();
    const parts = stand();
    const seen: string[] = [];
    createContext(parts.surface, {
      make: () => parts.renderer,
      repopulate: () => seen.push('repopulate'),
      reload: () => seen.push('reload'),
    });

    parts.send('webglcontextlost');
    vi.advanceTimersByTime(GRACE - 1);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['reload']);
  });

  it('takes its two handlers off when it is closed', () => {
    const parts = stand();
    const context = createContext(parts.surface, {
      make: () => parts.renderer,
      repopulate: () => {},
    });
    closeContext(context);
    expect(parts.knows('webglcontextlost')).toBe(false);
    expect(parts.knows('webglcontextrestored')).toBe(false);
    expect(parts.dropped()).toBe(1);
  });
});

describe('the resolution', () => {
  it('is handed what the tier asks for, and never more than one', () => {
    // spec 10, "Le budget de rendu": setPixelRatio is 1, and the quality scale
    // only ever takes it down. (spec 10-39)
    const parts = stand();
    const context = createContext(parts.surface, {
      make: () => parts.renderer,
      repopulate: () => {},
    });
    resize(context, 1024, 768, 0.85);
    resize(context, 1024, 768, 3);
    expect(parts.ratios).toEqual([0.85, 1]);
    expect(parts.sizes).toEqual([
      [1024, 768],
      [1024, 768],
    ]);
  });
});

// ------------------------------------------------------------------ the budget

const SRC = fileURLToPath(new URL('..', import.meta.url));

/** Every file of `src/` that is not itself a test. */
const SOURCES = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => ({
    path: `src/${name.split('\\').join('/')}`,
    text: readFileSync(join(SRC, name), 'utf8'),
  }));

describe('the budget of the drawing', () => {
  it('holds exactly one WebGL context, and this file is where it is built', () => {
    // spec 10, "Le budget de rendu": contextes WebGL, exactement 1.
    // spec 10 "Les interdits": jamais un second contexte WebGL.
    const builders = SOURCES.filter((source) => source.text.includes('WebGLRenderer('));
    expect(builders.map((source) => source.path)).toEqual(['src/render/context.ts']);
    const built = builders[0].text.match(/new\s+THREE\.WebGLRenderer\s*\(/g) ?? [];
    expect(built.length).toBe(1);
  });

  it('sets a resolution in one place, and never off the screen it is given', () => {
    // spec 10, "Le budget de rendu": setPixelRatio is 1 — never the ratio the
    // device claims, which on an iPad is 2.
    const setters = SOURCES.filter((source) => /\.setPixelRatio\s*\(/.test(source.text));
    expect(setters.map((source) => source.path)).toEqual(['src/render/context.ts']);
    for (const source of SOURCES) expect(source.text).not.toMatch(/devicePixelRatio/);
  });
});
