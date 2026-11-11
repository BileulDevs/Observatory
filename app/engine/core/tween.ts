/**
 * Minimal frame-driven tweens. The engine already owns a frame loop, so tweens advance from it
 * instead of pulling in an animation library for a handful of camera moves.
 */

/** Slow start, slow end. Used for camera flights: no visible jolt at either end. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Fast start, gentle landing. Used for UI-like settles (focus changes). */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

/** A running interpolation from 0 to 1. `onUpdate` receives the eased progress. */
export class Tween {
  private elapsed = 0
  private finished = false

  constructor(
    private readonly duration: number,
    private readonly onUpdate: (k: number) => void,
    private readonly ease: (t: number) => number = easeInOutCubic,
    private readonly onDone?: () => void,
  ) {
    // Zero-length tweens (reduced motion) still apply their end state on the next step.
    if (duration <= 0) this.elapsed = 0
  }

  get done(): boolean {
    return this.finished
  }

  /** Advances by dt seconds. Returns true while still running. */
  step(dt: number): boolean {
    if (this.finished) return false
    this.elapsed += dt
    const t = this.duration <= 0 ? 1 : Math.min(this.elapsed / this.duration, 1)
    this.onUpdate(this.ease(t))
    if (t >= 1) {
      this.finished = true
      this.onDone?.()
    }
    return !this.finished
  }

  /** Stops without calling onDone. */
  cancel(): void {
    this.finished = true
  }
}
