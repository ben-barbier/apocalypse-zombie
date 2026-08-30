/**
 * The seventeen sounds and the one music, read back against chapter 9 figure by
 * figure. Nothing here makes a real `AudioContext`: WebAudio is stood in for, so
 * what is read is the table of figures each sound is — its bus, its panning, its
 * span, its oscillators, its glides, its filters and its envelopes — and never a
 * noise. That is the whole point of synthesising them: a sound of this game is
 * something one reads. (spec 09 "Pourquoi tout est synthétisé", 10-41, 10-45)
 *
 * Every figure below is written out from the chapter and from nowhere else.
 *
 * The stand-in context has **no** `createPanner` that answers: it throws. A
 * `PannerNode` anywhere in `src/audio/` is a red error here rather than a good
 * intention. (spec 09-31)
 */
import { describe, expect, it } from 'vitest';
import { BUS, FLOOR, HELD, PLANS, type Sound, type Voice, wakeSound } from './sound';
import {
  SOUNDS,
  armful,
  beatPulse,
  beginPulse,
  bloup,
  bonus,
  cannonPlaced,
  cannonUpgraded,
  cannonball,
  coin,
  collapse,
  contact,
  createVoices,
  endPulse,
  gateway,
  hushVoices,
  lightFlame,
  moan,
  outFlame,
  reinforcement,
  rise,
  sweepFlames,
  tchac,
  townHallHit,
  whiff,
} from './sounds';

// ------------------------------------------------------------- the stand-ins

interface Written {
  kind: string;
  value: number;
  at: number;
  /** The constant of a `setTargetAtTime`, and 0 everywhere else. */
  tau: number;
}

class Knob {
  value = 0;
  readonly wrote: Written[] = [];

  setValueAtTime(value: number, at: number): Knob {
    this.wrote.push({ kind: 'set', value, at, tau: 0 });
    return this;
  }

  exponentialRampToValueAtTime(value: number, at: number): Knob {
    this.wrote.push({ kind: 'ramp', value, at, tau: 0 });
    return this;
  }

  setTargetAtTime(value: number, at: number, tau: number): Knob {
    this.wrote.push({ kind: 'target', value, at, tau });
    return this;
  }

  cancelScheduledValues(at: number): Knob {
    this.wrote.push({ kind: 'cancel', value: 0, at, tau: 0 });
    return this;
  }
}

class Box {
  readonly into: unknown[] = [];

  connect(to: unknown): unknown {
    this.into.push(to);
    return to;
  }

  disconnect(): void {
    this.into.length = 0;
  }
}

class Volume extends Box {
  readonly gain = new Knob();
}

class Sides extends Box {
  readonly pan = new Knob();
}

class Squeeze extends Box {
  readonly threshold = new Knob();
  readonly knee = new Knob();
  readonly ratio = new Knob();
  readonly attack = new Knob();
  readonly release = new Knob();
}

class Grain {
  readonly held: Float32Array;

  constructor(frames: number) {
    this.held = new Float32Array(frames);
  }

  getChannelData(): Float32Array {
    return this.held;
  }
}

class Player extends Box {
  buffer: Grain | null = null;
  loop = false;
  readonly begun: number[] = [];
  readonly ended: number[] = [];
  offset = -1;

  start(at: number, offset?: number): void {
    this.begun.push(at);
    this.offset = offset ?? 0;
  }

  stop(at: number): void {
    this.ended.push(at);
  }
}

class Tone extends Box {
  type = '';
  readonly frequency = new Knob();
  readonly begun: number[] = [];
  readonly ended: number[] = [];

  start(at: number): void {
    this.begun.push(at);
  }

  stop(at: number): void {
    this.ended.push(at);
  }
}

class Sift extends Box {
  type = '';
  readonly frequency = new Knob();
  readonly Q = new Knob();
}

class Ctx {
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly destination = new Box();

  gains: Volume[] = [];
  tones: Tone[] = [];
  sifts: Sift[] = [];
  grains: Player[] = [];
  sides: Sides[] = [];

  /** Everything made from here on, so one sound at a time can be read. */
  forget(): void {
    this.gains = [];
    this.tones = [];
    this.sifts = [];
    this.grains = [];
    this.sides = [];
  }

  createGain(): Volume {
    const node = new Volume();
    this.gains.push(node);
    return node;
  }

  createStereoPanner(): Sides {
    const node = new Sides();
    this.sides.push(node);
    return node;
  }

  createPanner(): never {
    // spec 09-31: never a `PannerNode`, never an attenuation by distance, never
    // a reverberation. One `StereoPanner` per panned voice, and nothing else.
    throw new Error('a PannerNode has no place in this game');
  }

  createConvolver(): never {
    throw new Error('a reverberation has no place in this game');
  }

  createDynamicsCompressor(): Squeeze {
    return new Squeeze();
  }

  createBiquadFilter(): Sift {
    const node = new Sift();
    this.sifts.push(node);
    return node;
  }

  createOscillator(): Tone {
    const node = new Tone();
    this.tones.push(node);
    return node;
  }

  createBuffer(_channels: number, frames: number): Grain {
    return new Grain(frames);
  }

  createBufferSource(): Player {
    const node = new Player();
    this.grains.push(node);
    return node;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    return Promise.resolve();
  }
}

/** A sound built on a stand-in context, with the clock put at two seconds. */
function open(): { sound: Sound; ctx: Ctx } {
  let made: Ctx | null = null;
  const sound = wakeSound(null, () => {
    made = new Ctx();
    return made as unknown as AudioContext;
  });
  if (sound === null || made === null) throw new Error('the sound did not come back');
  const ctx = made as Ctx;
  ctx.currentTime = 2;
  ctx.forget();
  return { sound, ctx };
}

/** The voice that has just taken a seat on that bus. */
function seated(sound: Sound, bus: number): Voice {
  const seats = sound.strips[bus].seats;
  let found: Voice | null = null;
  for (const voice of seats) {
    if (voice === null) continue;
    if (found === null || voice.at >= found.at) found = voice;
  }
  if (found === null) throw new Error('no voice took a seat');
  return found;
}

const AT = 2;

/** Reads an `env(peak · attack · decay)` off the gain a brick wrote it on. */
function readEnv(gain: Volume, at: number, peak: number, attack: number, decay: number): void {
  const wrote = gain.gain.wrote;
  expect(wrote.map((one) => one.kind)).toEqual(['set', 'ramp', 'ramp']);
  expect(wrote[0].value).toBe(FLOOR);
  expect(wrote[0].at).toBeCloseTo(at, 6);
  expect(wrote[1].value).toBe(peak);
  expect(wrote[1].at).toBeCloseTo(at + attack, 6);
  expect(wrote[2].value).toBe(FLOOR);
  expect(wrote[2].at).toBeCloseTo(at + attack + decay, 6);
}

/** Reads a tone: its shape, its pitch, when it began and when it was cut. */
function readTone(tone: Tone, shape: string, hz: number, at: number, cut: number): void {
  expect(tone.type).toBe(shape);
  expect(tone.frequency.wrote[0].kind).toBe('set');
  expect(tone.frequency.wrote[0].value).toBeCloseTo(hz, 6);
  expect(tone.frequency.wrote[0].at).toBeCloseTo(at, 6);
  expect(tone.begun).toEqual([at]);
  expect(tone.ended.length).toBe(1);
  expect(tone.ended[0]).toBeCloseTo(cut, 6);
}

/** Reads a glide: exponential, to a mark, over a span. */
function readSlide(tone: Tone, to: number, at: number, span: number): void {
  const ramp = tone.frequency.wrote[1];
  expect(ramp.kind).toBe('ramp');
  expect(ramp.value).toBeCloseTo(to, 6);
  expect(ramp.at).toBeCloseTo(at + span, 6);
}

/** Reads a filter: its kind, its cutoff and its Q. */
function readSift(sift: Sift, kind: string, hz: number, q: number): void {
  expect(sift.type).toBe(kind);
  expect(sift.frequency.value).toBe(hz);
  expect(sift.Q.value).toBe(q);
}

/** Reads a burst of the one buffer of noise: looped, started and cut. */
function readNoise(grain: Player, at: number, span: number): void {
  expect(grain.loop).toBe(true);
  expect(grain.begun).toEqual([at]);
  expect(grain.offset).toBeGreaterThanOrEqual(0);
  expect(grain.offset).toBeLessThan(2);
  expect(grain.ended.length).toBe(1);
  expect(grain.ended[0]).toBeCloseTo(at + span, 6);
}

// -------------------------------------------------------------- the table

describe('the table of the seventeen, and the one music', () => {
  it('holds seventeen sounds and one music, and the list is closed', () => {
    // spec 09-4 and the table "Les dix-sept bruitages, et la musique": seventeen
    // and one, and an eighteenth is a decision that goes through the chapter.
    const names = Object.keys(SOUNDS);
    expect(names.length).toBe(18);
    expect(names).toEqual([
      'TCHAC',
      'BLOUP',
      'WHIFF',
      'MOAN',
      'CONTACT',
      'COLLAPSE',
      'RISE',
      'CANNONBALL',
      'FLAME',
      'CANNON_PLACED',
      'CANNON_UPGRADED',
      'TOWN_HALL_HIT',
      'COIN',
      'BONUS',
      'REINFORCEMENT',
      'ARMFUL',
      'GATEWAY',
      'PULSE',
    ]);
  });

  it('gives each of them the bus, the panning and the span of the chapter', () => {
    // The table of chapter 9, row by row. A span of `HELD` is the two the
    // chapter writes "tenue": the flame and the pulse. (spec 09-13)
    expect(SOUNDS.TCHAC).toEqual({ bus: BUS.COMBAT, most: 0.28, span: 0.3 });
    expect(SOUNDS.BLOUP).toEqual({ bus: BUS.COMBAT, most: 0.28, span: 0.4 });
    expect(SOUNDS.WHIFF).toEqual({ bus: BUS.COMBAT, most: 0.28, span: 0.5 });
    expect(SOUNDS.MOAN).toEqual({ bus: BUS.COMBAT, most: 0.7, span: 0.82 });
    expect(SOUNDS.CONTACT).toEqual({ bus: BUS.COMBAT, most: 0, span: 0.4 });
    expect(SOUNDS.COLLAPSE).toEqual({ bus: BUS.COMBAT, most: 0, span: 0.7 });
    expect(SOUNDS.RISE).toEqual({ bus: BUS.COMBAT, most: 0, span: 0.45 });
    expect(SOUNDS.CANNONBALL).toEqual({ bus: BUS.CANNONS, most: 0.7, span: 0.35 });
    expect(SOUNDS.FLAME).toEqual({ bus: BUS.CANNONS, most: 0, span: HELD });
    expect(SOUNDS.CANNON_PLACED).toEqual({ bus: BUS.CANNONS, most: 0, span: 0.6 });
    expect(SOUNDS.CANNON_UPGRADED).toEqual({ bus: BUS.CANNONS, most: 0, span: 0.5 });
    expect(SOUNDS.TOWN_HALL_HIT).toEqual({ bus: BUS.ALARM, most: 0, span: 1 });
    expect(SOUNDS.COIN).toEqual({ bus: BUS.COINS, most: 0, span: 0.3 });
    expect(SOUNDS.BONUS).toEqual({ bus: BUS.COINS, most: 0, span: 0.95 });
    expect(SOUNDS.REINFORCEMENT).toEqual({ bus: BUS.COINS, most: 0, span: 0.9 });
    expect(SOUNDS.ARMFUL).toEqual({ bus: BUS.COINS, most: 0, span: 0.3 });
    expect(SOUNDS.GATEWAY).toEqual({ bus: BUS.WORLD, most: 0, span: 0.8 });
    expect(SOUNDS.PULSE).toEqual({ bus: BUS.MUSIC, most: 0, span: HELD });
  });

  it('pans five of them and five only, the three of the sword held tighter', () => {
    // spec 09-29: the "tchac", the "bloup", the dull whiff, the moan and a ball
    // going out. spec 09-30: the three of the sword are saturated at ±0,28 and
    // not at ±0,7 — what happens under his nose does not wander ear to ear.
    const panned = Object.keys(SOUNDS).filter((name) => SOUNDS[name].most !== 0);
    expect(panned).toEqual(['TCHAC', 'BLOUP', 'WHIFF', 'MOAN', 'CANNONBALL']);
    expect(SOUNDS.TCHAC.most).toBe(0.28);
    expect(SOUNDS.BLOUP.most).toBe(0.28);
    expect(SOUNDS.WHIFF.most).toBe(0.28);
    expect(SOUNDS.MOAN.most).toBe(0.7);
    expect(SOUNDS.CANNONBALL.most).toBe(0.7);
  });

  it('holds the one music on the lowest bus of the six', () => {
    // spec 09-35: it lives on a bus of its own, at the lowest gain of the six —
    // it is only noticed when it stops.
    const music = PLANS[BUS.MUSIC].gain;
    for (let bus = 0; bus < PLANS.length; bus += 1) {
      if (bus === BUS.MUSIC) continue;
      expect(PLANS[bus].gain).toBeGreaterThan(music);
    }
    expect(SOUNDS.PULSE.bus).toBe(BUS.MUSIC);
  });
});

// ------------------------------------------------------------ the panning

describe('the panning', () => {
  it('saturates where the chapter saturates, and never past it', () => {
    // spec 09-28: the sideways gap to the line of sight, normalised on the width
    // of the field and saturated. The gap arrives worked out where the camera is
    // known; the saturation belongs to the sound. (spec 09-30)
    const { sound } = open();

    tchac(sound, 5);
    expect(seated(sound, BUS.COMBAT).panner?.pan.value).toBe(0.28);
    tchac(sound, -5);
    expect(seated(sound, BUS.COMBAT).panner?.pan.value).toBe(-0.28);
    tchac(sound, 0.1);
    expect(seated(sound, BUS.COMBAT).panner?.pan.value).toBeCloseTo(0.1, 6);

    moan(sound, 5);
    expect(seated(sound, BUS.COMBAT).panner?.pan.value).toBe(0.7);
    moan(sound, -5);
    expect(seated(sound, BUS.COMBAT).panner?.pan.value).toBe(-0.7);

    cannonball(sound, 12);
    expect(seated(sound, BUS.CANNONS).panner?.pan.value).toBe(0.7);
  });

  it('gives the twelve centred ones no panner at all', () => {
    // spec 09-29, 09-31: a centred sound pays for nothing, and there is no
    // spatialisation of any other kind anywhere.
    const { sound, ctx } = open();

    contact(sound);
    expect(seated(sound, BUS.COMBAT).panner).toBe(null);
    townHallHit(sound);
    expect(seated(sound, BUS.ALARM).panner).toBe(null);
    coin(sound);
    expect(seated(sound, BUS.COINS).panner).toBe(null);
    gateway(sound);
    expect(seated(sound, BUS.WORLD).panner).toBe(null);
    expect(ctx.sides.length).toBe(0);
  });

  it('makes one panner and one only for each of the five, and none for the twelve', () => {
    const { sound, ctx } = open();
    const voices = createVoices(4);

    tchac(sound, 1);
    bloup(sound, 1);
    whiff(sound, 1);
    moan(sound, 1);
    cannonball(sound, 1);
    expect(ctx.sides.length).toBe(5);

    ctx.forget();
    contact(sound);
    collapse(sound);
    rise(sound);
    lightFlame(sound, voices, 0);
    cannonPlaced(sound);
    cannonUpgraded(sound);
    townHallHit(sound);
    coin(sound);
    bonus(sound);
    reinforcement(sound);
    armful(sound);
    gateway(sound);
    beginPulse(sound, voices);
    expect(ctx.sides.length).toBe(0);
  });

  it('takes a gap that is no number at all as the middle', () => {
    // A spot behind the camera comes back as a gap of ±2 and saturates; nothing
    // ever hands a gap that is not a number, and if it did the sound would sit
    // in the middle rather than at one ear. (spec 09-28)
    const { sound } = open();
    tchac(sound, Number.NaN);
    expect(seated(sound, BUS.COMBAT).panner).toBe(null);
  });
});

// ------------------------------------------------------------- the seats

describe('every sound takes the seat the chapter owes it', () => {
  it('sits on its bus for its span, and 150 ms more', () => {
    // spec 09-13, 09-16: a sound belongs to one bus and one only, and its seat
    // comes free its nominal span and 150 ms after it went out.
    const { sound, ctx } = open();
    const voices = createVoices(4);
    let clock = AT;

    /** Sounds one, a second past the one before, and reads back the seat it took. */
    const owed = (make: () => void, bus: number, span: number): void => {
      clock += 1;
      ctx.currentTime = clock;
      make();
      const voice = seated(sound, bus);
      expect(voice.at).toBe(clock);
      expect(voice.until).toBeCloseTo(clock + span + 0.15, 6);
    };

    owed(() => tchac(sound, 0), BUS.COMBAT, 0.3);
    owed(() => bloup(sound, 0), BUS.COMBAT, 0.4);
    owed(() => whiff(sound, 0), BUS.COMBAT, 0.5);
    owed(() => moan(sound, 0), BUS.COMBAT, 0.82);
    owed(() => contact(sound), BUS.COMBAT, 0.4);
    owed(() => collapse(sound), BUS.COMBAT, 0.7);
    owed(() => rise(sound), BUS.COMBAT, 0.45);

    owed(() => cannonball(sound, 0), BUS.CANNONS, 0.35);
    owed(() => cannonPlaced(sound), BUS.CANNONS, 0.6);
    owed(() => cannonUpgraded(sound), BUS.CANNONS, 0.5);

    owed(() => townHallHit(sound), BUS.ALARM, 1);

    owed(() => coin(sound), BUS.COINS, 0.3);
    owed(() => bonus(sound), BUS.COINS, 0.95);
    owed(() => reinforcement(sound), BUS.COINS, 0.9);
    owed(() => armful(sound), BUS.COINS, 0.3);

    owed(() => gateway(sound), BUS.WORLD, 0.8);

    // And the two that keep their seat until they are let go of.
    ctx.currentTime = clock + 1;
    lightFlame(sound, voices, 0);
    expect(seated(sound, BUS.CANNONS).until).toBe(HELD);
    beginPulse(sound, voices);
    expect(seated(sound, BUS.MUSIC).until).toBe(HELD);
  });

  it('plays on, mute, when there is no sound at all', () => {
    // spec 09-37: no `AudioContext`, no message, no icon — and not one caller
    // pays a test for it.
    const voices = createVoices(4);
    expect(() => {
      tchac(null, 1);
      bloup(null, 1);
      whiff(null, 1);
      moan(null, 1);
      contact(null);
      collapse(null);
      rise(null);
      cannonball(null, 1);
      cannonPlaced(null);
      cannonUpgraded(null);
      townHallHit(null);
      coin(null);
      bonus(null);
      reinforcement(null);
      armful(null);
      gateway(null);
      lightFlame(null, voices, 0);
      outFlame(null, voices, 0);
      sweepFlames(null, voices, 0);
      beginPulse(null, voices);
      beatPulse(null, voices);
      endPulse(null, voices);
    }).not.toThrow();
  });
});

// ------------------------------------------------------------- the combat

describe('the combat', () => {
  it('tchac: a burst of noise and a click over it', () => {
    // spec 09 "Tchac": noise 200 ms through a bandpass at 1 900 Hz Q 1,1 on
    // env(0,9 · 3 ms · 55 ms); a square at 240 Hz on env(0,25 · 2 ms · 30 ms),
    // cut at 50 ms.
    const { sound, ctx } = open();
    tchac(sound, 0);

    readSift(ctx.sifts[0], 'bandpass', 1900, 1.1);
    readNoise(ctx.grains[0], AT, 0.2);
    readEnv(ctx.gains[1], AT, 0.9, 0.003, 0.055);

    readTone(ctx.tones[0], 'square', 240, AT, AT + 0.05);
    readEnv(ctx.gains[2], AT, 0.25, 0.002, 0.03);
  });

  it('bloup: a body that falls away, and a pop a tenth of a second behind it', () => {
    // spec 09 "Bloup": a sine at 430 Hz gliding to 88 Hz in 130 ms, cut at
    // 350 ms, on env(0,8 · 5 ms · 160 ms); a triangle at 760 Hz at +130 ms on
    // env(0,3 · 4 ms · 50 ms), cut at 250 ms.
    const { sound, ctx } = open();
    bloup(sound, 0);

    readTone(ctx.tones[0], 'sine', 430, AT, AT + 0.35);
    readSlide(ctx.tones[0], 88, AT, 0.13);
    readEnv(ctx.gains[1], AT, 0.8, 0.005, 0.16);

    readTone(ctx.tones[1], 'triangle', 760, AT + 0.13, AT + 0.25);
    readEnv(ctx.gains[2], AT + 0.13, 0.3, 0.004, 0.05);
  });

  it('souffle sourd: one burst of noise, low and wide, and nothing else', () => {
    // spec 09 "Souffle sourd": noise 300 ms through a lowpass at 780 Hz Q 0,7 on
    // env(0,35 · 20 ms · 200 ms).
    const { sound, ctx } = open();
    whiff(sound, 0);

    expect(ctx.tones.length).toBe(0);
    readSift(ctx.sifts[0], 'lowpass', 780, 0.7);
    readNoise(ctx.grains[0], AT, 0.3);
    readEnv(ctx.gains[1], AT, 0.35, 0.02, 0.2);
  });

  it('gémissement: a sawtooth that chevrots, through a formant', () => {
    // spec 09 "Gémissement": a sawtooth at 118 Hz × a factor drawn in
    // [0,8 ; 1,3]; an LFO sine at 5,2 Hz reaching 9 Hz on the pitch of the body;
    // a bandpass at 520 Hz Q 2,4; env(0,5 · 90 ms · 620 ms), cut at 770 ms.
    const { sound, ctx } = open();
    moan(sound, 0);

    const body = ctx.tones[0];
    expect(body.type).toBe('sawtooth');
    expect(body.ended[0]).toBeCloseTo(AT + 0.77, 6);

    const slow = ctx.tones[1];
    readTone(slow, 'sine', 5.2, AT, AT + 0.77);
    // The reach of the chevrotement is a plain gain and carries no envelope.
    expect(ctx.gains[1].gain.value).toBe(9);
    expect(ctx.gains[1].gain.wrote).toEqual([]);

    readSift(ctx.sifts[0], 'bandpass', 520, 2.4);
    readEnv(ctx.gains[2], AT, 0.5, 0.09, 0.62);
  });

  it('gémissement: draws its pitch at every voice, and it never says the kind', () => {
    // spec 09-27: between ×0,8 and ×1,3 of 118 Hz, the same draw for the four
    // kinds — thirty voices at one pitch are a machine and not a crowd. spec
    // 09-12: this is one of the two draws `src/audio/` is allowed.
    const { sound, ctx } = open();
    const heard: number[] = [];
    for (let i = 0; i < 200; i += 1) {
      ctx.forget();
      moan(sound, 0);
      heard.push(ctx.tones[0].frequency.wrote[0].value);
    }

    for (const hz of heard) {
      expect(hz).toBeGreaterThanOrEqual(118 * 0.8);
      expect(hz).toBeLessThan(118 * 1.3);
    }
    expect(Math.min(...heard)).toBeLessThan(118);
    expect(Math.max(...heard)).toBeGreaterThan(118 * 1.2);
    // And the door takes no kind at all: there is nothing to hand it one with.
    expect(moan.length).toBe(2);
  });

  it('contact: the weight of the blow, and a little matter over it', () => {
    // spec 09 "Contact": a triangle at 130 Hz gliding to 71,5 Hz in 180 ms, cut
    // at 450 ms, on env(0,8 · 4 ms · 220 ms); noise 120 ms through a bandpass at
    // 1 400 Hz Q 0,8 on env(0,2 · 2 ms · 90 ms).
    const { sound, ctx } = open();
    contact(sound);

    readTone(ctx.tones[0], 'triangle', 130, AT, AT + 0.45);
    readSlide(ctx.tones[0], 71.5, AT, 0.18);
    readEnv(ctx.gains[1], AT, 0.8, 0.004, 0.22);

    readSift(ctx.sifts[0], 'bandpass', 1400, 0.8);
    readNoise(ctx.grains[0], AT, 0.12);
    readEnv(ctx.gains[2], AT, 0.2, 0.002, 0.09);
  });

  it("s'écrouler: the Contact pushed low and long", () => {
    // spec 09 "S'écrouler": a triangle at 90 Hz gliding to 40,5 Hz in 450 ms,
    // cut at 800 ms, on env(0,9 · 6 ms · 520 ms); noise 260 ms through a lowpass
    // at 700 Hz Q 0,7 on env(0,3 · 4 ms · 220 ms).
    const { sound, ctx } = open();
    collapse(sound);

    readTone(ctx.tones[0], 'triangle', 90, AT, AT + 0.8);
    readSlide(ctx.tones[0], 40.5, AT, 0.45);
    readEnv(ctx.gains[1], AT, 0.9, 0.006, 0.52);

    readSift(ctx.sifts[0], 'lowpass', 700, 0.7);
    readNoise(ctx.grains[0], AT, 0.26);
    readEnv(ctx.gains[2], AT, 0.3, 0.004, 0.22);
  });

  it('se relever: the same graph turned back upwards', () => {
    // spec 09 "Se relever": a triangle at 90 Hz gliding to 180 Hz in 320 ms, cut
    // at 500 ms, on env(0,5 · 40 ms · 300 ms); noise 120 ms at +200 ms through a
    // bandpass at 1 200 Hz Q 0,9 on env(0,18 · 4 ms · 100 ms). What goes down is
    // an accident, what climbs is a gain.
    const { sound, ctx } = open();
    rise(sound);

    readTone(ctx.tones[0], 'triangle', 90, AT, AT + 0.5);
    readSlide(ctx.tones[0], 180, AT, 0.32);
    readEnv(ctx.gains[1], AT, 0.5, 0.04, 0.3);

    readSift(ctx.sifts[0], 'bandpass', 1200, 0.9);
    readNoise(ctx.grains[0], AT + 0.2, 0.12);
    readEnv(ctx.gains[2], AT + 0.2, 0.18, 0.004, 0.1);
  });
});

// ------------------------------------------------------------ the cannons

describe('what the cannons say', () => {
  it('boulet tiré: a low that falls away and a blow of noise', () => {
    // spec 09 "Boulet tiré": a sine at 150 Hz gliding to 63 Hz in 150 ms, cut at
    // 300 ms, on env(0,75 · 3 ms · 170 ms); noise 160 ms through a lowpass at
    // 900 Hz Q 0,8 on env(0,22 · 4 ms · 130 ms).
    const { sound, ctx } = open();
    cannonball(sound, 0);

    readTone(ctx.tones[0], 'sine', 150, AT, AT + 0.3);
    readSlide(ctx.tones[0], 63, AT, 0.15);
    readEnv(ctx.gains[1], AT, 0.75, 0.003, 0.17);

    readSift(ctx.sifts[0], 'lowpass', 900, 0.8);
    readNoise(ctx.grains[0], AT, 0.16);
    readEnv(ctx.gains[2], AT, 0.22, 0.004, 0.13);
  });

  it('canon posé: it weighs, and it rattles twenty milliseconds in', () => {
    // spec 09 "Canon posé": a sine at 82 Hz gliding to 49,2 Hz in 300 ms, cut at
    // 700 ms, on env(0,9 · 6 ms · 320 ms); noise 90 ms at +20 ms through a
    // bandpass at 3 100 Hz Q 1,6 on env(0,28 · 2 ms · 70 ms).
    const { sound, ctx } = open();
    cannonPlaced(sound);

    readTone(ctx.tones[0], 'sine', 82, AT, AT + 0.7);
    readSlide(ctx.tones[0], 49.2, AT, 0.3);
    readEnv(ctx.gains[1], AT, 0.9, 0.006, 0.32);

    readSift(ctx.sifts[0], 'bandpass', 3100, 1.6);
    readNoise(ctx.grains[0], AT + 0.02, 0.09);
    readEnv(ctx.gains[2], AT + 0.02, 0.28, 0.002, 0.07);
  });

  it('canon amélioré: it climbs, three squares seventy milliseconds apart', () => {
    // spec 09 "Canon amélioré": 392 Hz, then 493,9 Hz, then 588 Hz, 70 ms
    // between two starts, each on env(0,22 · 5 ms · 110 ms) and cut 200 ms after
    // its own start. The one posed weighs; this one climbs.
    const { sound, ctx } = open();
    cannonUpgraded(sound);

    const climb = [392, 493.9, 588];
    expect(ctx.tones.length).toBe(3);
    for (let i = 0; i < 3; i += 1) {
      const at = AT + i * 0.07;
      readTone(ctx.tones[i], 'square', climb[i], at, at + 0.2);
      readEnv(ctx.gains[i + 1], at, 0.22, 0.005, 0.11);
    }
  });

  it('jet de feu: it holds a voice, and it crackles while it burns', () => {
    // spec 09 "Jet de feu": looped noise through a lowpass at 1 600 Hz Q 1,4; an
    // LFO sine at 11 Hz reaching 560 Hz on that cutoff; the lighting a climb to
    // 0,5 over 60 ms. And it holds its voice — no span ever frees it. (spec 09-13)
    const { sound, ctx } = open();
    const voices = createVoices(4);
    lightFlame(sound, voices, 2);

    const voice = seated(sound, BUS.CANNONS);
    expect(voice.until).toBe(HELD);
    expect(voices.flames[2]).toBe(voice);

    const climb = ctx.gains[0].gain.wrote;
    expect(climb).toEqual([
      { kind: 'set', value: FLOOR, at: AT, tau: 0 },
      { kind: 'ramp', value: 0.5, at: AT + 0.06, tau: 0 },
    ]);

    readSift(ctx.sifts[0], 'lowpass', 1600, 1.4);
    expect(ctx.grains[0].loop).toBe(true);
    expect(ctx.grains[0].begun).toEqual([AT]);
    expect(ctx.grains[0].ended).toEqual([]); // it burns until it is told to stop
    expect(ctx.tones[0].type).toBe('sine');
    expect(ctx.tones[0].frequency.wrote[0].value).toBe(11);
    expect(ctx.gains[1].gain.value).toBe(560);
  });

  it('jet de feu: it goes out on 50 ms and stops its sources 300 ms later', () => {
    // spec 09 "Jet de feu": `setTargetAtTime` τ = 50 ms, sources stopped 300 ms
    // later — which is where the seat comes back. (spec 09-13)
    const { sound, ctx } = open();
    const voices = createVoices(4);
    lightFlame(sound, voices, 2);
    const voice = seated(sound, BUS.CANNONS);

    ctx.currentTime = 9;
    outFlame(sound, voices, 2);

    expect(voices.flames[2]).toBe(null);
    expect(sound.strips[BUS.CANNONS].seats[voice.seat]).toBe(null);
    expect(ctx.gains[0].gain.wrote).toContainEqual({ kind: 'target', value: 0, at: 9, tau: 0.05 });
    expect(ctx.grains[0].ended).toEqual([9.3]);
    expect(ctx.tones[0].ended).toEqual([9.3]);
  });

  it('jet de feu: a cone already burning keeps the voice it has', () => {
    // A cone lights once and goes out once (spec 05-33), so a second lighting is
    // not a second voice — it would hold two seats of the five for one flame.
    const { sound } = open();
    const voices = createVoices(4);
    lightFlame(sound, voices, 1);
    const first = voices.flames[1];
    lightFlame(sound, voices, 1);
    expect(voices.flames[1]).toBe(first);

    // And a cone that never lit gives nothing back.
    expect(() => outFlame(sound, voices, 3)).not.toThrow();
    expect(voices.flames[3]).toBe(null);
  });

  it('jet de feu: lets go of the voice of a cannon that is no longer there', () => {
    // Losing a ground cannon carries the last of the pool into the spot that
    // comes free (spec 10-13), so a voice sitting past the count belongs to a
    // cannon that has gone and would be held for ever. (spec 05-50, 09-13)
    const { sound } = open();
    const voices = createVoices(4);
    lightFlame(sound, voices, 0);
    lightFlame(sound, voices, 3);

    sweepFlames(sound, voices, 1);
    expect(voices.flames[0]).not.toBe(null);
    expect(voices.flames[3]).toBe(null);
  });
});

// -------------------------------------------------------------- the alarm

describe('the one alarm', () => {
  it('mairie touchée: a sub-bass, the crack that carries it, and matter', () => {
    // spec 09 "Mairie touchée": a sine at 62 Hz gliding to 43,4 Hz in 350 ms,
    // cut at 900 ms, on env(1,0 · 5 ms · 700 ms); a triangle at 340 Hz gliding
    // to 187 Hz in 220 ms, cut at 500 ms, on env(0,55 · 3 ms · 240 ms); noise
    // 300 ms through a bandpass at 1 200 Hz Q 0,7 on env(0,3 · 2 ms · 200 ms).
    const { sound, ctx } = open();
    townHallHit(sound);

    readTone(ctx.tones[0], 'sine', 62, AT, AT + 0.9);
    readSlide(ctx.tones[0], 43.4, AT, 0.35);
    readEnv(ctx.gains[1], AT, 1, 0.005, 0.7);

    // It is the crack that carries the message: an iPad does not give 62 Hz back.
    readTone(ctx.tones[1], 'triangle', 340, AT, AT + 0.5);
    readSlide(ctx.tones[1], 187, AT, 0.22);
    readEnv(ctx.gains[2], AT, 0.55, 0.003, 0.24);

    readSift(ctx.sifts[0], 'bandpass', 1200, 0.7);
    readNoise(ctx.grains[0], AT, 0.3);
    readEnv(ctx.gains[3], AT, 0.3, 0.002, 0.2);
  });

  it('is the one thing that ducks the five other buses', () => {
    // spec 09-20, 09-21: one alarm in the whole game, and it is the only thing
    // that lowers the rest — which it does off its bus alone.
    const { sound } = open();
    townHallHit(sound);
    expect(sound.ducking).toBeCloseTo(AT + 0.45, 6);

    const { sound: quiet } = open();
    contact(quiet);
    coin(quiet);
    gateway(quiet);
    cannonPlaced(quiet);
    expect(quiet.ducking).toBe(-1);
  });
});

// -------------------------------------------------------------- the purse

describe('the purse', () => {
  it('pièce ramassée: two notes, whatever the coin is worth', () => {
    // spec 09 "Pièce ramassée": a sine at 880 Hz then one at 1 320 Hz, 45 ms
    // apart, each on env(0,4 · 4 ms · 70 ms) and cut 140 ms after its own start.
    // Two notes and two only: the value reads off the size of the coin.
    const { sound, ctx } = open();
    coin(sound);

    const chime = [880, 1320];
    expect(ctx.tones.length).toBe(2);
    for (let i = 0; i < 2; i += 1) {
      const at = AT + i * 0.045;
      readTone(ctx.tones[i], 'sine', chime[i], at, at + 0.14);
      readEnv(ctx.gains[i + 1], at, 0.4, 0.004, 0.07);
    }
  });

  it('prime de fin d’assaut: ten notes for the ten coins, and it never varies', () => {
    // spec 09 "Prime de fin d'assaut": ten sines on 523 · 587 · 659 · 784 · 880
    // · 1 047 · 1 175 · 1 319 · 1 046 · 1 174 Hz, 55 ms apart, each on
    // env(0,32 · 4 ms · 130 ms) and cut 200 ms after its own start. The last two
    // take the scale up an octave.
    const { sound, ctx } = open();
    bonus(sound);

    const cascade = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1046, 1174];
    expect(ctx.tones.length).toBe(10);
    for (let i = 0; i < 10; i += 1) {
      const at = AT + i * 0.055;
      readTone(ctx.tones[i], 'sine', cascade[i], at, at + 0.2);
      readEnv(ctx.gains[i + 1], at, 0.32, 0.004, 0.13);
    }
  });

  it('renfort acheté: a chord that opens instead of striking', () => {
    // spec 09 "Renfort acheté": four triangles on 196 · 245 · 294 · 392 Hz, all
    // four at once and cut at 900 ms, on env(0,3 · attack · 600 ms) with the
    // attack lengthened by 20 ms at every voice — 50, 70, 90, 110 ms.
    const { sound, ctx } = open();
    reinforcement(sound);

    const chord = [196, 245, 294, 392];
    const opening = [0.05, 0.07, 0.09, 0.11];
    expect(ctx.tones.length).toBe(4);
    for (let i = 0; i < 4; i += 1) {
      readTone(ctx.tones[i], 'triangle', chord[i], AT, AT + 0.9);
      readEnv(ctx.gains[i + 1], AT, 0.3, opening[i], 0.6);
    }
  });

  it('bombe prise à la base: it climbs, and that is the grammar', () => {
    // spec 09 "Bombe prise à la base": a triangle at 340 Hz gliding to 646 Hz in
    // 120 ms, cut at 300 ms, on env(0,35 · 4 ms · 130 ms); noise 80 ms through a
    // bandpass at 1 500 Hz Q 1,2 on env(0,2 · 2 ms · 60 ms).
    const { sound, ctx } = open();
    armful(sound);

    readTone(ctx.tones[0], 'triangle', 340, AT, AT + 0.3);
    readSlide(ctx.tones[0], 646, AT, 0.12);
    readEnv(ctx.gains[1], AT, 0.35, 0.004, 0.13);

    readSift(ctx.sifts[0], 'bandpass', 1500, 1.2);
    readNoise(ctx.grains[0], AT, 0.08);
    readEnv(ctx.gains[2], AT, 0.2, 0.002, 0.06);
  });
});

// -------------------------------------------------------------- the world

describe('the world', () => {
  it("portique qui s'allume: an octave up, and a glint over the top of it", () => {
    // spec 09 "Portique qui s'allume": a sine at 220 Hz gliding to 440 Hz in
    // 350 ms, cut at 800 ms, on env(0,4 · 80 ms · 400 ms); a sine at 1 320 Hz at
    // +300 ms on env(0,22 · 5 ms · 350 ms), cut at 800 ms.
    const { sound, ctx } = open();
    gateway(sound);

    readTone(ctx.tones[0], 'sine', 220, AT, AT + 0.8);
    readSlide(ctx.tones[0], 440, AT, 0.35);
    readEnv(ctx.gains[1], AT, 0.4, 0.08, 0.4);

    readTone(ctx.tones[1], 'sine', 1320, AT + 0.3, AT + 0.8);
    readEnv(ctx.gains[2], AT + 0.3, 0.22, 0.005, 0.35);
  });
});

// -------------------------------------------------------------- the pulse

describe('le pouls', () => {
  it('turns at 96 to the minute, on four notes and one timbre', () => {
    // spec 09-32 and 09 "Le pouls": 96 beats a minute is one beat every 625 ms;
    // 55 · 55 · 65,4 · 49 Hz turning; a triangle through a lowpass at 420 Hz
    // Q 1,1; env(0,5 · 10 ms · 500 ms) on a note, cut at 625 ms; a track gain of
    // 0,5 over the bus of the music.
    const { sound, ctx } = open();
    const voices = createVoices(4);

    beginPulse(sound, voices);
    expect(ctx.gains[0].gain.value).toBe(0.5);
    readSift(ctx.sifts[0], 'lowpass', 420, 1.1);

    // Six beats' worth of frames, a sixtieth of a second at a time.
    for (let i = 0; i < 240; i += 1) {
      ctx.currentTime = AT + i / 60;
      beatPulse(sound, voices);
    }

    const notes = [55, 55, 65.4, 49];
    expect(ctx.tones.length).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < 6; i += 1) {
      const at = AT + i * 0.625;
      readTone(ctx.tones[i], 'triangle', notes[i % 4], at, at + 0.625);
      readEnv(ctx.gains[i + 1], at, 0.5, 0.01, 0.5);
    }
  });

  it('lays every note before it is due, and never one behind', () => {
    // A note placed at the instant a frame notices it is due arrives a frame late
    // and wobbles, so it is laid ahead of the clock — which defers no sound that
    // answers a fact, and the pulse answers none. (spec 09-38, 10-40)
    const { sound, ctx } = open();
    const voices = createVoices(4);
    beginPulse(sound, voices);

    let laid = ctx.tones.length;
    for (let i = 0; i < 240; i += 1) {
      ctx.currentTime = AT + i / 60;
      beatPulse(sound, voices);
      // Whatever this frame laid down was laid at or ahead of the clock, never
      // behind it: a note behind the clock arrives late and wobbles.
      for (let at = laid; at < ctx.tones.length; at += 1) {
        expect(ctx.tones[at].begun[0]).toBeGreaterThanOrEqual(ctx.currentTime);
      }
      laid = ctx.tones.length;
    }
    expect(laid).toBeGreaterThan(6); // and four seconds of frames laid its notes
  });

  it('takes one held voice on the bus of the music, and never a second', () => {
    // spec 09-13, 09-35: one voice, held, alone on its bus. A second entry into
    // an assault while it turns takes nothing more.
    const { sound } = open();
    const voices = createVoices(4);

    beginPulse(sound, voices);
    const voice = voices.pulse;
    expect(voice).not.toBe(null);
    expect(voice?.until).toBe(HELD);

    beginPulse(sound, voices);
    expect(voices.pulse).toBe(voice);
    expect(sound.strips[BUS.MUSIC].seats.filter((seat) => seat !== null).length).toBe(1);
  });

  it('goes out with the last zombie, at the end of the note under way', () => {
    // spec 09-33, 09-34: it runs through an assault and is quiet through a
    // preparation. Nothing more is laid down, and the note that is sounding runs
    // out its own rather than being cut across the middle.
    const { sound, ctx } = open();
    const voices = createVoices(4);

    beginPulse(sound, voices);
    ctx.currentTime = AT + 0.3;
    beatPulse(sound, voices);
    const voice = voices.pulse;
    const owed = voices.beatAt;

    endPulse(sound, voices);
    expect(voices.pulse).toBe(null);
    expect(voice).not.toBe(null);
    if (voice !== null) {
      expect(sound.strips[BUS.MUSIC].seats[voice.seat]).toBe(null);
      expect(voice.until).toBeCloseTo(owed, 6);
    }

    // And nothing more is laid: a preparation is quiet.
    const laid = ctx.tones.length;
    ctx.currentTime = AT + 5;
    beatPulse(sound, voices);
    expect(ctx.tones.length).toBe(laid);
  });

  it('starts again with the next assault, and never on its own', () => {
    // spec 09-14, 09-34: nothing at all starts again by itself; the pulse comes
    // back because an assault opened, which is the one thing that starts it.
    const { sound, ctx } = open();
    const voices = createVoices(4);

    beginPulse(sound, voices);
    ctx.currentTime = AT + 1;
    beatPulse(sound, voices);
    endPulse(sound, voices);

    ctx.currentTime = AT + 30;
    beatPulse(sound, voices);
    expect(voices.pulse).toBe(null);

    beginPulse(sound, voices);
    expect(voices.pulse).not.toBe(null);
    expect(voices.beat).toBe(0); // and it opens on the first of the four notes
    expect(voices.beatAt).toBe(AT + 30);
  });
});

// ------------------------------------------------------- nothing is deferred

describe('nothing is ever deferred', () => {
  it('sounds at the instant the fact fell, or it is never heard at all', () => {
    // spec 09-38: no sound is ever deferred, put in a queue or played later —
    // one behind its fact lies about what has just happened. A full bus loses
    // its oldest voice rather than turning the new one away, so the "tchac" of
    // the child always sounds, and it sounds now. (spec 09-18, 09-19)
    const { sound, ctx } = open();
    for (let i = 0; i < 6; i += 1) {
      ctx.currentTime = AT + i * 0.14;
      moan(sound, 0.5);
    }
    expect(sound.strips[BUS.COMBAT].seats.filter((seat) => seat !== null).length).toBe(6);

    ctx.currentTime = AT + 0.9;
    ctx.forget();
    tchac(sound, 0.5);

    const voice = seated(sound, BUS.COMBAT);
    expect(voice.at).toBeCloseTo(AT + 0.9, 6);
    expect(ctx.tones[0].begun[0]).toBeCloseTo(AT + 0.9, 6);
    expect(ctx.grains[0].begun[0]).toBeCloseTo(AT + 0.9, 6);
    // And no seat was added to hold what was already there. (spec 09-16)
    expect(sound.strips[BUS.COMBAT].seats.length).toBe(6);
  });
});

// ---------------------------------------------------------------- the Sas

describe('the Sas', () => {
  it('is never crossed by a held voice, and nothing starts again on its own', () => {
    // spec 09-14: the game freezes, the held voices stop, and the two handles
    // kept on them are let go of with them.
    const { sound } = open();
    const voices = createVoices(4);

    lightFlame(sound, voices, 0);
    lightFlame(sound, voices, 1);
    beginPulse(sound, voices);

    hushVoices(voices);
    expect(voices.flames.every((flame) => flame === null)).toBe(true);
    expect(voices.pulse).toBe(null);
    expect(voices.beat).toBe(0);
    expect(voices.beatAt).toBe(0);

    // And a frame past the Sas asks for nothing at all.
    expect(() => beatPulse(sound, voices)).not.toThrow();
  });
});
