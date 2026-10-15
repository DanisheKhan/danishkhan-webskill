# SEO: Make Every Public Page Rankable

## 1. Rendering decision (decide early; this is the biggest SEO choice)
| Approach | SEO reality | Use when |
|---|---|---|
| Plain Vite SPA (client-rendered) | Google can index JS content but slower and less reliably. Many other crawlers and social-link previews (OG tags) do **not** run JS. A SPA fallback returns HTTP 200 for missing pages (soft 404). | Dashboards, internal tools, anything behind login |
| Vite + build-time pre-rendering (`vite-react-ssg`, `vike`) | Real HTML per route; good for content known at build time | Portfolio, brochure and marketing sites, blogs with few changes |
| Next.js (App Router) + `@supabase/ssr` | Best: server-rendered or static HTML, proper 404 status, ISR for DB-driven pages, httpOnly cookie auth | Business sites where organic search matters; product/listing/blog pages from Supabase |

**Recommendation:** if organic traffic is a goal (client sites, e-commerce, local business), use pre-rendering at minimum, and Next.js when content comes from the database. The `features/` structure carries over unchanged; only `app/` becomes the framework's routing layer. Keep the logged-in app a client-rendered area marked `noindex`. Confirm the choice with the user before building.

## 2. `Seo` component (use on every route)
```jsx
// shared/seo/Seo.jsx
// React 19 hoists <title>, <meta>, <link> into <head>. On React 18 use react-helmet-async.
import { SITE } from '@/shared/lib/site';

/**
 * @typedef {Object} SeoProps
 * @property {string} title
 * @property {string} description
 * @property {string} path            e.g. "/products/blue-mug"
 * @property {string} [image]         absolute URL, 1200x630
 * @property {'website'|'article'} [type]
 * @property {boolean} [noindex]      login, dashboard, thank-you pages
 */

/** @param {SeoProps} props */
export function Seo({ title, description, path, image = SITE.defaultImage, type = 'website', noindex }) {
  const url = `${SITE.url}${path}`;
  const fullTitle = title === SITE.name ? title : `${title} | ${SITE.name}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
```

## 3. On-page rules
- **One `h1` per page** with the primary topic; logical `h2/h3` below.
- Title ~50-60 characters, unique per page; description ~120-155 characters, written for humans, unique per page.
- URLs: lowercase, hyphenated, short, stable (`/products/blue-mug`). One canonical host (www or non-www) and a consistent trailing-slash policy, enforced by 301 redirects.
- Descriptive link text (never "click here"); meaningful `alt`; images with `width`/`height`.
- Every important page reachable within 3 clicks from home via real `<a href>` links (not `onClick` navigation).
- Real, original, useful text in the HTML; no text baked into images; no content visible only after login.
- Pagination with real URLs (`?page=2`). No infinite scroll.
- Multilingual: `<link rel="alternate" hreflang="...">` and `<html lang>` set correctly.

## 4. Technical files
- `public/robots.txt` pointing to the sitemap. Do **not** `Disallow` pages you also mark `noindex` (crawlers must see the tag).
- `sitemap.xml` generated at build by `scripts/generate-sitemap.js` reading slugs from Supabase; only canonical, indexable URLs with `lastmod`.
- Favicon set (`.ico`, 32px PNG, 180px apple-touch-icon), `site.webmanifest`, theme-color meta.
- Real 404 page, with a true 404 status when using pre-render/SSR.
- Open Graph default image (1200x630) plus per-page images for articles/products.
- `<html lang="en">`, viewport meta, HTTPS only, HSTS.
- Every new public route is also added to `scripts/e2e/routes.json`.

## 5. Structured data (JSON-LD)
Add only types that match real page content: `Organization` or `LocalBusiness` (home/contact), `Product` + `Offer` (product pages), `Article` (blog), `BreadcrumbList` (deep pages), `FAQPage` only if the FAQ is visible on the page. Render as `<script type="application/ld+json">` with `JSON.stringify` of an object. Validate with Google's Rich Results Test.

## 6. Measurement and hygiene
- Core Web Vitals are a ranking signal: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Verify in **Google Search Console** and **Bing Webmaster Tools**; submit the sitemap; watch the Pages/Indexing report.
- Privacy-friendly analytics (Plausible/Umami) or GA4 with consent; track conversions (form submit, signup, purchase).
- Test social previews (LinkedIn Post Inspector, Facebook Sharing Debugger) after each deploy that changes metadata.
- **Don't:** keyword-stuff, duplicate titles/descriptions, hide text, buy links, publish thin or AI-generated filler pages, change URLs without 301 redirects.
