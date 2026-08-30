/**
 * The hud read back against chapter 8. Nothing here draws and nothing opens a
 * page: the nodes are stood in for, exactly as the renderer is in
 * `context.test.ts`, so what is being read is the discipline of the writing and
 * the closed list of the five displays. (spec 10-45)
 *
 * Three of these are the ones the chapter is most easily lost on, and each is a
 * red error rather than a good intention: **nothing is written once a frame**
 * (spec 08-12), **there are five displays and no sixth** (spec 08-2, 08-3), and
 * **there is no red anywhere** (spec 08-19, 07-11).
 *
 * The sheet in `index.html` is read as a file, like the guard of `src/` reads
 * the sources: it carries the two dispositions and every colour, so it is where
 * those two are settled and where they are checked.
 *
 * Every figure below is written out from the spec and from nowhere else.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PriceBalance } from '../game/balance';
import {
  BADGES,
  CANNON,
  CONVEYOR,
  FLAME,
  REINFORCEMENT,
  type Hud,
  type HudRule,
  type Slab,
  bearArrow,
  createHud,
  loseSegments,
  reinforceBar,
  showNotch,
  strikeSegment,
  writeHud,
} from './hud';

// ------------------------------------------------------------- the stand-ins

interface Held extends Slab {
  readonly written: Map<string, string>;
}

function slab(): Held {
  const written = new Map<string, string>();
  return {
    className: '',
    textContent: null,
    written,
    style: {
      setProperty: (name: string, value: string) => {
        written.set(name, value);
      },
    },
  };
}

function page() {
  const nodes = new Map<string, Held>();
  const asked: string[] = [];
  const find = (name: string): Slab | null => {
    asked.push(name);
    let node = nodes.get(name);
    if (node === undefined) {
      node = slab();
      nodes.set(name, node);
    }
    return node;
  };
  const at = (name: string): Held => {
    const node = nodes.get(name);
    if (node === undefined) throw new Error(`no ${name}`);
    return node;
  };
  return { nodes, asked, find, at };
}

/** The five prices of chapter 6, which chapter 8 does nothing but show. */
const PRICES: PriceBalance = {
  cannon: 40, // spec 08, "Les quatre vignettes"
  tierTwo: 60,
  tierThree: 120,
  firebomb: 1, // three coins the armful, and it has no badge (spec 08-27)
  reinforcements: [50, 80, 120],
  reinforcementAgain: 120,
};

const RULE: HudRule = {
  segments: 10, // ten, whatever the notch (spec 08-13)
  pips: 5, // spec 08-20
  streets: 3, // three at most, in overtime (spec 08-36)
  few: 3, // three or fewer and the figure goes white (spec 08-40, 03-38)
  prices: PRICES,
};

/** From the mouth of a street to the face of the town hall, in blocks. (spec 02-13) */
const RAIL = 92;

/**
 * Where a walk down each rail comes to a stop: the face of the shed on street
 * one, four blocks short of the town hall, and the face of the town hall on the
 * other two. It is what an arrow fills against. (spec 03-45, 08-34)
 */
const STOP = new Float32Array([RAIL - 4, RAIL, RAIL]);

function state() {
  return {
    snapshot: {
      coins: 0,
      playerHp: 5,
      wave: 1,
      streets: new Uint8Array([1, 0, 0]), // street one from wave one (spec 03-28)
    },
    assault: {
      prepLeft: 0,
      toEnter: 0,
      zombies: {
        count: 0,
        street: new Uint8Array(60),
        progress: new Float32Array(60),
      },
      city: { rails: { faceAt: STOP } },
    },
  };
}

function stand(): { hud: Hud; sheet: ReturnType<typeof page> } {
  const sheet = page();
  return { hud: createHud(sheet.find, RULE), sheet };
}

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGE = readFileSync(`${ROOT}index.html`, 'utf8');

// ------------------------------------------------------ the five, and no sixth

/**
 * The five displays of the table of chapter 8, and every node each of them is
 * made of. A sixth display would have to add a line here, which is exactly the
 * decision 08-3 asks to be made out in the open.
 */
const FIVE: { [display: string]: string[] } = {
  townHallBar: ['notch', 'bar', ...run('seg', 10)],
  pips: run('pip', 5),
  purse: ['coins', ...run('badge', 4), ...run('price', 4)],
  arrows: run('arrow', 3),
  phase: ['phase', 'wave', 'prep', 'left'],
};

function run(name: string, held: number): string[] {
  const all: string[] = [];
  for (let i = 0; i < held; i += 1) all.push(`${name}${i}`);
  return all;
}

describe('the closed list of five', () => {
  it('reaches for the five displays of chapter 8 and for no sixth', () => {
    const { sheet } = stand();
    const wanted = Object.values(FIVE).flat().sort();
    expect(Object.keys(FIVE).length).toBe(5); // spec 08-2
    expect([...sheet.asked].sort()).toEqual(wanted);
  });

  it('finds every one of those nodes on the page', () => {
    for (const name of Object.values(FIVE).flat()) {
      expect(PAGE).toContain(`id="${name}"`);
    }
  });

  it('holds four badges and not one more', () => {
    // Nothing counts what has no ceiling, and what he carries rides over his
    // head. (spec 08-4, "Jamais un compteur de canons")
    const { hud } = stand();
    expect(hud.badges.length).toBe(BADGES);
    expect(BADGES).toBe(4);
  });
});

describe('what it never does', () => {
  const source = readFileSync(fileURLToPath(new URL('./hud.ts', import.meta.url)), 'utf8');

  it('costs no draw call, because it never touches the engine', () => {
    // spec 08-11: it is DOM and CSS over the canvas, never drawn in WebGL.
    expect(source).not.toMatch(/from\s*'three'/);
    expect(source).not.toMatch(/\bTHREE\b/);
  });

  it('names no colour of its own, so the sheet holds them all', () => {
    // spec 08-14, 08-19: one place to look for a red, and there is none there.
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgb\(/);
  });

  it('opens no page of its own', () => {
    // The nodes are handed over, so `src/app/` stays the one layer that knows a
    // browser at all. (spec 10-3)
    expect(source).not.toMatch(/\bdocument\b/);
    expect(source).not.toMatch(/\bwindow\b/);
  });
});

// --------------------------------------------------------- nothing once a frame

describe('what wakes it', () => {
  it('writes nothing at all on a frame where nothing has moved', () => {
    const { hud } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    writeHud(hud, held, false, across);
    const settled = hud.writes;
    for (let i = 0; i < 600; i += 1) writeHud(hud, held, false, across);
    expect(hud.writes).toBe(settled); // spec 08-12
  });

  it('writes once when a scalar moves, and not again', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);
    writeHud(hud, held, false, across);

    held.snapshot.coins = 40;
    const before = hud.writes;
    writeHud(hud, held, false, across);
    // The figure of the purse, and the one badge that lights with it.
    expect(hud.writes - before).toBe(2);
    expect(sheet.at('coins').textContent).toBe('40');

    const after = hud.writes;
    writeHud(hud, held, false, across);
    expect(hud.writes).toBe(after);
  });

  it('holds a gauge to a whole percent, so a hair of a step asks for nothing', () => {
    const { hud } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);
    held.assault.zombies.count = 1;
    held.assault.zombies.progress[0] = STOP[0] / 2;
    writeHud(hud, held, false, across);

    const settled = hud.writes;
    held.assault.zombies.progress[0] = STOP[0] / 2 + 0.01;
    writeHud(hud, held, false, across);
    expect(hud.writes).toBe(settled);
  });
});

// ------------------------------------------------------- the bar of the town hall

describe('the bar of the town hall', () => {
  it('holds ten segments at every notch', () => {
    for (let notch = 0; notch <= 3; notch += 1) {
      const { hud } = stand();
      showNotch(hud, notch, 120);
      expect(hud.segments.length).toBe(10); // spec 08-13
    }
  });

  it('says the notch by the stuff of its picto and never by a figure', () => {
    const { hud, sheet } = stand();
    const looks: string[] = [];
    // The page opens on the first stuff, so the walk starts on the second and
    // comes back to it at the end: the hud writes what has moved, never what
    // has not.
    for (const notch of [1, 2, 3, 0]) {
      showNotch(hud, notch, 120);
      looks.push(sheet.at('notch').className);
    }
    expect(looks).toEqual(['n1', 'n2', 'n3', 'n0']); // spec 08-15
    expect(sheet.at('notch').textContent).toBe(null);
  });

  it('lights the segment being eaten, and starts the flash again on the next blow', () => {
    const { hud, sheet } = stand();
    strikeSegment(hud);
    expect(sheet.at('seg9').className).toBe('seg a'); // spec 08-16
    strikeSegment(hud);
    expect(sheet.at('seg9').className).toBe('seg b');
  });

  it('takes the segments that are gone to almost black, and nothing else', () => {
    const { hud, sheet } = stand();
    loseSegments(hud, 7); // spec 08-18
    expect(sheet.at('seg9').className).toBe('seg gone');
    expect(sheet.at('seg8').className).toBe('seg gone');
    expect(sheet.at('seg7').className).toBe('seg gone');
    expect(sheet.at('seg6').className).toBe('');
    // And the blow that follows lights the one that is now being eaten.
    strikeSegment(hud);
    expect(sheet.at('seg6').className).toBe('seg a');
  });

  it('fills white from left to right when a reinforcement is bought', () => {
    const { hud, sheet } = stand();
    loseSegments(hud, 6);
    reinforceBar(hud, 1, 80); // spec 08-17
    for (let i = 0; i < 10; i += 1) expect(sheet.at(`seg${i}`).className).not.toContain('gone');
    expect(sheet.at('bar').className).toBe('a');
    expect(sheet.at('notch').className).toBe('n1');
    expect(sheet.at('price3').textContent).toBe('80'); // the notch to come (spec 08-26)

    loseSegments(hud, 4);
    reinforceBar(hud, 2, 120);
    expect(sheet.at('bar').className).toBe('b'); // the other name starts it again
  });
});

// ----------------------------------------------------------------- the pips

describe('the pips', () => {
  it('hollows one lost and flashes one that comes back', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.snapshot.playerHp = 3;
    writeHud(hud, held, false, across);
    expect(sheet.at('pip4').className).toBe('pip gone'); // spec 08-21
    expect(sheet.at('pip3').className).toBe('pip gone');
    expect(sheet.at('pip2').className).toBe('');

    held.snapshot.playerHp = 4;
    writeHud(hud, held, false, across);
    expect(sheet.at('pip3').className).toBe('pip back');
    expect(sheet.at('pip4').className).toBe('pip gone');
  });

  it('holds five of them, discrete, and never a bar', () => {
    const { hud } = stand();
    expect(hud.pips.length).toBe(5); // spec 08-20, 08-22
  });
});

// ---------------------------------------------------------------- the purse

describe('the purse', () => {
  it('carries the four prices in the one fixed order, in figures', () => {
    const { hud, sheet } = stand();
    showNotch(hud, 0, 50);
    expect(sheet.at('price0').textContent).toBe('40'); // cannon
    expect(sheet.at('price1').textContent).toBe('60'); // the flame, tier two
    expect(sheet.at('price2').textContent).toBe('120'); // the conveyor, tier three
    expect(sheet.at('price3').textContent).toBe('50'); // the notch to come
    expect([CANNON, FLAME, CONVEYOR, REINFORCEMENT]).toEqual([0, 1, 2, 3]); // spec 08-23
  });

  it('gives the armful no badge at all', () => {
    const { hud } = stand();
    showNotch(hud, 0, 50);
    // Three coins, payable off the first zombie felled, and it would teach
    // nothing. (spec 08-27)
    expect([...hud.asks]).toEqual([40, 60, 120, 50]);
    expect([...hud.asks]).not.toContain(3);
  });

  it('lights what the purse can pay for and puts out what it cannot', () => {
    const { hud, sheet } = stand();
    showNotch(hud, 0, 50);
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.snapshot.coins = 39;
    writeHud(hud, held, false, across);
    expect(sheet.at('badge0').className).toBe('');

    held.snapshot.coins = 40;
    writeHud(hud, held, false, across);
    expect(sheet.at('badge0').className).toBe('badge lit'); // spec 08-24, 08-25
    expect(sheet.at('badge1').className).toBe('');

    held.snapshot.coins = 120;
    writeHud(hud, held, false, across);
    for (const name of ['badge0', 'badge1', 'badge2', 'badge3']) {
      expect(sheet.at(name).className).toBe('badge lit');
    }

    held.snapshot.coins = 0;
    writeHud(hud, held, false, across);
    expect(sheet.at('badge3').className).toBe('badge');
  });

  it('contributes the figure going up and the badges lighting to a payment, and nothing else', () => {
    // spec 08-89: the payment that closes an assault is seen **in the world** —
    // the spray of shards from the town hall — and the hud adds the figure of
    // the purse going up and whatever badge lights with it. No sixth display, no
    // tally, no figure floating over a body. (spec 06-10, 06-16, 07-37)
    const { hud, sheet } = stand();
    showNotch(hud, 0, 50);
    const held = state();
    const across = new Float32Array(RULE.streets);
    writeHud(hud, held, false, across);

    const untouched = ['phase', 'wave', 'prep', 'left', 'seg9', 'pip4', 'arrow0', 'notch'];
    const before = untouched.map((name) => sheet.at(name).className);
    const written = hud.writes;

    held.snapshot.coins = 43; // what the payment of the second assault carries it to
    writeHud(hud, held, false, across);

    expect(hud.writes - written).toBe(2); // the figure, and the one badge
    expect(sheet.at('coins').textContent).toBe('43');
    expect(sheet.at('badge0').className).toBe('badge lit');
    expect(untouched.map((name) => sheet.at(name).className)).toEqual(before);
  });

  it('lights the badge of the cannon in white, which is half of what says climb', () => {
    // spec 08-87: at the first cannon he can pay for, the badge of the cannon
    // lights white **and** every ladder of the city starts to beat. The badge is
    // this file's half of it; the ladders are `render/city.ts`'s.
    // spec 08-25: a badge that lights comes in on a white flash of 400 ms.
    expect(PAGE).toMatch(/@keyframes lit\s*\{[\s\S]*?var\(--white\)/);
    expect(PAGE).toMatch(/\.badge\.lit\s*\{[\s\S]*?animation:\s*lit 400ms/);
  });
});

// --------------------------------------------------------------- the arrows

describe('the street arrows', () => {
  it('holds one per active street, and never lets one go', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').className).toBe('arrow on'); // spec 08-31
    expect(sheet.at('arrow1').className).toBe('');

    held.snapshot.streets[1] = 1;
    writeHud(hud, held, false, across);
    expect(sheet.at('arrow1').className).toBe('arrow on');

    // Nothing takes one away: it is there for as long as the street is active.
    for (let i = 0; i < 60; i += 1) writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').className).toBe('arrow on');
    expect(sheet.at('arrow1').className).toBe('arrow on');
  });

  it('fills as the head of the column comes down the street', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').written.get('--gauge')).toBe('0'); // just walked in

    held.assault.zombies.count = 2;
    held.assault.zombies.progress[0] = STOP[0] / 4;
    held.assault.zombies.progress[1] = STOP[0] / 2; // the head of the column
    writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').written.get('--gauge')).toBe('50'); // spec 08-34

    held.assault.zombies.progress[1] = STOP[0]; // at the face of the shed (spec 03-45)
    writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').written.get('--gauge')).toBe('100'); // at the town hall
  });

  it('goes flat against the border it lies beyond, and over its gateway otherwise', () => {
    const { hud, sheet } = stand();
    const held = state();
    held.snapshot.streets[1] = 1;
    held.snapshot.streets[2] = 1;
    const across = new Float32Array([0, -3, 3]);

    writeHud(hud, held, false, across);
    expect(sheet.at('arrow0').written.get('--at')).toBe('50'); // straight ahead
    expect(sheet.at('arrow1').written.get('--at')).toBe('0'); // spec 08-32
    expect(sheet.at('arrow2').written.get('--at')).toBe('100');
  });

  it('lives in the top two thirds of the screen and never lower', () => {
    // spec 08-35: the sheet is what holds it there, so the sheet is what says so.
    expect(PAGE).toMatch(/#arrows\s*\{[^}]*height:\s*66\.6%/);
    expect(PAGE).toMatch(/#arrows\s*\{[^}]*top:\s*0/);
  });
});

// ---------------------------------------------------- a street opening

describe('the birth of an arrow', () => {
  it('is born on the fact of a gateway lighting, and beats the whole preparation', () => {
    // spec 08-85: from the first second of the preparation that comes before it,
    // the arrow of the street is born white, grows twice as large over 2 s, takes
    // its colour, and beats for the whole of that preparation.
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.snapshot.streets[1] = 1;
    bearArrow(hud, 1);
    writeHud(hud, held, true, across);
    expect(sheet.at('arrow1').className).toBe('arrow on born');

    // It stays borne for as long as that preparation runs, and writes nothing
    // more while it does. (spec 08-12)
    const written = hud.writes;
    for (let i = 0; i < 60; i += 1) writeHud(hud, held, true, across);
    expect(sheet.at('arrow1').className).toBe('arrow on born');
    expect(hud.writes).toBe(written);
  });

  it('takes the plain look when the assault opens, and is never born twice', () => {
    // spec 08-85: the beat runs the preparation and not a second longer — a beat
    // that outlived the moment would stop announcing anything. And a street opens
    // once. (spec 03-28)
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.snapshot.streets[1] = 1;
    bearArrow(hud, 1);
    writeHud(hud, held, true, across);
    writeHud(hud, held, false, across);
    expect(sheet.at('arrow1').className).toBe('arrow on');

    // The next preparation comes, and nothing is born again.
    writeHud(hud, held, true, across);
    expect(sheet.at('arrow1').className).toBe('arrow on');
  });

  it('is born whether its street is on screen or not', () => {
    // spec 08-86: it is the birth that is the message, so nothing here asks
    // where the camera happens to be pointing.
    const { hud, sheet } = stand();
    const held = state();
    held.snapshot.streets[1] = 1;
    bearArrow(hud, 1);
    writeHud(hud, held, true, new Float32Array([0, 0, 0])); // its gateway dead ahead
    expect(sheet.at('arrow1').className).toBe('arrow on born');
    expect(sheet.at('arrow1').written.get('--at')).toBe('50');
  });

  it('grows twice as large over two seconds and beats at the rate of the hud', () => {
    // spec 08-85: the sheet carries every look and every length, here as
    // everywhere else — and the beat is the 250 ms the figure of what is left
    // already answers to, so the hud has one beat and not two. (spec 08-14, 08-40)
    expect(PAGE).toMatch(/@keyframes born\s*\{[\s\S]*?scale\(2\)/);
    expect(PAGE).toMatch(/@keyframes born\s*\{[\s\S]*?background:\s*var\(--white\)/);
    expect(PAGE).toMatch(/\.arrow\.born\s*\{[\s\S]*?born 2s/);
    expect(PAGE).toMatch(/\.arrow\.born\s*\{[\s\S]*?beating 250ms 2s/);
  });
});

// ---------------------------------------------------------- the phase strip

describe('the phase strip', () => {
  it('carries the number of the wave, and never a total', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.snapshot.wave = 7;
    writeHud(hud, held, false, across);
    expect(sheet.at('wave').textContent).toBe('7'); // spec 08-37, 08-38

    held.snapshot.wave = 14; // overtime, and it has no ceiling either
    writeHud(hud, held, false, across);
    expect(sheet.at('wave').textContent).toBe('14');
  });

  it('never carries two things at once in its reserved height', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.assault.prepLeft = 30;
    writeHud(hud, held, true, across);
    expect(sheet.at('phase').className).toBe('prep'); // spec 08-39
    expect(sheet.at('left').textContent).toBe(null); // nothing has been put there

    held.assault.prepLeft = 15;
    writeHud(hud, held, true, across);
    expect(sheet.at('prep').written.get('--drain')).toBe('50');

    held.assault.toEnter = 12;
    writeHud(hud, held, false, across);
    expect(sheet.at('phase').className).toBe('assault');
    expect(sheet.at('left').textContent).toBe('12');
    // And the sheet is what shows one and hides the other. (spec 08-39)
    expect(PAGE).toMatch(/#phase\.prep #left,\s*#phase\.assault #prep\s*\{\s*display:\s*none/);
  });

  it('takes the large figure to white at three or fewer', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    held.assault.toEnter = 4;
    writeHud(hud, held, false, across);
    expect(sheet.at('left').className).toBe('');

    held.assault.toEnter = 3;
    writeHud(hud, held, false, across);
    expect(sheet.at('left').className).toBe('few'); // spec 08-40, 03-38

    held.assault.toEnter = 0;
    writeHud(hud, held, false, across);
    expect(sheet.at('left').className).toBe('');
  });

  it('runs the bar down over what the preparation opened on', () => {
    const { hud, sheet } = stand();
    const held = state();
    const across = new Float32Array(RULE.streets);

    // Forty seconds before waves two to four, thirty from there on: the hud
    // knows neither, and reads what the preparation opened on. (spec 01-15)
    held.assault.prepLeft = 40;
    writeHud(hud, held, true, across);
    expect(sheet.at('prep').written.get('--drain')).toBe('100');
    held.assault.prepLeft = 10;
    writeHud(hud, held, true, across);
    expect(sheet.at('prep').written.get('--drain')).toBe('25');

    // The next one opens on thirty, and full is thirty. (spec 01-15)
    held.assault.prepLeft = 0;
    writeHud(hud, held, false, across);
    held.assault.prepLeft = 30;
    writeHud(hud, held, true, across);
    expect(sheet.at('prep').written.get('--drain')).toBe('100');
  });
});

// ------------------------------------------------------------ what the sheet says

/** The hue of a colour in degrees, and how saturated it is, from its code. */
function hueOf(code: string): { hue: number; sat: number } {
  const r = Number.parseInt(code.slice(1, 3), 16) / 255;
  const g = Number.parseInt(code.slice(3, 5), 16) / 255;
  const b = Number.parseInt(code.slice(5, 7), 16) / 255;
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const span = high - low;
  if (span === 0) return { hue: 0, sat: 0 };
  let hue = 0;
  if (high === r) hue = 60 * (((g - b) / span + 6) % 6);
  else if (high === g) hue = 60 * ((b - r) / span + 2);
  else hue = 60 * ((r - g) / span + 4);
  return { hue, sat: span / high };
}

describe('the sheet beside the page', () => {
  it('holds not one red, here or anywhere', () => {
    const codes = PAGE.match(/#[0-9a-fA-F]{6}(?![0-9a-zA-Z])/g) ?? [];
    expect(codes.length).toBeGreaterThan(10);
    const reds = codes.filter((code) => {
      const { hue, sat } = hueOf(code);
      return sat > 0.15 && (hue < 20 || hue > 340);
    });
    expect(reds).toEqual([]); // spec 08-19, 07-11
    expect(PAGE).not.toMatch(/:\s*(red|crimson|firebrick|tomato|indianred|orangered)\b/);
  });

  it('settles its two dispositions on the ratio of the window and never on the device', () => {
    expect(PAGE).toContain('min-aspect-ratio: 1/1'); // spec 08-8
    // Never the way the device is held: it locks on no iPad, and Split View
    // hands over any proportion at all. (spec 08-8, "Les deux dispositions")
    expect(PAGE).not.toMatch(/orientation\s*:/);
    // And the sheet settles both on its own, so nothing holds the game up while
    // it lays itself out again. (spec 08-9)
    expect(PAGE).not.toContain('matchMedia');
  });

  it('sizes everything as a share of the smaller side of the window, bounded in pixels', () => {
    // The table of chapter 8, written out here from the spec.
    expect(PAGE).toContain('clamp(48px, 12vmin, 96px)'); // the large figure
    expect(PAGE).toContain('clamp(32px, 8vmin, 64px)'); // an arrow
    expect(PAGE).toContain('clamp(28px, 6vmin, 56px)'); // a badge
    expect(PAGE).toContain('clamp(14px, 3.5vmin, 28px)'); // a pip
    expect(PAGE).toContain('clamp(200px, 40vw, 420px)'); // the bar, 40 % of the width
  });

  it('keeps every display clear of a border by the safe area and sixteen pixels', () => {
    expect(PAGE).toContain('--edge: 16px'); // spec 08-50
    expect(PAGE).toContain('env(safe-area-inset-top)');
    expect(PAGE).toContain('env(safe-area-inset-left)');
    expect(PAGE).toContain('env(safe-area-inset-right)');
  });

  it('loads no image of its own, and lets no press through', () => {
    expect(PAGE).not.toContain('<img');
    expect(PAGE).not.toContain('url(');
    expect(PAGE).toMatch(/#hud\s*\{[^}]*pointer-events:\s*none/); // spec 08-5
  });
});
