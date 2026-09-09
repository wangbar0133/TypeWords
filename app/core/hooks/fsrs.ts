import { type Card, type CardInput, FSRS, type Grade, Rating } from 'ts-fsrs'
import { useSettingStore } from '../stores/setting.ts'
import { gradeByWrongTimes } from './fsrs-grade.ts'

export { gradeByWrongTimes } from './fsrs-grade.ts'

export function useGetGradeByWrongTimes() {
  let store = useSettingStore()
  function getGradeByWrongTimes(wrongTimes?: number): Rating {
    return gradeByWrongTimes(wrongTimes, {
      easy: store.fsrsEasyLimit,
      good: store.fsrsGoodLimit,
      hard: store.fsrsHardLimit,
    })
  }
  return { getGradeByWrongTimes }
}

export function useNextCard() {
  let store = useSettingStore()
  let fsrs = new FSRS(store.fsrsParameters)
  function nextCard(card: CardInput | Card, grade: Grade): Card {
    return fsrs.next(card, new Date(), grade).card
  }
  return { nextCard }
}
