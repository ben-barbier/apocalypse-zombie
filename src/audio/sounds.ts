/**
 * The seventeen sounds and the one music, each of them a table of figures taken
 * off chapter 9 and hung on the frame `sound.ts` lays out. Nothing here loads a
 * file and nothing here carries a set of samples: an oscillator, the one buffer
 * of noise, an envelope and a filter are the whole of the toolkit — which is
 * what makes a sound of this game something one reads and retouches in a pull
 * request, exactly like a price or a reach. (spec 09-1)
 *
 * Every one of them goes out because the buffer of events said what the
 * simulation had just done, and never because two pictures differ: there is one
 * door per fact of chapter 9, and the reading of the buffer in `src/app/` is
 * what walks through it. (spec 09-2)
 *
 * The list is closed. Seventeen and one, and an eighteenth is a decision that
 * goes through the chapter rather than a reflex. (spec 09-4)
 *
 * Two of them keep their voice rather than a span: the flame of a cannon, which
 * holds one for as long as it burns, and *le pouls*, which holds one for as long
 * as an assault runs. (spec 09-13)
 */
import {
  BUS,
  type Bus,
  FLOOR,
  HELD,
  type Sound,
  type Voice,
  claimVoice,
  envelope,
  hold,
  noise,
  releaseVoice,
} from './sound';

// ------------------------------------------------------------ the seventeen

/** What a sound is, before a single oscillator: a bus, a width and a span. */
export interface Plan {
  readonly bus: Bus;
  /**
   * How far the panning may go either way, and **0 on a centred sound** — which
   * is twelve of the seventeen, and none of them pays for a panner. Five are
   * panned and five only, and the three of the sword are held far tighter than
   * the other two. (spec 09-28, 09-29, 09-30)
   */
  readonly most: number;
  /** The nominal span in seconds, or `HELD` for the flame and the pulse. (spec 09-13) */
  readonly span: number;
}

/** How wide a panned sound may go, and how wide the three of the sword may. (spec 09-28, 09-30) */
const WIDE = 0.7;
const CLOSE = 0.28;

/**
 * The whole table of chapter 9, in one place and in its order: the family, the
 * bus, the panning and the nominal span. It is written here rather than spread
 * through the seventeen doors below so that it reads back against the chapter
 * without anyone opening a single synthesis.
 * (spec 09 "Les dix-sept bruitages, et la musique")
 */
export const SOUNDS: { readonly [name: string]: Plan } = {
  // Combat
  TCHAC: { bus: BUS.COMBAT, most: CLOSE, span: 0.3 },
  BLOUP: { bus: BUS.COMBAT, most: CLOSE, span: 0.4 },
  WHIFF: { bus: BUS.COMBAT, most: CLOSE, span: 0.5 },
  MOAN: { bus: BUS.COMBAT, most: WIDE, span: 0.82 },
  CONTACT: { bus: BUS.COMBAT, most: 0, span: 0.4 },
  COLLAPSE: { bus: BUS.COMBAT, most: 0, span: 0.7 },
  RISE: { bus: BUS.COMBAT, most: 0, span: 0.45 },
  // What the cannons say
  CANNONBALL: { bus: BUS.CANNONS, most: WIDE, span: 0.35 },
  FLAME: { bus: BUS.CANNONS, most: 0, span: HELD },
  CANNON_PLACED: { bus: BUS.CANNONS, most: 0, span: 0.6 },
  CANNON_UPGRADED: { bus: BUS.CANNONS, most: 0, span: 0.5 },
  // The one alarm there is
  TOWN_HALL_HIT: { bus: BUS.ALARM, most: 0, span: 1 },
  // The purse
  COIN: { bus: BUS.COINS, most: 0, span: 0.3 },
  BONUS: { bus: BUS.COINS, most: 0, span: 0.95 },
  REINFORCEMENT: { bus: BUS.COINS, most: 0, span: 0.9 },
  ARMFUL: { bus: BUS.COINS, most: 0, span: 0.3 },
  // The world
  GATEWAY: { bus: BUS.WORLD, most: 0, span: 0.8 },
  // And the one music
  PULSE: { bus: BUS.MUSIC, most: 0, span: HELD },
};

// ------------------------------------------------------------- the two rules

/**
 * The panning of chapter 9: the sideways gap to the line of sight, worked out
 * where the camera is known and handed here already normalised on the width of
 * the field, saturated at what the sound is allowed. A centred sound is handed
 * nothing and given no panner at all. (spec 09-28, 09-29, 09-31)
 */
function aside(across: number, most: number): number {
  if (most === 0) return 0;
  if (!Number.isFinite(across)) return 0;
  if (across > most) return most;
  if (across < -most) return -most;
  return across;
}

/** Takes the seat a sound is owed. It never comes back empty-handed. (spec 09-18) */
function take(sound: Sound, plan: Plan, across: number): Voice {
  return claimVoice(sound, plan.bus, plan.span, aside(across, plan.most));
}

// ----------------------------------------------------------- the four bricks

/**
 * One brick of a sound: its own gain, carrying its own envelope, plugged into
 * the gain of the voice. A sound of chapter 9 is two or three of them laid over
 * one another, each with a peak, an attack and a decay of its own — which is
 * why the envelope is written here and not on the voice.
 * (spec 09-11, 09 "La convention d'écriture d'une enveloppe")
 */
function brick(
  sound: Sound,
  voice: Voice,
  peak: number,
  attack: number,
  decay: number,
  at: number,
): GainNode {
  const gain = sound.ctx.createGain();
  envelope(gain.gain, peak, attack, decay, at);
  gain.connect(voice.out);
  return gain;
}

/** An oscillator of a shape and a pitch, started and handed to its voice. */
function tone(
  sound: Sound,
  voice: Voice,
  shape: OscillatorType,
  hz: number,
  at: number,
): OscillatorNode {
  const osc = sound.ctx.createOscillator();
  osc.type = shape;
  osc.frequency.setValueAtTime(hz, at);
  hold(voice, osc);
  osc.start(at);
  return osc;
}

/**
 * The glide of chapter 9, which is always exponential: a pitch leaves where the
 * tone was set and reaches its mark at the end of the span.
 */
function slide(osc: OscillatorNode, to: number, at: number, span: number): void {
  osc.frequency.exponentialRampToValueAtTime(to, at + span);
}

/** A filter, of a kind, a cutoff and a Q — the three figures the chapter gives. */
function sifted(sound: Sound, kind: BiquadFilterType, hz: number, q: number): BiquadFilterNode {
  const node = sound.ctx.createBiquadFilter();
  node.type = kind;
  node.frequency.value = hz;
  node.Q.value = q;
  return node;
}

/**
 * A slow oscillator swinging something by so much: the chevrotement of a moan on
 * the pitch of its body, and the crackle of a flame on the cutoff of its filter.
 * It is the same brick twice, so it is written once.
 * (spec 09 "Gémissement", 09 "Jet de feu")
 */
function swing(
  sound: Sound,
  voice: Voice,
  hz: number,
  reach: number,
  onto: AudioParam,
  at: number,
): OscillatorNode {
  const slow = tone(sound, voice, 'sine', hz, at);
  const much = sound.ctx.createGain();
  much.gain.value = reach;
  slow.connect(much);
  much.connect(onto);
  return slow;
}

/** A burst of the one buffer of noise, filtered, enveloped and cut. */
function burst(
  sound: Sound,
  voice: Voice,
  kind: BiquadFilterType,
  hz: number,
  q: number,
  span: number,
  peak: number,
  attack: number,
  decay: number,
  at: number,
): void {
  const grain = noise(sound, voice, at);
  const through = sifted(sound, kind, hz, q);
  grain.connect(through);
  through.connect(brick(sound, voice, peak, attack, decay, at));
  grain.stop(at + span);
}

// ---------------------------------------------------------------- the combat

/**
 * **Tchac** — a blow of his sword that touches without felling. A burst of
 * noise held to a narrow reach of its own, and a click over it that is what
 * makes the blow land rather than merely sound. (spec 09 "Tchac")
 */
export function tchac(sound: Sound | null, across: number): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.TCHAC, across);
  const at = voice.at;

  burst(sound, voice, 'bandpass', 1900, 1.1, 0.2, 0.9, 0.003, 0.055, at);

  const click = tone(sound, voice, 'square', 240, at);
  click.connect(brick(sound, voice, 0.25, 0.002, 0.03, at));
  click.stop(at + 0.05);
}

/**
 * **Bloup** — a fatal blow, whatever landed it. It falls away and pops, and it
 * is comical on purpose: the public is eight years old, and nothing of this
 * game is ever a noise of flesh. (spec 09-5, 09 "Bloup")
 */
export function bloup(sound: Sound | null, across: number): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.BLOUP, across);
  const at = voice.at;

  const body = tone(sound, voice, 'sine', 430, at);
  slide(body, 88, at, 0.13);
  body.connect(brick(sound, voice, 0.8, 0.005, 0.16, at));
  body.stop(at + 0.35);

  // The pop, a tenth of a second behind the fall. Its cut is counted from the
  // start of the sound and not from its own, which is the reading the chapter
  // bears everywhere it offsets a brick. (spec 09 "Portique qui s'allume")
  const pop = tone(sound, voice, 'triangle', 760, at + 0.13);
  pop.connect(brick(sound, voice, 0.3, 0.004, 0.05, at + 0.13));
  pop.stop(at + 0.25);
}

/**
 * **Souffle sourd** — a blow of his sword that touches nothing. It costs him
 * nothing but the time of the gesture, and the sound says exactly that: low,
 * wide and gone. (spec 09 "Souffle sourd")
 */
export function whiff(sound: Sound | null, across: number): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.WHIFF, across);
  burst(sound, voice, 'lowpass', 780, 0.7, 0.3, 0.35, 0.02, 0.2, voice.at);
}

/**
 * **Gémissement** — the moan of the assault, which belongs to no zombie: the
 * rules settle when one goes out and which of the living gives it a side to
 * come from, and this is only the voice of it. (spec 09-24, 09-26)
 *
 * The pitch is drawn afresh at every voice, between ×0,8 and ×1,3 of 118 Hz,
 * and it is the same draw for the four kinds: thirty voices at one pitch are a
 * machine and not a crowd, and a pitch that said the kind would say what the
 * body already says. This is one of the two draws `src/audio/` is allowed, and
 * nothing it draws is ever observable. (spec 09-12, 09-27)
 */
export function moan(sound: Sound | null, across: number): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.MOAN, across);
  const at = voice.at;

  const hz = 118 * (0.8 + Math.random() * 0.5);
  const body = tone(sound, voice, 'sawtooth', hz, at);
  const chevrotement = swing(sound, voice, 5.2, 9, body.frequency, at);

  const formant = sifted(sound, 'bandpass', 520, 2.4);
  body.connect(formant);
  formant.connect(brick(sound, voice, 0.5, 0.09, 0.62, at));
  body.stop(at + 0.77);
  chevrotement.stop(at + 0.77);
}

/**
 * **Contact** — one hit point of his gone. It is the weight of the thing, low
 * and falling, with a little matter over it; and it is the graph the two below
 * are a transposition of. (spec 09 "Contact")
 */
export function contact(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.CONTACT, 0);
  const at = voice.at;

  const weight = tone(sound, voice, 'triangle', 130, at);
  slide(weight, 71.5, at, 0.18);
  weight.connect(brick(sound, voice, 0.8, 0.004, 0.22, at));
  weight.stop(at + 0.45);

  burst(sound, voice, 'bandpass', 1400, 0.8, 0.12, 0.2, 0.002, 0.09, at);
}

/**
 * **S'écrouler** — he goes down where he stands. The Contact pushed towards the
 * low and the long: what goes down is an accident, and this is the furthest
 * down the game ever goes. He is never gone. (spec 09 "S'écrouler")
 */
export function collapse(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.COLLAPSE, 0);
  const at = voice.at;

  const weight = tone(sound, voice, 'triangle', 90, at);
  slide(weight, 40.5, at, 0.45);
  weight.connect(brick(sound, voice, 0.9, 0.006, 0.52, at));
  weight.stop(at + 0.8);

  burst(sound, voice, 'lowpass', 700, 0.7, 0.26, 0.3, 0.004, 0.22, at);
}

/**
 * **Se relever** — the same graph turned back upwards, three seconds later. What
 * climbs is a gain, and it is the very figure the armful at the shed climbs on:
 * two sounds, one grammar. (spec 09 "Se relever")
 */
export function rise(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.RISE, 0);
  const at = voice.at;

  const body = tone(sound, voice, 'triangle', 90, at);
  slide(body, 180, at, 0.32);
  body.connect(brick(sound, voice, 0.5, 0.04, 0.3, at));
  body.stop(at + 0.5);

  burst(sound, voice, 'bandpass', 1200, 0.9, 0.12, 0.18, 0.004, 0.1, at + 0.2);
}

// --------------------------------------------------------------- the cannons

/**
 * **Boulet tiré** — a cannon sends a ball, and this is the one sound the shot
 * ever makes: the landing has none at all, because the aim mark said where it
 * would come down before it left. (spec 09 "Boulet tiré")
 */
export function cannonball(sound: Sound | null, across: number): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.CANNONBALL, across);
  const at = voice.at;

  const low = tone(sound, voice, 'sine', 150, at);
  slide(low, 63, at, 0.15);
  low.connect(brick(sound, voice, 0.75, 0.003, 0.17, at));
  low.stop(at + 0.3);

  burst(sound, voice, 'lowpass', 900, 0.8, 0.16, 0.22, 0.004, 0.13, at);
}

/**
 * **Canon posé** — one goes down. It **weighs**, where the one moving up
 * **climbs**: that is the whole of what tells the two apart by ear, with nobody
 * looking. (spec 09 "Canon posé")
 */
export function cannonPlaced(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.CANNON_PLACED, 0);
  const at = voice.at;

  const weight = tone(sound, voice, 'sine', 82, at);
  slide(weight, 49.2, at, 0.3);
  weight.connect(brick(sound, voice, 0.9, 0.006, 0.32, at));
  weight.stop(at + 0.7);

  burst(sound, voice, 'bandpass', 3100, 1.6, 0.09, 0.28, 0.002, 0.07, at + 0.02);
}

/** The three notes a cannon moving up climbs. (spec 09 "Canon amélioré") */
const CLIMB = [392, 493.9, 588];

/**
 * **Canon amélioré** — one moves up a tier. Three notes, seventy milliseconds
 * apart, and each of them cut two hundred milliseconds after its own start —
 * which is the one place the chapter counts a cut from a brick rather than from
 * the sound. (spec 09 "Canon amélioré")
 */
export function cannonUpgraded(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.CANNON_UPGRADED, 0);

  for (let i = 0; i < CLIMB.length; i += 1) {
    const at = voice.at + i * 0.07;
    const note = tone(sound, voice, 'square', CLIMB[i], at);
    note.connect(brick(sound, voice, 0.22, 0.005, 0.11, at));
    note.stop(at + 0.2);
  }
}

/**
 * **Jet de feu** — a cone lights, and it holds a voice for as long as it burns:
 * six cannons crying fire hold six voices, so the five seats of their bus bound
 * them exactly as they bound the balls. (spec 09-13, 09 "Ce qui déclenche
 * chacun")
 *
 * The lighting is a climb to 0,5 over sixty milliseconds, written on the gain of
 * the voice itself: it is the one thing of this file that is not one brick among
 * several, because a held sound has nothing to lay over itself. Like every other
 * climb of chapter 9 it is exponential and it leaves the floor, which an
 * exponential ramp needs. (spec 09-11, 09 "Jet de feu")
 */
function lightOne(sound: Sound): Voice {
  const voice = take(sound, SOUNDS.FLAME, 0);
  const at = voice.at;

  voice.out.gain.setValueAtTime(FLOOR, at);
  voice.out.gain.exponentialRampToValueAtTime(0.5, at + 0.06);

  const grain = noise(sound, voice, at);
  const through = sifted(sound, 'lowpass', 1600, 1.4);
  grain.connect(through);
  through.connect(voice.out);
  swing(sound, voice, 11, 560, through.frequency, at);

  return voice;
}

/**
 * And its going out: the gain leaves on a constant of fifty milliseconds and the
 * sources stop three hundred milliseconds later, which is where the seat comes
 * back. (spec 09 "Jet de feu")
 */
function outOne(sound: Sound, voice: Voice): void {
  const at = sound.ctx.currentTime;
  voice.out.gain.cancelScheduledValues(at);
  voice.out.gain.setTargetAtTime(0, at, 0.05);
  releaseVoice(sound, voice, at + 0.3);
}

// ----------------------------------------------------------------- the alarm

/**
 * **Mairie touchée** — the one alarm of the whole game, and the one thing that
 * ducks the rest of it, which `claimVoice` does off the bus alone. It exists
 * because the leak is out of sight: he is often at the far end of a street with
 * his back to the square, and every blow taken there is a point of the town hall
 * gone for good. (spec 09-20, 09-21, 09-23)
 *
 * It is the **crack** that carries the message and not the sub-bass: the speaker
 * of an iPad does not give 62 Hz back, and an alarm one only hears on headphones
 * is not an alarm. (spec 09 "Les paramètres de synthèse — alarme")
 */
export function townHallHit(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.TOWN_HALL_HIT, 0);
  const at = voice.at;

  const under = tone(sound, voice, 'sine', 62, at);
  slide(under, 43.4, at, 0.35);
  under.connect(brick(sound, voice, 1, 0.005, 0.7, at));
  under.stop(at + 0.9);

  const crack = tone(sound, voice, 'triangle', 340, at);
  slide(crack, 187, at, 0.22);
  crack.connect(brick(sound, voice, 0.55, 0.003, 0.24, at));
  crack.stop(at + 0.5);

  burst(sound, voice, 'bandpass', 1200, 0.7, 0.3, 0.3, 0.002, 0.2, at);
}

// ------------------------------------------------------------------ the coins

/** The two notes of a coin, whatever the coin is worth. (spec 09 "Pièce ramassée") */
const CHIME = [880, 1320];

/**
 * **Pièce ramassée** — one enters the purse. Two notes, and two whatever it is
 * worth: the value reads off the size of the coin already, and the bravery bonus
 * with it. (spec 09 "Pièce ramassée")
 */
export function coin(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.COIN, 0);

  for (let i = 0; i < CHIME.length; i += 1) {
    const at = voice.at + i * 0.045;
    const note = tone(sound, voice, 'sine', CHIME[i], at);
    note.connect(brick(sound, voice, 0.4, 0.004, 0.07, at));
    note.stop(at + 0.14);
  }
}

/**
 * The cascade, one note a coin, and the last two take the scale up an octave.
 * (spec 09 "Prime de fin d'assaut")
 */
const CASCADE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1046, 1174];

/**
 * **Prime de fin d'assaut** — the town hall pays what closes an assault. Ten
 * notes for the ten coins, and it never varies: not with the wave, not with what
 * he did. That is exactly why a child learns in three assaults that it says
 * "it is over, you held". (spec 09 "Prime de fin d'assaut")
 */
export function bonus(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.BONUS, 0);

  for (let i = 0; i < CASCADE.length; i += 1) {
    const at = voice.at + i * 0.055;
    const note = tone(sound, voice, 'sine', CASCADE[i], at);
    note.connect(brick(sound, voice, 0.32, 0.004, 0.13, at));
    note.stop(at + 0.2);
  }
}

/** The four voices of the chord, and the attack each of them opens on. */
const CHORD = [196, 245, 294, 392];
const OPENING = [0.05, 0.07, 0.09, 0.11];

/**
 * **Renfort acheté** — the chord **opens** instead of striking. The Renfort is
 * what one buys when it is going badly, so it has to relieve and not to reward.
 * (spec 09 "Renfort acheté")
 */
export function reinforcement(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.REINFORCEMENT, 0);
  const at = voice.at;

  for (let i = 0; i < CHORD.length; i += 1) {
    const note = tone(sound, voice, 'triangle', CHORD[i], at);
    note.connect(brick(sound, voice, 0.3, OPENING[i], 0.6, at));
    note.stop(at + 0.9);
  }
}

/**
 * **Bombe prise à la base** — the armful fills at the shed. It climbs, which is
 * the same figure as the getting back up: what climbs is a gain.
 * (spec 09 "Bombe prise à la base")
 */
export function armful(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.ARMFUL, 0);
  const at = voice.at;

  const climb = tone(sound, voice, 'triangle', 340, at);
  slide(climb, 646, at, 0.12);
  climb.connect(brick(sound, voice, 0.35, 0.004, 0.13, at));
  climb.stop(at + 0.3);

  burst(sound, voice, 'bandpass', 1500, 1.2, 0.08, 0.2, 0.002, 0.06, at);
}

// ------------------------------------------------------------------ the world

/**
 * **Portique qui s'allume** — a street becomes active, which is the most
 * important moment of the game. It climbs an octave and glitters over the top of
 * itself. (spec 09 "Portique qui s'allume")
 */
export function gateway(sound: Sound | null): void {
  if (sound === null) return;
  const voice = take(sound, SOUNDS.GATEWAY, 0);
  const at = voice.at;

  const climb = tone(sound, voice, 'sine', 220, at);
  slide(climb, 440, at, 0.35);
  climb.connect(brick(sound, voice, 0.4, 0.08, 0.4, at));
  climb.stop(at + 0.8);

  const glint = tone(sound, voice, 'sine', 1320, at + 0.3);
  glint.connect(brick(sound, voice, 0.22, 0.005, 0.35, at + 0.3));
  glint.stop(at + 0.8);
}

// ------------------------------------------------------- the held voices

/**
 * What the two held sounds of chapter 9 need remembered between two frames: the
 * voice a burning cone holds, by the spot of its cannon in the pool, and the one
 * voice of *le pouls* with the note it owes next.
 *
 * It is here and not in `sound.ts` because the frame of the sound knows none of
 * the seventeen, and it is here and not in `src/app/` because none of this is
 * the business of the page. (spec 09-13)
 */
export interface Voices {
  /** The voice each burning cone holds, by the spot of its cannon. (spec 09-13) */
  readonly flames: (Voice | null)[];
  /** The one voice of the pulse while an assault runs, and nothing between. */
  pulse: Voice | null;
  /** The one lowpass every note of the pulse goes through. */
  through: BiquadFilterNode | null;
  /** When the next note of the pulse begins, on the clock of the audio. */
  beatAt: number;
  /** Which of the four notes that will be. */
  beat: number;
}

export function createVoices(cannons: number): Voices {
  const flames: (Voice | null)[] = [];
  for (let i = 0; i < cannons; i += 1) flames.push(null);
  return { flames, pulse: null, through: null, beatAt: 0, beat: 0 };
}

/**
 * A cone lighting takes a voice and keeps it. One that is already burning keeps
 * the one it has rather than being given a second: a cone lights once and goes
 * out once. (spec 05-33, 09-13)
 */
export function lightFlame(sound: Sound | null, voices: Voices, which: number): void {
  if (sound === null || which < 0 || which >= voices.flames.length) return;
  if (voices.flames[which] !== null) return;
  voices.flames[which] = lightOne(sound);
}

/** And a cone going out lets its voice go, which is where the seat comes back. */
export function outFlame(sound: Sound | null, voices: Voices, which: number): void {
  if (sound === null || which < 0 || which >= voices.flames.length) return;
  const voice = voices.flames[which];
  if (voice === null) return;
  voices.flames[which] = null;
  outOne(sound, voice);
}

/**
 * Lets go of the flame of any spot past the cannons still standing. Losing a
 * ground cannon carries the last of the pool into the spot that comes free
 * (spec 10-13), so a voice left sitting past the count belongs to a cannon that
 * is no longer there and would be held for ever. The cone that was carried in
 * keeps burning and comes back with its own lighting: what the frame of the
 * sound must never do is hold a voice for something that has gone.
 * (spec 05-50, 09-13)
 */
export function sweepFlames(sound: Sound | null, voices: Voices, standing: number): void {
  if (sound === null) return;
  for (let which = standing; which < voices.flames.length; which += 1) {
    outFlame(sound, voices, which);
  }
}

// ------------------------------------------------------------------ the pulse

/** A beat at 96 to the minute, and the four notes that turn on it. (spec 09-32) */
const BEAT = 0.625;
const NOTES = [55, 55, 65.4, 49];

/**
 * How far ahead of the clock of the audio a note is laid down. It is **not** a
 * figure of the chapter: a metronome cannot be written without one, since a note
 * placed at the instant a frame notices it is due arrives a frame late and
 * wobbles. A tenth of a second covers six frames of a display held at 30, which
 * is the slowest the game ever runs. (spec 10-40)
 *
 * It defers nothing that 09-38 speaks of: what may never be deferred is a
 * **sound answering a fact**, and *le pouls* answers none — it is the one music,
 * and it is a tempo. (spec 09-38, 09-32)
 */
const AHEAD = 0.1;

/**
 * The gain of the track, under the four notes and over the bus of the music,
 * which is itself the lowest of the six: the pulse is only noticed when it
 * stops. (spec 09-35, 09 "Le pouls")
 */
const TRACK = 0.5;

/**
 * *Le pouls* starts, which happens on the entry into an assault and nowhere
 * else. It is the one music of the game: a low pulse at 96 to the minute, four
 * notes that turn, no verse and no end — it gives a tempo to the one phase that
 * has none. (spec 09-32, 09-33, 09-34)
 */
export function beginPulse(sound: Sound | null, voices: Voices): void {
  if (sound === null || voices.pulse !== null) return;

  const voice = take(sound, SOUNDS.PULSE, 0);
  voice.out.gain.value = TRACK;

  const through = sifted(sound, 'lowpass', 420, 1.1);
  through.connect(voice.out);

  voices.pulse = voice;
  voices.through = through;
  voices.beatAt = voice.at;
  voices.beat = 0;
}

/**
 * Lays down whatever notes of the pulse are due, and it is called once a frame
 * from the reading of the buffer. A note is a triangle through the one lowpass,
 * held for eighty per cent of its beat and cut at the end of it.
 * (spec 09 "Le pouls")
 */
export function beatPulse(sound: Sound | null, voices: Voices): void {
  const voice = voices.pulse;
  if (sound === null || voice === null || voices.through === null) return;

  const until = sound.ctx.currentTime + AHEAD;
  while (voices.beatAt <= until) {
    const at = voices.beatAt;
    const note = tone(sound, voice, 'triangle', NOTES[voices.beat], at);
    const gain = sound.ctx.createGain();
    envelope(gain.gain, 0.5, 0.01, 0.5, at);
    note.connect(gain);
    gain.connect(voices.through);
    note.stop(at + BEAT);

    voices.beatAt = at + BEAT;
    voices.beat = (voices.beat + 1) % NOTES.length;
  }
}

/**
 * And it goes out with the last zombie of the assault, at the same moment the
 * bonus falls: nothing more is laid down, and the voice is let go of at the end
 * of the note under way. The chapter writes an envelope for a note and no fading
 * for the pulse, so the note that is sounding runs out its own rather than being
 * cut across the middle — and the silence that follows says "it is over" as
 * loudly as the cascade does. (spec 09-33, 09-34)
 */
export function endPulse(sound: Sound | null, voices: Voices): void {
  const voice = voices.pulse;
  voices.pulse = null;
  voices.through = null;
  if (sound === null || voice === null) return;
  releaseVoice(sound, voice, voices.beatAt);
}

/**
 * The Sas, where no sound ever crosses: `hush` has already stopped every voice
 * there is, so what is left here is to forget the handles on the two that were
 * held. Nothing starts again on its own — the pulse comes back with the next
 * assault, and a cone with its next lighting. (spec 09-14)
 */
export function hushVoices(voices: Voices): void {
  for (let which = 0; which < voices.flames.length; which += 1) voices.flames[which] = null;
  voices.pulse = null;
  voices.through = null;
  voices.beatAt = 0;
  voices.beat = 0;
}
