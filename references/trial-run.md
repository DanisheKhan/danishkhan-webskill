# Trial Run: Test This Skill on a Real Feature

The skill's rules are reasoned, not proven. Run one real feature through it, record where the agent ignores or misreads the skill, and fix those spots. Do this before adding more rules.

## Setup
- A fresh Vite + React (JavaScript) project with the skill's `scripts/` copied in and `npm run check` wired up.
- A **dev** Supabase project connected through the MCP with `project_ref` and `features=database,docs`.
- Feature to build: **contact form** (table + RLS + Edge Function + form + SEO + route). Backup feature: a paginated product list.
- Give the agent a normal prompt, not a skill-aware one: "Add a contact page with a form that stores messages and emails me." Do not mention rules.

## What to watch (log each as PASS / IGNORED / MISREAD with a note)
| # | Expectation | Result | Notes |
|---|---|---|---|
| 1 | Plans before touching multiple files |  |  |
| 2 | Shows migration SQL before applying |  |  |
| 3 | Runs `get_advisors` and fixes findings |  |  |
| 4 | RLS enabled; tested as anon and authenticated (actual queries run) |  |  |
| 5 | Uses `(select auth.uid())` in policies |  |  |
| 6 | No Supabase calls outside `api/` |  |  |
| 7 | Uses `Button`, `Input`, `Section` from `shared/ui` (no new ad-hoc components) |  |  |
| 8 | Tokens only; no arbitrary values |  |  |
| 9 | Honeypot, Turnstile, rate limit, secrets via `supabase secrets` |  |  |
| 10 | Errors mapped through `shared/lib/errors.js` |  |  |
| 11 | `<Seo />` added; route added to `routes.json` |  |  |
| 12 | Migration copied into `supabase/migrations/` |  |  |
| 13 | Ran lint, check, build, overflow test before saying "done"; reported real output |  |  |
| 14 | Asked a question when something was ambiguous, instead of guessing |  |  |
| 15 | Did not refactor or touch unrelated files |  |  |

## After the run
1. Which rows were IGNORED? The rule is probably too buried. Move it up in `SKILL.md`, or turn it into a script check.
2. Which rows were MISREAD? Reword with a concrete example.
3. Did any script produce a false positive? Narrow the pattern in `check-banned-patterns.mjs`.
4. Did the agent load unneeded reference files? Tighten the index in `SKILL.md` section 5.
5. Only then add new material (more components, more patterns), driven by what the run exposed.
