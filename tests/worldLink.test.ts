import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_WORLD, MAX_SEED, worldFromQuery, worldToQuery } from '../app/utils/worldLink.ts'

test('an empty query gives the default world', () => {
  assert.deepEqual(worldFromQuery({}), DEFAULT_WORLD)
})

test('reads seed, type and style from the query', () => {
  assert.deepEqual(worldFromQuery({ seed: '4821', type: 'gas', style: 'carto' }), { seed: 4821, type: 'gas', style: 'carto' })
})

test('ignores invalid values, keeping the default for each', () => {
  const world = worldFromQuery({ seed: 'abc', type: 'lava', style: 'neon' })
  assert.deepEqual(world, DEFAULT_WORLD)
})

test('rejects seeds out of range, negative or not whole', () => {
  for (const seed of [String(MAX_SEED + 1), '-3', '12.5', '1e3', '']) {
    assert.equal(worldFromQuery({ seed }).seed, DEFAULT_WORLD.seed, `seed "${seed}"`)
  }
  assert.equal(worldFromQuery({ seed: '0' }).seed, 0)
  assert.equal(worldFromQuery({ seed: String(MAX_SEED) }).seed, MAX_SEED)
})

test('takes the first value when a parameter is repeated', () => {
  assert.equal(worldFromQuery({ seed: ['12', '34'] }).seed, 12)
})

test('writes only what differs from the default world', () => {
  assert.deepEqual(worldToQuery(DEFAULT_WORLD), {})
  assert.deepEqual(worldToQuery({ ...DEFAULT_WORLD, seed: 42 }), { seed: '42' })
  assert.deepEqual(worldToQuery({ seed: 42, type: 'ice', style: 'nocturne' }), { seed: '42', type: 'ice', style: 'nocturne' })
})

test('a written query reads back as the same world', () => {
  const world = { seed: 907, type: 'arid', style: 'carto' } as const
  assert.deepEqual(worldFromQuery(worldToQuery(world)), world)
})
