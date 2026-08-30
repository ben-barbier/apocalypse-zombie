/**
 * The hud: the five things the game shows over the world, and nothing else —
 * the bar of the town hall, the five pips, the purse and its four badges, the
 * street arrows, the phase strip. That list is the **list of exceptions** to the
 * principle the whole game is built on, "what a thing is reads off the thing
 * itself", and it is closed: a sixth goes through chapter 8 by a change to the
 * spec, never through a reflex here. (spec 08-1, 08-2, 08-3)
 *
 * It never repeats what the world already says. A cannon out of firebombs, the
 * cells of a magazine, the armful over his head, the halo, the diamond, the
 * reach, the rim and the mark are all read off the city, and not one of them
 * has a place here. (spec 08-4)
 *
 * **It writes on a fact, and never once a frame.** (spec 08-12) Two things wake
 * it, and they are the whole of it:
 *
 *   - the buffer of events, dealt out by `src/app/main.ts` where the one reading
 *     of it lives — a blow on the town hall, a segment gone, a reinforcement
 *     bought, a gateway lit (spec 10-18, 10-19);
 *   - a handful of scalars compared: the purse, his hp, the wave, which of the
 *     two times is running, how far a preparation has run out, how many are
 *     left, and one number per street for the gauge and one for where the arrow
 *     rides.
 *
 * Every one of the compared scalars is quantised to a whole percent before it is
 * looked at, so a hundredth of the screen is the smallest thing that can ever
 * ask for a write. A run standing still writes nothing at all, and `writes`
 * below is what a test reads to hold this file to that.
 *
 * **It settles no look and no size.** The sheet in `index.html` carries the two
 * dispositions, every size as a share of the smaller side of the screen bounded
 * in pixels, and every colour — of which not one is red, here or anywhere.
 * (spec 08-8, 08-10, 08-14, 08-19) What this file writes is a class name, a
 * figure, or one of three custom properties.
 *
 * It touches no page of its own either: `createHud` is handed a way of finding a
 * node, so `src/app/` stays the one layer that knows a browser, and a test under
 * node hands over its own nodes.
 */
import type { PriceBalance } from '../game/balance';

/**
 * What the hud reads of the one state, and the whole of it: five scalars, the
 * flag of each street, and where the head of each column has got to. It is
 * written out rather than taken as the whole `Game`, because writing it out is
 * what says — and keeps saying — that the hud reads seven things and no eighth.
 * A `Readonly<Game>` answers to it as it stands. (spec 08-12, 10-2, 10-6)
 */
export interface HudColumns {
  readonly count: number;
  readonly street: Uint8Array;
  readonly progress: Float32Array;
}

export interface HudState {
  readonly snapshot: {
    readonly coins: number;
    readonly playerHp: number;
    readonly wave: number;
    readonly streets: Uint8Array;
  };
  readonly assault: {
    readonly prepLeft: number;
    readonly toEnter: number;
    readonly zombies: HudColumns;
    readonly city: { readonly rails: { readonly faceAt: Readonly<Float32Array> } };
  };
}

/**
 * What the hud needs of one node of the page, and the whole of it: a class name,
 * a figure, and a custom property. An `HTMLElement` answers to this as it
 * stands, and so does the plain object a test hands over.
 */
export interface Slab {
  className: string;
  textContent: string | null;
  readonly style: {
    setProperty(name: string, value: string): void;
  };
}

/**
 * The four constants of the game the hud reads, handed over rather than written
 * twice: the ten segments of the bar whatever the notch (spec 08-13), the five
 * pips (spec 08-20), the three streets at most (spec 08-36), and the three left
 * at which the figure goes white (spec 08-40, 03-38). The prices are chapter
 * 6's, and this chapter does nothing but show them. (spec 08, "Les quatre vignettes")
 */
export interface HudRule {
  readonly segments: number;
  readonly pips: number;
  readonly streets: number;
  readonly few: number;
  readonly prices: PriceBalance;
}

/** The badges, in the one fixed order of chapter 8. (spec 08-23) */
export const CANNON = 0;
export const FLAME = 1;
export const CONVEYOR = 2;
export const REINFORCEMENT = 3;
export const BADGES = 4;

// ------------------------------------------------------------- the class names

/**
 * Every class name the hud ever writes, made once. Nothing below builds one, so
 * a write costs no string. The two names of a struck segment and of a
 * reinforced bar are the same look twice over: writing the other one is what
 * starts the flash again on something struck twice running. A pip that comes
 * back keeps the name of its flash, whose look once the flash is over is the
 * plain one. (spec 08-16, 08-17, 08-21)
 */
const SEG = 'seg';
const SEG_STRUCK = ['seg a', 'seg b'];
const SEG_GONE = 'seg gone';
const BAR_FILLED = ['a', 'b'];
const NOTCH = ['n0', 'n1', 'n2', 'n3'];
const PIP_GONE = 'pip gone';
const PIP_BACK = 'pip back';
const BADGE = 'badge';
const BADGE_LIT = 'badge lit';
const ARROW = 'arrow';
const ARROW_ON = 'arrow on';
/**
 * The one look a street opening wears: white at birth, twice its size over two
 * seconds, then its own colour and a beat that runs the whole preparation. The
 * lengths and the beat are in the sheet, as every other look here is.
 * (spec 08-85)
 */
const ARROW_BORN = 'arrow on born';
const PREPARING = 'prep';
const ASSAULTING = 'assault';
const LEFT = '';
const LEFT_FEW = 'few';

// ----------------------------------------------------------------- the writing

export interface Hud {
  readonly rule: HudRule;
  /** The picto whose stuff says the notch, at the left end of the bar. (spec 08-15) */
  readonly notch: Slab;
  readonly bar: Slab;
  readonly segments: readonly Slab[];
  readonly pips: readonly Slab[];
  readonly coins: Slab;
  readonly badges: readonly Slab[];
  /** Where each badge shows what it asks for, in figures. (spec 08-24, 08-29) */
  readonly prices: readonly Slab[];
  /** What each badge asks for, the fourth of them moving with the notch. (spec 08-26) */
  readonly asks: Float64Array;
  readonly arrows: readonly Slab[];
  readonly phase: Slab;
  readonly wave: Slab;
  readonly drain: Slab;
  readonly left: Slab;

  /** What it holds from one frame to the next, so it writes only what has moved. */
  heldCoins: number;
  heldHp: number;
  heldWave: number;
  preparing: boolean;
  /** What the preparation in hand opened on, in seconds, so the bar is a share. */
  prepFull: number;
  heldDrain: number;
  heldLeft: number;
  heldFew: boolean;
  heldStanding: number;
  heldNotch: number;
  readonly heldLit: Uint8Array;
  /** Which of the three looks each arrow is wearing: gone, plain, or born. */
  readonly heldOn: Uint8Array;
  /** Which streets opened on the preparation running, and are being born in it. */
  readonly born: Uint8Array;
  readonly heldGauge: Int16Array;
  readonly heldAt: Int16Array;
  /** How far down each street the head of its column has come, this frame. */
  readonly heads: Float32Array;
  /** Which of the two names a flash last wore, so the next one starts it again. */
  struck: number;
  filled: number;
  /**
   * How many times it has written into the page since it was made. It is the one
   * figure that holds this file to 08-12: a run where nothing moves leaves it
   * where it was, frame after frame.
   */
  writes: number;
}

/** Writes one class name, and counts it. */
function dress(hud: Hud, slab: Slab, look: string): void {
  slab.className = look;
  hud.writes += 1;
}

/** Writes one figure, and counts it. */
function ink(hud: Hud, slab: Slab, figure: number): void {
  slab.textContent = String(figure);
  hud.writes += 1;
}

/** Writes one custom property, and counts it. */
function paint(hud: Hud, slab: Slab, name: string, whole: number): void {
  slab.style.setProperty(name, String(whole));
  hud.writes += 1;
}

// -------------------------------------------------------------- making the hud

function seek(find: (name: string) => Slab | null, name: string): Slab {
  const slab = find(name);
  if (slab === null) throw new Error(`the hud has no ${name}`);
  return slab;
}

function seekRun(find: (name: string) => Slab | null, name: string, held: number): Slab[] {
  const run: Slab[] = [];
  for (let i = 0; i < held; i += 1) run.push(seek(find, `${name}${i}`));
  return run;
}

/**
 * Finds the five displays on a page that already holds them, and holds what they
 * are showing. The page is written out in `index.html` rather than built here:
 * a hud that never writes once a frame has nothing to gain from building its own
 * nodes, and the sheet beside them carries the two dispositions and every colour.
 *
 * What it holds opens on exactly what the page shows — a full row of pips, an
 * empty purse, wave one, an assault — so a game that opens on those writes
 * nothing at all before its first fact.
 */
export function createHud(find: (name: string) => Slab | null, rule: HudRule): Hud {
  const hud: Hud = {
    rule,
    notch: seek(find, 'notch'),
    bar: seek(find, 'bar'),
    segments: seekRun(find, 'seg', rule.segments),
    pips: seekRun(find, 'pip', rule.pips),
    coins: seek(find, 'coins'),
    badges: seekRun(find, 'badge', BADGES),
    prices: seekRun(find, 'price', BADGES),
    asks: new Float64Array(BADGES),
    arrows: seekRun(find, 'arrow', rule.streets),
    phase: seek(find, 'phase'),
    wave: seek(find, 'wave'),
    drain: seek(find, 'prep'),
    left: seek(find, 'left'),

    heldCoins: 0,
    heldHp: rule.pips,
    heldWave: 1,
    preparing: false,
    prepFull: 0,
    heldDrain: -1,
    heldLeft: -1,
    heldFew: false,
    heldStanding: rule.segments,
    heldNotch: 0,
    heldLit: new Uint8Array(BADGES),
    heldOn: new Uint8Array(rule.streets),
    born: new Uint8Array(rule.streets),
    heldGauge: new Int16Array(rule.streets),
    heldAt: new Int16Array(rule.streets),
    heads: new Float32Array(rule.streets),
    struck: 0,
    filled: 0,
    writes: 0,
  };

  hud.heldGauge.fill(-1);
  hud.heldAt.fill(-1);

  // The three that never move, written once off the balance so no figure of the
  // game lives in the page. The fourth arrives with the notch. (spec 08-29)
  hud.asks[CANNON] = rule.prices.cannon;
  hud.asks[FLAME] = rule.prices.tierTwo;
  hud.asks[CONVEYOR] = rule.prices.tierThree;
  for (let i = 0; i < BADGES; i += 1) {
    if (hud.asks[i] > 0) ink(hud, hud.prices[i], hud.asks[i]);
  }
  return hud;
}

// -------------------------------------------------------- what a fact writes

/**
 * A blow taken by the town hall: the segment being eaten lights white for 80 ms,
 * and nothing else moves. Which segment it is needs no reckoning — it is the
 * last one still standing, and the fact that a segment has gone arrives on its
 * own event, after this one. (spec 08-16, 10-19)
 */
export function strikeSegment(hud: Hud): void {
  const at = hud.heldStanding - 1;
  if (at < 0 || at >= hud.segments.length) return;
  dress(hud, hud.segments[at], SEG_STRUCK[hud.struck]);
  hud.struck = hud.struck === 0 ? 1 : 0;
}

/**
 * A tenth of the ceiling is gone: the segments past what is left go almost
 * black, and only a reinforcement ever brings one back. `standing` is what the
 * fact of the rules carries, so nothing here compares two states to find out.
 * (spec 08-18, 06-35, 10-19)
 */
export function loseSegments(hud: Hud, standing: number): void {
  for (let i = standing; i < hud.heldStanding; i += 1) {
    if (i >= 0 && i < hud.segments.length) dress(hud, hud.segments[i], SEG_GONE);
  }
  hud.heldStanding = standing;
}

/**
 * The notch the town hall stands at: the picto changes its stuff — wood, boards,
 * stone, crenellations — which is how the notch is read, and never by a figure.
 * The fourth badge takes the price of the notch to come with it. (spec 08-15, 08-26)
 */
export function showNotch(hud: Hud, notch: number, price: number): void {
  const at = notch < 0 ? 0 : notch >= NOTCH.length ? NOTCH.length - 1 : notch;
  if (at !== hud.heldNotch) {
    hud.heldNotch = at;
    dress(hud, hud.notch, NOTCH[at]);
  }
  if (price !== hud.asks[REINFORCEMENT]) {
    hud.asks[REINFORCEMENT] = price;
    ink(hud, hud.prices[REINFORCEMENT], price);
    lightBadges(hud);
  }
}

/**
 * A reinforcement bought, which is one movement and not two: the whole bar comes
 * back and white fills it from left to right in 400 ms, and the picto takes the
 * stuff of its new notch. (spec 08-17, 06-36)
 */
export function reinforceBar(hud: Hud, notch: number, price: number): void {
  for (let i = 0; i < hud.segments.length; i += 1) {
    if (i >= hud.heldStanding) dress(hud, hud.segments[i], SEG);
  }
  hud.heldStanding = hud.segments.length;
  dress(hud, hud.bar, BAR_FILLED[hud.filled]);
  hud.filled = hud.filled === 0 ? 1 : 0;
  showNotch(hud, notch, price);
}

/**
 * A street opening, which is the most important moment of the game and the one
 * the child has to read without a word: the arrow of that street **is born**,
 * white, grows to twice its size over two seconds, takes its colour, and beats
 * for the whole of the preparation that opens it. (spec 08-85)
 *
 * It comes in on the fact the rules write when a gateway lights, and not on a
 * flag of the state compared with itself — which is what makes it the *birth*
 * of an arrow rather than the mere sight of one: a page coming back from an
 * Instantané at wave seven finds its three streets already active and no fact in
 * the buffer, so nothing is born a second time. (spec 08-86, 10-19)
 *
 * **It is born whether the street is on screen or not.** Nothing here so much as
 * asks: the arrow is always there and always placed, and it is the birth that is
 * the message. (spec 08-31, 08-86)
 */
export function bearArrow(hud: Hud, street: number): void {
  if (street < 0 || street >= hud.born.length) return;
  hud.born[street] = 1;
}

// --------------------------------------------------- what a compared scalar writes

/** A share held to [0, 1] and turned into a whole percent. */
function percentOf(share: number): number {
  if (!(share > 0)) return 0;
  return share >= 1 ? 100 : Math.round(share * 100);
}

/**
 * The four badges: lit when the spend is one the purse can pay for, out when it
 * cannot, and a badge that lights comes in on a white flash of 400 ms. It says
 * "may I pay?" and never "may I here?", which is the diamond's question and the
 * two never overlap. (spec 08-24, 08-25, 08-28)
 *
 * A price the purse has always been able to pay for is not written again, so
 * nothing flashes twice for the same reason.
 */
function lightBadges(hud: Hud): void {
  for (let i = 0; i < BADGES; i += 1) {
    const ask = hud.asks[i];
    const lit = ask > 0 && hud.heldCoins >= ask ? 1 : 0;
    if (lit === hud.heldLit[i]) continue;
    hud.heldLit[i] = lit;
    dress(hud, hud.badges[i], lit === 1 ? BADGE_LIT : BADGE);
  }
}

/**
 * The five pips: one lost goes hollow and dark, and one that comes back comes
 * back on a white flash. His hp are the one gauge with no fact of its own — they
 * grow again on their own every six seconds, and no event of the rules says so —
 * which is exactly what the handful of compared scalars of 08-12 is for.
 * (spec 08-21, 04-41)
 */
function showPips(hud: Hud, hp: number): void {
  for (let i = 0; i < hud.pips.length; i += 1) {
    const full = i < hp;
    if (full === (i < hud.heldHp)) continue; // it was already showing what it shows
    dress(hud, hud.pips[i], full ? PIP_BACK : PIP_GONE);
  }
  hud.heldHp = hp;
}

/** How far down each street the head of its column has come, in one pass of the pool. */
function readHeads(hud: Hud, held: HudState): void {
  const pool = held.assault.zombies;
  hud.heads.fill(0);
  for (let i = 0; i < pool.count; i += 1) {
    const street = pool.street[i];
    if (street >= hud.heads.length) continue;
    if (pool.progress[i] > hud.heads[street]) hud.heads[street] = pool.progress[i];
  }
}

/**
 * The street arrows: one per active street, always there and never gone while
 * the street is active, in the colour of its gateway — the sheet holds the three
 * colours, so nothing here names one. It fills with that colour as the head of
 * the column comes down: empty, they have just walked in; full, they are at the
 * town hall. (spec 08-31, 08-33, 08-34)
 *
 * Where it rides across the screen is the one thing it takes from the camera: a
 * share from the left border to the right, held to the two of them, so a street
 * out of sight puts its arrow flat against the border it lies beyond and a
 * street in sight puts it over its own gateway. It lives in the top two thirds
 * and never lower, and the sheet is what holds it there. (spec 08-32, 08-35)
 *
 * An arrow just borne wears the third look for as long as the preparation that
 * bore it runs, and takes the plain one when the assault opens: a beat that
 * outlived the moment it announces would stop announcing anything. (spec 08-85)
 */
function showArrows(
  hud: Hud,
  held: HudState,
  preparing: boolean,
  across: Readonly<Float32Array>,
): void {
  const streets = held.snapshot.streets;
  // Full is "they are at the town hall", so it is measured against the face each
  // rail stops at and not against the rail: street one stops at the shed, four
  // blocks short, and its arrow has to fill all the same. (spec 03-45, 08-34)
  const stops = held.assault.city.rails.faceAt;
  readHeads(hud, held);

  for (let i = 0; i < hud.arrows.length; i += 1) {
    // The birth is over with the preparation that carried it, and it is over for
    // good: a street opens once. (spec 08-85, 03-28)
    if (!preparing) hud.born[i] = 0;
    const on = streets[i] !== 1 ? 0 : hud.born[i] === 1 ? 2 : 1;
    if (on !== hud.heldOn[i]) {
      hud.heldOn[i] = on;
      dress(hud, hud.arrows[i], on === 0 ? ARROW : on === 1 ? ARROW_ON : ARROW_BORN);
    }
    if (on === 0) continue;

    const gauge = percentOf(stops[i] > 0 ? hud.heads[i] / stops[i] : 0);
    if (gauge !== hud.heldGauge[i]) {
      hud.heldGauge[i] = gauge;
      paint(hud, hud.arrows[i], '--gauge', gauge);
    }

    const at = percentOf((across[i] + 1) / 2);
    if (at !== hud.heldAt[i]) {
      hud.heldAt[i] = at;
      paint(hud, hud.arrows[i], '--at', at);
    }
  }
}

/**
 * The phase strip: the number of the wave, always, and never a total — neither
 * "out of ten" in the main game nor a ceiling in overtime. Under it one reserved
 * height that never carries two things at once: in a preparation a bar that runs
 * out, in an assault the large figure of what is left, which goes white and
 * beats at three or fewer. A wave coming is a bar finishing, and there is no
 * alarm of any kind anywhere near it.
 * (spec 08-37, 08-38, 08-39, 08-40, 08-43, 08-44)
 */
function showPhase(hud: Hud, held: HudState, preparing: boolean): void {
  const assault = held.assault;

  if (preparing !== hud.preparing) {
    hud.preparing = preparing;
    hud.prepFull = 0;
    dress(hud, hud.phase, preparing ? PREPARING : ASSAULTING);
  }

  if (preparing) {
    // What the preparation opened on, taken as it opens rather than worked out:
    // nothing here knows the forty seconds or the thirty, and the bar is a share
    // of what there was. (spec 01-14, 01-15)
    if (assault.prepLeft > hud.prepFull) hud.prepFull = assault.prepLeft;
    const drain = percentOf(hud.prepFull > 0 ? assault.prepLeft / hud.prepFull : 0);
    if (drain !== hud.heldDrain) {
      hud.heldDrain = drain;
      paint(hud, hud.drain, '--drain', drain);
    }
    return;
  }

  const left = assault.zombies.count + assault.toEnter;
  if (left !== hud.heldLeft) {
    hud.heldLeft = left;
    ink(hud, hud.left, left);
  }
  const few = left > 0 && left <= hud.rule.few;
  if (few !== hud.heldFew) {
    hud.heldFew = few;
    dress(hud, hud.left, few ? LEFT_FEW : LEFT);
  }
}

/**
 * One frame of the hud, and it writes only what has moved. `preparing` says
 * which of the two times of the wave is running, and `across` carries one share
 * per street of where its gateway falls between the two borders of the screen:
 * both are settled in `src/app/main.ts`, which is where the enumerations of the
 * rules and the camera are named. (spec 10-2)
 *
 * A game standing still writes nothing at all through this, which is the whole
 * of 08-12.
 */
export function writeHud(
  hud: Hud,
  held: HudState,
  preparing: boolean,
  across: Readonly<Float32Array>,
): void {
  const snapshot = held.snapshot;

  if (snapshot.coins !== hud.heldCoins) {
    hud.heldCoins = snapshot.coins;
    ink(hud, hud.coins, snapshot.coins);
    lightBadges(hud);
  }
  if (snapshot.playerHp !== hud.heldHp) showPips(hud, snapshot.playerHp);
  if (snapshot.wave !== hud.heldWave) {
    hud.heldWave = snapshot.wave;
    ink(hud, hud.wave, snapshot.wave);
  }
  showPhase(hud, held, preparing);
  showArrows(hud, held, preparing, across);
}
