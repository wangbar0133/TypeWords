import { describe, expect, it } from 'vitest'
import { applyWordPracticeDictationSetting, BUILTIN_FLOWS } from '@/core/composables/practice-words/practice-flow-config.ts'

function stepIds(config: (typeof BUILTIN_FLOWS)[string]) {
  return config.nodes.map(node => node.steps.map(step => step.templateId))
}

describe('applyWordPracticeDictationSetting', () => {
  it('keeps dictation steps in system/review when enabled', () => {
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.system, true))).toEqual([
      ['followWrite', 'listen', 'dictation'],
      ['identify', 'listen', 'dictation'],
    ])
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.review, true))).toEqual([
      ['identify', 'listen', 'dictation'],
    ])
  })

  it('removes dictation steps from system/review when disabled without mutating builtins', () => {
    const before = JSON.stringify(stepIds(BUILTIN_FLOWS.system))
    const filtered = applyWordPracticeDictationSetting(BUILTIN_FLOWS.system, false)
    expect(stepIds(filtered)).toEqual([
      ['followWrite', 'listen'],
      ['identify', 'listen'],
    ])
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.review, false))).toEqual([
      ['identify', 'listen'],
    ])
    expect(stepIds(BUILTIN_FLOWS.system)).toEqual(JSON.parse(before))
    expect(filtered).not.toBe(BUILTIN_FLOWS.system)
  })

  it('does not strip dictation from dedicated dictation, shuffle, or other builtin flows', () => {
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.dictationOnly, false))).toEqual([
      ['dictation'],
      ['dictation'],
    ])
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.shuffle, false))).toEqual([['dictation']])
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.free, false))).toEqual([['followWrite']])
    expect(stepIds(applyWordPracticeDictationSetting(BUILTIN_FLOWS.listenOnly, false))).toEqual([['listen'], ['listen']])
  })
})
