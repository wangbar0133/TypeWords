# TypeWords

Local-first English **word** typing practice. Article follow-typing has been removed.

## Commands

- `pnpm install`
- `pnpm dev` — Nuxt dev server on port `5567`
- `pnpm test` — Vitest unit tests
- `pnpm generate` — static site (see Deploy: not sufficient on its own)
- `pnpm i18n:write` — after editing `i18n/i18n.xlsx`
- `./scripts/build-static.sh` — build static Docker image and push to Docker Hub

## Deploy

Full flow and host setup: `docs/deploy.md`. Deployed instance: `https://words.neicun.online` (Docker behind an existing nginx).

- **`pnpm generate` alone is not a deployable static site.** `@nuxtjs/i18n` serves locale messages from a Nitro route that prerendering skips, so the UI falls back to raw i18n keys. Always follow generate with `node scripts/gen-i18n-messages.mjs` (`scripts/build-static.sh` does both).
- Keep `image: { provider: 'none' }` in `nuxt.config.ts`. The default IPX provider routes images through a server endpoint (`/_ipx/*`) that 404s when hosted statically. Bonus: no sharp binary is bundled, so `.output/server` stays architecture-independent.
- The site domain is baked at build time: `ORIGIN` drives canonical URLs (`runtimeConfig.public.origin`), `HOST` is injected as `__APP_HOST__` into `app/core/config/env.ts` (`Host` / `Origin` constants used by `og:url`, share text). Changing the domain requires a rebuild.
- `public/libs/t.js` used to load 51.la / Baidu / Umami trackers pointed at the **upstream author's** accounts. They are intentionally disabled — do not re-enable upstream IDs; the file documents how to add your own.
- `LIBS_URL` has no trailing slash; join paths as `${ENV.LIBS_URL}/x.js`.

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
