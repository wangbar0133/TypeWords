# TypeWords

Local-first English **word** typing practice. Article follow-typing has been removed.

## Commands

- `pnpm install`
- `pnpm dev` — Nuxt dev server on port `5567`
- `pnpm test` — Vitest unit tests
- `pnpm generate` — static site
- `pnpm i18n:write` — after editing `i18n/i18n.xlsx`

## Code

- New code uses standard `ref` / `computed`. Do not spread `$ref` / `$computed`.
- When editing an old page, keep its existing style or migrate the whole page. Do not mix both in one function.
- Prefer CSS variables from `app/assets/css/main.scss`. Do not hard-code theme colors.

## Persistence

- Changing dict / setting / practice cache shape requires an upgrade path and a version bump (`SAVE_DICT_KEY`, `SAVE_SETTING_KEY`, `PRACTICE_WORD_CACHE`).
- Official word lists are **not** stored in IndexedDB or synced to the cloud. `shakeCommonDict()` keeps metadata and progress only.
- Do not rename system dict ids: `wordCollect`, `wordWrong`, `wordKnown`, `articleCollect`.
- Cloud sync is blob JSON keyed by `(user_id, type)`. Sync only when a session exists. Do not last-write-wins on first login when both sides have data.

## Practice

- Word practice lives in `app/core/composables/practice-words/`. Change stage order in `practice-flow-config.ts`, not in the page.
- `setting.wordPracticeDictation` (default on) strips dictation steps from built-in `system` / `review` flows. Dedicated dictation mode and custom flows are unchanged.
- After changing the practice engine, run `pnpm test`.

## Scope

See `docs/改造基线.md` for the confirmed change list and constraints.
