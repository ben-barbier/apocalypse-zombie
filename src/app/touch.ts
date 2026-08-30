/**
 * The touch screen, which is the second of the two entries the game is designed
 * for — the other is the gamepad, and the keyboard is only a shortcut for
 * testing. (spec 04-56)
 *
 * It writes the very same `InputState` as the pad, so nothing below the app ever
 * learns which of them a child is holding, and it holds its rising edges by the
 * same flag: a finger going down raises one, and the reading of a step clears
 * it. (spec 10-30, 10-31)
 *
 * Chapter 8 lays the surface out and this file obeys it. A **floating stick**
 * under the left thumb — it is born where the thumb lands, in the left half
 * below mid-height, and a ghost ring at rest shows it until the first use,
 * because a child does not look for a circle, he puts his thumb down. Three
 * targets under the right thumb **in a triangle**, because a thumb pivots and
 * does not travel: strike at the bottom right, jump to its left at the same
 * height, act above. And the act target is there **only when an action is
 * possible**, wearing the picto of what it will do — which is the one press
 * whose sense changes with where he stands. (spec 08-46, 08-47, 08-48, 04-58)
 *
 * **Nothing here measures a screen to find out what was pressed.** The page
 * carries the four targets and the sheet beside them carries every size and
 * every margin — the floor no target goes under, and the
 * `env(safe-area-inset-*)` plus the clearance that keeps every one of them away
 * from a border. The system gestures of iPadOS cannot be held off from the web
 * at all, so the only answer is to stand well clear of them, and that answer is
 * declarative. The browser does the hit-testing, and what reaches this file is
 * already the name of a target. (spec 08-49, 08-50,
 * docs/research/entrees-manette-tactile.md §2.6, §3.4)
 *
 * One figure does cross that line, and one only: how far a thumb may swing from
 * where the stick was born. The reading needs it as a number, so it is settled
 * here and handed to the sheet, which draws the ring and the stick at that very
 * size — one home, and the two can never drift apart.
 *
 * `pointercancel` is treated **exactly as** `pointerup`, which is rule 08-51 and
 * the first bug of every web game on an iPad: a system gesture takes the hand,
 * the finger is never lifted, and the child runs on for ever.
 * (docs/research/entrees-manette-tactile.md §2.6)
 */
import { DIAMOND, type DiamondType, type InputState } from '../game/state';
import { type Edge, createEdge, setEdge, takeEdge } from './input';

/**
 * The four things a thumb lands on, and the browser is what says which: one
 * floating stick on the left, three targets in a triangle on the right.
 * (spec 08-46, 08-47)
 *
 * The door of the Sas is a fifth, and it is not here: it opens the one screen
 * off the game, and it arrives with `src/app/airlock.ts`. (spec 08-59)
 */
export const TARGET = {
  STICK: 0,
  STRIKE: 1,
  JUMP: 2,
  ACT: 3,
} as const;

export type TargetType = (typeof TARGET)[keyof typeof TARGET];

const TARGETS = 4;

/** What the page calls each of them, in the order of `TARGET`. */
const NAMES = ['stick-zone', 'strike', 'jump', 'act'];

/**
 * How far a thumb may swing from where the stick was born: a share of the
 * smaller side of the window, bounded in pixels, exactly as every size of
 * chapter 8 is. (spec 08-10)
 *
 * The share is this file's own — no rule sets one. It sits well under the 22 %
 * of the strike target so the two thumbs never crowd each other, and its floor
 * sits well over the smallest a target may be, so a push to the edge is a
 * gesture a child makes on purpose and never a twitch.
 * (spec 08-49, 08 "Les cibles tactiles")
 */
const SWING_SHARE = 0.15;
const SWING_LEAST = 64;
const SWING_MOST = 128;

/**
 * What this file needs of one node of the page, and the whole of it: a class
 * name and a custom property. An `HTMLElement` answers to it as it stands, and
 * so does the plain object a test hands over — which is why nothing here builds
 * a node or reads a size off one.
 */
export interface Panel {
  className: string;
  readonly style: {
    setProperty(name: string, value: string): void;
  };
}

/**
 * The look the act target wears for each sense the press has where he stands.
 * It is written by index off the enumeration of the rules rather than in a row,
 * so the two can never fall out of step. `NONE` is left empty on purpose: no
 * action is possible, so **there is no target at all**. (spec 08-48, 04-58)
 */
const ACT_LOOK: string[] = [];
ACT_LOOK[DIAMOND.PLACE] = 'on place';
ACT_LOOK[DIAMOND.UPGRADE] = 'on upgrade';
ACT_LOOK[DIAMOND.POUR] = 'on pour';
ACT_LOOK[DIAMOND.TAKE] = 'on take';
ACT_LOOK[DIAMOND.REINFORCE] = 'on reinforce';
ACT_LOOK[DIAMOND.NONE] = '';

/** The stick showing, and the ghost ring gone for good. (spec 08-46) */
const STICK_ON = 'on';
const STICK_REST = '';
const RING_GONE = 'gone';
const LAYER_ERASED = 'gone';

export interface Thumbs {
  /** The layer the one figure of this file is written on. */
  readonly layer: Panel;
  /** The ghost ring at rest, gone for good at the first use. (spec 08-46) */
  readonly ring: Panel;
  /** The stick, born where the thumb lands. (spec 08-46) */
  readonly stick: Panel;
  /** Its knob, which is what follows the thumb inside the ring. */
  readonly knob: Panel;
  /** The act target, there only when an action is possible. (spec 08-48) */
  readonly act: Panel;

  /** Which pointer holds each target, or -1 for none. */
  readonly at: Int32Array;
  /** Where the stick was born, in the frame of the screen. */
  bornX: number;
  bornY: number;
  /** Its push, in the frame of the screen, of a norm of at most one. (spec 10-30) */
  dx: number;
  dz: number;
  /** The two rising edges of the right thumb. (spec 10-31) */
  readonly jumping: Edge;
  readonly acting: Edge;

  /** How far a thumb may swing, in pixels: the one home of that figure. */
  swing: number;
  /** Whether the stick has been used once, which is what takes the ring away. */
  used: boolean;
  /** Which sense the act target is wearing, so nothing is written twice. */
  shows: number;
  /** Where the knob was last put, in whole pixels, for that same reason. */
  knobX: number;
  knobY: number;
}

function seek(find: (name: string) => Panel | null, name: string): Panel {
  const panel = find(name);
  if (panel === null) throw new Error(`the thumbs have no ${name}`);
  return panel;
}

/**
 * Finds the five nodes this file writes on a page that already holds them. What
 * it holds opens on exactly what the page shows — no stick, a ghost ring
 * standing, and no act target — so a game that opens on that writes nothing at
 * all before the first thumb.
 */
export function createThumbs(find: (name: string) => Panel | null): Thumbs {
  const at = new Int32Array(TARGETS);
  at.fill(-1);
  return {
    layer: seek(find, 'thumbs'),
    ring: seek(find, 'ring'),
    stick: seek(find, 'stick'),
    knob: seek(find, 'knob'),
    act: seek(find, 'act'),

    at,
    bornX: 0,
    bornY: 0,
    dx: 0,
    dz: 0,
    jumping: createEdge(),
    acting: createEdge(),

    swing: SWING_LEAST,
    used: false,
    shows: DIAMOND.NONE,
    knobX: 0,
    knobY: 0,
  };
}

/**
 * The screen has changed size, so the swing is settled again and handed to the
 * sheet. A window that changes size is never a reason to hold the game up —
 * Split View and a rotation are ordinary, not interruptions — and the layout
 * itself is the browser's own work off the sheet. (spec 08-9, 08-10)
 */
export function fitThumbs(thumbs: Thumbs, width: number, height: number): void {
  const side = Math.min(width, height);
  const swing = Math.min(SWING_MOST, Math.max(SWING_LEAST, side * SWING_SHARE));
  if (swing === thumbs.swing) return;
  thumbs.swing = swing;
  thumbs.layer.style.setProperty('--swing', `${swing}px`);
}

/** Puts the knob where the thumb is, in whole pixels and only when it has moved. */
function layKnob(thumbs: Thumbs, x: number, y: number): void {
  const kx = Math.round(x);
  const ky = Math.round(y);
  if (kx === thumbs.knobX && ky === thumbs.knobY) return;
  thumbs.knobX = kx;
  thumbs.knobY = ky;
  thumbs.knob.style.setProperty('--kx', String(kx));
  thumbs.knob.style.setProperty('--ky', String(ky));
}

/**
 * A thumb lands on one of the four. The last finger down owns the target, so a
 * second one laid on the same spot takes it over rather than being lost, and
 * the first one lifting no longer lets go of something a thumb is still holding.
 */
export function pressThumb(
  thumbs: Thumbs,
  target: TargetType,
  id: number,
  x: number,
  y: number,
): void {
  thumbs.at[target] = id;
  if (target === TARGET.STICK) {
    thumbs.bornX = x;
    thumbs.bornY = y;
    thumbs.dx = 0;
    thumbs.dz = 0;
    thumbs.stick.style.setProperty('--x', String(Math.round(x)));
    thumbs.stick.style.setProperty('--y', String(Math.round(y)));
    layKnob(thumbs, 0, 0);
    thumbs.stick.className = STICK_ON;
    // The ring showed where to put a thumb. The thumb is there, so it goes —
    // and it never comes back, because a sign one has already followed is no
    // longer a sign. (spec 08-46)
    if (!thumbs.used) {
      thumbs.used = true;
      thumbs.ring.className = RING_GONE;
    }
  } else if (target === TARGET.JUMP) setEdge(thumbs.jumping, true);
  else if (target === TARGET.ACT) setEdge(thumbs.acting, true);
}

/**
 * A thumb slides. Only the stick has anything to follow: a target of the
 * triangle is held or it is not, and where inside it a thumb wanders says
 * nothing at all.
 *
 * What comes out is in the frame of the **screen**, exactly as a pad hands it
 * over — up the screen is `dz` below nought — and `input.ts` turns the whole of
 * it onto the heading the camera watches before a step ever reads it.
 * (spec 04-16, 10-30)
 */
export function moveThumb(thumbs: Thumbs, id: number, x: number, y: number): void {
  if (id !== thumbs.at[TARGET.STICK]) return;
  let dx = (x - thumbs.bornX) / thumbs.swing;
  let dz = (y - thumbs.bornY) / thumbs.swing;
  // Held to a norm of one radially and never axis by axis, for the reason the
  // pad is: cut each axis on its own and running at an angle comes out faster
  // than running straight, and there is one pace. (spec 04-6, 10-30)
  const push = Math.hypot(dx, dz);
  if (push > 1) {
    dx /= push;
    dz /= push;
  }
  thumbs.dx = dx;
  thumbs.dz = dz;
  layKnob(thumbs, dx * thumbs.swing, dz * thumbs.swing);
}

/** The stick with nothing on it: no push at all, and nothing drawn. */
function restStick(thumbs: Thumbs): void {
  thumbs.dx = 0;
  thumbs.dz = 0;
  thumbs.stick.className = STICK_REST;
}

/**
 * A finger goes, whichever of the four it was holding. It is the one path out,
 * and `pointerup` and `pointercancel` both take it: rule 08-51 asks for exactly
 * that, and a finger that is never lifted is a child left running on for ever.
 * (spec 08-51)
 */
export function liftThumb(thumbs: Thumbs, id: number): void {
  for (let t = 0; t < TARGETS; t += 1) {
    if (thumbs.at[t] !== id) continue;
    thumbs.at[t] = -1;
    if (t === TARGET.STICK) restStick(thumbs);
    else if (t === TARGET.JUMP) setEdge(thumbs.jumping, false);
    else if (t === TARGET.ACT) setEdge(thumbs.acting, false);
  }
}

/** Everything up at once, which is what a screen losing its fingers has to mean. */
export function releaseThumbs(thumbs: Thumbs): void {
  thumbs.at.fill(-1);
  restStick(thumbs);
  setEdge(thumbs.jumping, false);
  setEdge(thumbs.acting, false);
}

/**
 * Which sense the press has where he stands, which is what the act target wears
 * — and there is **no target at all** where nothing is possible. The rules
 * settle which of the senses it is, from his feet and once a step; this takes
 * the answer and never the reckoning behind it. (spec 08-48, 04-58, 04-60)
 *
 * It writes only when the answer has moved, so a child standing still writes
 * nothing, frame after frame.
 */
export function showAction(thumbs: Thumbs, shows: DiamondType): void {
  if (shows === thumbs.shows) return;
  thumbs.shows = shows;
  thumbs.act.className = ACT_LOOK[shows] ?? '';
  // A target that goes takes its finger with it, exactly as a lift would: what
  // is no longer on the screen cannot be left leaning on. (spec 08-51)
  if (shows === DIAMOND.NONE && thumbs.at[TARGET.ACT] >= 0) {
    thumbs.at[TARGET.ACT] = -1;
    setEdge(thumbs.acting, false);
  }
}

/**
 * Adds what the two thumbs say to the entries of this step, alongside whatever
 * the pad and the keys put there. It never writes over them: the buttons
 * gather, the stick adds, and the norm is settled once by the caller.
 */
export function readThumbs(thumbs: Thumbs, input: InputState): void {
  if (thumbs.at[TARGET.STRIKE] >= 0) input.strike = true; // held, never an edge (spec 04-24)
  if (takeEdge(thumbs.jumping)) input.jump = true;
  if (takeEdge(thumbs.acting)) input.action = true;
  input.dx += thumbs.dx;
  input.dz += thumbs.dz;
}

/**
 * The end of a game: the targets go out with the hud over the same second, and
 * they stop taking a press on the spot. The world is fading behind them and the
 * only thing that stays is the number of the wave reached, so a stick still
 * live under it would be steering nothing. (spec 01-29, 08-63)
 */
export function eraseThumbs(thumbs: Thumbs): void {
  releaseThumbs(thumbs);
  thumbs.layer.className = LAYER_ERASED;
}

/**
 * Hangs the listeners of the page, and Pointer Events are the only family
 * listened to: one press is then counted once, a `pointerId` tells the two
 * thumbs apart on its own, and a touch gets its capture without anything being
 * asked for. None of them ever calls `preventDefault` — `touch-action: none` in
 * the sheet does that work, declaratively and sooner.
 * (docs/research/entrees-manette-tactile.md §2.1, §2.4, §2.5)
 *
 * The press is hung on each target, so the browser is what names it. The slide
 * and the lift are hung on the window instead: a thumb that wanders off a
 * target is still the same finger, and a lift has to let go wherever it lands.
 * Each of them does one thing — write down where a finger is — because an entry
 * is sampled at the step and never on an event. (spec 10-31)
 */
export function listenThumbs(thumbs: Thumbs): void {
  for (let t = 0; t < TARGETS; t += 1) {
    const node = document.getElementById(NAMES[t]);
    if (node === null) continue;
    const target = t as TargetType;
    node.addEventListener('pointerdown', (fired) => {
      pressThumb(thumbs, target, fired.pointerId, fired.clientX, fired.clientY);
    });
  }

  window.addEventListener('pointermove', (fired) => {
    moveThumb(thumbs, fired.pointerId, fired.clientX, fired.clientY);
  });

  const lift = (fired: PointerEvent): void => {
    liftThumb(thumbs, fired.pointerId);
  };
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);

  window.addEventListener('blur', () => {
    releaseThumbs(thumbs);
  });
}
