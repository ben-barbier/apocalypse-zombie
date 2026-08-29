/**
 * The one WebGL context of the whole game, and the two facts it can send.
 *
 * A GPU takes its context back whenever it likes — a tab in the background, a
 * device that warms up, a driver that gives up. Nothing comes back unless the
 * page says it wants it back, which is what `preventDefault()` on the loss says
 * and nothing else does. Then the scene is built again from the state, because
 * the scene is a projection of the state and no datum of the game lives only on
 * the GPU. If nothing comes back at all, the page reloads rather than sit on a
 * black screen. (spec 10-37, 10-38)
 *
 * There is exactly one of these, ever. (spec 10, "Le budget de rendu")
 */
import * as THREE from 'three';

/** How long the page waits for the GPU before it gives up and reloads. (spec 10-38) */
export const GRACE = 3000;

/** What one of the two facts of a context carries. */
export interface SurfaceFact {
  preventDefault(): void;
}

/** What this file needs of the canvas it hangs the context on. */
export interface Surface {
  addEventListener(kind: string, handler: (fact: SurfaceFact) => void): void;
  removeEventListener(kind: string, handler: (fact: SurfaceFact) => void): void;
}

/**
 * What the rest of the code needs of the one renderer. It is an interface and
 * not the class itself so a test with no GPU can hand its own in: the tests run
 * under node, and there is no rendering test, no screenshot and no driven
 * browser anywhere in this project. (spec 10-45)
 */
export interface Renderer {
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

export interface ContextHooks {
  /** Builds the scene again from the state, once the GPU is back. (spec 10-37) */
  repopulate(): void;
  /** Opens the Sas while the GPU is away, and closes it when it is back. (spec 10-38) */
  onLost?: () => void;
  onBack?: () => void;
  /** What reloads the page when nothing comes back. (spec 10-38) */
  reload?: () => void;
  /** The one renderer. Only a test with no GPU hands this in. */
  make?: (surface: Surface) => Renderer;
}

export interface Context {
  readonly renderer: Renderer;
  readonly surface: Surface;
  readonly hooks: ContextHooks;
  /** True while the GPU has taken the context away. */
  lost: boolean;
  /** The three-second watch, armed while it is away. (spec 10-38) */
  waiting: ReturnType<typeof setTimeout> | null;
  /** The two handlers, made once so they can be taken off again. */
  whenLost: (fact: SurfaceFact) => void;
  whenBack: (fact: SurfaceFact) => void;
}

/** The one context of the game. Nothing else in `src/` builds a renderer. */
function onCanvas(surface: Surface): Renderer {
  return new THREE.WebGLRenderer({ canvas: surface as unknown as HTMLCanvasElement });
}

function reloadPage(): void {
  location.reload();
}

export function createContext(surface: Surface, hooks: ContextHooks): Context {
  const make = hooks.make ?? onCanvas;
  const context: Context = {
    renderer: make(surface),
    surface,
    hooks,
    lost: false,
    waiting: null,
    whenLost: () => {},
    whenBack: () => {},
  };

  context.whenLost = (fact: SurfaceFact): void => {
    // Without this the context is gone for good: the default is to never
    // restore. (spec 10-38)
    fact.preventDefault();
    if (context.lost) return;
    context.lost = true;
    context.hooks.onLost?.();
    context.waiting = setTimeout(() => {
      context.waiting = null;
      if (!context.lost) return;
      (context.hooks.reload ?? reloadPage)();
    }, GRACE);
  };

  context.whenBack = (_fact: SurfaceFact): void => {
    if (context.waiting !== null) {
      clearTimeout(context.waiting);
      context.waiting = null;
    }
    if (!context.lost) return;
    context.lost = false;
    context.hooks.repopulate();
    context.hooks.onBack?.();
  };

  surface.addEventListener('webglcontextlost', context.whenLost);
  surface.addEventListener('webglcontextrestored', context.whenBack);
  return context;
}

/**
 * The one place a resolution is set. It is never above 1, whatever the screen
 * claims: the fragment is the rare resource of this game, and the quality scale
 * only ever takes it down. (spec 10, "Le budget de rendu", 10-39)
 */
export function resize(context: Context, width: number, height: number, ratio: number): void {
  context.renderer.setPixelRatio(ratio > 1 ? 1 : ratio);
  context.renderer.setSize(width, height);
}

/** Takes the two handlers off and drops the context. */
export function closeContext(context: Context): void {
  context.surface.removeEventListener('webglcontextlost', context.whenLost);
  context.surface.removeEventListener('webglcontextrestored', context.whenBack);
  if (context.waiting !== null) {
    clearTimeout(context.waiting);
    context.waiting = null;
  }
  context.renderer.dispose();
}
