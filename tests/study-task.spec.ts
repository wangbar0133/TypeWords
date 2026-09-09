import { describe, expect, it } from 'vitest'
import { addRandomReviewWhenNoDue } from '@/core/composables/practice-words/study-task-random.ts'
import type { Word } from '@/core/types/types.ts'

function word(value: string): Word {
  return { word: value } as Word
}

describe('addRandomReviewWhenNoDue', () => {
  const learned = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map(word)

  it('does nothing when disabled or due reviews already exist', () => {
    const dueTask = { new: [word('new1')], review: [word('due1')] }
    const withDue = addRandomReviewWhenNoDue(dueTask, {
      words: learned,
      lastLearnIndex: 5,
      perDayStudyNumber: 2,
      wordReviewRatio: 3,
      ignoreSet: new Set(),
      enabled: true,
    })
    expect(withDue.dueReviewCount).toBe(1)
    expect(withDue.randomReviewCount).toBe(0)
    expect(withDue.taskWords.review.map(item => item.word)).toEqual(['due1'])

    const emptyTask = { new: [], review: [] }
    const disabled = addRandomReviewWhenNoDue(emptyTask, {
      words: learned,
      lastLearnIndex: 5,
      perDayStudyNumber: 2,
      wordReviewRatio: 3,
      ignoreSet: new Set(),
      enabled: false,
    })
    expect(disabled.randomReviewCount).toBe(0)
    expect(disabled.taskWords.review).toEqual([])
  })

  it('fills from learned words, excluding new/ignore words and unlearned tail', () => {
    const result = addRandomReviewWhenNoDue(
      { new: [word('alpha')], review: [] },
      {
        words: learned,
        lastLearnIndex: 4,
        perDayStudyNumber: 10,
        wordReviewRatio: 1,
        ignoreSet: new Set(['echo']),
        enabled: true,
      }
    )
    const reviewWords = result.taskWords.review.map(item => item.word)
    expect(result.dueReviewCount).toBe(0)
    expect(result.randomReviewCount).toBe(3)
    expect(reviewWords.sort()).toEqual(['bravo', 'charlie', 'delta'])
    expect(reviewWords).not.toContain('alpha')
    expect(reviewWords).not.toContain('echo')
  })

  it('adds nothing when the computed review quota is zero', () => {
    const result = addRandomReviewWhenNoDue(
      { new: [], review: [] },
      {
        words: learned,
        lastLearnIndex: 5,
        perDayStudyNumber: 2,
        wordReviewRatio: 0,
        ignoreSet: new Set(),
        enabled: true,
      }
    )
    expect(result.randomReviewCount).toBe(0)
    expect(result.taskWords.review).toEqual([])
  })
})
