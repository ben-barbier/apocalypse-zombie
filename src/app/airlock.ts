/**
 * The Sas: the **one** screen there is when the game is not running. It is the
 * welcome at load, the halt of an interruption, the halt one asks for and the
 * end of a game, all four at once — there is no "press a button" screen beside
 * it, no screen carrying the name of the game, no home screen. Safari will not
 * hand a pad back without a press, and an `AudioContext` only restarts reliably
 * inside a gesture, so a screen like this one was owed at load and after every
 * return from the background: there is one, and the press that leaves it does
 * the triple work — the pad exposed, the sound restarted, the wake lock taken
 * back. (spec 08-52, 08-53)
 *
 * **Nothing ever resumes on its own.** Every way in is written out in
 * `openAirlock`'s callers, and the one way out is a press. (spec 08-61)
 *
 * It carries **not one line of text** and **no setting at all** — no volume, no
 * quality, no language. Two doors: *Reprendre*, the town hall and the number of
 * the wave in a large figure, on a plain press; and *Nouvelle partie*, the city
 * and a circular arrow, on a press held for a second while a ring fills. The
 * held press is what replaces a written confirmation, and it is why the hud
 * needs no way of giving a game up. (spec 08-55, 08-56, 08-58, 08-60)
 *
 * It settles no look and no size: the sheet in `index.html` carries the veil,
 * the two doors, the ring and its two lengths, exactly as it carries the hud's.
 * What this file writes is a class name and a figure.
 */
import type { PadReading } from './gamepad';

/** How long the second door is held before it opens, in ms. (spec 08-56) */
export const HOLD = 1000;

/** How long its ring takes to empty when the press lets go, in ms. (spec 08-56) */
export const LETGO = 200;

/** The width under which the Sas opens and stays open, in CSS px. (spec 08-62) */
export const NARROW = 400;

/**
 * The two buttons of the standard mapping this file names, and it names no
 * others: **A**, which the second door is held on, and **B**, which is never
 * read anywhere in this game because iPadOS catches it for its own navigation.
 * Every other button is a plain press, and `gamepad.ts` reads the same mapping
 * for the game itself. (spec 08-56, 04-57)
 */
const HELD_ON = 0;
const NEVER = 1;

// ------------------------------------------------------------- the class names

/**
 * Every class name the Sas ever wears, made once. `ALONE` is the shape it takes
 * when there is nothing to resume: one door, centred. (spec 08-57)
 */
const SHUT = 'shut';
const OPEN = 'open';
const ALONE = 'open alone';
const DOOR = 'door';
const DOOR_HELD = 'door held';

// ------------------------------------------------------------------ the page

/** What one of the two facts of a press carries. */
export interface PressFact {
  preventDefault(): void;
}

/**
 * What this file needs of one node of the page: a class name, a figure, and the
 * presses it takes. An `HTMLElement` answers to it as it stands, and so does the
 * plain object a test under node hands over.
 */
export interface Slab {
  className: string;
  textContent: string | null;
  addEventListener(kind: string, handler: (fact: PressFact) => void): void;
}

// ------------------------------------------------------------------ the hooks

export interface AirlockHooks {
  /**
   * Freezes the game behind it. Time never crosses the Sas: nothing flows
   * behind it while it stands open. (spec 08-55, 08-68)
   */
  freeze(): void;
  /** Lets the game run again, on the one press that leaves. (spec 08-61) */
  thaw(): void;
  /** Lets go of the game in hand and opens a new one. (spec 08-56) */
  renew(): void;
  /**
   * Asks the browser for a still picture of the pad. It is called **every
   * frame** the Sas stands open, and it has to be: without that reading,
   * `gamepadconnected` never fires at all. (spec 08-54)
   */
  pads(): PadReading | null;
  /** The number of the wave in hand, which the first door carries. (spec 08-56) */
  wave(): number;
  /**
   * Whether there is a game to resume, asked afresh every time the Sas opens.
   * With none — a page that has just loaded, a town hall that has just fallen —
   * the door of a new game stands alone and centred. (spec 08-57, 08-63)
   */
  standing(): boolean;
  /**
   * Where the `AudioContext` comes back, and the only place it may: `resume()`
   * belongs in the handler of the press that leaves the Sas and never on
   * `visibilitychange`. It is left unwired on purpose until the sounds
   * themselves arrive. (spec 08-83)
   */
  sound?(): void;
  /**
   * Where the wake lock is taken back, in that very same handler. Only a test
   * hands this in; the page uses `takeWakeLock` below. (spec 08, "Les interruptions")
   */
  awake?(): void;
}

/**
 * The wake lock, which the browser lets go of at every trip into the background
 * and which is taken back **in the handler of the press that leaves**, beside
 * the sound. It never says anything when it fails, here as everywhere else.
 */
export function takeWakeLock(): void {
  if (typeof navigator === 'undefined') return;
  const held = (navigator as unknown as { wakeLock?: { request(kind: string): Promise<unknown> } })
    .wakeLock;
  if (held === undefined) return;
  held.request('screen').catch(() => {});
}

// ------------------------------------------------------------------- the Sas

export interface Airlock {
  readonly hooks: AirlockHooks;
  readonly panel: Slab;
  /** The first door, and the figure of the wave it carries. (spec 08-56) */
  readonly resume: Slab;
  readonly onWave: Slab;
  /** The second door, the one that is held. (spec 08-56) */
  readonly fresh: Slab;
  /** The little door that opens the Sas: a target, and not a display. (spec 08-59) */
  readonly hatch: Slab;

  open: boolean;
  /**
   * Whether there is a game to resume. With none, the second door stands alone
   * and centred and a plain press opens it. (spec 08-57)
   */
  standing: boolean;
  /** Whether the second door is being held, by a finger or by a thumb. */
  holding: boolean;
  byFinger: boolean;
  byPad: boolean;
  /** When the hold began, on the clock of the frames, or -1 until one stamps it. */
  since: number;
  /** Whether a button that is not A was down at the frame before. */
  padOther: boolean;
  /** The first frame of an opening only reads the pad, it never acts on it. */
  settling: boolean;
  /** True while the screen is too narrow to play on. (spec 08-62) */
  narrow: boolean;
  /**
   * Whether the pad was the last entry used, because `gamepaddisconnected`
   * opens the Sas only then. (spec 08-62, "Les interruptions")
   */
  onPad: boolean;
  /** What `requestAnimationFrame` hands back, so its frames can be stopped. */
  handle: number;
  /** The one callback, made once. */
  onFrame: (now: number) => void;
}

/** Writes one class name. */
function dress(slab: Slab, look: string): void {
  slab.className = look;
}

function seek(find: (name: string) => Slab | null, name: string): Slab {
  const slab = find(name);
  if (slab === null) throw new Error(`the airlock has no ${name}`);
  return slab;
}

/**
 * Finds the Sas on a page that already carries it and hangs the presses of its
 * three targets. The two doors and the little door act on the press **going
 * down** rather than coming up, which is what lets `pointercancel` be handled
 * exactly like `pointerup` — both of them mean one thing, the press has ended.
 * (spec 08-51)
 */
export function createAirlock(find: (name: string) => Slab | null, hooks: AirlockHooks): Airlock {
  const airlock: Airlock = {
    hooks,
    panel: seek(find, 'airlock'),
    resume: seek(find, 'resume'),
    onWave: seek(find, 'onwave'),
    fresh: seek(find, 'fresh'),
    hatch: seek(find, 'hatch'),
    open: false,
    standing: false,
    holding: false,
    byFinger: false,
    byPad: false,
    since: -1,
    padOther: false,
    settling: false,
    narrow: false,
    onPad: false,
    handle: 0,
    onFrame: () => {},
  };

  airlock.onFrame = (now: number): void => {
    airlockFrame(airlock, now);
    if (airlock.open && typeof requestAnimationFrame === 'function') {
      airlock.handle = requestAnimationFrame(airlock.onFrame);
    }
  };

  airlock.resume.addEventListener('pointerdown', (fact) => {
    fact.preventDefault();
    leaveAirlock(airlock);
  });

  airlock.fresh.addEventListener('pointerdown', (fact) => {
    fact.preventDefault();
    pressFresh(airlock);
  });
  // The two of them are the same thing said twice: the press has ended.
  // (spec 08-51)
  airlock.fresh.addEventListener('pointerup', () => {
    airlock.byFinger = false;
    setHold(airlock, airlock.byPad);
  });
  airlock.fresh.addEventListener('pointercancel', () => {
    airlock.byFinger = false;
    setHold(airlock, airlock.byPad);
  });

  airlock.hatch.addEventListener('pointerdown', (fact) => {
    fact.preventDefault();
    openAirlock(airlock);
  });

  return airlock;
}

/** Arms and disarms the ring, and stamps nothing: a frame does that. */
function setHold(airlock: Airlock, held: boolean): void {
  if (held === airlock.holding) return;
  airlock.holding = held;
  airlock.since = -1;
  dress(airlock.fresh, held ? DOOR_HELD : DOOR);
}

/**
 * Opens the Sas. Everything that opens it is written out where it is called
 * from, because the table of chapter 8 is the whole list and nothing else may
 * add to it: the page loading, `visibilitychange` to hidden, `pagehide`, the
 * WebGL context lost, a pad gone while it was the last entry used, the window
 * narrower than 400, and the town hall reaching nought. (spec 08-62, 08-63)
 *
 * Whether there is a game to resume is asked of the caller afresh each time,
 * because it is not the same answer at load, in the middle of a wave 8 and on a
 * town hall that has just fallen: with none, the door of a new game stands
 * alone and centred. (spec 08-57, 08-63)
 */
export function openAirlock(airlock: Airlock): void {
  if (airlock.open) return;
  const standing = airlock.hooks.standing();
  airlock.open = true;
  airlock.standing = standing;
  airlock.byFinger = false;
  airlock.byPad = false;
  airlock.holding = false;
  airlock.since = -1;
  // Whatever was down when it opened — Start, most often — is not a press of
  // the Sas: the first frame reads the pad and acts on nothing.
  airlock.settling = true;
  dress(airlock.fresh, DOOR);
  if (standing) airlock.onWave.textContent = String(airlock.hooks.wave());
  dress(airlock.panel, standing ? OPEN : ALONE);
  // The game freezes and darkens behind it, and the darkening is the sheet's.
  // (spec 08-55, 08-68)
  airlock.hooks.freeze();
  if (typeof requestAnimationFrame === 'function') {
    airlock.handle = requestAnimationFrame(airlock.onFrame);
  }
}

/**
 * The one press that leaves, and the whole of the triple work of 08-53 happens
 * in it and in nothing else: the pad is asked for again, so Safari hands it
 * over; the `AudioContext` is restarted; the wake lock is taken back. Then, and
 * only then, the game runs again. (spec 08-53, 08-61, 08-83)
 *
 * A window too narrow to play on refuses to let go of it, which is the one way
 * in that a press does not answer. (spec 08-62)
 */
export function leaveAirlock(airlock: Airlock): void {
  if (!airlock.open || airlock.narrow) return;
  airlock.open = false;
  airlock.holding = false;
  airlock.byFinger = false;
  airlock.byPad = false;
  airlock.since = -1;
  dress(airlock.fresh, DOOR);
  dress(airlock.panel, SHUT);
  stopFrames(airlock);

  airlock.hooks.pads();
  (airlock.hooks.sound ?? nothing)();
  (airlock.hooks.awake ?? takeWakeLock)();
  airlock.hooks.thaw();
}

function nothing(): void {}

function stopFrames(airlock: Airlock): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(airlock.handle);
  airlock.handle = 0;
}

/**
 * The second door opening: the game in hand is let go of, and the press that
 * did it leaves the Sas like any other. It is the way a game that has gone
 * badly is given up, which is why no such thing is needed in the hud.
 * (spec 08-56, 08-58)
 */
function openFresh(airlock: Airlock): void {
  if (!airlock.open || airlock.narrow) return;
  airlock.hooks.renew();
  leaveAirlock(airlock);
}

/**
 * A press landing on the second door. Held for a second it opens; with nothing
 * to resume there is only that one door and a plain press does. (spec 08-56, 08-57)
 */
function pressFresh(airlock: Airlock): void {
  if (!airlock.open) return;
  if (!airlock.standing) {
    openFresh(airlock);
    return;
  }
  airlock.byFinger = true;
  setHold(airlock, true);
}

/**
 * A plain press from anywhere else — the keyboard, which is a shortcut for
 * testing and nothing more. It takes the door that is put forward by default,
 * and the one door there is when there is nothing to resume. (spec 04-56, 08-56, 08-57)
 */
export function pressAirlock(airlock: Airlock): void {
  if (!airlock.open) return;
  if (airlock.standing) leaveAirlock(airlock);
  else openFresh(airlock);
}

/** Whether a button of a reading is down, whatever length the array turned out to be. */
function isDown(reading: PadReading, at: number): boolean {
  return reading.buttons[at]?.pressed === true;
}

/** Whether anything at all is down apart from A and from B. */
function anyOther(reading: PadReading): boolean {
  for (let i = 0; i < reading.buttons.length; i += 1) {
    if (i === HELD_ON || i === NEVER) continue;
    if (isDown(reading, i)) return true;
  }
  return false;
}

/**
 * What the pad says to the two doors. Chapter 8 gives **A** both of its jobs at
 * once — the first door takes "any button of the pad but B", and the second is
 * held on A — so A is the one button settled by **how long it is held**: let go
 * under the second it resumes, held past it, the second door opens. Every other
 * button but B resumes on the press itself, and B is read nowhere.
 * (spec 08-56, 04-57)
 */
function readDoors(airlock: Airlock, reading: PadReading | null): void {
  const held = reading !== null && isDown(reading, HELD_ON);
  const other = reading !== null && anyOther(reading);
  if (held || other) airlock.onPad = true;

  if (airlock.settling) {
    airlock.settling = false;
    airlock.padOther = other;
    airlock.byPad = held;
    return;
  }

  const wasOther = airlock.padOther;
  const wasHeld = airlock.byPad;
  airlock.padOther = other;
  airlock.byPad = held;

  // Nothing to resume: one door, and a plain press of any button but B opens
  // it, A included. (spec 08-57)
  if (!airlock.standing) {
    if ((other && !wasOther) || (held && !wasHeld)) openFresh(airlock);
    return;
  }

  if (other && !wasOther) {
    leaveAirlock(airlock);
    return;
  }
  if (wasHeld && !held) {
    // Let go before the ring had filled: that was a plain press. (spec 08-56)
    setHold(airlock, airlock.byFinger);
    leaveAirlock(airlock);
    return;
  }
  setHold(airlock, held || airlock.byFinger);
}

/**
 * One frame of the Sas, and it owes two things. It asks the browser for the
 * pads, because without that reading `gamepadconnected` never fires (spec
 * 08-54); and it settles the held press against the clock of the frames, which
 * is the one clock this game reads. (spec 10-22)
 */
export function airlockFrame(airlock: Airlock, now: number): void {
  if (!airlock.open) return;
  readDoors(airlock, airlock.hooks.pads());
  if (!airlock.open || !airlock.holding) return;
  if (airlock.since < 0) {
    airlock.since = now;
    return;
  }
  if (now - airlock.since >= HOLD) openFresh(airlock);
}

/**
 * The one threshold of width that opens the Sas, and the only one there is: a
 * window that merely changes size never holds the game up, because a split
 * screen and a turned iPad are ordinary, and not interruptions. Under
 * 400 the touch targets no longer fit, and the Sas is the only honest answer —
 * it stays open until the window widens, and even then it is a press that
 * leaves. (spec 08-9, 08-62, 08-61)
 */
export function senseWidth(airlock: Airlock, width: number): void {
  const narrow = width < NARROW;
  if (narrow === airlock.narrow) return;
  airlock.narrow = narrow;
  if (narrow) openAirlock(airlock);
}
