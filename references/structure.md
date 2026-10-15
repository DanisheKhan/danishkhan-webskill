# Structure and React Patterns

## File structure
```
src/
  app/                      # app shell: wiring only, no business logic
    App.jsx
    router.jsx
    providers.jsx           # QueryClient, AuthProvider, MotionConfig, Theme
    layouts/
      RootLayout.jsx
      AuthLayout.jsx
  features/
    auth/
      api/                  # supabase calls (auth.api.js)
      components/           # LoginForm, SignupForm
      hooks/                # useSession, useSignIn
      schemas/              # zod schemas
      routes/               # LoginPage.jsx, SignupPage.jsx
      typedefs.js           # JSDoc @typedef shapes
      index.js              # PUBLIC API of the feature
    products/
      api/ products.api.js
      components/ ProductCard.jsx, ProductList.jsx
      hooks/ useProducts.js, useProduct.js
      routes/ ProductsPage.jsx, ProductDetailPage.jsx
      typedefs.js
      index.js
    contact/
      ...
  shared/                   # truly cross-feature, feature-agnostic
    ui/                     # Button, Input, Container, Section, Modal, Toast
    hooks/                  # useMediaQuery, useDebounce
    motion/                 # presets.js, Reveal (one motion language)
    seo/                    # Seo component, JSON-LD helpers
    lib/
      supabase.js           # single client instance
      queryClient.js
      errors.js             # maps Supabase/Postgres errors to human messages
      format.js
      site.js               # site name, url, default OG image
  styles/
    tokens.css
    globals.css
  main.jsx
supabase/
  migrations/               # SQL, versioned
  functions/                # Edge Functions
  seed.sql
  config.toml
scripts/                    # enforcement (see scripts/README.md)
```

## Structure rules (enforced by `check-banned-patterns.mjs`)
- **A feature exports only through `index.js`.** Other features import `@/features/products`, never `@/features/products/components/ProductCard`.
- **Features may import from `shared/`. `shared/` never imports from features.**
- **Features do not import each other's internals.** If two features need the same thing, move it to `shared/` or compose them at the `app/` or route level.
- `routes/` inside a feature holds page-level components. The router in `app/` only points at them.
- **Rule of three:** duplicate once, extract on the third use.
- Path alias `@/` -> `src/`, set in **both** `vite.config.js` and `jsconfig.json`.
- Naming: `PascalCase.jsx` for components, `camelCase.js` for logic, `x.api.js` for data access.

## React patterns
- Function components and hooks only. One responsibility per component; split past ~150 lines.
- Plain JavaScript discipline: document props and data shapes with JSDoc (`@param`, `@typedef`) or PropTypes, give optional props defaults, validate untrusted data (forms, anything external) with zod at the boundary. Keep ESLint (`react-hooks`, `no-unused-vars`, `no-undef`) on and enforced in CI, since there is no compiler to catch mistakes.
- **Server state in TanStack Query. UI state in `useState`.** Add a global store only when you can name the problem it solves.
- Every data view handles **loading, error and empty** states. No blank screens.
- Forms: zod schema -> `react-hook-form`; inline errors; submit disabled while pending; success feedback.
- Route-level code splitting with `React.lazy`.
- Error boundary at the layout level plus a custom 404 route.
- Avoid `useEffect` for data fetching and for derived values.
- Debounce search inputs; keep list rendering cheap (key by id, paginate).

## Hooks wrap the API
```js
// features/products/hooks/useProducts.js
import { useQuery } from '@tanstack/react-query';
import { listProducts } from '../api/products.api';

export const productKeys = {
  all: ['products'],
  list: (page) => [...productKeys.all, 'list', page],
};

export const useProducts = (page = 0) =>
  useQuery({ queryKey: productKeys.list(page), queryFn: () => listProducts({ page }) });
```
Query keys are centralized per feature. Mutations invalidate the feature's key. For optimistic updates see `supabase-realworld.md`.
