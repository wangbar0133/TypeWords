import type { TaskWords, Word } from '@/core/types/types.ts'

export interface StudyTaskResult {
  taskWords: TaskWords
  dueReviewCount: number
  randomReviewCount: number
}

export interface AddRandomReviewOptions {
  words: Word[]
  lastLearnIndex: number
  perDayStudyNumber: number
  wordReviewRatio: number
  ignoreSet: Set<string>
  enabled: boolean
}

function shuffle<T>(array: T[]): T[] {
  const result = array.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function addRandomReviewWhenNoDue(taskWords: TaskWords, options: AddRandomReviewOptions): StudyTaskResult {
  const dueReviewCount = taskWords.review.length
  if (!options.enabled || dueReviewCount > 0) {
    return { taskWords, dueReviewCount, randomReviewCount: 0 }
  }

  const totalNeed = Math.max(0, Math.floor(options.perDayStudyNumber * options.wordReviewRatio))
  if (!totalNeed) {
    return { taskWords, dueReviewCount, randomReviewCount: 0 }
  }

  const excludedWords = new Set([
    ...options.ignoreSet,
    ...taskWords.new.map(item => item.word),
    ...taskWords.review.map(item => item.word),
  ])
  const learnedEnd = Math.min(options.lastLearnIndex, options.words.length)
  const randomReviewWords = shuffle(
    options.words.slice(0, learnedEnd).filter(item => !excludedWords.has(item.word))
  ).slice(0, totalNeed)

  taskWords.review = taskWords.review.concat(randomReviewWords)
  return {
    taskWords,
    dueReviewCount,
    randomReviewCount: randomReviewWords.length,
  }
}
