# Performance, Accessibility, Testing, CI, Deployment

## Performance
- Targets: Lighthouse 95+, LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Route-level lazy loading; analyze the bundle; no heavy libraries for small jobs.
- Images: WebP/AVIF, explicit `width`/`height`, `loading="lazy"` below the fold, preload the LCP image.
- Fonts: self-host, subset, `font-display: swap`.
- Supabase: paginate, select only needed columns, index filter columns, cache with TanStack Query (`staleTime`).
- Avoid waterfalls: prefetch on hover/route intent; fetch in parallel.

## Accessibility
- Semantic landmarks, one `h1`, ordered headings.
- Visible focus on everything interactive; `button` for actions, `a` for navigation.
- Labels on all inputs; errors linked with `aria-describedby`.
- Contrast AA minimum; never color alone; `alt` on meaningful images.
- Full keyboard walkthrough on every key flow.

## Testing and CI
- Unit-test pure logic and zod schemas.
- Component-test forms and states with React Testing Library.
- E2E (Playwright): sign up, log in, main CRUD flow, contact/checkout flow, **and the no-horizontal-scroll test on every route**.
- CI order: install -> lint -> `npm run check` (banned patterns) -> test -> build -> Playwright. Preview deploy per PR. Template: `scripts/ci-example.yml`.
- Run migrations against a staging DB in CI before production (`supabase db diff` / `db push`).

## Deployment
- Host on Vercel/Netlify/Cloudflare Pages (SPA fallback rewrite to `index.html` for client-rendered apps; real per-route HTML when pre-rendered).
- Env vars per environment. Custom domain + HTTPS + redirect www/non-www.
- Supabase: confirm backup coverage for the plan in use (see `supabase-realworld.md` section 7), set auth redirect URLs per project, restrict allowed origins, configure custom SMTP.
- Rollback plan: redeploy the previous build; DB changes must be backward compatible.
