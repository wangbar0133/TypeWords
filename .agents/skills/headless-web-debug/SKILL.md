---
name: headless-web-debug
description: Use headless Chrome (puppeteer-core) to reproduce "click does nothing" and other client-side web app bugs, capture browser console/pageerror output, and verify fixes end-to-end. Covers DSH sandbox pitfalls, CDP quirks, and custom-component selector traps.
---

# Headless Web Debug

Use this skill when a web app misbehaves only in the browser (e.g. "点击没有反应", silent navigation failure, blank page after interaction) and you need to reproduce the exact user flow and capture browser-side errors. SSR `curl` checks cannot reproduce client-side interaction bugs — only a real browser can.

The workflow below was proven on a Nuxt/Vite SPA dev server (TypeWords, localhost:5567) to find a lazy-chunk `SyntaxError` that silently aborted `router.push`.

## Core principles

1. **Reproduce the full user flow**, not just the final click. State built by earlier steps (selected dict, IndexedDB cache, localStorage) often gates the failing action. Script: open page → walk the same UI path the user took → perform the failing click.
2. **Always capture `pageerror` and `console` events.** A silent "no reaction" is very often a module-level `SyntaxError` in a lazily-loaded chunk: the router aborts navigation with no visible feedback. Look for `Identifier '...' has already been declared`, `Unexpected token`, etc. in the `pageerror` stream.
3. **Fix, then re-run the identical script** to verify before/after. Prefer a fresh `--user-data-dir` per run to avoid stale state.

## Step 0 — Static triage (before launching a browser)

- `grep` the button text → i18n key → template → click handler → trace the handler chain (e.g. `startPractice → nav → router.push`).
- Check whether the target component renders a real `<button>` or a custom div (see selector traps below).
- Run the project's unit tests (`pnpm test`) — they're cheap and rule out engine regressions.
- Check `git log --oneline` / `git show <commit> --stat` for recent large commits that could have introduced the regression.

## Step 1 — Environment pitfalls (macOS + DSH sandbox)

- **Chrome cannot start under the DSH command sandbox**: it logs `sandbox initialization failed: Operation not permitted` and CDP page sessions hang (`timeout: Runtime.enable`, puppeteer: `Requesting main frame too early!`). When you hit these markers, retry the exact same command with `sandbox_permissions: "danger-full-access"` and a one-sentence justification. Chrome needs to spawn renderer processes and write outside the workspace.
- **Do not waste time on raw CDP** (page-level `webSocketDebuggerUrl` or browser-level `Target.attachToTarget`): on some machines session-scoped commands never respond even though browser-level ones do. Go straight to `puppeteer-core`.
- **Install puppeteer-core OUTSIDE the project** so the app's `package.json` is untouched:
  ```bash
  mkdir -p /tmp/pptr && cd /tmp/pptr && npm init -y >/dev/null 2>&1
  npm install puppeteer-core@23 --no-fund --no-audit --cache /tmp/pptr/npm-cache
  ```
  (`--cache` avoids `EPERM` on root-owned files in `~/.npm`.)
- **Proxy env vars poison local curl**: use `curl --noproxy '*' http://localhost:PORT` for smoke checks. Note that a dev server may listen only on IPv6 `[::1]` — use `localhost`, not `127.0.0.1`.
- Truncated bash output is spilled to a file — read it back with the `read`/`grep` tools instead of re-running.

## Step 2 — The repro script template

Save as e.g. `/tmp/pptr/repro.mjs` and run with `node repro.mjs` (needs danger-full-access, see Step 1):

```js
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-first-run', '--no-extensions', '--lang=zh-CN', '--window-size=1440,900',
         '--user-data-dir=/tmp/pptr/profile-run1'], // fresh profile per run
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

// Capture errors; filter framework noise or it drowns the signal.
const logs = []
page.on('console', m => {
  const t = m.text()
  if (t.includes('Vue warn') || t.includes('Invalid prop')) return
  logs.push(`[console.${m.type()}] ${t}`)
})
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${(e.stack ?? '').split('\n').slice(0, 8).join('\n')}`))
page.on('requestfailed', r => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`))

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Seed localStorage BEFORE app scripts run (e.g. dismiss onboarding tours).
await page.evaluateOnNewDocument(() => localStorage.setItem('tour-guide', '1'))

await page.goto('http://localhost:5567/words', { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(4000)

// --- helpers -------------------------------------------------------------
// Regexes cannot be serialized into page.evaluate — pass a string source.
async function clickBaseButton(reSrc) {
  return page.evaluate(reSrc => {
    const re = new RegExp(reSrc)
    const btns = [...document.querySelectorAll('.base-button')] // see selector traps
    const target = btns.find(b => re.test((b.textContent || '').replace(/\s+/g, '')))
    if (!target) return { ok: false }
    target.click()
    return { ok: true, cls: target.className }
  }, reSrc)
}
const urlNow = () => page.evaluate(() => location.href)
const bodyText = () => page.evaluate(() => document.body.innerText)

// ... walk the user flow: click buttons, confirm dialogs (e.g. '#dialog-ok'),
// navigate, return, then perform the FAILING click and watch the URL:
console.log('--- click the failing button ---')
console.log(JSON.stringify(await clickBaseButton('继续学习|开始学习')))
for (let i = 1; i <= 15; i++) {
  await sleep(1000)
  const u = await urlNow()
  if (u !== 'http://localhost:5567/words') { console.log(`navigated after ${i}s →`, u); break }
  if (i === 15) console.log('STILL AT /words after 15s  ← symptom reproduced')
}
console.log('=== PAGE LOGS (filtered, last 60) ===')
console.log(logs.slice(-60).join('\n') || '(empty)')
await browser.close()
```

### Selector traps (cost real time — read first)

- **Custom button components are often not `<button>`.** e.g. TypeWords' `BaseButton` renders `<div class="base-button">`; `document.querySelectorAll('button')` finds nothing and `el.disabled` is meaningless. Inspect the rendered DOM first (`document.querySelectorAll('.base-button')`, check `className` for `disabled`, look for a `.loading` child), and check the component source for guards like `@click="e => !disabled && !loading && $emit('click', e)"` — a stuck `loading` ref swallows clicks **silently** (no toast, no navigation).
- **`element.click()` bypasses overlay hit-testing.** Onboarding-tour overlays (Shepherd), modals, and `pointer-events: none` do NOT block programmatic clicks. If a programmatic click does nothing, suspect the handler/logic, not an overlay. (Conversely: to test what a real user experiences, use `page.click(selector)` with coordinates.)
- **Buttons inside wrappers**: locate via the wrapper (e.g. `.btn-no-margin .base-button`) to avoid matching sibling option buttons.
- **Toasts auto-dismiss in ~3s** — capture `document.body.innerText` within ~1s of the click, or you'll miss the warning message.
- **Dialogs may Teleport to body end** — don't truncate `bodyText()` too aggressively when checking whether a dialog opened; check for specific ids/classes (e.g. `#dialog-ok`) instead.

## Step 3 — Reading the results

- `[pageerror] ... SyntaxError: Identifier 'X' has already been declared` → duplicate import+declaration in one module; any chunk importing it fails to load, and `router.push` to a lazy route is silently aborted. Grep for the identifier and remove the stale duplicate (keep the version that matches current call-site signatures).
- Navigation that starts but never completes (URL unchanged, no error) → also check for `await`s that never settle in the target page's setup (e.g. hung `fetch` through a proxy, stuck `globalLoading` flags).
- Button found but `disabled`/`loading` → trace the state flag lifecycle (init watchers, debounced watches gated on store flags).
- `requestfailed` entries reveal unreachable third-party APIs (may be benign degradation).

## Step 4 — Fix and verify

1. Apply the minimal fix (e.g. delete the duplicate declaration; keep the import whose signature matches call sites).
2. Re-run unit tests.
3. Re-run the **same** repro script (new `--user-data-dir` if state pollution is a concern) and confirm: the failing click now navigates / shows the expected UI, and the `pageerror` is gone.
4. Clean up any scratch scripts created inside the project workspace (keep nothing debug-related in the repo).

## Checklist summary

- [ ] Static trace of the click handler chain + recent commits
- [ ] Unit tests pass (baseline)
- [ ] puppeteer-core installed in /tmp (not in project)
- [ ] Repro script walks the FULL user flow, captures console + pageerror (noise-filtered)
- [ ] Symptom reproduced (URL unchanged / no toast)
- [ ] Root cause identified in page logs
- [ ] Fix applied → tests green → identical script now passes
- [ ] Scratch files removed from the workspace
