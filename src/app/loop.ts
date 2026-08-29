/**
 * The loop, and the one clock of the game.
 *
 * The step is fixed at 60 Hz with an accumulator: it never depends on the rate
 * of the display. A variable step would make a run irreproducible, therefore the
 * bench impossible, therefore the balancing a blurred mean. What absorbs a slow
 * frame is the accumulator, never the length of a step. (spec 10-21)
 *
 * The clock is the timestamp `requestAnimationFrame` hands over, and nothing
 * else anywhere reads one. The gap between two frames is clamped at 100 ms
 * before it feeds the accumulator, which is six steps caught up at most: a page
 * that comes back after a minute owes six steps, not three thousand six hundred.
 * (spec 10-22, 10-23)
 *
 * A frame is four moves in one order: the buffer is emptied, the steps of this
 * frame fill it, it is read once, and then it is drawn. The drawing interpolates
 * between the two last steps, because at 144 Hz a picture that shows the last
 * step judders visibly. (spec 10-18, 10-24)
 */
import type { LoopBalance } from '../game/balance';
import { EVENT, clearEvents, type EventBuffer, type Game, type InputState } from '../game/state';
import { step } from '../game/step';

/** Where the simulation stands against the frame that is being drawn. */
export interface Clock {
  /** The timestamp of the frame before, in ms, or -1 before the first one. (spec 10-22) */
  last: number;
  /** Seconds the simulation is owed and has not run. (spec 10-21) */
  owed: number;
  /** Seconds of held picture left on a fatal blow, and never caught up. (spec 10-26) */
  frozen: number;
  /** Where this frame sits between the two last steps, in [0, 1). (spec 10-24) */
  alpha: number;
  /** How many steps the last frame ran, six at most. (spec 10-23) */
  steps: number;
}

export function createClock(): Clock {
  return { last: -1, owed: 0, frozen: 0, alpha: 0, steps: 0 };
}

/**
 * Moves the clock on by one frame: it reads a timestamp and settles how many
 * steps this frame owes and where it sits between the two last ones. The first
 * frame owes nothing, because there is no frame before it to measure from.
 */
export function advance(clock: Clock, now: number, loop: LoopBalance): void {
  const seconds = 1 / loop.hz;
  if (clock.last < 0) {
    clock.last = now;
    clock.steps = 0;
    return;
  }

  let gap = (now - clock.last) / 1000;
  clock.last = now;
  // A timestamp that walks backwards owes nothing rather than something absurd.
  if (!(gap > 0)) gap = 0;
  if (gap > loop.frameClamp) gap = loop.frameClamp; // spec 10-23

  // The freeze of a fatal blow eats its share of the gap and hands it to no one:
  // the picture holds, and those milliseconds are never caught up. (spec 10-26)
  if (clock.frozen > 0) {
    const eaten = clock.frozen < gap ? clock.frozen : gap;
    clock.frozen -= eaten;
    gap -= eaten;
  }

  clock.owed += gap;
  let steps = 0;
  while (clock.owed >= seconds && steps < loop.maxCatchUp) {
    clock.owed -= seconds;
    steps += 1;
  }
  clock.steps = steps;
  clock.alpha = clock.owed / seconds;
}

/**
 * Arms the freeze when this frame felled something. The one fact the loop takes
 * for itself out of the buffer, and it takes it before anyone draws. (spec 10-26)
 */
export function takeFreeze(clock: Clock, events: Readonly<EventBuffer>, seconds: number): void {
  for (let i = 0; i < events.count; i += 1) {
    if (events.type[i] === EVENT.FATAL_BLOW) {
      clock.frozen = seconds;
      return;
    }
  }
}

export interface LoopHooks {
  /**
   * Fills the one `InputState` for the step about to run. It is called once per
   * step and never once per frame, because a rising edge is cleared by the
   * reading: a frame that owes six steps hands the jump to the first of them and
   * nothing to the five that follow. A run with no entries leaves it out.
   * (spec 10-30, 10-31)
   */
  sample?(): void;
  /**
   * Reads the buffer, once, before the drawing. It is handed the one clock of
   * the game, because what it starts — an effect that lasts a fraction of a
   * second — runs on the frame and not on the step. (spec 10-18, 10-19, 10-22)
   */
  read(game: Readonly<Game>, now: number): void;
  /** Draws, interpolating between the two last steps. (spec 10-24) */
  draw(game: Readonly<Game>, alpha: number, now: number): void;
}

export interface Loop {
  readonly game: Game;
  readonly input: InputState;
  readonly hooks: LoopHooks;
  readonly clock: Clock;
  running: boolean;
  /** What `requestAnimationFrame` hands back, so the loop can be stopped. */
  handle: number;
  /** The one callback, made once: a frame allocates nothing. (spec 10-14) */
  onFrame: (now: number) => void;
}

export function createLoop(game: Game, input: InputState, hooks: LoopHooks): Loop {
  const loop: Loop = {
    game,
    input,
    hooks,
    clock: createClock(),
    running: false,
    handle: 0,
    onFrame: () => {},
  };
  loop.onFrame = (now: number): void => {
    frame(loop, now);
    if (loop.running) loop.handle = requestAnimationFrame(loop.onFrame);
  };
  return loop;
}

/** One frame, in its one order. Takes the timestamp it is handed. (spec 10-18, 10-22) */
export function frame(loop: Loop, now: number): void {
  const game = loop.game;
  const clock = loop.clock;
  const events = game.assault.events;

  clearEvents(events); // emptied at the start of the frame (spec 10-18)
  advance(clock, now, game.balance.loop);
  for (let i = 0; i < clock.steps; i += 1) {
    loop.hooks.sample?.(); // the entries are sampled at the step (spec 10-31)
    step(game, loop.input);
  }

  takeFreeze(clock, events, game.balance.loop.fatalBlowFreeze); // spec 10-26
  loop.hooks.read(game, now); // read once, before the drawing (spec 10-18)
  loop.hooks.draw(game, clock.alpha, now); // spec 10-24
}

/** Hands the loop to the one clock of the game. (spec 10-22) */
export function startLoop(loop: Loop): void {
  if (loop.running) return;
  loop.running = true;
  loop.handle = requestAnimationFrame(loop.onFrame);
}

export function stopLoop(loop: Loop): void {
  if (!loop.running) return;
  loop.running = false;
  cancelAnimationFrame(loop.handle);
}
