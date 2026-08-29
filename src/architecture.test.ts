/**
 * The architecture guard. It reads the files and fails on anything the spec
 * forbids, so the rules of chapter 10 are runnable and not merely written down.
 *
 * It covers, in order: the boundary (spec 10-1 to 10-7), the storage rules
 * (spec 10-7, 10-32, 10-33) and the words ADR-0002 forbids (spec 10-8, 10-9).
 *
 * This file is the only one in `src/` that sits outside a scanned folder: it
 * quotes every forbidden word, so scanning itself would fail on the first line.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ADR_WORDS = 'docs/adr/0002-code-en-anglais-conception-en-francais.md';

/** Every folder the guard reads. `src/audio` and `bench` arrive with their chapters. */
const SCANNED = ['src/game', 'src/render', 'src/app', 'src/audio', 'bench'];

/** The folders that obey the "imports nothing" rule. (spec 10-1, 10-5) */
const PURE = ['src/game', 'bench'];

/** Where a snapshot may touch a disk, and nowhere else. (spec 10-7) */
const STORAGE_FILE = 'src/app/storage.ts';

/**
 * Where a run is composed. Spec 10-15 forbids a module of rules to import the
 * balance and writes the call that hands it over — `createGame(BALANCE)` — so
 * that call has one home, and this is the list of the homes it may have.
 */
const ROOTS = ['src/app/main.ts'];

const STORAGE_APIS = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'openDatabase',
  'caches',
  'cookie',
];

/** What `src/game/` and `bench/` may not name. (spec 10-1) */
const IMPURE = [
  'Math.random',
  'Date.now',
  'performance',
  'window',
  'document',
  'navigator',
  'requestAnimationFrame',
  'fetch',
  ...STORAGE_APIS,
];

// ---------------------------------------------------------------- the files

interface Source {
  /** Path from the repository root, with forward slashes. */
  path: string;
  /** Which of SCANNED it was found under. */
  folder: string;
  text: string;
}

function walk(dir: string, found: string[]): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found; // a folder that has not arrived yet is not a failure
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (entry.endsWith('.ts')) found.push(full);
  }
  return found;
}

const SOURCES: Source[] = SCANNED.flatMap((folder) =>
  walk(join(ROOT, folder), []).map((full) => ({
    path: relative(ROOT, full).split('\\').join('/'),
    folder,
    text: readFileSync(full, 'utf8'),
  })),
);

const isTest = (path: string): boolean => path.endsWith('.test.ts');
const inFolders = (source: Source, folders: string[]): boolean =>
  folders.some((folder) => source.folder === folder);

// -------------------------------------------------------------- the imports

interface Import {
  /** The whole statement, so `import type` can be told apart. */
  statement: string;
  /** What sits between the quotes. */
  from: string;
}

function importsOf(text: string): Import[] {
  const found: Import[] = [];
  const withFrom = /(?:^|\n)\s*(?:import|export)\b([^;\n]*?)\bfrom\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(withFrom)) {
    found.push({ statement: `import${match[1]}`, from: match[2] ?? '' });
  }
  const bare = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(bare)) {
    found.push({ statement: 'import', from: match[1] ?? '' });
  }
  const dynamic = /\bimport\s*\(\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(dynamic)) {
    found.push({ statement: 'import(', from: match[1] ?? '' });
  }
  return found;
}

const isTypeOnly = (statement: string): boolean => /^import\s+type\b/.test(statement);

/** Which layer a specifier points at, or null when it leaves the project. */
function layerOf(source: Source, from: string): string | null {
  if (!from.startsWith('.')) return null;
  const resolved = join(source.path, '..', from).split('\\').join('/');
  for (const layer of ['src/game', 'src/render', 'src/app', 'src/audio']) {
    if (resolved === layer || resolved.startsWith(`${layer}/`)) return layer;
  }
  return null;
}

// ---------------------------------------------------------------- the words

interface Forbidden {
  /** Matched against every name the code writes. */
  anywhere: Set<string>;
  /** Matched against whole names only — the rows ADR-0002 marks "seul". */
  whole: Set<string>;
  /** Matched under `bench/` only — the rows ADR-0002 scopes there. */
  bench: Set<string>;
}

function readForbidden(): Forbidden {
  const adr = readFileSync(join(ROOT, ADR_WORDS), 'utf8');
  const table = adr.split('## Mots interdits dans le code')[1] ?? '';
  const forbidden: Forbidden = { anywhere: new Set(), whole: new Set(), bench: new Set() };

  for (const line of table.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line.includes('Ne jamais')) continue;
    const cell = line.split('|')[1] ?? '';
    const quoted = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
    if (quoted.length === 0) continue;

    // "(au banc)" and "(profondeur d'aventure)" are the two rows ADR-0002 scopes.
    if (/banc|profondeur/.test(cell)) {
      for (const word of quoted) forbidden.bench.add(word);
      continue;
    }
    // "`damage` seul", "`texture` seul": only the word before "seul" is whole-name.
    const before = cell.split('seul')[0] ?? '';
    const wholeOnly = cell.includes('seul')
      ? [...before.matchAll(/`([^`]+)`/g)].pop()?.[1]
      : undefined;
    for (const word of quoted) {
      if (word === wholeOnly) forbidden.whole.add(word);
      else forbidden.anywhere.add(word);
    }
  }
  return forbidden;
}

const FORBIDDEN = readForbidden();

/** A compound like `spawnRate` is only ever a whole name; a plain word is a part. */
const isCompound = (word: string): boolean => /[A-Z]/.test(word);

function partsOf(name: string): string[] {
  const pieces = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_$]+/)
    .filter(Boolean)
    .map((piece) => piece.toLowerCase());
  const all: string[] = [];
  for (const piece of pieces) {
    all.push(piece);
    if (piece.endsWith('ies') && piece.length > 4) all.push(`${piece.slice(0, -3)}y`);
    else if (piece.endsWith('s') && !piece.endsWith('ss') && piece.length > 3)
      all.push(piece.slice(0, -1));
  }
  return all;
}

/**
 * The names a file writes — what it calls on someone else's object is left
 * alone, because ADR-0002 forbids `fog`, `depth` and `texture` precisely
 * because Three.js already owns them. (spec 10-9)
 */
function namesOf(text: string): string[] {
  const ours = text
    .replace(/(?:^|\n)\s*import[^;\n]*from\s*['"]three['"]\s*;?/g, ' ')
    .replace(/\.\s*[A-Za-z_$][\w$]*/g, ' ');
  return ours.match(/[A-Za-z_$][\w$]*/g) ?? [];
}

function offendingWords(source: Source): string[] {
  const scoped = source.folder === 'bench' ? FORBIDDEN.bench : new Set<string>();
  const hits = new Set<string>();
  for (const name of namesOf(source.text)) {
    const flat = name.toLowerCase().replace(/_/g, '');
    for (const set of [FORBIDDEN.whole, scoped]) {
      for (const word of set) if (word.toLowerCase() === flat) hits.add(word);
    }
    for (const word of FORBIDDEN.anywhere) {
      if (isCompound(word)) {
        if (word.toLowerCase() === flat) hits.add(word);
      } else if (partsOf(name).includes(word.toLowerCase())) hits.add(word);
    }
    for (const word of scoped) {
      if (!isCompound(word) && partsOf(name).includes(word.toLowerCase())) hits.add(word);
    }
  }
  return [...hits];
}

// ----------------------------------------------------------------- the tests

describe('the guard has something to bite on', () => {
  it('reads the forbidden words out of ADR-0002', () => {
    const total = FORBIDDEN.anywhere.size + FORBIDDEN.whole.size + FORBIDDEN.bench.size;
    expect(total).toBeGreaterThanOrEqual(60);
    expect(FORBIDDEN.anywhere).toContain('enemy');
    expect(FORBIDDEN.anywhere).toContain('gameObject');
    expect(FORBIDDEN.whole).toEqual(new Set(['damage', 'texture']));
    expect(FORBIDDEN.bench).toEqual(new Set(['sweep', 'depth']));
  });

  it('catches what it is meant to catch', () => {
    const forged = (folder: string, text: string): Source => ({ path: 'forged.ts', folder, text });
    expect(offendingWords(forged('src/game', 'const enemyCount = 0;'))).toContain('enemy');
    expect(offendingWords(forged('src/game', 'let spawnRate = 1;'))).toContain('spawnRate');
    expect(offendingWords(forged('src/game', 'const damage = 1;'))).toContain('damage');
    expect(offendingWords(forged('src/game', 'const swordHits = 1;'))).toEqual([]);
    expect(offendingWords(forged('src/game', 'const sweepAngle = 120;'))).toEqual([]);
    expect(offendingWords(forged('bench', 'const sweepAngle = 120;'))).toContain('sweep');
    expect(offendingWords(forged('src/render', 'material.depthTest = false;'))).toEqual([]);
    expect(offendingWords(forged('src/render', 'const depth = 8;'))).toEqual([]);
  });
});

describe('the boundary', () => {
  it('keeps the rules pure: no engine, no clock, no free chance, no disk', () => {
    const broken: string[] = [];
    for (const source of SOURCES) {
      if (!inFolders(source, PURE)) continue;
      for (const banned of IMPURE) {
        const pattern = new RegExp(`\\b${banned.replace('.', '\\s*\\.\\s*')}\\b`);
        if (pattern.test(source.text)) broken.push(`${source.path} names ${banned}`);
      }
      for (const imported of importsOf(source.text)) {
        if (imported.from === 'three' || imported.from.startsWith('three/')) {
          broken.push(`${source.path} imports three`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('lets the layers point one way only', () => {
    const allowed: Record<string, string[]> = {
      'src/game': ['src/game'],
      'src/render': ['src/render', 'src/game'],
      'src/app': ['src/app', 'src/game', 'src/render', 'src/audio'],
      'src/audio': ['src/audio', 'src/game'],
      bench: ['bench', 'src/game'],
    };
    const broken: string[] = [];
    for (const source of SOURCES) {
      for (const imported of importsOf(source.text)) {
        const layer = layerOf(source, imported.from);
        if (layer === null) continue;
        if (!(allowed[source.folder] ?? []).includes(layer)) {
          broken.push(`${source.path} imports ${layer}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('lets the renderer and the audio take types from the rules, never functions', () => {
    const broken: string[] = [];
    for (const source of SOURCES) {
      if (!inFolders(source, ['src/render', 'src/audio'])) continue;
      for (const imported of importsOf(source.text)) {
        if (layerOf(source, imported.from) !== 'src/game') continue;
        if (!isTypeOnly(imported.statement)) {
          broken.push(`${source.path} takes more than types from ${imported.from}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('injects the balance instead of importing it, outside the roots of a run', () => {
    const broken: string[] = [];
    for (const source of SOURCES) {
      if (isTest(source.path) || source.path === 'src/game/balance.ts') continue;
      if (ROOTS.includes(source.path)) continue;
      for (const imported of importsOf(source.text)) {
        const reachesBalance = /(^|\/)balance$/.test(imported.from);
        if (reachesBalance && !isTypeOnly(imported.statement)) {
          broken.push(`${source.path} imports the balance instead of taking it`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('the storage', () => {
  it('touches a disk in one file and nowhere else', () => {
    const broken: string[] = [];
    for (const source of SOURCES) {
      if (source.path === STORAGE_FILE) continue;
      for (const api of STORAGE_APIS) {
        if (new RegExp(`\\b${api}\\b`).test(source.text)) {
          broken.push(`${source.path} names ${api}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('holds one key and exactly three doors, once that file arrives', () => {
    const storage = SOURCES.find((source) => source.path === STORAGE_FILE);
    if (storage === undefined) return; // it lands with the chapter that needs it

    const keys = [...storage.text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*['"]/g)];
    expect(keys.length).toBe(1);
    expect(storage.text).toContain("'apocalypse-zombie:snapshot'");
    expect(storage.text).not.toMatch(/version/i);

    const exported = [...storage.text.matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1],
    );
    expect(exported.sort()).toEqual(['clearSnapshot', 'readSnapshot', 'writeSnapshot']);
    for (const door of exported) {
      expect(storage.text).toMatch(new RegExp(`function\\s+${door}[\\s\\S]*?try\\s*{`));
    }
  });

  it('never listens for unload', () => {
    const broken = SOURCES.filter((source) => /\bunload\b/.test(source.text)).map((s) => s.path);
    expect(broken).toEqual([]);
  });
});

describe('the words', () => {
  it('writes only what ADR-0002 allows', () => {
    const broken: string[] = [];
    for (const source of SOURCES) {
      const hits = offendingWords(source);
      if (hits.length > 0) broken.push(`${source.path}: ${hits.sort().join(', ')}`);
    }
    expect(broken).toEqual([]);
  });
});
