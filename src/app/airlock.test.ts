/**
 * The Sas read back against chapter 8. Nothing here opens a page and nothing
 * draws: the nodes are stood in for, exactly as the renderer is in
 * `context.test.ts` and the hud's nodes are in `hud.test.ts`, so what is being
 * read is the behaviour and not a picture. (spec 10-45)
 *
 * Four of these are the ones the chapter is most easily lost on, and each is a
 * red error rather than a good intention: **there is one screen and no second**
 * (spec 08-52), **it carries not one line of text and not one setting** (spec
 * 08-55, 08-60), **nothing ever resumes on its own** (spec 08-61), and **a new
 * game is never one plain press away while a game is in hand** (spec 08-56).
 *
 * The sheet in `index.html` is read as a file, like the guard of `src/` reads
 * the sources: it carries the veil, the two doors and the ring, so it is where
 * those are settled and where they are checked.
 *
 * Every figure below is written out from the spec and from nowhere else.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  type Airlock,
  type AirlockHooks,
  HOLD,
  LETGO,
  NARROW,
  type PressFact,
  type Slab,
  airlockFrame,
  createAirlock,
  leaveAirlock,
  openAirlock,
  pressAirlock,
  senseWidth,
} from './airlock';
import type { PadReading } from './gamepad';

// ------------------------------------------------------------- the stand-ins

/** One node of the page, which keeps what was written on it and its handlers. */
class Stand implements Slab {
  className = '';
  textContent: string | null = null;
  readonly handlers = new Map<string, (fact: PressFact) => void>();

  addEventListener(kind: string, handler: (fact: PressFact) => void): void {
    this.handlers.set(kind, handler);
  }

  press(kind: string): void {
    this.handlers.get(kind)?.({ preventDefault: () => {} });
  }
}

/** A still picture of a pad, with the buttons named down. */
function reading(down: readonly number[]): PadReading {
  const buttons: { pressed: boolean }[] = [];
  for (let i = 0; i < 17; i += 1) buttons.push({ pressed: down.includes(i) });
  return { axes: [0, 0, 0, 0], buttons };
}

const A = 0;
const B = 1;
const X = 2;
const START = 9;

interface Bench {
  airlock: Airlock;
  nodes: Map<string, Stand>;
  /** What each hook was asked for, in the order it was asked. */
  said: string[];
  /** What the next reading of the pad hands back. */
  pad: { held: PadReading | null };
  /** Whether there is a game to resume, which the caller answers. (spec 08-57) */
  game: { standing: boolean };
}

function bench(): Bench {
  const nodes = new Map<string, Stand>();
  for (const name of ['airlock', 'resume', 'onwave', 'fresh', 'hatch']) {
    nodes.set(name, new Stand());
  }
  const said: string[] = [];
  const pad: { held: PadReading | null } = { held: null };
  const game = { standing: true };
  const hooks: AirlockHooks = {
    freeze: () => said.push('freeze'),
    thaw: () => said.push('thaw'),
    renew: () => said.push('renew'),
    pads: () => {
      said.push('pads');
      return pad.held;
    },
    wave: () => 7,
    standing: () => game.standing,
    sound: () => said.push('sound'),
    awake: () => said.push('awake'),
  };
  const airlock = createAirlock((name) => nodes.get(name) ?? null, hooks);
  return { airlock, nodes, said, pad, game };
}

/** Runs a run of frames, one every sixtieth of a second, up to `span` ms. */
function frames(airlock: Airlock, span: number, from = 0): void {
  for (let at = from; at <= from + span; at += 1000 / 60) airlockFrame(airlock, at);
}

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGE = readFileSync(`${ROOT}index.html`, 'utf8');
const SOURCE = readFileSync(fileURLToPath(new URL('./airlock.ts', import.meta.url)), 'utf8');

/** The block of the page the Sas is written in, tags and all. */
const BLOCK = PAGE.slice(PAGE.indexOf('<div id="airlock"'), PAGE.indexOf('</body>'));

// --------------------------------------------------------- the one screen

describe('the one screen there is', () => {
  it('is carried by the page, doors, ring and little door', () => {
    // spec 08-52, 08-56, 08-59: one screen, two doors, and the little door
    // that asks for it.
    for (const name of ['airlock', 'resume', 'onwave', 'fresh', 'ring', 'hatch']) {
      expect(PAGE).toContain(`id="${name}"`);
    }
    expect(BLOCK.length).toBeGreaterThan(0);
  });

  it('carries not one line of text', () => {
    // spec 08-55: the Sas carries no text at all — the number of the wave is a
    // figure, and a figure reads without knowing how to read. (spec 08-29, 01-30)
    const words = BLOCK.replace(/<[^>]*>/g, ' ').replace(/[\s\d]/g, '');
    expect(words).toBe('');
  });

  it('carries no setting at all', () => {
    // spec 08-60: no volume, no quality, no language — and the quality of the
    // drawing is settled on its own and never touches the simulation. (spec 10-39)
    expect(BLOCK).not.toMatch(/<(input|select|option|label|textarea)\b/i);
    expect(BLOCK).not.toMatch(/type="range"/i);
  });

  it('names no colour of its own, so the sheet holds them all', () => {
    // spec 08-19, 07-11: one place to look for a red, and there is none there.
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SOURCE).not.toMatch(/\brgb\(/);
  });

  it('never draws, because it is DOM over the canvas like the hud', () => {
    // spec 08-11: nothing over the world costs a draw call.
    expect(SOURCE).not.toMatch(/from\s*'three'/);
  });
});

// ------------------------------------------------------- what freezes behind

describe('the game behind it', () => {
  it('freezes when it opens and runs again on the press that leaves', () => {
    // spec 08-55, 08-68: it darkens and freezes behind it, and time never
    // crosses it.
    const { airlock, said } = bench();
    openAirlock(airlock);
    expect(said).toContain('freeze');
    expect(said).not.toContain('thaw');
    leaveAirlock(airlock);
    expect(said).toContain('thaw');
  });

  it('never resumes on its own, however long it stands open', () => {
    // spec 08-61: no resuming is automatic, and it is always a press that
    // leaves.
    const { airlock, said } = bench();
    openAirlock(airlock);
    frames(airlock, 60000);
    expect(airlock.open).toBe(true);
    expect(said).not.toContain('thaw');
  });

  it('asks the browser for the pads every frame it stands open', () => {
    // spec 08-54: without that reading, `gamepadconnected` never fires at all.
    const { airlock, said } = bench();
    openAirlock(airlock);
    for (let i = 0; i < 5; i += 1) airlockFrame(airlock, i * 16);
    expect(said.filter((one) => one === 'pads').length).toBe(5);
  });
});

// ------------------------------------------------------------- the two doors

describe('the two doors', () => {
  it('shows both when there is a game to resume, and the wave it stands at', () => {
    // spec 08-56: Reprendre carries the town hall and the number of the wave in
    // a large figure, and it is the one put forward by default.
    const { airlock, nodes } = bench();
    openAirlock(airlock);
    expect(nodes.get('airlock')?.className).toBe('open');
    expect(nodes.get('onwave')?.textContent).toBe('7');
  });

  it('shows the one door of a new game alone when there is nothing to resume', () => {
    // spec 08-57, 08-63: alone and centred, and a plain press does.
    const { airlock, nodes, said, game } = bench();
    game.standing = false;
    openAirlock(airlock);
    expect(nodes.get('airlock')?.className).toBe('open alone');
    nodes.get('fresh')?.press('pointerdown');
    expect(said).toContain('renew');
    expect(airlock.open).toBe(false);
  });

  it('resumes on a plain press of the first door', () => {
    // spec 08-56: Reprendre, on a plain press.
    const { airlock, nodes, said } = bench();
    openAirlock(airlock);
    nodes.get('resume')?.press('pointerdown');
    expect(airlock.open).toBe(false);
    expect(said).not.toContain('renew');
  });

  it('never opens a new game on a plain press while a game is in hand', () => {
    // spec 08-56, and "Jamais une nouvelle partie lancée d'un appui simple
    // quand une partie est en cours": two large doors and a finger that slips.
    const { airlock, nodes, said } = bench();
    openAirlock(airlock);
    nodes.get('fresh')?.press('pointerdown');
    nodes.get('fresh')?.press('pointerup');
    expect(said).not.toContain('renew');
    expect(airlock.open).toBe(true);
  });

  it('opens a new game on a press held one second, and not a moment sooner', () => {
    // spec 08-56: a press held 1 s while a ring fills clockwise.
    expect(HOLD).toBe(1000);
    const { airlock, nodes, said } = bench();
    openAirlock(airlock);
    nodes.get('fresh')?.press('pointerdown');
    frames(airlock, HOLD - 60);
    expect(said).not.toContain('renew');
    expect(airlock.open).toBe(true);
    frames(airlock, HOLD + 100);
    expect(said).toContain('renew');
    expect(airlock.open).toBe(false);
  });

  it('arms the ring while it is held and puts it out when it is let go', () => {
    // spec 08-56: the ring fills while it is held, and empties in 200 ms when
    // the press lets go — the two lengths live in the sheet.
    expect(LETGO).toBe(200);
    const { airlock, nodes } = bench();
    openAirlock(airlock);
    const fresh = nodes.get('fresh');
    fresh?.press('pointerdown');
    expect(fresh?.className).toBe('door held');
    fresh?.press('pointerup');
    expect(fresh?.className).toBe('door');
  });

  it('treats pointercancel exactly as pointerup', () => {
    // spec 08-51.
    const { airlock, nodes, said } = bench();
    openAirlock(airlock);
    const fresh = nodes.get('fresh');
    fresh?.press('pointerdown');
    frames(airlock, 500);
    fresh?.press('pointercancel');
    expect(fresh?.className).toBe('door');
    frames(airlock, HOLD + 100, 600);
    expect(said).not.toContain('renew');
  });
});

// ------------------------------------------------------------------- the pad

describe('the pad at the Sas', () => {
  it('resumes on any button but B, and never on B', () => {
    // spec 08-56, 04-57: any button of the pad but B, which iPadOS catches.
    const shut = bench();
    openAirlock(shut.airlock);
    shut.pad.held = reading([B]);
    frames(shut.airlock, 500);
    expect(shut.airlock.open).toBe(true);

    const open = bench();
    openAirlock(open.airlock);
    airlockFrame(open.airlock, 0); // the frame that reads what was already down
    open.pad.held = reading([X]);
    frames(open.airlock, 200, 16);
    expect(open.airlock.open).toBe(false);
  });

  it('does not read as a press whatever was already down when it opened', () => {
    // Start is what asked for the Sas, and it is still down on the frame that
    // follows: it must not be the press that leaves it. (spec 08-59, 08-61)
    const { airlock, pad } = bench();
    pad.held = reading([START]);
    openAirlock(airlock);
    airlockFrame(airlock, 0);
    expect(airlock.open).toBe(true);
  });

  it('resumes on A let go under the second, and opens a new game on A held', () => {
    // spec 08-56 gives A both jobs at once — "any button but B" resumes, and
    // the second door is held on A — so A is settled by how long it is held.
    const quick = bench();
    openAirlock(quick.airlock);
    quick.pad.held = reading([A]);
    frames(quick.airlock, 300);
    quick.pad.held = reading([]);
    airlockFrame(quick.airlock, 400);
    expect(quick.airlock.open).toBe(false);
    expect(quick.said).not.toContain('renew');

    const long = bench();
    openAirlock(long.airlock);
    long.pad.held = reading([A]);
    frames(long.airlock, HOLD + 200);
    expect(long.said).toContain('renew');
    expect(long.airlock.open).toBe(false);
  });

  it('says a pad is what is in hand, so a pad gone opens the Sas', () => {
    // spec 08-62, 08 "Les interruptions": on `gamepaddisconnected`, and only if
    // the pad was the last entry used.
    const { airlock, pad } = bench();
    expect(airlock.onPad).toBe(false);
    openAirlock(airlock);
    pad.held = reading([X]);
    airlockFrame(airlock, 0);
    expect(airlock.onPad).toBe(true);
  });
});

// ------------------------------------------------ the little door, and the width

describe('what asks for the Sas and what holds it open', () => {
  it('opens on the little door under the phase strip', () => {
    // spec 08-59: a target and not a display, at the one place no thumb visits.
    const { airlock, nodes } = bench();
    expect(airlock.open).toBe(false);
    nodes.get('hatch')?.press('pointerdown');
    expect(airlock.open).toBe(true);
    expect(nodes.get('onwave')?.textContent).toBe('7');
  });

  it('never lets that little door fall under the floor of a touch target', () => {
    // spec 08-49: never under 44 px, and never near a border.
    expect(PAGE).toMatch(/#hatch\s*\{[^}]*width:\s*clamp\(44px/);
    expect(PAGE).toMatch(/#hatch\s*\{[^}]*height:\s*clamp\(44px/);
  });

  it('opens under 400 wide and lets no press leave until the window widens', () => {
    // spec 08-62, "Les deux dispositions": under 400 the touch targets no
    // longer fit, and the Sas is the only honest answer.
    expect(NARROW).toBe(400);
    const { airlock, nodes, said } = bench();
    senseWidth(airlock, NARROW - 1);
    expect(airlock.open).toBe(true);
    nodes.get('resume')?.press('pointerdown');
    expect(airlock.open).toBe(true);
    expect(said).not.toContain('thaw');

    senseWidth(airlock, NARROW);
    nodes.get('resume')?.press('pointerdown');
    expect(airlock.open).toBe(false);
  });

  it('holds nothing up when the window merely changes size', () => {
    // spec 08-9: Split View, a split screen and a turned iPad are ordinary.
    const { airlock } = bench();
    senseWidth(airlock, 1024);
    senseWidth(airlock, 768);
    senseWidth(airlock, 401);
    expect(airlock.open).toBe(false);
  });
});

// ------------------------------------------------------- the press that leaves

describe('the one press that leaves', () => {
  it('does the triple work, in that one handler and nowhere else', () => {
    // spec 08-53, 08-83: the pad exposed to Safari, the AudioContext restarted,
    // the wake lock taken back — all three in the handler of the press that
    // leaves, and never on `visibilitychange`.
    const { airlock, nodes, said } = bench();
    openAirlock(airlock);
    said.length = 0;
    nodes.get('resume')?.press('pointerdown');
    expect(said).toEqual(['pads', 'sound', 'awake', 'thaw']);
  });

  it('takes a plain press from the keyboard, which is a shortcut for testing', () => {
    // spec 04-56.
    const { airlock, said } = bench();
    openAirlock(airlock);
    pressAirlock(airlock);
    expect(airlock.open).toBe(false);
    expect(said).not.toContain('renew');
  });

  it('shuts the panel on the way out', () => {
    const { airlock, nodes } = bench();
    openAirlock(airlock);
    leaveAirlock(airlock);
    expect(nodes.get('airlock')?.className).toBe('shut');
  });
});

// ----------------------------------------------------------------- the sheet

describe('the sheet, which carries the look', () => {
  it('darkens the game behind it rather than hiding it', () => {
    // spec 08-55: the game freezes and darkens behind it.
    expect(PAGE).toMatch(/#airlock::before\s*\{[^}]*opacity:\s*0\.\d+/);
  });

  it('fills the ring in one second and empties it in 200 ms', () => {
    // spec 08-56.
    expect(PAGE).toMatch(/#ring \.fill\s*\{[^}]*transition:\s*stroke-dashoffset 200ms/);
    expect(PAGE).toMatch(/#fresh\.held \.fill\s*\{[^}]*transition-duration:\s*1000ms/);
  });

  it('puts the one door of a new game alone when there is nothing to resume', () => {
    // spec 08-57.
    expect(PAGE).toMatch(/#airlock\.alone #resume\s*\{\s*display:\s*none/);
  });
});
