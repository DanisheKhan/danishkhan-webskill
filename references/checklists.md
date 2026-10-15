# Checklists

Contents: Professional website standards, Review checklist (every PR / launch).

## Professional website standards

**Content and brand**
- Real copy and real images before launch: no lorem ipsum, no meaningless stock photos, no fake logos, testimonials or stats.
- Consistent voice, tense and capitalization. Short, concrete, specific sentences. Every button is a verb.
- Clear value statement above the fold: what it is, who it is for, what to do next. One primary CTA per page.
- Contact details, business address (if applicable) and an easy way to reach a human.

**Trust and legal**
- Privacy Policy, Terms, and (e-commerce) Refund/Shipping policies, linked in the footer.
- Cookie consent only where required, only for non-essential cookies/analytics. No dark patterns.
- Consistent branding: logo, favicon, colors, social links, `og:image`.
- HTTPS padlock; correct domain email (SPF, DKIM, DMARC) so mail does not land in spam.

**UX polish**
- Every async action has loading, success and error feedback; every list has an empty state; every form shows inline, human-readable errors.
- Skeletons sized like the final content (no layout jumps). Optimistic updates where safe.
- Focus management (move focus into modals and return it on close; skip-to-content link; visible focus rings).
- Scroll restoration on route change; document title updates per route; the back button always behaves.
- Custom 404 and error pages in the same design language, with a path back home.
- Forms: proper `type`, `autocomplete`, `inputmode`; visible labels; submit disabled while pending; double-submit prevented.
- Responsive polish at 320 / 360 / 390 / 768 / 1024 / 1280 / 1920 and landscape phone.

**Reliability and operations**
- Error tracking (Sentry), uptime monitoring, alerts to a real inbox/phone.
- Backups matched to the Supabase plan with a tested restore; staging mirrors production.
- Zero broken links or images (run a link checker before launch); redirects for any changed URL.
- Changelog and release notes; semantic commits; a documented rollback.

**Final "professional" test before launch**
1. Open it on a real phone on mobile data. Does it feel instant and calm?
2. Tab through it with the keyboard only. Can you do every task?
3. View source / disable JS. Do crawlers and link previews get real content and metadata?
4. Try to break it: bad input, offline mode, expired session, double-click submit.
5. Remove one thing from every page. Is it better?

## Review checklist (before every PR / launch)

**Automated (must be green)**
- [ ] `npm run lint`, `npm run check`, `npm test`, `npm run build`
- [ ] Playwright no-horizontal-scroll test passes; every route is in `routes.json`

**Structure**
- [ ] Feature owns its api/hooks/components/routes; imports go through `index.js`
- [ ] No Supabase calls in components; `shared/` imports nothing from features

**Supabase**
- [ ] RLS enabled and tested as anon, user and admin on every table; no `service_role` in client
- [ ] Policies use `(select auth.uid())`; policy columns indexed
- [ ] Migrations in Git mirror what MCP applied; `get_advisors` clean; list queries paginated with specific columns
- [ ] MCP scoped to the dev project; no `service_role` key in app, repo or chat
- [ ] Plan checked for pause/backup behavior if it is a client production site

**Design**
- [ ] Zero gradients, glows, blurs, bounce/scale hovers, emoji icons
- [ ] Only tokens; one typeface; max 2 weights; one accent
- [ ] Nothing could be removed without making the page worse

**Layout**
- [ ] No horizontal scroll at 320, 360, 768, 1280 and 200% zoom
- [ ] No carousels/marquees; tables become stacked cards on mobile
- [ ] No `100vw` widths, no full-bleed hacks

**Motion**
- [ ] All animation uses shared presets; opacity/transform only; no bounce, no loops
- [ ] `MotionConfig reducedMotion="user"` set; tested with reduce-motion on
- [ ] No fade-in on the LCP/hero element; no off-screen X animations; no layout shift

**Security**
- [ ] CSP + security headers live and verified; no CSP errors in the console
- [ ] Views use `security_invoker`; webhooks verify signatures; payment amounts come from the DB
- [ ] CAPTCHA/honeypot + rate limit on signup, login, contact; auth redirect allow-list exact per environment
- [ ] Secret scanning in CI; 2FA on all accounts; `npm audit` clean of high/critical

**SEO**
- [ ] Rendering strategy chosen (pre-render/SSR for public pages); crawlers see real HTML
- [ ] Unique title/description/canonical/OG per page; one `h1`; private pages `noindex`
- [ ] `sitemap.xml`, `robots.txt`, favicon set, OG image, JSON-LD validated, real 404 status
- [ ] Search Console + Bing verified, sitemap submitted; social previews checked

**Professional finish**
- [ ] Real content only; privacy/terms linked; contact visible
- [ ] Custom 404/error pages; link check clean; backups and monitoring live
- [ ] Final launch test (real phone, keyboard only, JS-disabled view, break-it pass) done

**Quality**
- [ ] Loading/error/empty states everywhere
- [ ] Keyboard walkthrough and axe pass
- [ ] Lighthouse 95+ on mobile
- [ ] CI green; rollback plan known
