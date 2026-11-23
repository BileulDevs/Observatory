/**
 * Adaptive resolution: watches how long continuous frames take and scales the drawing resolution to keep motion
 * smooth. The quality tier (quality.ts) is a guess made once at start-up from the device; this corrects it with what
 * the GPU actually does, for instance an integrated GPU classed "medium", or a heavy scene (nebula ray-march, ISS).
 *
 * Falls fast and climbs slowly: one slow second lowers the resolution, several smooth seconds in a row raise it
 * back, so it settles instead of oscillating. Pure logic, no Three.js: tested by tests/adaptiveResolution.test.ts.
 */

export interface AdaptiveResolutionOptions {
  /** Lowest scale of the device's pixel ratio. 0.6 of a 2× screen is still 1.2 device pixels per CSS pixel. */
  min?: number
}

/** Length of one measurement, ms of frames. Shorter reacts to noise; longer leaves a stutter on screen longer. */
const WINDOW_MS = 1000
/** Below this average frame rate over a window, the resolution goes down. */
const LOW_FPS = 48
/** At or above this rate a window counts as smooth (just under 60: a 60 Hz display never reports more). */
const HIGH_FPS = 57
/** Smooth windows in a row before the resolution goes back up one step. */
const SMOOTH_WINDOWS_TO_RAISE = 3
/** Scale factors of one step down and one step up. */
const STEP_DOWN = 0.85
const STEP_UP = 1.1
/** After a change, measurements are ignored this long: the first frames at the new size are not representative. */
const COOLDOWN_MS = 1500
/** A frame longer than this is a hitch (tab switch, long task, shader compile), not the GPU's pace: skipped. */
const HITCH_MS = 250

export class AdaptiveResolution {
  /** Current scale of the device pixel ratio, in [min, 1]. */
  scale = 1

  private readonly min: number
  private sum = 0
  private count = 0
  private smoothWindows = 0
  private quietUntil = 0

  constructor(options: AdaptiveResolutionOptions = {}) {
    this.min = options.min ?? 0.6
  }

  /**
   * One frame of a continuous run: its duration and the time it ended (ms). Returns the new scale when it should
   * change, else null.
   */
  sample(frameMs: number, now: number): number | null {
    if (now < this.quietUntil || frameMs <= 0 || frameMs > HITCH_MS) return null
    this.sum += frameMs
    this.count++
    if (this.sum < WINDOW_MS) return null

    const fps = (this.count * 1000) / this.sum
    this.sum = 0
    this.count = 0
    if (fps < LOW_FPS) {
      this.smoothWindows = 0
      return this.change(Math.max(this.min, this.scale * STEP_DOWN), now)
    }
    if (fps < HIGH_FPS) {
      this.smoothWindows = 0
      return null
    }
    if (++this.smoothWindows < SMOOTH_WINDOWS_TO_RAISE) return null
    this.smoothWindows = 0
    return this.change(Math.min(1, this.scale * STEP_UP), now)
  }

  /** Forgets the window being measured: call when the run of continuous frames breaks (idle, paused, hidden). */
  reset(): void {
    this.sum = 0
    this.count = 0
  }

  private change(next: number, now: number): number | null {
    // Rounded so the scale lands exactly on its bounds and small float drift never triggers a resize.
    const rounded = Math.round(next * 100) / 100
    if (rounded === this.scale) return null
    this.scale = rounded
    this.quietUntil = now + COOLDOWN_MS
    return rounded
  }
}
