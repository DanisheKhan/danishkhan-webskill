# Supabase Patterns

For MCP usage see `supabase-mcp.md`. For auth edge cases, RLS performance, RPC, Realtime, error mapping, email and payments see `supabase-realworld.md`. **Never invent Supabase APIs:** check the docs if unsure.

## Single client
```js
// shared/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(url, key);
```
Only the **anon** (publishable) key is allowed in the frontend.

## API layer per feature
```js
// features/products/api/products.api.js
import { supabase } from '@/shared/lib/supabase';

export async function listProducts({ page = 0, pageSize = 12 } = {}) {
  const from = page * pageSize;
  const { data, error, count } = await supabase
    .from('products')
    .select('id, name, price, image_url', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data, total: count ?? 0 };
}
```
- Select only the columns you need. No `select('*')` (CI-enforced).
- Always paginate list queries.
- Always `throw` on error so TanStack Query handles it.
- `supabase.from` / `.rpc` / `.storage` / `.functions` appear only in `features/*/api/` files (CI-enforced). Auth state wiring lives in `features/auth/api`.

## Auth basics
- **Supabase Auth is the only auth system.** No custom login endpoints, hand-rolled JWTs or password hashing. Use `signUp`, `signInWithPassword`, `signInWithOAuth`, `resetPasswordForEmail`, `signOut`.
- One `AuthProvider` subscribing to `supabase.auth.onAuthStateChange`. Expose `session`, `user`, `loading`. Gate routes with `ProtectedRoute`.
- Roles live in a `profiles` table (or JWT custom claims) and are **checked by RLS**, not just the UI.
- Create the `profiles` row with a database trigger on `auth.users` insert.
- Test email confirmation and password reset manually. Edge cases: `supabase-realworld.md`.

## Database and RLS
- Every schema change is a migration file in `supabase/migrations/`. Never edit production through the dashboard.
- `alter table x enable row level security;` on **every** table, then explicit policies, one per operation (select/insert/update/delete), with `to authenticated` or `to anon` stated.
- Owner-only pattern: `using ((select auth.uid()) = user_id)` (note the subselect; see `supabase-realworld.md`).
- Index foreign keys and columns used in filters, sorts and policies.
- `created_at` and `updated_at` (with trigger) everywhere.
- No generated types in JavaScript. Read the live schema with MCP `list_tables` before writing queries, and keep a short `docs/schema.md` snapshot for humans.
- Test policies as `anon` and as a normal user, not only as admin.

## Storage
- Separate buckets by purpose; public bucket only for truly public assets.
- Storage policies mirror table policies. Path convention: `{user_id}/{filename}`.
- Validate file type and size on the client **and** with policy or Edge Function.
- Use Supabase image transformations or pre-optimized WebP. Never serve raw 6MB photos.

## Edge Functions
Use them for anything needing secrets: payments, sending email, admin-only operations, bot-verification. Verify webhook signatures. Never put these secrets in the frontend. Working examples are in `supabase-realworld.md`.

## Environments
Separate Supabase projects for **dev**, **staging**, **prod**. Env vars per environment. Local dev with `supabase start` when possible.
