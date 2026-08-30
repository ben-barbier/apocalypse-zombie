/**
 * The frame of the sound read back against chapter 9. Nothing here makes a real
 * `AudioContext`: WebAudio is stood in for, exactly as the nodes of the page are
 * in `airlock.test.ts`, so what is read is the shape of the graph and the
 * policy of the voices rather than a noise. (spec 10-41, 10-45)
 *
 * The four the chapter is most easily lost on are each a red error here rather
 * than a good intention: **there is one context and it is born of the press
 * that leaves the Sas** (spec 09-7, 08-83), **the seats are counted bus by bus
 * and never as a whole** (spec 09-17), **a full bus loses its oldest voice and
 * never turns the new one away** (spec 09-18), and **the one alarm is the one
 * thing that ducks** (spec 09-21).
 *
 * Every figure below is written out from the spec and from nowhere else.
 */
import { describe, expect, it } from 'vitest';
import {
  BUS,
  FLOOR,
  HELD,
  PLANS,
  type Sound,
  claimVoice,
  envelope,
  hold,
  hush,
  noise,
  releaseVoice,
  sweepVoices,
  wakeSound,
} from './sound';

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
  readonly into: Box[] = [];

  connect(to: Box): Box {
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

  constructor(
    readonly channels: number,
    readonly frames: number,
    readonly rate: number,
  ) {
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

class Ctx {
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly destination = new Box();
  resumed = 0;
  quieted = 0;

  createGain(): Volume {
    return new Volume();
  }

  createStereoPanner(): Sides {
    return new Sides();
  }

  createDynamicsCompressor(): Squeeze {
    return new Squeeze();
  }

  createBuffer(channels: number, frames: number, rate: number): Grain {
    return new Grain(channels, frames, rate);
  }

  createBufferSource(): Player {
    return new Player();
  }

  resume(): Promise<void> {
    this.resumed += 1;
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.quieted += 1;
    return Promise.resolve();
  }
}

/** What the maker was handed, so the settings of the one context can be read. */
let asked: AudioContextOptions[] = [];
let made: Ctx[] = [];

function maker(settings: AudioContextOptions): AudioContext {
  asked.push(settings);
  const ctx = new Ctx();
  made.push(ctx);
  return ctx as unknown as AudioContext;
}

function open(): { sound: Sound; ctx: Ctx } {
  asked = [];
  made = [];
  const sound = wakeSound(null, maker);
  if (sound === null) throw new Error('the sound did not come back');
  return { sound, ctx: made[0] as Ctx };
}

const knobOf = (node: unknown): Knob => (node as { gain: Knob }).gain;
const boxOf = (node: unknown): Box => node as unknown as Box;

// ---------------------------------------------------------------- the context

describe('the one context', () => {
  it('is asked for an interactive latency, and is asked for nothing else', () => {
    const { sound, ctx } = open();
    expect(asked).toEqual([{ latencyHint: 'interactive' }]); // spec 09-7
    expect(made.length).toBe(1);
    expect(sound.ctx).toBe(ctx as unknown as AudioContext);
  });

  it('is made once and resumed after, never made a second time', () => {
    // The press that leaves the Sas is the one place either happens, and a
    // second press finds the context that is already there. (spec 09-7, 08-83)
    const { sound, ctx } = open();
    expect(ctx.resumed).toBe(1);

    const again = wakeSound(sound, maker);
    expect(again).toBe(sound);
    expect(made.length).toBe(1);
    expect(ctx.resumed).toBe(2);
  });

  it('leaves the game mute when nothing comes back, and says nothing at all', () => {
    // No `AudioContext` in this browser, or one that refuses to be built: the
    // game plays on without a sound and without a word. (spec 09-37, 08-84)
    expect(wakeSound(null, () => null)).toBe(null);
    expect(
      wakeSound(null, () => {
        throw new Error('no sound here');
      }),
    ).toBe(null);

    // And every door of this file takes that `null` and does nothing with it.
    expect(() => hush(null)).not.toThrow();
    expect(() => sweepVoices(null)).not.toThrow();
  });
});

// ------------------------------------------------------------------ the graph

describe('the graph', () => {
  it('stands in three storeys, and the compressor is one of them', () => {
    // A voice plugs into the gain of its bus, the six buses into the master,
    // the master through the one compressor and out. (spec 09-8)
    const { sound, ctx } = open();
    expect(sound.strips.length).toBe(6);
    for (const strip of sound.strips) {
      expect(boxOf(strip.node).into).toEqual([boxOf(sound.master)]);
    }
    expect(boxOf(sound.master).into).toEqual([boxOf(sound.compressor)]);
    expect(boxOf(sound.compressor).into).toEqual([ctx.destination]);
  });

  it('holds the master at 0,9 and the compressor at the five figures of the chapter', () => {
    const { sound } = open();
    expect(knobOf(sound.master).value).toBe(0.9);

    const squeeze = sound.compressor as unknown as Squeeze;
    expect(squeeze.threshold.value).toBe(-18); // spec 09 "Les six bus"
    expect(squeeze.knee.value).toBe(12);
    expect(squeeze.ratio.value).toBe(6);
    expect(squeeze.attack.value).toBe(0.004);
    expect(squeeze.release.value).toBe(0.18);
  });

  it('carries the six buses at their gains and their seats', () => {
    // Six and six only, each with the gain and the cap of the chapter.
    // (spec 09-15, 09-16, 09 "Les six bus")
    expect(PLANS.map((plan) => plan.gain)).toEqual([0.85, 0.7, 1, 0.8, 0.8, 0.45]);
    expect(PLANS.map((plan) => plan.seats)).toEqual([6, 5, 3, 4, 3, 4]);

    const { sound } = open();
    for (let bus = 0; bus < sound.strips.length; bus += 1) {
      const strip = sound.strips[bus];
      expect(knobOf(strip.node).value).toBe(PLANS[bus].gain);
      expect(strip.seats.length).toBe(PLANS[bus].seats);
    }
  });

  it('fills one buffer of noise, mono and two seconds long, and only ever one', () => {
    // One buffer for the whole game, filled once at the building with even
    // values in [-1, 1[. (spec 09-10)
    const { sound, ctx } = open();
    const grain = sound.noise as unknown as Grain;
    expect(grain.channels).toBe(1);
    expect(grain.frames).toBe(ctx.sampleRate * 2);
    expect(grain.rate).toBe(ctx.sampleRate);

    const drawn = grain.getChannelData();
    let moved = 0;
    for (const value of drawn) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThan(1);
      if (value !== 0) moved += 1;
    }
    expect(moved).toBeGreaterThan(drawn.length / 2);

    // And a second reading takes that same buffer, from an offset drawn afresh.
    // (spec 09-10, 09-12)
    const voice = claimVoice(sound, BUS.COMBAT, 0.3, 0);
    const first = noise(sound, voice, 0) as unknown as Player;
    const second = noise(sound, voice, 0) as unknown as Player;
    expect(first.buffer).toBe(grain);
    expect(second.buffer).toBe(grain);
    expect(first.loop).toBe(true);
    expect(first.offset).toBeGreaterThanOrEqual(0);
    expect(first.offset).toBeLessThan(2);
  });
});

// -------------------------------------------------------------- the envelopes

describe('an envelope', () => {
  it('leaves the floor, climbs to the peak, and comes back to the floor', () => {
    // `env(peak · attack · decay)`, exponential from end to end, and never from
    // zero — which an exponential ramp does not bear. (spec 09-11)
    const knob = new Knob();
    envelope(knob as unknown as AudioParam, 0.9, 0.003, 0.055, 2);

    expect(knob.wrote.map((written) => written.kind)).toEqual(['set', 'ramp', 'ramp']);
    expect(knob.wrote.map((written) => written.value)).toEqual([FLOOR, 0.9, FLOOR]);
    expect(knob.wrote[0].at).toBe(2);
    expect(knob.wrote[1].at).toBeCloseTo(2.003, 6);
    expect(knob.wrote[2].at).toBeCloseTo(2.058, 6);
    expect(FLOOR).toBe(0.0001);
  });
});

// ----------------------------------------------------------------- the voices

describe('a voice', () => {
  it('takes a seat, and gives it back its span and 150 ms later', () => {
    // (spec 09-13)
    const { sound, ctx } = open();
    const strip = sound.strips[BUS.COINS];

    ctx.currentTime = 10;
    const voice = claimVoice(sound, BUS.COINS, 0.3, 0);
    expect(strip.seats[voice.seat]).toBe(voice);
    expect(voice.until).toBeCloseTo(10.45, 6);

    ctx.currentTime = 10.44;
    sweepVoices(sound);
    expect(strip.seats[voice.seat]).toBe(voice);

    ctx.currentTime = 10.46;
    sweepVoices(sound);
    expect(strip.seats[voice.seat]).toBe(null);
  });

  it('keeps its seat as long as it is held, and gives it back where it is let go', () => {
    // The flame and the pulse are held: no span ever frees them, and the
    // letting go carries the moment their own dying away has finished.
    // (spec 09-13)
    const { sound, ctx } = open();
    const strip = sound.strips[BUS.CANNONS];

    ctx.currentTime = 4;
    const flame = claimVoice(sound, BUS.CANNONS, HELD, 0);
    expect(flame.until).toBe(HELD);

    ctx.currentTime = 40;
    sweepVoices(sound);
    expect(strip.seats[flame.seat]).toBe(flame);

    const source = new Player();
    hold(flame, source as unknown as AudioScheduledSourceNode);
    releaseVoice(sound, flame, 40.3);
    expect(strip.seats[flame.seat]).toBe(null);
    expect(source.ended).toEqual([40.3]);
  });

  it('is given a panner when it is panned, and none at all when it is centred', () => {
    // One `StereoPanner` per panned voice, and nothing else anywhere.
    // (spec 09-29, 09-31)
    const { sound } = open();
    const strip = sound.strips[BUS.COMBAT];

    const centred = claimVoice(sound, BUS.COMBAT, 0.3, 0);
    expect(centred.panner).toBe(null);
    expect(boxOf(centred.out).into).toEqual([boxOf(strip.node)]);

    const aside = claimVoice(sound, BUS.COMBAT, 0.3, -0.28);
    expect(aside.panner).not.toBe(null);
    expect((aside.panner as unknown as Sides).pan.value).toBe(-0.28);
    expect(boxOf(aside.out).into).toEqual([boxOf(aside.panner)]);
    expect(boxOf(aside.panner).into).toEqual([boxOf(strip.node)]);
  });
});

// ------------------------------------------------------------------ the theft

describe('a full bus', () => {
  it('loses its oldest voice and never turns the new one away', () => {
    // The moan must never eat the "tchac": it is the oldest that goes.
    // (spec 09-18, 09-19)
    const { sound, ctx } = open();
    const strip = sound.strips[BUS.COMBAT];

    const moans = [];
    for (let i = 0; i < 6; i += 1) {
      ctx.currentTime = i * 0.14;
      moans.push(claimVoice(sound, BUS.COMBAT, 0.82, 0.7));
    }
    expect(strip.seats.filter((seat) => seat !== null).length).toBe(6);

    ctx.currentTime = 0.9;
    const tchac = claimVoice(sound, BUS.COMBAT, 0.3, 0.28);

    // The new one sits, the first moan is gone, and no seat was added.
    expect(strip.seats[tchac.seat]).toBe(tchac);
    expect(strip.seats.length).toBe(6);
    expect(strip.seats.includes(moans[0])).toBe(false);
    for (let i = 1; i < 6; i += 1) expect(strip.seats.includes(moans[i])).toBe(true);
  });

  it('puts the stolen voice out on 12 ms and unplugs it 120 ms later', () => {
    // (spec 09-18)
    const { sound, ctx } = open();
    const source = new Player();

    ctx.currentTime = 1;
    const first = claimVoice(sound, BUS.WORLD, 0.8, 0);
    hold(first, source as unknown as AudioScheduledSourceNode);
    for (let i = 1; i < 3; i += 1) {
      ctx.currentTime = 1 + i * 0.01;
      claimVoice(sound, BUS.WORLD, 0.8, 0);
    }

    ctx.currentTime = 1.05;
    claimVoice(sound, BUS.WORLD, 0.8, 0);

    const wrote = knobOf(first.out).wrote;
    expect(wrote).toContainEqual({ kind: 'target', value: 0, at: 1.05, tau: 0.012 });
    expect(source.ended).toEqual([1.17]);
    expect(boxOf(first.out).into.length).toBe(1);

    ctx.currentTime = 1.17;
    sweepVoices(sound);
    expect(boxOf(first.out).into).toEqual([]);
  });

  it('counts its seats for itself, and never for the whole of the sound', () => {
    // An assault that fills the combat bus never keeps a coin from being heard.
    // (spec 09-17)
    const { sound, ctx } = open();
    for (let i = 0; i < 9; i += 1) {
      ctx.currentTime = i * 0.05;
      claimVoice(sound, BUS.COMBAT, 0.82, 0.7);
    }

    ctx.currentTime = 1;
    const coins = [];
    for (let i = 0; i < 4; i += 1) coins.push(claimVoice(sound, BUS.COINS, 0.3, 0));
    for (const coin of coins) expect(sound.strips[BUS.COINS].seats.includes(coin)).toBe(true);
  });
});

// ------------------------------------------------------------------- the duck

describe('the duck', () => {
  it('is the one alarm that asks for it, and it lowers the five others', () => {
    // Every other bus goes to 42 % of its own gain, held 450 ms, down on 20 ms
    // and back on 180 ms. (spec 09-20, 09-21, 09-22)
    const { sound, ctx } = open();
    ctx.currentTime = 7;
    claimVoice(sound, BUS.ALARM, 1, 0);

    for (let bus = 0; bus < sound.strips.length; bus += 1) {
      const wrote = knobOf(sound.strips[bus].node).wrote;
      if (bus === BUS.ALARM) {
        expect(wrote).toEqual([]);
        continue;
      }
      const gain = PLANS[bus].gain;
      expect(wrote).toEqual([
        { kind: 'cancel', value: 0, at: 7, tau: 0 },
        { kind: 'target', value: gain * 0.42, at: 7, tau: 0.02 },
        { kind: 'target', value: gain, at: 7.45, tau: 0.18 },
      ]);
    }
    expect(sound.ducking).toBeCloseTo(7.45, 6);
  });

  it('never comes from anything but the alarm', () => {
    // There is one alarm in the whole game and it is the only thing that ducks:
    // no sound of the sword, of a cannon or of a coin ever lowers the rest.
    // (spec 09-20, 09-21)
    const { sound, ctx } = open();
    ctx.currentTime = 3;
    for (const bus of [BUS.COMBAT, BUS.CANNONS, BUS.COINS, BUS.WORLD, BUS.MUSIC]) {
      claimVoice(sound, bus, 0.3, 0);
    }
    for (const strip of sound.strips) expect(knobOf(strip.node).wrote).toEqual([]);
    expect(sound.ducking).toBe(-1);
  });
});

// -------------------------------------------------------------------- the Sas

describe('the Sas', () => {
  it('is never crossed by a sound, held voices and all', () => {
    // The game freezes, the held voices stop, and nothing starts again on its
    // own. (spec 09-14, 08-61)
    const { sound, ctx } = open();
    ctx.currentTime = 5;
    const flame = claimVoice(sound, BUS.CANNONS, HELD, 0);
    const source = new Player();
    hold(flame, source as unknown as AudioScheduledSourceNode);
    const pulse = claimVoice(sound, BUS.MUSIC, HELD, 0);

    hush(sound);

    expect(sound.strips[BUS.CANNONS].seats[flame.seat]).toBe(null);
    expect(sound.strips[BUS.MUSIC].seats[pulse.seat]).toBe(null);
    expect(source.ended).toEqual([5]);
    expect(boxOf(flame.out).into).toEqual([]);
    expect(ctx.quieted).toBe(1);
    expect(ctx.resumed).toBe(1); // and nothing resumed it on the way out
  });

  it('comes back to the six gains the chapter wrote, whatever the duck left', () => {
    // A Sas opened in the middle of a duck must not hand the game back at 42 %.
    const { sound, ctx } = open();
    ctx.currentTime = 2;
    claimVoice(sound, BUS.ALARM, 1, 0);
    knobOf(sound.strips[BUS.COMBAT].node).value = 0.85 * 0.42;

    wakeSound(sound, maker);
    for (let bus = 0; bus < sound.strips.length; bus += 1) {
      expect(knobOf(sound.strips[bus].node).value).toBe(PLANS[bus].gain);
    }
    expect(sound.ducking).toBe(-1);
  });
});
