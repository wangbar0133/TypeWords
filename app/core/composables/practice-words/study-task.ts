import { getCurrentStudyWord } from '@/core/hooks/dict.ts'
import { useBaseStore } from '@/core/stores/base.ts'
import { useSettingStore } from '@/core/stores/setting.ts'
import { addRandomReviewWhenNoDue, type StudyTaskResult } from './study-task-random.ts'

export type { StudyTaskResult } from './study-task-random.ts'
export { addRandomReviewWhenNoDue } from './study-task-random.ts'

export function createStudyTask(): StudyTaskResult {
  const store = useBaseStore()
  const settingStore = useSettingStore()
  return addRandomReviewWhenNoDue(getCurrentStudyWord(), {
    words: store.sdict.words,
    lastLearnIndex: store.sdict.lastLearnIndex,
    perDayStudyNumber: store.sdict.perDayStudyNumber,
    wordReviewRatio: settingStore.wordReviewRatio,
    ignoreSet: store.getIgnoreWordsSet(),
    enabled: settingStore.autoAddRandomReviewWhenNoDue,
  })
}
