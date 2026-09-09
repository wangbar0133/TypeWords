import { describe, expect, it } from 'vitest'
import {
  getFirstWrongCharacterIndex,
  getWholeInputAfterWrongBackspace,
  isPracticeCharacterCorrect,
  isWholePracticeInputComplete,
  isWholePracticeInputCorrect,
  normalizePracticeInputCharacter,
} from '@/core/composables/practice-words/visible-word-typing.ts'

describe('visible-word-typing', () => {
  it('matches case-insensitive letters and rejects missing targets', () => {
    expect(isPracticeCharacterCorrect('A', 'a', true)).toBe(true)
    expect(isPracticeCharacterCorrect('A', 'a', false)).toBe(false)
    expect(isPracticeCharacterCorrect('a', undefined, true)).toBe(false)
  })

  it('maps a physical key to the full-width target character', () => {
    expect(normalizePracticeInputCharacter({ key: '.', code: 'Period', shiftKey: false }, '。')).toBe('。')
    expect(normalizePracticeInputCharacter({ key: '!', code: 'Digit1', shiftKey: true }, '！')).toBe('！')
    expect(normalizePracticeInputCharacter({ key: '.', code: 'Period', shiftKey: false }, '.')).toBe('.')
    expect(normalizePracticeInputCharacter({ key: 'a', code: 'KeyA', shiftKey: false }, 'a')).toBe('a')
  })

  it('detects the first wrong index and whole-word correctness', () => {
    expect(getFirstWrongCharacterIndex('cat', 'cat', true)).toBe(-1)
    expect(getFirstWrongCharacterIndex('cot', 'cat', true)).toBe(1)
    expect(getFirstWrongCharacterIndex('cats', 'cat', true)).toBe(3)
    expect(isWholePracticeInputComplete('cat', 'cat')).toBe(true)
    expect(isWholePracticeInputComplete('ca', 'cat')).toBe(false)
    expect(isWholePracticeInputCorrect('Cat', 'cat', true)).toBe(true)
    expect(isWholePracticeInputCorrect('Cat', 'cat', false)).toBe(false)
    expect(isWholePracticeInputCorrect('ca', 'cat', true)).toBe(false)
  })

  it('backspaces to the first wrong character, or deletes the last char if all match', () => {
    expect(getWholeInputAfterWrongBackspace('cot', 'cat', true)).toBe('c')
    expect(getWholeInputAfterWrongBackspace('ca', 'cat', true)).toBe('c')
  })
})
