# Persistence

- IndexedDB keys: `typing-word-dict` (v4), `typing-word-setting` (current `SAVE_SETTING_KEY.version`), `PracticeSaveWord` (v2).
- Official dictionaries store progress only. Never persist full official `words` / `articles`.
- System dict ids are fixed: `wordCollect`, `wordWrong`, `wordKnown`, `articleCollect`.
- Practice word cache is compact (`wordsStr`). Changing the Word primary key or spelling must consider cache invalidation.
- Article `sections` are generated at runtime. Do not persist them as a feature field.
- Cloud rows use primary key `(user_id, type)` and `onConflict: 'user_id,type'`. Do not upsert on `type` alone.
- Sync only when the user has a session. Unauthenticated use stays on IndexedDB.
- First login on a device with both local and remote data must ask the user. Do not silently last-write-wins.
- `updated_at` comparison is used for later sync. Do not rewrite local timestamps unless an upgrade actually changed data.
