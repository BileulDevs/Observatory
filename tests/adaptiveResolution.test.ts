import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AdaptiveResolution } from '../app/engine/core/adaptiveResolution.ts'

/** Feeds `seconds` of frames at a steady rate; returns every scale change reported, in order. */
function run(ctrl: AdaptiveResolution, fps: number, seconds: number, start = 0): { changes: number[]; end: number } {
  const changes: number[] = []
  const frameMs = 1000 / fps
  let now = start
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    now += frameMs
    const next = ctrl.sample(frameMs, now)
    if (next !== null) changes.push(next)
  }
  return { changes, end: now }
}

test('keeps full resolution while frames are smooth', () => {
  const ctrl = new AdaptiveResolution()
  assert.deepEqual(run(ctrl, 60, 10).changes, [])
  assert.equal(ctrl.scale, 1)
})

test('lowers the resolution when frames are slow', () => {
  const ctrl = new AdaptiveResolution()
  const { changes } = run(ctrl, 30, 2)
  assert.ok(changes.length >= 1, 'at least one step down')
  assert.ok(ctrl.scale < 1)
})

test('never goes below the floor, however slow', () => {
  const ctrl = new AdaptiveResolution({ min: 0.6 })
  run(ctrl, 10, 60)
  assert.equal(ctrl.scale, 0.6)
})

test('waits between two steps, so a step can take effect before the next one', () => {
  const ctrl = new AdaptiveResolution()
  const { changes } = run(ctrl, 20, 1.2)
  assert.equal(changes.length, 1)
})

test('climbs back once frames are smooth for a while', () => {
  const ctrl = new AdaptiveResolution()
  const slow = run(ctrl, 30, 3)
  assert.ok(ctrl.scale < 1)
  const smooth = run(ctrl, 60, 2, slow.end)
  assert.ok(ctrl.scale < 1, 'not back after two smooth seconds: it climbs slower than it falls')
  run(ctrl, 60, 20, smooth.end)
  assert.equal(ctrl.scale, 1)
})

test('ignores hitches (a tab switch, a long task) instead of reading them as slow frames', () => {
  const ctrl = new AdaptiveResolution()
  let now = 0
  for (let i = 0; i < 600; i++) {
    const ms = i % 60 === 0 ? 400 : 1000 / 60
    now += ms
    assert.equal(ctrl.sample(ms, now), null)
  }
  assert.equal(ctrl.scale, 1)
})

test('reset drops a half-measured window', () => {
  const ctrl = new AdaptiveResolution()
  run(ctrl, 30, 0.9)
  ctrl.reset()
  // Without the reset, these smooth frames would complete a window averaged with the slow ones.
  assert.deepEqual(run(ctrl, 60, 0.5, 900).changes, [])
  assert.equal(ctrl.scale, 1)
})
