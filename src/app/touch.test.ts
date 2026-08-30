/**
 * The touch screen read back against chapter 8. Nothing here asks a browser for
 * anything: `pressThumb`, `moveThumb` and `liftThumb` are what the listeners
 * call, so the whole surface is driven from a test under node. (spec 10-41, 10-45)
 *
 * Two of the boxes of chapter 8 are not about behaviour at all but about the
 * page — no target under 44 px, none closer to a border than
 * `env(safe-area-inset-*) + 32 px`, and the displays at 16 px. Those are settled
 * in the sheet of `index.html`, so they are read straight off the file, the way
 * the guard reads its sources. (spec 08-49, 08-50)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DIAMOND, createInput } from '../game/state';
import {
  type Panel,
  TARGET,
  createThumbs,
  fitThumbs,
  liftThumb,
  moveThumb,
  pressThumb,
  readThumbs,
  releaseThumbs,
  showAction,
} from './touch';

/** A node of the page that keeps what was written on it, and nothing else. */
interface Held extends Panel {
  readonly written: Map<string, string>;
}

function held(): Held {
  const written = new Map<string, string>();
  return {
    className: '',
    written,
    style: {
      setProperty(name: string, value: string): void {
        written.set(name, value);
      },
    },
  };
}

/** The five nodes `createThumbs` looks for, each kept so a test can read it. */
function page(): { find: (name: string) => Panel; nodes: Map<string, Held> } {
  const nodes = new Map<string, Held>();
  return {
    nodes,
    find: (name: string): Panel => {
      const made = held();
      nodes.set(name, made);
      return made;
    },
  };
}

function thumbsOn(sheet: { find: (name: string) => Panel }) {
  return createThumbs(sheet.find);
}

describe('the two entries write the one object', () => {
  it('writes the very same entries as the pad', () => {
    // spec 10-30: one InputState, written indifferently by pad or screen.
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    pressThumb(thumbs, TARGET.STICK, 1, 100, 100);
    moveThumb(thumbs, 1, 100 + thumbs.swing, 100);
    pressThumb(thumbs, TARGET.STRIKE, 2, 900, 700);
    pressThumb(thumbs, TARGET.JUMP, 3, 700, 700);
    pressThumb(thumbs, TARGET.ACT, 4, 900, 500);

    const input = createInput();
    readThumbs(thumbs, input);
    expect(input.dx).toBeCloseTo(1, 12);
    expect(input.dz).toBeCloseTo(0, 12);
    expect(input.strike).toBe(true);
    expect(input.jump).toBe(true);
    expect(input.action).toBe(true);
  });

  it('loops the blows while the strike target is held', () => {
    // spec 04-24: the button held strikes over and over, and it is not an edge.
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STRIKE, 1, 900, 700);
    for (let i = 0; i < 5; i += 1) {
      const input = createInput();
      readThumbs(thumbs, input);
      expect(input.strike).toBe(true);
    }
  });

  it('hands a jump and an act to one reading and no second', () => {
    // spec 10-31: pressed since the last reading, cleared by that reading.
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.JUMP, 1, 700, 700);
    pressThumb(thumbs, TARGET.ACT, 2, 900, 500);

    const first = createInput();
    readThumbs(thumbs, first);
    expect(first.jump).toBe(true);
    expect(first.action).toBe(true);

    const second = createInput();
    readThumbs(thumbs, second);
    expect(second.jump).toBe(false);
    expect(second.action).toBe(false);

    liftThumb(thumbs, 1);
    pressThumb(thumbs, TARGET.JUMP, 3, 700, 700);
    const third = createInput();
    readThumbs(thumbs, third);
    expect(third.jump).toBe(true);
  });
});

describe('the floating stick', () => {
  it('is born where the thumb lands, and pushes from there', () => {
    // spec 08-46: it is born where the thumb is put down, and the push is read
    // from that spot and no other.
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    pressThumb(thumbs, TARGET.STICK, 1, 210, 640);
    expect(sheet.nodes.get('stick')?.written.get('--x')).toBe('210');
    expect(sheet.nodes.get('stick')?.written.get('--y')).toBe('640');
    expect(thumbs.dx).toBe(0);
    expect(thumbs.dz).toBe(0);

    // Up the screen is dz below nought, which is what a pad hands over too.
    moveThumb(thumbs, 1, 210, 640 - thumbs.swing);
    expect(thumbs.dx).toBeCloseTo(0, 12);
    expect(thumbs.dz).toBeCloseTo(-1, 12);
  });

  it('is held to a norm of one radially, so a slant is not faster', () => {
    // spec 10-30, 04-6: a norm of at most one, and one pace.
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    moveThumb(thumbs, 1, 200 + thumbs.swing * 4, 600 + thumbs.swing * 4);
    expect(Math.hypot(thumbs.dx, thumbs.dz)).toBeCloseTo(1, 12);
    expect(thumbs.dx).toBeCloseTo(thumbs.dz, 12);
  });

  it('leaves a push shorter than the swing alone', () => {
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    moveThumb(thumbs, 1, 200 + thumbs.swing / 2, 600);
    expect(thumbs.dx).toBeCloseTo(0.5, 12);
  });

  it('follows only the finger that made it', () => {
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    moveThumb(thumbs, 2, 200 + thumbs.swing, 600); // the other thumb, elsewhere
    expect(thumbs.dx).toBe(0);
  });

  it('shows a ghost ring at rest, and takes it away at the first use for good', () => {
    // spec 08-46: a ghost ring at rest shows it until the first use.
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    expect(sheet.nodes.get('ring')?.className).toBe('');

    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    expect(sheet.nodes.get('ring')?.className).toBe('gone');
    liftThumb(thumbs, 1);
    expect(sheet.nodes.get('ring')?.className).toBe('gone');
    pressThumb(thumbs, TARGET.STICK, 2, 300, 620);
    expect(sheet.nodes.get('ring')?.className).toBe('gone');
  });

  it('settles its swing as a share of the smaller side, bounded in pixels', () => {
    // spec 08-10: every size is a share of the smaller side of the window,
    // bounded in pixels.
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    fitThumbs(thumbs, 1180, 820);
    expect(thumbs.swing).toBeCloseTo(820 * 0.15, 9);
    expect(sheet.nodes.get('thumbs')?.written.get('--swing')).toBe(`${820 * 0.15}px`);

    fitThumbs(thumbs, 300, 300); // the floor
    expect(thumbs.swing).toBe(64);
    fitThumbs(thumbs, 4000, 4000); // the ceiling
    expect(thumbs.swing).toBe(128);
  });
});

describe('a finger going', () => {
  it('lets go of the stick and of the buttons, and stops the body', () => {
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    moveThumb(thumbs, 1, 200 + thumbs.swing, 600);
    pressThumb(thumbs, TARGET.STRIKE, 2, 900, 700);

    liftThumb(thumbs, 1);
    expect(thumbs.dx).toBe(0);
    expect(thumbs.dz).toBe(0);
    expect(sheet.nodes.get('stick')?.className).toBe('');

    const input = createInput();
    readThumbs(thumbs, input);
    expect(input.dx).toBe(0);
    expect(input.strike).toBe(true); // the other thumb is still down

    liftThumb(thumbs, 2);
    const after = createInput();
    readThumbs(thumbs, after);
    expect(after.strike).toBe(false);
  });

  it('is what pointercancel does too, and by the very same path', () => {
    // spec 08-51: pointercancel is treated exactly as pointerup. A system
    // gesture takes the hand, and a finger never lifted leaves a child running
    // on for ever — so the two events are given one and the same listener.
    const source = readFileSync(fileURLToPath(new URL('touch.ts', import.meta.url)), 'utf8');
    expect(source).toContain("window.addEventListener('pointerup', lift);");
    expect(source).toContain("window.addEventListener('pointercancel', lift);");
  });

  it('gives up every target at once when the screen loses its fingers', () => {
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STICK, 1, 200, 600);
    moveThumb(thumbs, 1, 200 + thumbs.swing, 600);
    pressThumb(thumbs, TARGET.STRIKE, 2, 900, 700);
    releaseThumbs(thumbs);

    const input = createInput();
    readThumbs(thumbs, input);
    expect(input.dx).toBe(0);
    expect(input.strike).toBe(false);
  });

  it('leaves a target a second finger has taken over alone', () => {
    const thumbs = thumbsOn(page());
    pressThumb(thumbs, TARGET.STRIKE, 1, 900, 700);
    pressThumb(thumbs, TARGET.STRIKE, 2, 910, 710);
    liftThumb(thumbs, 1);
    const input = createInput();
    readThumbs(thumbs, input);
    expect(input.strike).toBe(true);
  });
});

describe('the act target', () => {
  it('is there only when an action is possible, and wears what it will do', () => {
    // spec 08-48, 04-58: present only when an action is possible, carrying the
    // picto of what it will do. spec 04-60: the second button never has two
    // senses at one spot.
    const sheet = page();
    const thumbs = thumbsOn(sheet);
    const act = sheet.nodes.get('act');
    expect(act?.className).toBe('');

    for (const [shows, look] of [
      [DIAMOND.TAKE, 'on take'],
      [DIAMOND.POUR, 'on pour'],
      [DIAMOND.PLACE, 'on place'],
      [DIAMOND.UPGRADE, 'on upgrade'],
      [DIAMOND.REINFORCE, 'on reinforce'],
    ] as const) {
      showAction(thumbs, shows);
      expect(act?.className).toBe(look);
      showAction(thumbs, DIAMOND.NONE);
      expect(act?.className).toBe('');
    }
  });

  it('takes its finger with it when it goes', () => {
    // spec 08-51: nothing is ever left leaning on something that has gone.
    const thumbs = thumbsOn(page());
    showAction(thumbs, DIAMOND.PLACE);
    pressThumb(thumbs, TARGET.ACT, 1, 900, 500);
    const first = createInput();
    readThumbs(thumbs, first);
    expect(first.action).toBe(true);

    showAction(thumbs, DIAMOND.NONE);
    pressThumb(thumbs, TARGET.STICK, 2, 200, 600); // a wholly other thumb
    liftThumb(thumbs, 1);
    const second = createInput();
    readThumbs(thumbs, second);
    expect(second.action).toBe(false);
  });
});

// -------------------------------------------------------------- the page

const SHEET = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

/** What one rule of the sheet says, whitespace squeezed out of it. */
function ruleOf(name: string): string {
  const at = SHEET.indexOf(`${name} {`);
  expect(at).toBeGreaterThan(0);
  const shut = SHEET.indexOf('}', at);
  return SHEET.slice(at, shut).replace(/\s+/g, ' ');
}

describe('the sheet, where every size and every margin is settled', () => {
  it('holds no touch target under 44 px', () => {
    // spec 08-49: no touch target under 44 px. The table of chapter 8 puts the
    // strike target at 22 % bounded 96–160, and the two others at 70 % of it
    // with a floor of 64 — every one of them well over the 44.
    const thumbs = ruleOf('#thumbs');
    expect(thumbs).toContain('--strike-side: clamp(96px, 22vmin, 160px)');
    expect(thumbs).toContain('--small-side: max(64px, calc(var(--strike-side) * 0.7))');
    for (const floor of [96, 64]) expect(floor).toBeGreaterThanOrEqual(44);
  });

  it('keeps every touch target away from a border by the safe area and 32 px', () => {
    // spec 08-49: env(safe-area-inset-*) + 32 px, because the system gestures
    // of iPadOS cannot be held off from the web at all.
    expect(ruleOf('#thumbs')).toContain('--keep: 32px');
    // The triangle hangs in the corner at that clearance, and the strike target
    // sits flush in it — so the whole of it is clear at once.
    const triangle = ruleOf('#triangle');
    expect(triangle).toContain('right: calc(env(safe-area-inset-right, 0px) + var(--keep))');
    expect(triangle).toContain('bottom: calc(env(safe-area-inset-bottom, 0px) + var(--keep))');
    // And the stick zone by the clearance plus the swing, so the travel of the
    // thumb and not merely the spot it lands on stays clear. (spec 08-46)
    const zone = ruleOf('#stick-zone');
    expect(zone).toContain(
      'left: calc(env(safe-area-inset-left, 0px) + var(--keep) + var(--swing))',
    );
    expect(zone).toContain(
      'bottom: calc(env(safe-area-inset-bottom, 0px) + var(--keep) + var(--swing))',
    );
  });

  it('keeps a display away from a border by the safe area and 16 px', () => {
    // spec 08-50: a display, which is never touched, settles for 16 px.
    expect(ruleOf('#hud')).toContain('--edge: 16px');
  });

  it('gives the bottom to the two thumbs and puts no display under a finger', () => {
    // spec 08-5: the displays hold to the strip at the top, the bottom belongs
    // to the two thumbs, and no display ever passes under a finger — the hud
    // takes no press at all. spec 08-46: the left half, below mid-height.
    expect(ruleOf('#hud')).toContain('pointer-events: none');
    const zone = ruleOf('#stick-zone');
    expect(zone).toContain('top: 50%');
    expect(zone).toContain('right: 50%');
    expect(zone).toContain('pointer-events: auto');
  });

  it('lays the three out in a triangle and not in a row', () => {
    // spec 08-47: strike at the bottom right, jump to its left at the same
    // height, act above it — the thumb pivots, it does not travel.
    expect(ruleOf('#strike')).toContain('right: 0; bottom: 0');
    const jump = ruleOf('#jump');
    expect(jump).toContain('right: calc(var(--strike-side) + var(--apart))');
    expect(jump).toContain('bottom: calc((var(--strike-side) - var(--small-side)) / 2)');
    const act = ruleOf('#act');
    expect(act).toContain('right: calc((var(--strike-side) - var(--small-side)) / 2)');
    expect(act).toContain('bottom: calc(var(--strike-side) + var(--apart))');
  });
});
