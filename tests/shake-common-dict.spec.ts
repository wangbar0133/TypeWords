import { describe, expect, it } from 'vitest'
import { shakeCommonDict } from '@/core/utils/shake-common-dict.ts'
import type { BaseState } from '@/core/stores/base.ts'

function baseState(partial: Partial<BaseState> = {}): BaseState {
  return {
    simpleWords: [],
    load: true,
    dictListVersion: 1,
    fsrsData: {},
    noteData: {},
    _ignoreWatch: false,
    word: {
      studyIndex: 0,
      bookList: [],
    },
    article: {
      studyIndex: 0,
      bookList: [],
    },
    ...partial,
  } as BaseState
}

describe('shakeCommonDict', () => {
  it('drops official word lists but keeps custom and system words', () => {
    const input = baseState({
      word: {
        studyIndex: 0,
        bookList: [
          { id: 'cet4', custom: false, system: false, words: [{ word: 'apple' }], lastLearnIndex: 3 } as any,
          { id: 'wordCollect', custom: false, system: true, words: [{ word: 'keep' }] } as any,
          { id: 'mine', custom: true, system: false, words: [{ word: 'custom' }] } as any,
        ],
      },
    })
    const result = shakeCommonDict(input)
    expect(result.word.bookList[0].words).toEqual([])
    expect(result.word.bookList[0].lastLearnIndex).toBe(3)
    expect(result.word.bookList[1].words).toEqual([{ word: 'keep' }])
    expect(result.word.bookList[2].words).toEqual([{ word: 'custom' }])
    expect(input.word.bookList[0].words).toEqual([{ word: 'apple' }])
  })

  it('clears generated article sections and official article bodies', () => {
    const result = shakeCommonDict(
      baseState({
        article: {
          studyIndex: 0,
          bookList: [
            { id: 'nce', custom: false, system: false, articles: [{ title: 'A', sections: [{}] }] } as any,
            { id: 'mine', custom: true, system: false, articles: [{ title: 'B', sections: [{}] }] } as any,
            { id: 'articleCollect', custom: false, system: true, articles: [{ title: 'C', sections: [{}] }] } as any,
          ],
        },
      })
    )
    expect(result.article.bookList[0].articles).toEqual([])
    expect(result.article.bookList[1].articles[0].sections).toEqual([])
    expect(result.article.bookList[1].articles[0].title).toBe('B')
    expect(result.article.bookList[2].articles[0].sections).toEqual([])
    expect(result.article.bookList[2].articles[0].title).toBe('C')
  })
})
