# Motion: Smooth, Not Showy (Framer Motion)

Install: `npm i motion`, import from `motion/react` (the library formerly published as `framer-motion`; same API).

## Principles
1. Motion **explains** (where something came from, what changed). It never decorates.
2. **One motion language:** same easing and durations everywhere, defined once in `shared/motion/presets.js`.
3. Animate **`opacity` and `transform` only** (`y`, `scale` for press feedback). Never `width/height/top/left` on in-flow content (layout shift, jank).
4. Fast: 150-300ms for UI, up to 500ms for section reveals. Total page choreography under ~1s.
5. Scroll reveals play **once**.
6. Respect reduced motion globally.
7. Motion never delays interaction or hides content from crawlers or slow devices.

## Presets (single source of truth)
```js
// shared/motion/presets.js
export const ease = [0.22, 1, 0.36, 1]; // smooth ease-out, no overshoot
export const duration = { fast: 0.15, base: 0.3, slow: 0.5 };

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease } },
};
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease } },
};
export const stagger = { visible: { transition: { staggerChildren: 0.06 } } };
```

## Provider (reduced motion + smaller bundle)
```jsx
// app/providers.jsx
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { duration, ease } from '@/shared/motion/presets';

<MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease }}>
  <LazyMotion features={domAnimation} strict>
    {children}
  </LazyMotion>
</MotionConfig>
```
With `LazyMotion` use the lightweight `m.` components (`m.div`, `m.li`), not `motion.div`. `strict` makes the build fail if someone imports the heavy one.

## Reveal
```jsx
// shared/motion/Reveal.jsx
import { m } from 'motion/react';
import { fadeUp } from './presets';

export function Reveal({ children, className }) {
  return (
    <m.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
    >
      {children}
    </m.div>
  );
}
```
For lists: parent `m.ul` with `variants={stagger} initial="hidden" whileInView="visible"`, each child `m.li variants={fadeUp}`. Cap staggered items at ~8 so total delay stays under ~0.5s.

## Where to use it
- Below-the-fold section reveals (`Reveal`), list/grid stagger
- Mount/unmount of modals, dropdowns, toasts, mobile menu via `AnimatePresence`
- Accordions (`animate={{ height: 'auto' }}` inside an `overflow-hidden` wrapper)
- Route entrance: enter-only fade/translate keyed by pathname
  ```jsx
  const { pathname } = useLocation();
  <m.main key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    <Outlet />
  </m.main>
  ```
  Exit animations with React Router's `<Outlet />` need extra work (freezing the outlet). Usually not worth it; skip them.
- Micro-feedback: `whileTap={{ opacity: 0.85 }}` on buttons; link underline reveal with CSS. No scale-up hovers.
- Skeleton shimmer only as a flat, low-contrast fade, never a gradient sweep.

## Rules that protect SEO, performance and layout
- **Never put `initial={{ opacity: 0 }}` on the LCP element or the above-the-fold `h1`/hero image.** It delays LCP and leaves content invisible if JS is slow.
- No `layout` animations on large trees; use `layout` sparingly on small elements.
- No parallax, scroll-jacking, scroll-linked transforms on large areas, cursor followers or looping animations.
- Do not animate in from off-screen on X (CI-enforced; see `design.md` rule 12).
- Motion must not change document flow after load (no CLS): reserve space, animate transforms.
- QA: test with OS "reduce motion" on, with 4x CPU throttling in DevTools, and at 320px.
