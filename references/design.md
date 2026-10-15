# Design System: Refined Minimalist Light Mode

Positive examples (components, Tailwind config, page patterns) are in `components.md`. Responsive and mobile-first rules are detailed in `responsiveness.md`. Start there; use this file for the core light-mode aesthetic principles.

## 1. Tokens
```css
/* styles/tokens.css */
:root {
  --bg: #FAFAF9;
  --surface: #FFFFFF;
  --text: #171717;
  --text-muted: #5F5F5F;     /* keep >= 4.5:1 on bg */
  --border: #E5E5E3;
  --accent: #171717;         /* ONE accent; swap for a single brand color if needed */
  --accent-fg: #FAFAF9;      /* text on accent */
  --danger: #B42318;
  --radius: 8px;
  --font: 'Inter', system-ui, sans-serif;
}
:root[data-theme="dark"] {
  --bg: #0E0E0E; --surface: #151515; --text: #F2F2F0;
  --text-muted: #A1A1A1; --border: #262626; --accent: #F2F2F0; --accent-fg: #0E0E0E;
}
```
Spacing uses Tailwind's default 4px scale restricted to this set: `1 2 4 6 8 12 16 24` (= 4, 8, 16, 24, 32, 48, 64, 96px). Map the tokens into Tailwind (see `components.md`) so classes like `bg-bg text-text border-border` exist. No raw colors or arbitrary values (`[#fff]`, `w-[437px]`) in components.

## 2. Typography
- One typeface. Weights 400 and 600 only.
- Scale: 14 / 16 / 20 / 24 / 32 / 40 / 56. Body 16-18px, line-height 1.6, `max-w-prose` for paragraphs.
- Headings: line-height 1.1-1.2, slight negative tracking, weight 600.
- Left-align text. Center only short hero lines.

## 3. Layout and spacing
- 8px grid. Section padding 96px desktop / 64px mobile (`py-16 md:py-24`). Be generous.
- Container: `max-w-5xl` (or 6xl), `px-4 md:px-6`, centered. Use the `Container` component.
- Single column by default; max 2 for content, 3 for simple grids. `grid-cols-1 md:grid-cols-2`.
- One primary action per screen.

## 4. Component rules
- **Button:** solid (`--accent` on `--accent-fg`) or outlined 1px. 8px radius. Hover = small opacity change, 150ms. Min height 44px.
- **Card:** only if it groups content. 1px border, no shadow, `--radius`.
- **Input:** 1px border, visible label always (never placeholder-only), 2px focus ring with offset, 16px font minimum.
- **Nav:** logo left, 3-5 links right; mobile = simple vertical menu. No mega-menus.
- **Icons:** Lucide, 1.5px stroke, only when they add meaning. No icon-in-colored-circle decoration.

## 5. BANNED: the "typical AI design" list
Never use these (most are caught by `check-banned-patterns.mjs`):
- Glow effects: colored `box-shadow` blur, `drop-shadow` glows, neon borders, blurred gradient orbs/blobs (`blur-3xl`)
- Gradients of any kind on backgrounds, buttons, borders or text (`bg-gradient-*`, `linear-gradient`, `bg-clip-text`)
- The purple/blue/indigo/violet "AI" palette; dark navy + cyan combos
- Glassmorphism: `backdrop-blur`, translucent frosted panels
- Heavy shadow stacks (`shadow-xl`, `shadow-2xl`); at most a 1px border
- Oversized radius everywhere (`rounded-2xl/3xl`), pill-shaped everything
- Emoji as icons or bullets; sparkle icons; the sparkle emoji anywhere
- Hero clichés: badge pill above the headline ("Now in beta"), gradient headline, two buttons plus a floating mockup
- Bento grids with 6 mismatched tiles; three identical feature cards with icon circles
- Animated gradients, grain overlays, grid/dot backgrounds, particles, cursor followers
- Scale/bounce hover effects (`hover:scale-105`), bouncy springs, infinite pulse/loop animations
- Marketing filler: "Supercharge", "Unlock", "Seamless", "Revolutionize", "Elevate", "Next-gen"
- Fake logo walls, fake testimonials, fake stats

## 6. Visual interest without clutter
Character comes from: a strong type scale, precise alignment, generous whitespace, real photography, one confident accent, thin 1px rules and good copy. Not from effects.

## 7. NO HORIZONTAL SCROLLING
> **Note:** For the complete 10-rule guide, fluid typography (`clamp()`), touch ergonomics, and Playwright verification, see `references/responsiveness.md`.

### Rules
1. Never set a px width larger than the viewport on a block element. Use `max-w-*` + `w-full`.
2. **Never use `100vw`** for width (it includes the scrollbar). Use `100%` / `w-full`. No `w-screen`.
3. Every flex/grid child that holds text or media gets `min-w-0`.
4. Media: `img, video, svg, canvas { max-width: 100%; height: auto; }`
5. Long strings (emails, URLs, IDs): `overflow-wrap: anywhere;` on the container.
6. **No carousels, marquees, sliders or swipe rows.** Use wrapping grids or stacked lists.
7. Full-bleed tricks (`-mx-[50vw]`, `left-1/2 -translate-x-1/2 w-screen`) are banned.
8. Tables: on mobile, convert rows to stacked cards (label/value) instead of sideways scroll.
9. Code blocks and unavoidable wide content get their own `overflow-x-auto` **inside a bounded container**, never at page level.
10. Fixed/absolute decorative elements must never extend past the container. Delete them if in doubt.
11. Tap targets >= 44px; inputs 16px font minimum (prevents iOS zoom that shifts layout).
12. **Animations must not cause overflow.** Never animate in from off-screen on X (`x: '100%'`, `x: 100vw`). Reveal with `y` (8-16px) and opacity. If a small `x` offset (<= 16px) is unavoidable, wrap the section in `overflow-x: clip`.

### Global safety net (add it, but do not rely on it)
```css
/* globals.css */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; min-height: 100dvh; overflow-wrap: break-word; }
img, video, svg, canvas { max-width: 100%; height: auto; display: block; }
```
> `overflow-x: hidden` on `body` hides the symptom and breaks `position: sticky`. Fix the offending element instead.

### Find the offender
The Playwright test (`scripts/e2e/no-horizontal-scroll.spec.js`) lists the elements that overflow when it fails. Manually, in the DevTools console at 320px:
```js
[...document.querySelectorAll('*')].filter(
  el => el.getBoundingClientRect().right > document.documentElement.clientWidth
).forEach(el => console.log(el));
```
Also test at 360, 390, 768, 1024, 1280, 1920 and browser zoom 200%.
