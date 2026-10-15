# Responsive Web Design & Mobile-First Excellence

This guide establishes the rules and patterns for building flawless, mobile-first responsive websites from **320px viewport width up to 4K displays**.

---

## 1. The 320px Mobile-First Standard

Every interface must be designed and tested starting from **320px** (e.g. iPhone SE 1st gen, Galaxy Fold cover screen) up through ultra-wide monitors.

### Standard Breakpoints (Tailwind)
| Breakpoint | Min-Width | Target Devices |
|---|---|---|
| `default` | `< 640px` | Small to large mobile phones (320px – 639px) |
| `sm` | `640px` | Large phones in landscape, small tablets |
| `md` | `768px` | iPads, tablets, small portrait laptops |
| `lg` | `1024px` | Laptops, desktop monitors |
| `xl` | `1280px` | Large desktop displays |
| `2xl` | `1536px` | Ultra-wide displays, high-res monitors |

**Rule:** Design mobile first. Write base styles for mobile (`< 640px`), then add `md:`, `lg:` modifiers to scale up. Never write desktop styles and try to "shrink" them down with overrides.

---

## 2. The 10 Anti-Horizontal Scroll Rules

Horizontal scroll on mobile is a critical bug. It breaks touch-scrolling, cuts off text, and feels broken. Follow these 10 non-negotiable rules:

### Rule 1: Never Use `100vw` or `w-screen` for Layouts
On Windows, Chrome, and Android, `100vw` includes the browser vertical scrollbar width (~15-17px), causing instant horizontal page scroll.
- **Incorrect:** `<div className="w-screen">...</div>` or `width: 100vw;`
- **Correct:** `<div className="w-full">...</div>` or `width: 100%;`

### Rule 2: Flexbox & Grid Children Must Have `min-w-0`
By default, flex and grid items have `min-width: auto`. If a child contains long text or an image, it expands past its parent.
- **Incorrect:** `<div className="flex"><div>Long text...</div></div>`
- **Correct:** `<div className="flex"><div className="min-w-0">Long text...</div></div>`

### Rule 3: Text Wrapping on All Containers
Prevent long words, URLs, emails, or hash IDs from blowing out container widths:
```css
/* In global CSS or container utilities */
.break-words {
  overflow-wrap: break-word;
  word-break: break-word;
}
/* For very long unbreakable strings like transaction hashes or URLs */
.break-anywhere {
  overflow-wrap: anywhere;
}
```

### Rule 4: Responsive Media Sizing
Every image, video, SVG, canvas, and iframe must be bounded:
```css
/* In globals.css */
img, video, canvas, svg {
  max-width: 100%;
  height: auto;
  display: block;
}
```
If an image is inside a flex child, ensure the parent has `min-w-0` or the image has `w-full object-cover`.

### Rule 5: Container Bounds (`Container.jsx`)
Never let page content exceed max widths on wide screens or bleed off edges on mobile:
```jsx
// shared/ui/Container.jsx
export function Container({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
```

### Rule 6: No Full-Bleed Hacks
Do not use negative viewport margins like `-mx-[50vw] left-1/2 -translate-x-1/2`. If a section requires a background spanning the entire browser width:
- Wrap the section in an outer full-width wrapper (`w-full bg-surface border-y border-border`).
- Place the `<Container>` inside the wrapper.

### Rule 7: Bounded Horizontal Overflow for Code & Tables
Wide tables and code blocks cannot fit on 320px screens. **Isolate horizontal scrolling to the component itself**, never the entire page:
```jsx
<div className="w-full overflow-x-auto rounded border border-border">
  <table className="w-full min-w-[600px] text-sm">
    {/* table content */}
  </table>
</div>
```
On mobile, prefer transforming table rows into stacked key-value cards instead of raw tables.

### Rule 8: Never Animate Off-Screen on the X Axis
Animating elements from off-screen (`x: '100vw'`, `x: 500`) expands the document's bounding box and triggers horizontal scrollbars during animation.
- Animate with vertical reveals (`y: 12`, `opacity: 0 -> 1`).
- If horizontal motion is strictly required, wrap the section with `overflow-x: clip;` (not `overflow-x: hidden`, which breaks `position: sticky`).

### Rule 9: Negative Margins Must Be Paired with Equal Padding
If using negative margins (e.g. for card alignment), ensure the parent container accommodates it with equal padding, or limit it to `md:` and above.

### Rule 10: Fixed & Absolute Elements Stay Inside the Viewport
Inspect any floating modals, badges, or tooltips. Ensure `right-0` or `left-0` constraints prevent elements from extending beyond `320px`.

---

## 3. Fluid Typography & Spacing

Instead of jarring jumps across breakpoints, use fluid scaling formulas with CSS `clamp()`.

### Fluid Heading Scale
```css
/* styles/tokens.css */
:root {
  /* Scales smoothly from mobile (320px) to desktop (1280px) */
  --font-hero: clamp(2rem, 1.2rem + 3.5vw, 3.5rem);      /* 32px -> 56px */
  --font-h1: clamp(1.75rem, 1.25rem + 2.5vw, 2.75rem);   /* 28px -> 44px */
  --font-h2: clamp(1.5rem, 1.15rem + 1.8vw, 2.25rem);    /* 24px -> 36px */
  --font-h3: clamp(1.25rem, 1.05rem + 1vw, 1.5rem);      /* 20px -> 24px */
  --font-body: clamp(0.9375rem, 0.9rem + 0.2vw, 1rem);   /* 15px -> 16px */
}
```

### Adaptive Section Padding
Sections should feel spacious on desktop without squishing content off the screen on mobile:
```jsx
// Section.jsx
export function Section({ children, className = '' }) {
  return (
    <section className={`py-12 sm:py-16 md:py-24 ${className}`}>
      {children}
    </section>
  );
}
```

---

## 4. Mobile Ergonomics & Touch Guidelines

### 44px Minimum Tap Targets
Every interactive button, icon link, menu item, and checkbox hit area must be at least **44x44px** on touch screens (WCAG 2.5.5):
```jsx
// Minimal icon button with 44px hit area:
<button 
  type="button" 
  className="flex h-11 w-11 items-center justify-center rounded text-text hover:bg-surface"
  aria-label="Toggle menu"
>
  <Menu className="h-5 w-5" />
</button>
```

### 16px Minimum Input Font Size
If an `<input>` or `<textarea>` has a font size smaller than `16px` (`1rem`), iOS Safari automatically zooms in on focus, causing horizontal layout jumps.
- **Rule:** Always use `text-base` (16px) minimum for mobile form fields.

### Safe Area Insets (Notches & Home Bars)
For sticky headers, fixed bottom bars, or mobile drawers:
```css
/* styles/globals.css */
.safe-top {
  padding-top: max(1rem, env(safe-area-inset-top));
}
.safe-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

---

## 5. Light Mode Mobile Navigation Pattern

A minimal, accessible light-mode mobile drawer navigation:

```jsx
// shared/ui/Navbar.jsx
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Container } from './Container';

export function Navbar({ links = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/95 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between">
        <a href="/" className="font-semibold text-text text-lg tracking-tight">
          Brand
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-muted hover:text-text transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center text-text md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {/* Mobile Drawer (Light Mode Minimal) */}
      {isOpen && (
        <div 
          className="fixed inset-0 top-16 z-50 bg-bg px-6 py-8 flex flex-col gap-6 md:hidden border-t border-border overflow-y-auto"
        >
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-text hover:text-accent transition-colors py-2 border-b border-border/40"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
```

---

## 6. Testing & Overflow Detection

### Manual DevTools Inspection (at 320px)
1. Open Chrome DevTools (`F12`).
2. Toggle Device Toolbar (`Ctrl+Shift+M`).
3. Set width to **320px**, zoom to 100%.
4. Open the DevTools Console and run this snippet to highlight any element causing overflow:
```javascript
(() => {
  const docWidth = document.documentElement.clientWidth;
  const culprits = [];
  document.querySelectorAll('*').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.right > docWidth || rect.left < 0) {
      culprits.push({ el, right: rect.right, width: rect.width });
      el.style.outline = '2px solid red';
    }
  });
  if (culprits.length === 0) {
    console.log('%c✓ No horizontal overflow detected at ' + docWidth + 'px', 'color: green; font-weight: bold;');
  } else {
    console.warn(`Found ${culprits.length} overflowing elements:`, culprits);
  }
})();
```

### Automated Playwright Overflow Test
Every route is validated against horizontal scroll in CI:
```bash
npm run test:overflow
```
The test (`scripts/e2e/no-horizontal-scroll.spec.js`) iterates through `routes.json` across `[320, 360, 390, 768]` viewports and fails if `scrollWidth > clientWidth`.
