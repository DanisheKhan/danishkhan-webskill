# Supabase: Real-World Gaps

Read the section you need. **If you are unsure about any method, option or error code below, confirm it in the Supabase docs (MCP docs tool) before relying on it.** Code here is a starting point, not a substitute for that check.

1. Auth edge cases
2. RLS performance
3. RPC / database functions
4. Realtime
5. Optimistic updates
6. Error mapping
7. Free-tier realities
8. Transactional email and the contact form
9. Payments (Razorpay / Stripe) with webhook verification

---

## 1. Auth edge cases

**Session refresh.** supabase-js refreshes tokens automatically in the browser. Do not build your own refresh timer. React to `onAuthStateChange` events (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `PASSWORD_RECOVERY`, `USER_UPDATED`).
- Keep the callback synchronous. Do not `await` other Supabase calls directly inside it (this can deadlock); set state, or defer the work with `setTimeout(() => ..., 0)`.
- On `SIGNED_OUT` (including a failed refresh), clear the TanStack Query cache: `queryClient.clear()`.
- `getSession()` reads local storage and is not verified by the server. For anything security-relevant, use `getUser()` (server-verified) or rely on RLS. Never authorize from client-held session data.
- Expired session while a form is open: catch auth errors in the api layer, redirect to login with a `next` param, and preserve unsent input where practical.

**OAuth redirect URLs per environment.**
- Set **Site URL** and the **Redirect URLs allow-list** separately in each Supabase project (dev, staging, prod). Exact URLs in prod; wildcards only in dev/staging if needed.
- Build `redirectTo` from the current origin, so it is right in every environment:
  ```js
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  ```
- Add an `/auth/callback` route that waits for the session, then navigates to `next` or `/`.
- Update the provider's own console (Google, GitHub) with the Supabase callback URL for each project.
- Local dev: add `http://localhost:5173/**` to the **dev** project only.

**Email templates and auth emails.**
- Customize confirmation, magic-link, recovery and invite templates in the dashboard (Auth > Email Templates) or `config.toml` for local dev. Use the template variables Supabase documents (for example `{{ .ConfirmationURL }}`).
- Configure **custom SMTP** (Resend, Postmark, SES) before launch. The default sender is rate-limited and meant for testing.
- Set up SPF, DKIM and DMARC on the sending domain. Send yourself a real confirmation and recovery email and check spam placement.
- Test: sign up, confirm, log in, reset password, change email, expired link, reused link.

---

## 2. RLS performance

Wrap `auth.uid()` (and other `auth.*` / `current_setting` calls) in a subselect so Postgres evaluates it once per query instead of once per row:
```sql
-- slow on large tables: evaluated per row
using (auth.uid() = user_id)

-- better: evaluated once (initPlan)
using ((select auth.uid()) = user_id)
```
- Index every column used in a policy (`user_id`, `org_id`, ...).
- Specify the role: `to authenticated` (or `to anon`) so the policy is skipped for other roles.
- Avoid joins and subqueries inside policies. For membership checks, use a small `security definer` helper function with `set search_path = ''` and an indexed lookup.
- In client queries, still add explicit filters (`.eq('user_id', user.id)`) so the planner can use indexes. RLS is the safety net, not the query plan.
- Run `get_advisors` (performance) after adding policies.

---

## 3. RPC / database functions

Use `supabase.rpc()` for multi-step operations that must be atomic (create order + items, decrement stock), or logic that should not be split across round trips.
```sql
create or replace function public.place_order(p_items jsonb)
returns uuid
language plpgsql
security invoker          -- default; RLS still applies. Use definer only when required.
set search_path = ''
as $$
declare v_order uuid;
begin
  insert into public.orders (user_id) values ((select auth.uid())) returning id into v_order;
  -- insert order_items from p_items ...
  return v_order;
end;
$$;
```
```js
// features/orders/api/orders.api.js
export async function placeOrder(items) {
  const { data, error } = await supabase.rpc('place_order', { p_items: items });
  if (error) throw error;
  return data;
}
```
- Always `set search_path = ''` and schema-qualify objects (`public.orders`).
- `security definer` bypasses RLS: validate the caller inside the function, and revoke `execute` from `anon`/`public` unless it must be public (`revoke execute on function ... from public, anon;`).
- RPC calls live in `api/` like any other Supabase call. Ship the function as a migration.

---

## 4. Realtime

Use it only where live updates matter (chat, live status, dashboards). Otherwise polling or refetch-on-focus via TanStack Query is simpler.
```js
// features/orders/hooks/useOrderUpdates.js
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToOrders } from '../api/orders.api';
import { orderKeys } from './useOrders';

export function useOrderUpdates() {
  const qc = useQueryClient();
  useEffect(() => {
    const unsubscribe = subscribeToOrders(() => qc.invalidateQueries({ queryKey: orderKeys.all }));
    return unsubscribe;
  }, [qc]);
}
```
```js
// in orders.api.js
export function subscribeToOrders(onChange) {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
```
- The table must be enabled for Realtime (publication) in a migration. RLS applies to `postgres_changes`.
- Always clean up with `removeChannel` in the effect cleanup.
- Prefer **invalidating queries** on events over hand-patching cached state; it keeps one source of truth.
- Do not subscribe to whole large tables. Filter (`filter: 'user_id=eq.<id>'`).

---

## 5. Optimistic updates

For quick-feel actions (toggle, like, small edits). Skip them for payments or anything where failure is costly.
```js
export function useToggleDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }) => setTaskDone(id, done),     // api layer
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: taskKeys.all });
      const previous = qc.getQueryData(taskKeys.list());
      qc.setQueryData(taskKeys.list(), (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t)));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(taskKeys.list(), ctx.previous);        // rollback
      toast.error(toMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
```

---

## 6. Mapping errors to human messages

Never show raw `error.message` to users. Centralize in `shared/lib/errors.js`:
```js
// shared/lib/errors.js
const MESSAGES = {
  // Postgres
  '23505': 'That already exists.',
  '23503': 'This item is linked to something else and cannot be changed.',
  '23502': 'A required field is missing.',
  '23514': 'One of the values is not allowed.',
  '42501': 'You do not have permission to do that.',
  // PostgREST
  PGRST116: 'We could not find that item.',
  PGRST301: 'Your session has expired. Please sign in again.',
  // Supabase Auth (error.code)
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email first.',
  user_already_exists: 'An account with this email already exists.',
  weak_password: 'Please choose a stronger password.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  over_email_send_rate_limit: 'Too many emails sent. Please try again later.',
};

export function toMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'You appear to be offline.';
  return MESSAGES[error.code] ?? 'Something went wrong. Please try again.';
}
```
- Log the real error (to Sentry or the console in dev); show the friendly one.
- Treat the table as a living list: confirm codes in the docs and add what you actually hit.
- Use the mapped message in form errors and toasts; keep the original for logs.

---

## 7. Free-tier realities

**Verify the current terms at supabase.com/pricing and the docs before quoting a client.** Limits change. What to check, and what has historically been true:
- **Inactivity pause:** free projects can be paused after a period of no activity (historically about a week) and must be restored manually. A paused client site shows errors. Not acceptable for a business site.
- **Backups:** free projects have had no downloadable or point-in-time backups. Daily backups and PITR sit on paid plans. Export `pg_dump` yourself if you stay on free.
- **Resource caps:** database size, storage, egress, monthly active users, Edge Function invocations, Realtime connections.
- **Email:** the built-in auth email sender is heavily rate-limited; use custom SMTP.
- **Support/SLA:** none on free.

**Rule:** a paying client's production site goes on a paid plan (or a plan the client owns and understands). Free tier is for prototypes, portfolios and staging. Tell the client the hosting cost upfront. Do not use keep-alive pings to dodge the pause on a client site.

---

## 8. Transactional email and the contact form

Pattern: browser -> Edge Function -> (verify Turnstile, honeypot, validate, rate-limit) -> store row -> send email via Resend. The browser never sees the Resend key.

**Table (migration):**
```sql
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 5000),
  ip_hash text,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
-- No insert/select policies for anon: only the Edge Function (service role, server-side) writes.
```

**Edge Function** (`supabase/functions/send-contact/index.ts`; Edge Functions run on Deno and are the one place TypeScript-style files are normal. Keep client code JavaScript):
```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_ORIGIN') ?? '',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const { name, email, message, website, turnstileToken } = await req.json().catch(() => ({}));

  // Honeypot: real users leave `website` empty. Pretend success to bots.
  if (website) return json({ ok: true });

  // Validate
  if (!name || !email || !message || message.length > 5000 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'invalid_input' }, 400);
  }

  // Turnstile
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: Deno.env.get('TURNSTILE_SECRET')!, response: turnstileToken ?? '', remoteip: ip }),
  }).then((r) => r.json());
  if (!verify.success) return json({ error: 'captcha_failed' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Simple rate limit: max 5 per hour per IP hash
  const ipHash = ip ? await sha256(ip) : null;
  if (ipHash) {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin.from('contact_messages')
      .select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if ((count ?? 0) >= 5) return json({ error: 'rate_limited' }, 429);
  }

  const { error: dbError } = await admin.from('contact_messages').insert({ name, email, message, ip_hash: ipHash });
  if (dbError) return json({ error: 'server_error' }, 500);

  // Email via Resend (plain text avoids HTML-injection)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('MAIL_FROM'),          // e.g. "Site <hello@yourdomain.com>" on a verified domain
      to: [Deno.env.get('MAIL_TO')],
      reply_to: email,
      subject: `New contact message from ${name}`.slice(0, 120),
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });
  if (!res.ok) console.error('resend_failed', res.status);   // message is already stored; do not fail the user

  return json({ ok: true });
});

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```
Secrets: `supabase secrets set RESEND_API_KEY=... TURNSTILE_SECRET=... MAIL_FROM=... MAIL_TO=... SITE_ORIGIN=https://yourdomain.com`. Verify the sending domain in Resend (SPF/DKIM).

**Client api function:**
```js
// features/contact/api/contact.api.js
import { supabase } from '@/shared/lib/supabase';

export async function sendContact(values) {
  const { data, error } = await supabase.functions.invoke('send-contact', { body: values });
  if (error) throw error;
  return data;
}
```
Form requirements: visible labels, zod validation, hidden honeypot field named `website` (`tabIndex={-1}`, `autoComplete="off"`, visually hidden but not `display:none`), Turnstile widget, submit disabled while pending, success and error states. A reference form is in `components.md`.

---

## 9. Payments: Razorpay and Stripe via Edge Functions

Rules (both providers):
- Create orders/checkout sessions **server-side**, with the **amount read from your database**, never from the client.
- **Verify the webhook signature on the raw request body** before doing anything. Reject on mismatch.
- Treat the webhook, not the browser redirect, as the source of truth for "paid".
- Make handlers **idempotent**: store the provider's event ID in a table with a unique constraint and skip duplicates.
- Webhook functions are called by the provider, not a logged-in user: set `verify_jwt = false` for that function in `supabase/config.toml` (signature verification replaces JWT).
- Use `test` keys in dev/staging; keep live keys only in prod secrets.
- Never log full payloads containing personal data.

**Razorpay webhook** (signature = HMAC-SHA256 of the raw body with the webhook secret, sent in `x-razorpay-signature`):
```ts
Deno.serve(async (req) => {
  const body = await req.text();                                   // RAW body, do not JSON.parse first
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const eventId = req.headers.get('x-razorpay-event-id') ?? '';

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (!timingSafeEqual(expected, signature)) return new Response('invalid signature', { status: 400 });

  const event = JSON.parse(body);
  // 1) insert eventId into payment_events (unique); if conflict, return 200 (already handled)
  // 2) if event.event === 'payment.captured' -> mark the order paid (match on order id from your DB)
  return new Response('ok');
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```
Checkout flow: client calls an Edge Function that creates the Razorpay order (amount from DB, currency `INR`) and returns the order id; the client opens Razorpay Checkout with it; after success, the client may also call a verify function (checks `razorpay_signature` over `order_id|payment_id` with your key secret), but the webhook remains authoritative.

**Stripe webhook:**
```ts
import Stripe from 'npm:stripe';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, cryptoProvider);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }
  // idempotency on event.id, then handle 'checkout.session.completed' etc.
  return new Response('ok');
});
```
Confirm current SDK usage and signature format in each provider's docs before shipping, and test with their CLI or dashboard "send test webhook" tools.
