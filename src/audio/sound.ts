/**
 * The frame of the sound: the one `AudioContext`, the three storeys of the
 * graph, the six buses with their gains and their seats, the theft of the
 * oldest voice, and the one duck there is. The seventeen sounds themselves are
 * not here — this file is what they are made on, and it knows none of them.
 *
 * Everything is synthesised: no file is ever loaded, no set of samples is ever
 * carried, and nothing is added to what the project already depends on.
 * (spec 09-1)
 *
 * This folder is the one place in the game allowed to call `Math.random()` —
 * the offset the noise is read from, and the pitch a moan comes out at. Neither
 * ever reaches the state, neither goes into the Instantané, and neither moves
 * the draw of the world along: the bench plays with no sound at all.
 * (spec 09-12, 10-1)
 *
 * It knows the types of the rules and their buffer of events, and nothing else
 * of the game: it answers what a step says it has just done, and never looks at
 * the state. (spec 09-2, 10-3)
 */

// ------------------------------------------------------------------ the buses

/**
 * The six buses, and there are six. A sound belongs to one of them and to one
 * only, and what fills one never silences another. (spec 09-15, 09-16, 09-17)
 *
 * *Défenses* is `CANNONS` here because the word the chapter uses is forbidden
 * in the code and the four sounds it carries are the cannon's four sounds;
 * *argent* is `COINS` for the same reason. (ADR-0002)
 */
export const BUS = {
  /** The sword, the moan, the blows the child takes. */
  COMBAT: 0,
  /** The ball, the flame, the cannon going down and moving up. */
  CANNONS: 1,
  /** The town hall taking a blow, which is the one alarm there is. (spec 09-20) */
  ALARM: 2,
  /** The purse: a coin, the payment, the reinforcement, the armful. */
  COINS: 3,
  /** A gateway lighting. */
  WORLD: 4,
  /** *Le pouls*, alone on its own bus. (spec 09-35) */
  MUSIC: 5,
} as const;

export type Bus = (typeof BUS)[keyof typeof BUS];

export interface BusPlan {
  /** Its fixed gain, which nothing but the duck ever moves. (spec 09-16) */
  readonly gain: number;
  /** How many voices may sit on it at once, counted here and never as a whole. (spec 09-17) */
  readonly seats: number;
}

/** The gains and the seats of chapter 9, in the order of `BUS`. (spec 09 "Les six bus") */
export const PLANS: readonly BusPlan[] = [
  { gain: 0.85, seats: 6 },
  { gain: 0.7, seats: 5 },
  { gain: 1, seats: 3 },
  { gain: 0.8, seats: 4 },
  { gain: 0.8, seats: 3 },
  { gain: 0.45, seats: 4 },
];

// -------------------------------------------------------------- the constants

/** The gain of the master, the last thing before the compressor. (spec 09 "Les six bus") */
const MASTER = 0.9;

/** The compressor, always in service: no way past it, no setting, no mode. (spec 09-9) */
const SQUEEZE = { threshold: -18, knee: 12, ratio: 6, attack: 0.004, release: 0.18 };

/** How long the one buffer of noise is, in seconds. (spec 09-10) */
const NOISE_SPAN = 2;

/**
 * Where every envelope of the game starts and ends. An exponential ramp does
 * not bear zero, so nothing ever starts from it. (spec 09-11)
 */
export const FLOOR = 0.0001;

/** How long a voice keeps its seat past its nominal span, in seconds. (spec 09-13) */
const TAIL = 0.15;

/** What a held voice writes where a span would go: it keeps its seat until it is let go. (spec 09-13) */
export const HELD = -1;

/** A stolen voice goes out on this constant, and is unplugged this long after. (spec 09-18) */
const THEFT_FADE = 0.012;
const THEFT_CUT = 0.12;

/** The duck of the one alarm: how far down, how long, and the two constants. (spec 09-21, 09-22) */
const DUCK = 0.42;
const DUCK_SPAN = 0.45;
const DUCK_DOWN = 0.02;
const DUCK_UP = 0.18;

/**
 * How many sources one voice may carry. The longest sound of chapter 9 is the
 * cascade of the bonus, which is ten notes in one voice; twelve leaves room and
 * nothing here ever grows. (spec 09 "Prime de fin d'assaut")
 */
const SOURCES = 12;

/**
 * How many stolen voices may wait to be unplugged at once. Every seat of the
 * six buses could be stolen in the same breath and no more than that, so the
 * sum of the six caps is the whole of it. (spec 09-18)
 */
const LEAVING = 25;

// ------------------------------------------------------------------ the voice

export interface Voice {
  readonly bus: Bus;
  /** Which seat of its bus it sits in. */
  readonly seat: number;
  /**
   * Where a sound hangs everything it makes. It is the voice's own gain, and
   * the envelope of the sound is written on it. (spec 09-8, 09-11)
   */
  readonly out: GainNode;
  /**
   * One `StereoPanner` on a panned voice, and none at all on a centred one:
   * twelve of the seventeen sounds are centred and pay for nothing.
   * (spec 09-29, 09-31)
   */
  readonly panner: StereoPannerNode | null;
  /** When it began, on the clock of the audio. */
  readonly at: number;
  /** When its seat comes free, or `HELD` while it is held. (spec 09-13) */
  until: number;
  /** The sources it started; all of them are stopped when it is unplugged. */
  readonly sources: (AudioScheduledSourceNode | null)[];
  taken: number;
}

export interface Strip {
  readonly plan: BusPlan;
  /** The one gain of the bus, which every voice of it plugs into. (spec 09-8) */
  readonly node: GainNode;
  /** Its seats, `null` where one stands free. */
  readonly seats: (Voice | null)[];
}

export interface Sound {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly compressor: DynamicsCompressorNode;
  readonly strips: readonly Strip[];
  /** The one buffer of noise of the whole game, filled once. (spec 09-10) */
  readonly noise: AudioBuffer;
  /** The stolen voices waiting for their unplugging. */
  readonly leaving: (Voice | null)[];
  /** Where the next stolen voice goes in that list. */
  next: number;
  /** When the duck lets go, on the clock of the audio, or -1 when nothing ducks. */
  ducking: number;
}

// ---------------------------------------------------------------- the opening

/**
 * Posed at the loading of the page, and it is the one thing the sound does
 * before a press: without it the silent switch of an iPad cuts the whole game
 * and not merely its sound. It says nothing when it fails. (spec 08-82, 09-37)
 */
export function claimSession(): void {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session === undefined) return;
  try {
    session.type = 'playback';
  } catch {
    // A browser that has the field and refuses the value plays on, mute.
  }
}

/**
 * What the one context is asked for, and the game asks for nothing else: a
 * latency held as short as the browser will hold it, because every sound of
 * this game answers a gesture that has just been made. (spec 09-7)
 */
const SETTINGS: AudioContextOptions = { latencyHint: 'interactive' };

/** What makes the one context. Only a test hands one in; the page uses the browser's. */
export type MakeContext = (settings: AudioContextOptions) => AudioContext | null;

function browserContext(settings: AudioContextOptions): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  return new AudioContext(settings);
}

/**
 * The one place an `AudioContext` is ever made, and the one place `resume()` is
 * ever called: the handler of the press that leaves the Sas, and never a
 * `visibilitychange`, never a frame, never a timer. Handed what it made the
 * time before, it resumes it rather than making a second one — there is one
 * context in this game and there is never another. (spec 09-7, 08-83)
 *
 * If nothing comes back — no `AudioContext` at all, a context that refuses to
 * start — it hands back `null` and **the game plays on, mute**: no message, no
 * icon, no screen. Everything below takes `null` and does nothing with it, so
 * being mute costs the caller not one test. (spec 09-37, 08-84)
 */
export function wakeSound(had: Sound | null, make: MakeContext = browserContext): Sound | null {
  if (had !== null) {
    // Everything held is let go of and the six buses are put back where the
    // chapter wrote them, but the context is **not** suspended on the way in:
    // suspending a breath before resuming is the one way a press could hand
    // the game back mute. (spec 09-14)
    silence(had);
    settle(had);
    void had.ctx.resume().catch(() => {});
    return had;
  }

  let ctx: AudioContext | null = null;
  try {
    ctx = make(SETTINGS);
  } catch {
    ctx = null;
  }
  if (ctx === null) return null;

  try {
    const sound = build(ctx);
    void ctx.resume().catch(() => {});
    return sound;
  } catch {
    return null;
  }
}

/**
 * The three storeys, and they never change: a voice plugs into the gain of its
 * bus, the six buses plug into the master, the master goes through the one
 * compressor and out. (spec 09-8, 09-9)
 */
function build(ctx: AudioContext): Sound {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = SQUEEZE.threshold;
  compressor.knee.value = SQUEEZE.knee;
  compressor.ratio.value = SQUEEZE.ratio;
  compressor.attack.value = SQUEEZE.attack;
  compressor.release.value = SQUEEZE.release;
  compressor.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(compressor);

  const strips: Strip[] = [];
  for (const plan of PLANS) {
    const node = ctx.createGain();
    node.gain.value = plan.gain;
    node.connect(master);
    const seats: (Voice | null)[] = [];
    for (let i = 0; i < plan.seats; i += 1) seats.push(null);
    strips.push({ plan, node, seats });
  }

  const leaving: (Voice | null)[] = [];
  for (let i = 0; i < LEAVING; i += 1) leaving.push(null);

  return { ctx, master, compressor, strips, noise: fillNoise(ctx), leaving, next: 0, ducking: -1 };
}

/**
 * The one buffer of noise of the whole game: mono, two seconds, filled once at
 * the building with even values in `[-1, 1[` and read in a loop from an offset
 * drawn at each voice. (spec 09-10)
 */
function fillNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_SPAN), ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Puts the six buses back at their own gains, whatever the duck left behind. */
function settle(sound: Sound): void {
  const at = sound.ctx.currentTime;
  for (const strip of sound.strips) {
    strip.node.gain.cancelScheduledValues(at);
    strip.node.gain.value = strip.plan.gain;
  }
  sound.ducking = -1;
}

/**
 * The sound never crosses the Sas: the game freezes, the held voices stop, and
 * nothing at all starts again on its own. It is called where the Sas opens, and
 * again on the way back through it. (spec 09-14, 08-61)
 */
export function hush(sound: Sound | null): void {
  if (sound === null) return;
  silence(sound);
  void sound.ctx.suspend().catch(() => {});
}

/** Stops every voice there is, held ones and stolen ones alike. */
function silence(sound: Sound): void {
  const at = sound.ctx.currentTime;
  for (const strip of sound.strips) {
    for (let seat = 0; seat < strip.seats.length; seat += 1) {
      const voice = strip.seats[seat];
      if (voice === null) continue;
      strip.seats[seat] = null;
      unplug(voice, at);
    }
  }
  for (let i = 0; i < sound.leaving.length; i += 1) {
    const voice = sound.leaving[i];
    if (voice === null) continue;
    sound.leaving[i] = null;
    unplug(voice, at);
  }
}

// ----------------------------------------------------------------- the voices

/**
 * Takes a seat on a bus, and it never comes back empty-handed: a full bus loses
 * its **oldest** voice rather than turning the new one away, because the moan
 * must never eat the "tchac". (spec 09-18, 09-19)
 *
 * `span` is the nominal duration in seconds, past which the seat comes free a
 * further 150 ms later, or `HELD` for the two voices that are held — the flame
 * and the pulse — which keep it until they are let go. (spec 09-13)
 *
 * `pan` is 0 on a centred sound, and a centred sound is given no panner at all.
 * The saturations of chapter 9 — ±0,7, ±0,28 — belong to the sound, not here.
 * (spec 09-28, 09-29, 09-30)
 */
export function claimVoice(sound: Sound, bus: Bus, span: number, pan: number): Voice {
  const at = sound.ctx.currentTime;
  sweepVoices(sound, at);

  const strip = sound.strips[bus];
  let seat = strip.seats.indexOf(null);
  if (seat < 0) {
    seat = oldest(strip);
    const robbed = strip.seats[seat];
    if (robbed !== null) steal(sound, robbed, at);
  }

  const out = sound.ctx.createGain();
  out.gain.value = 1;
  let panner: StereoPannerNode | null = null;
  if (pan !== 0) {
    panner = sound.ctx.createStereoPanner();
    panner.pan.value = pan;
    out.connect(panner);
    panner.connect(strip.node);
  } else {
    out.connect(strip.node);
  }

  const sources: (AudioScheduledSourceNode | null)[] = [];
  for (let i = 0; i < SOURCES; i += 1) sources.push(null);

  const voice: Voice = {
    bus,
    seat,
    out,
    panner,
    at,
    until: span === HELD ? HELD : at + span + TAIL,
    sources,
    taken: 0,
  };
  strip.seats[seat] = voice;

  // The one alarm of the game, and the one thing that ducks the rest: it ducks
  // because it sounded, and nothing else in the game may ask for this.
  // (spec 09-20, 09-21)
  if (bus === BUS.ALARM) duck(sound, at);

  return voice;
}

/** Which seat carries the voice that began first. */
function oldest(strip: Strip): number {
  let found = 0;
  let first = Infinity;
  for (let seat = 0; seat < strip.seats.length; seat += 1) {
    const voice = strip.seats[seat];
    if (voice === null) return seat;
    if (voice.at < first) {
      first = voice.at;
      found = seat;
    }
  }
  return found;
}

/**
 * The theft: the voice goes out on a constant of 12 ms — too short to be heard,
 * too long to snap — and is unplugged 120 ms later. Its seat is free at once,
 * which is the whole purpose. (spec 09-18)
 */
function steal(sound: Sound, voice: Voice, at: number): void {
  const strip = sound.strips[voice.bus];
  if (strip.seats[voice.seat] === voice) strip.seats[voice.seat] = null;
  voice.out.gain.cancelScheduledValues(at);
  voice.out.gain.setTargetAtTime(0, at, THEFT_FADE);
  part(sound, voice, at + THEFT_CUT);
}

/** Puts a voice in the list of those waiting to be unplugged, at `cut`. */
function part(sound: Sound, voice: Voice, cut: number): void {
  voice.until = cut;
  for (let i = 0; i < voice.taken; i += 1) stopSource(voice.sources[i], cut);
  const waiting = sound.leaving[sound.next];
  if (waiting !== null) unplug(waiting, cut);
  sound.leaving[sound.next] = voice;
  sound.next = (sound.next + 1) % sound.leaving.length;
}

/**
 * Lets go of a held voice — the flame going out, the pulse stopping. The seat
 * comes free at once and the voice is unplugged at `cut`, which is where the
 * sound's own dying away has been written: a flame goes out on its own constant
 * and stops its sources 300 ms later. (spec 09-13, 09 "Jet de feu")
 */
export function releaseVoice(sound: Sound, voice: Voice, cut: number): void {
  const strip = sound.strips[voice.bus];
  if (strip.seats[voice.seat] !== voice) return;
  strip.seats[voice.seat] = null;
  part(sound, voice, cut);
}

/**
 * Frees what is due: the seats of the voices past their span, and the plugs of
 * the voices that were stolen. It runs at every claim, and the reading of the
 * buffer of events may call it once a frame besides. (spec 09-13, 09-18)
 */
export function sweepVoices(sound: Sound | null, when?: number): void {
  if (sound === null) return;
  const at = when ?? sound.ctx.currentTime;
  for (const strip of sound.strips) {
    for (let seat = 0; seat < strip.seats.length; seat += 1) {
      const voice = strip.seats[seat];
      if (voice === null || voice.until === HELD || voice.until > at) continue;
      strip.seats[seat] = null;
      unplug(voice, at);
    }
  }
  for (let i = 0; i < sound.leaving.length; i += 1) {
    const voice = sound.leaving[i];
    if (voice === null || voice.until > at) continue;
    sound.leaving[i] = null;
    unplug(voice, at);
  }
  if (sound.ducking >= 0 && sound.ducking <= at) sound.ducking = -1;
}

/** Stops everything a voice started and takes it out of the graph. */
function unplug(voice: Voice, at: number): void {
  for (let i = 0; i < voice.taken; i += 1) stopSource(voice.sources[i], at);
  voice.taken = 0;
  try {
    voice.out.disconnect();
    if (voice.panner !== null) voice.panner.disconnect();
  } catch {
    // A node already out of the graph is not a failure.
  }
}

function stopSource(source: AudioScheduledSourceNode | null, at: number): void {
  if (source === null) return;
  try {
    source.stop(at);
  } catch {
    // A source that never started, or one already stopped, wants nothing here.
  }
}

/**
 * Hands a source to the voice that made it, so that a theft or a letting go
 * stops it. Past the twelve a voice carries the source is left alone rather
 * than the list grown: nothing here ever grows.
 */
export function hold(voice: Voice, source: AudioScheduledSourceNode): void {
  if (voice.taken >= voice.sources.length) return;
  voice.sources[voice.taken] = source;
  voice.taken += 1;
}

// ------------------------------------------------------------------- the duck

/**
 * The five other buses go down to 42 % of their own gains, hold for 450 ms and
 * come back. The descent takes a constant of 20 ms, the climb one of 180 ms,
 * and the alarm itself never ducks. (spec 09-21, 09-22)
 */
function duck(sound: Sound, at: number): void {
  for (let bus = 0; bus < sound.strips.length; bus += 1) {
    if (bus === BUS.ALARM) continue;
    const strip = sound.strips[bus];
    strip.node.gain.cancelScheduledValues(at);
    strip.node.gain.setTargetAtTime(strip.plan.gain * DUCK, at, DUCK_DOWN);
    strip.node.gain.setTargetAtTime(strip.plan.gain, at + DUCK_SPAN, DUCK_UP);
  }
  sound.ducking = at + DUCK_SPAN;
}

// ------------------------------------------------------------- the two bricks

/**
 * The one way an envelope is written in this game: `env(peak · attack · decay)`.
 * It leaves `0,0001`, climbs to the peak by the end of the attack, and comes
 * back to `0,0001` a decay later. None of them is linear and none of them
 * leaves zero, which an exponential ramp does not bear. (spec 09-11)
 *
 * The decay is counted **from the peak** and not from the departure, which is
 * the one reading the figures of the chapter bear: the moan is
 * `env(0,5 · 90 ms · 620 ms)` and is cut at 770 ms, and 90 + 620 is what fits
 * under it. (spec 09 "Gémissement")
 */
export function envelope(
  param: AudioParam,
  peak: number,
  attack: number,
  decay: number,
  at: number,
): void {
  param.setValueAtTime(FLOOR, at);
  param.exponentialRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(FLOOR, at + attack + decay);
}

/**
 * A reading of the one buffer of noise, in a loop from an offset drawn at each
 * voice — which is what keeps two bursts of noise from sounding like the same
 * one. It comes back started and plugged into nothing: what filters it is the
 * sound's business. (spec 09-10, 09-12)
 */
export function noise(sound: Sound, voice: Voice, at: number): AudioBufferSourceNode {
  const source = sound.ctx.createBufferSource();
  source.buffer = sound.noise;
  source.loop = true;
  hold(voice, source);
  source.start(at, Math.random() * NOISE_SPAN);
  return source;
}
