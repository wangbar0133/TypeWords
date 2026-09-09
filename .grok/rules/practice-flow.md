# Practice flow

- Built-in flows live in `app/core/composables/practice-words/practice-flow-config.ts`.
- Change “how practice works” by editing flow config, not by hard-coding stage order in pages.
- `applyWordPracticeDictationSetting` removes `templateId === 'dictation'` from built-in `system` and `review` only.
- Dedicated Dictation mode, shuffle, and custom flows keep their dictation steps.
- Mid-session setting changes apply the next time a flow is loaded (enter practice or restore).
- After engine changes, run `pnpm test`. At least cover typing correctness, dictation filtering, study-task fill, FSRS grade mapping, and `shakeCommonDict`.
