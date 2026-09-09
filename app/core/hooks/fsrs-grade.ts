import { Rating } from 'ts-fsrs'

export function gradeByWrongTimes(
  wrongTimes: number | undefined,
  limits: { easy: number; good: number; hard: number }
): Rating {
  if (wrongTimes === undefined) return Rating.Easy
  if (wrongTimes <= limits.easy) return Rating.Easy
  if (wrongTimes <= limits.good) return Rating.Good
  if (wrongTimes <= limits.hard) return Rating.Hard
  return Rating.Again
}
