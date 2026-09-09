# TypeScript

- `strict` and `typeCheck` are off in Nuxt config. New modules should still type their public APIs.
- Prefer explicit types on exported functions. Avoid `any` unless matching existing store/upgrade code.
- New Vue code uses `ref` / `computed` / `shallowRef`. Do not add `$ref` / `$computed`.
