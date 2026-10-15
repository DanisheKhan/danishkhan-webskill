# Enforcement scripts

Rules become real when the build fails. Copy this folder to the project root.

## Install
```bash
npm i -D @playwright/test
npx playwright install chromium
```
Add to `package.json` (project must be `"type": "module"`, as Vite templates are):
```json
{
  "scripts": {
    "check": "node scripts/check-banned-patterns.mjs src",
    "test:overflow": "playwright test -c scripts/e2e",
    "verify": "npm run lint && npm run check && npm run build && npm run test:overflow"
  }
}
```

## What each piece does
| File | Purpose |
|---|---|
| `check-banned-patterns.mjs` | Static scan of `src/`. Fails on gradients, glass/blur, heavy shadows, oversized radius, scale hovers, off-screen X animation, `100vw`/`w-screen`, `select('*')`, raw hex and arbitrary px values, emoji icons, `service_role`, TypeScript files, Supabase calls outside `api/`, cross-feature deep imports, `shared/` importing features. Warns on `dangerouslySetInnerHTML`. |
| `e2e/no-horizontal-scroll.spec.js` | Loads every route at 320, 360, 390, 768px; scrolls the page to trigger reveals; fails if `scrollWidth > clientWidth` and lists the offending elements. |
| `e2e/routes.json` | The route list. **Add each new route in the same change that creates it.** For dynamic routes add a representative URL (e.g. `/products/blue-mug`). |
| `e2e/playwright.config.js` | Builds the app, serves `vite preview` on 4173, runs the specs. Set `BASE_URL` to test a deployed preview instead. |
| `ci-example.yml` | GitHub Actions: lint, check, test, build, overflow test, audit, secret scan. |

## Opting out (rarely)
A line can carry `// banned-ok: <reason>` (or `{/* banned-ok: reason */}` in JSX). Every use needs a justification in the PR. Never loosen the regexes just to get green; fix the code.

## Tailwind backstop
`references/components.md` section 1 overrides Tailwind's `boxShadow`, `backgroundImage`, `borderRadius`, `fontSize` and `spacing`, so most banned utilities do not exist at all. The script catches what slips through (inline styles, plain CSS, arbitrary values).
