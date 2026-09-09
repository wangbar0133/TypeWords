import { describe, expect, it } from 'vitest'
import { getDictVoiceUrl, PronunciationApi } from '@/core/config/env.ts'

describe('getDictVoiceUrl', () => {
  it('uses Youdao dictvoice and encodes the sentence', () => {
    const url = getDictVoiceUrl('The atmosphere was electric.', 'us')
    expect(url.startsWith(PronunciationApi)).toBe(true)
    expect(url).toContain(encodeURIComponent('The atmosphere was electric.'))
    expect(url.endsWith('&type=2')).toBe(true)
  })

  it('maps UK accent to type=1', () => {
    expect(getDictVoiceUrl('hello', 'uk')).toBe(`${PronunciationApi}${encodeURIComponent('hello')}&type=1`)
  })
})
