// Fails if any route scrolls horizontally at phone widths.
// Routes come from scripts/e2e/routes.json (or ROUTES="/,/contact" env).
// Add EVERY new route to routes.json in the same change that creates it.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const routes = process.env.ROUTES
  ? process.env.ROUTES.split(',').map((r) => r.trim()).filter(Boolean)
  : JSON.parse(fs.readFileSync(new URL('./routes.json', import.meta.url), 'utf8'));

const WIDTHS = [320, 360, 390, 768];

/** Scroll through the page so lazy images and whileInView reveals render before measuring. */
async function exercisePage(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700); // let reveal animations finish
}

for (const route of routes) {
  for (const width of WIDTHS) {
    test(`no horizontal scroll: ${route} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route, { waitUntil: 'networkidle' });
      await exercisePage(page);

      const result = await page.evaluate(() => {
        const de = document.documentElement;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
          .slice(0, 8)
          .map((el) => {
            const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '';
            return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`;
          });
        return {
          scrollWidth: Math.max(de.scrollWidth, document.body.scrollWidth),
          clientWidth: de.clientWidth,
          offenders,
        };
      });

      expect(
        result.scrollWidth,
        `Horizontal overflow on ${route} at ${width}px: scrollWidth ${result.scrollWidth} > clientWidth ${result.clientWidth}.\nElements past the right edge (may include harmless children of an overflow-x-auto box):\n  ${result.offenders.join('\n  ')}`,
      ).toBeLessThanOrEqual(result.clientWidth);
    });
  }
}
