/**
 * The one door to the disk, and the only file of the whole project that names a
 * store of the browser at all. (spec 10-7)
 *
 * One key, frozen, and three doors — and **not one of them ever throws**. A
 * Safari set to block every cookie throws on the reading of
 * `globalThis.localStorage` *itself*, so that case is met once, here, and never
 * rediscovered anywhere else: a reading that fails is "nothing kept", a writing
 * that fails does nothing at all, and the game plays on without a net and in
 * silence. A run is never interrupted, and there is no message and no screen of
 * error. (spec 08-81, 10-34)
 *
 * There is **no probe at load**: asking whether the store answers would want a
 * second key, and the Instantané is the one thing this game ever leaves behind.
 * (spec 08-79, 08-80, 10 "Pourquoi le stockage tient dans un fichier et trois
 * fonctions")
 *
 * What the text holds is settled by `src/game/snapshot.ts` — the ten fields and
 * the format they are stamped with live there. This file carries a key and a
 * string, and knows nothing at all of either. (spec 08-70, 10-32)
 */

/** The one key, frozen. (spec 08-80, 10-32) */
const KEY = 'apocalypse-zombie:snapshot';

/**
 * The store, or nothing at all. The reading of the field is what throws when
 * every cookie is blocked, which is why it sits inside the try and not beside
 * it; and it is asked for afresh at every door, because a store that was shut
 * at load is not a state this game holds anywhere. (spec 08-81, 10-34)
 */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** What was kept, or `null` — which is also what a store that will not answer says. */
export function readSnapshot(): string | null {
  try {
    return store()?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

/** Writes it, synchronously, and says nothing whatever happens. (spec 10-32, 10-34) */
export function writeSnapshot(text: string): void {
  try {
    store()?.setItem(KEY, text);
  } catch {
    // A store that is full, shut or absent is played without a net, in silence:
    // the game is never held up for it. (spec 08-81, 10-34)
  }
}

/**
 * Throws it away. It is called when a game is left — the town hall fallen, or a
 * new game asked for — and on a text that cannot be read; never on a victory,
 * which keeps its net for the overtime. (spec 08-76, 08-78)
 */
export function clearSnapshot(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // Same silence. (spec 08-81, 10-34)
  }
}
