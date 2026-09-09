import type { BaseState } from '../stores/base'
import type { Dict } from '../types'

/** 官方词表不上 IndexedDB / 云：只留进度；自定义和系统词本保留完整 Word[]。 */
export function shakeCommonDict(n: BaseState): BaseState {
  const data: BaseState = JSON.parse(JSON.stringify(n))
  data.word.bookList.map((v: Dict) => {
    if (!v.custom && !v.system) v.words = []
  })
  data.article.bookList.map((v: Dict) => {
    if (!v.custom && !v.system) v.articles = []
    else {
      v.articles.map(a => {
        a.sections = []
      })
    }
  })
  return data
}
