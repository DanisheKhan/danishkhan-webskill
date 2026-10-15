# Security

## Baseline
- Anon key only in the client. Secrets only in Edge Functions / server env. `service_role` in `src/` fails CI.
- RLS on, policies tested per role. Never trust the UI for authorization.
- Validate with zod on the client **and** with DB constraints (`check`, `not null`, `unique`, foreign keys).
- Sanitize any rendered user HTML (DOMPurify) or avoid `dangerouslySetInnerHTML` entirely.
- Rate-limit sensitive endpoints (auth, contact form) via Edge Function or Supabase settings; add CAPTCHA/honeypot on public forms.
- Dependency audit in CI.

## Supabase-specific
- **Session storage:** supabase-js in a Vite SPA keeps the session in `localStorage`, so any XSS can steal it. Mitigate with a strict CSP, no `dangerouslySetInnerHTML` (or DOMPurify), no untrusted third-party scripts. For httpOnly-cookie sessions you need SSR (Next.js + `@supabase/ssr`).
- **Views bypass RLS** unless created with `security_invoker = true`. For Postgres functions avoid `security definer` unless required, and always `set search_path = ''`.
- **Auth settings:** exact redirect-URL allow-list (no wildcards in prod), email confirmation on, strong password policy, short JWT expiry, disable unused providers, disable public signups if the app is invite-only.
- **Bot protection:** CAPTCHA (Cloudflare Turnstile / hCaptcha) on signup, login and contact forms, plus a honeypot and rate limiting in Edge Functions (working example in `supabase-realworld.md`).
- **Admin actions** (delete user, refunds, role changes) only in Edge Functions that re-verify the caller's role from the database, never from client-supplied data.
- **Storage:** no public buckets for private data; short-lived signed URLs; restrict MIME types and file size.
- **Audit trail:** log sensitive actions to an insert-only `audit_log` table.
- **Secrets hygiene:** secret scanning (gitleaks / GitHub) in CI; rotate any key that ever touched git history; 2FA on GitHub, Supabase, hosting and the domain registrar.
- **Abuse limits:** cap request body sizes, text lengths (DB `check` constraints) and rows per user.

## HTTP security headers (set at host level, not in React)
```json
// vercel.json (Netlify: _headers file)
{ "headers": [{ "source": "/(.*)", "headers": [
  { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
  { "key": "X-Content-Type-Options", "value": "nosniff" },
  { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
  { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
  { "key": "X-Frame-Options", "value": "DENY" },
  { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co wss://<project>.supabase.co; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
]}]}
```
Add analytics/CAPTCHA/font domains explicitly to the CSP as you introduce them (Turnstile needs its script and frame origin; Razorpay Checkout needs its script and frame origins), then test every page with DevTools open (CSP violations show in the console). Verify at securityheaders.com.
