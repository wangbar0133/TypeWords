import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { gradeByWrongTimes } from '@/core/hooks/fsrs-grade.ts'

const limits = { easy: 0, good: 3, hard: 6 }

describe('gradeByWrongTimes', () => {
  it('maps missing wrong times to Easy', () => {
    expect(gradeByWrongTimes(undefined, limits)).toBe(Rating.Easy)
  })

  it('maps error counts onto Easy/Good/Hard/Again using inclusive upper bounds', () => {
    expect(gradeByWrongTimes(0, limits)).toBe(Rating.Easy)
    expect(gradeByWrongTimes(1, limits)).toBe(Rating.Good)
    expect(gradeByWrongTimes(3, limits)).toBe(Rating.Good)
    expect(gradeByWrongTimes(4, limits)).toBe(Rating.Hard)
    expect(gradeByWrongTimes(6, limits)).toBe(Rating.Hard)
    expect(gradeByWrongTimes(7, limits)).toBe(Rating.Again)
    expect(gradeByWrongTimes(1, { easy: 1, good: 3, hard: 6 })).toBe(Rating.Easy)
  })
})
