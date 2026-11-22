import { mulberry32 } from '~/engine/core/random'

/**
 * Pronounceable name for a generated world, deterministic from its seed: the same seed always gives the same name,
 * so a world can be named in a link or a conversation. Not a catalogue designation and not translated: a proper
 * noun reads the same in every language.
 *
 * Shape: two or three syllables, each an onset and a vowel, plus an optional final consonant. The tables are
 * tuned by ear: a cluster that is hard to say in English or French (or that spells a common word) does not belong
 * here. Changing any table renames every world, including ones people may have shared.
 */
const ONSETS = ['th', 'v', 'k', 's', 'm', 'n', 'r', 'l', 'd', 'z', 'br', 'kh', 'tr', 'h', 'ar', 'el'] as const
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'ae'] as const
const MIDDLES = ['r', 'l', 'n', 'v', 'th', 's', 'm', 'd', 'k'] as const
const ENDINGS = ['', '', 'n', 's', 'r', 'l', 'e', 'a', 'n', 'th'] as const
/** Share of names with three syllables rather than two. Higher = longer, more "exotic" names. */
const THREE_SYLLABLES = 0.35
/** Salt so names do not move in lockstep with other values drawn from the same seed elsewhere. */
const NAME_SALT = 0x6e616d65

function pick<T>(list: readonly T[], rnd: () => number): T {
  return list[Math.floor(rnd() * list.length)]!
}

/** "Tharune"-style name for the world generated from `seed`. */
export function worldName(seed: number): string {
  const rnd = mulberry32((seed ^ NAME_SALT) >>> 0)
  const syllables = rnd() < THREE_SYLLABLES ? 3 : 2
  let name = pick(ONSETS, rnd) + pick(VOWELS, rnd)
  for (let i = 1; i < syllables; i++) name += pick(MIDDLES, rnd) + pick(VOWELS, rnd)
  name += pick(ENDINGS, rnd)
  return name.charAt(0).toUpperCase() + name.slice(1)
}
