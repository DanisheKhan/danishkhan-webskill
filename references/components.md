# Reference Implementations

Positive examples of what "good" looks like. **Copy these first; adapt them; do not reinvent.** All use tokens only, plain JavaScript with JSDoc, and satisfy the no-overflow and banned-pattern rules.

Contents: tokens-to-Tailwind config, `cn`, `Button`, `Container`, `Section`, `Input` / `Textarea`, page patterns (hero, feature list, pricing, footer, contact), reference `ContactForm`.

---

## 1. Tailwind config that maps the tokens (Tailwind v3)

The config both exposes the tokens and **removes the banned utilities** (`theme` keys that are overridden, not extended, delete the defaults). With this config, `shadow-2xl`, `bg-gradient-to-r` and `rounded-3xl` simply do not exist.

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    // Overridden (not extended) to enforce the design system:
    fontSize: { sm: '14px', base: '16px', lg: '20px', xl: '24px', '2xl': '32px', '3xl': '40px', '4xl': '56px' },
    fontWeight: { normal: '400', semibold: '600' },
    borderRadius: { none: '0', DEFAULT: 'var(--radius)' },
    boxShadow: { none: 'none' },
    backgroundImage: { none: 'none' },
    spacing: {
      0: '0px', px: '1px', 1: '4px', 2: '8px', 4: '16px', 6: '24px',
      8: '32px', 11: '44px', 12: '48px', 16: '64px', 24: '96px',
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        danger: 'var(--danger)',
      },
      fontFamily: { sans: ['var(--font)'] },
      maxWidth: { prose: '65ch' },
    },
  },
  plugins: [],
};
```
Notes:
- Because `spacing` is overridden, also add any fractional/width utilities you truly need (`w-full`, `max-w-*`, `min-h-*` come from other keys and still work). If a spacing step is missing, add it deliberately, not ad hoc.
- Token colors do not support Tailwind opacity modifiers (`bg-accent/50`). That is intentional; use a defined token.
- **Tailwind v4 equivalent:** in `globals.css` use `@theme inline { --color-bg: var(--bg); --color-text: var(--text); ... }` and reset removed namespaces with `--shadow-*: initial; --radius-*: initial;`. Confirm exact syntax in the Tailwind docs.

---

## 2. `cn` helper
```js
// shared/lib/cn.js
export const cn = (...parts) => parts.filter(Boolean).join(' ');
```

---

## 3. Button
```jsx
// shared/ui/Button.jsx
import { cn } from '@/shared/lib/cn';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded px-6 text-base font-semibold ' +
  'transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  solid: 'bg-accent text-accent-fg hover:opacity-90 active:opacity-80',
  outline: 'border border-border text-text hover:opacity-70 active:opacity-60',
};

/**
 * @param {Object} props
 * @param {'solid'|'outline'} [props.variant]
 * @param {boolean} [props.pending]   disables the button and sets aria-busy
 * @param {import('react').ElementType} [props.as]   e.g. Link for navigation
 */
export function Button({ variant = 'solid', pending = false, as: Tag = 'button', className, children, ...rest }) {
  const isButton = Tag === 'button';
  return (
    <Tag
      className={cn(base, variants[variant], className)}
      {...(isButton ? { type: rest.type ?? 'button', disabled: pending || rest.disabled } : {})}
      aria-busy={pending || undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```
Navigation uses `<Button as={Link} to="/contact">Contact us</Button>` (a real `<a>`). Actions use a real `<button>`.

---

## 4. Container and Section
```jsx
// shared/ui/Container.jsx
import { cn } from '@/shared/lib/cn';

/** Centered, bounded content width. Never wider than the viewport. */
export function Container({ as: Tag = 'div', size = 'md', className, ...rest }) {
  const max = size === 'lg' ? 'max-w-6xl' : 'max-w-5xl';
  return <Tag className={cn('mx-auto w-full px-4 md:px-6', max, className)} {...rest} />;
}
```
```jsx
// shared/ui/Section.jsx
import { Container } from './Container';
import { cn } from '@/shared/lib/cn';

/**
 * Vertical rhythm: 64px mobile, 96px desktop. Optional 1px top rule.
 * @param {Object} props
 * @param {string} [props.id]
 * @param {boolean} [props.rule]  adds a top border divider
 */
export function Section({ id, rule = false, className, children, ...rest }) {
  return (
    <section id={id} className={cn('py-16 md:py-24', rule && 'border-t border-border', className)} {...rest}>
      <Container>{children}</Container>
    </section>
  );
}
```

---

## 5. Input and Textarea
Visible label always, errors linked with `aria-describedby`, 16px text (prevents iOS zoom), 44px height.
```jsx
// shared/ui/Input.jsx
import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

const field =
  'w-full rounded border border-border bg-surface px-4 text-base text-text ' +
  'placeholder:text-muted focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-danger';

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} [props.error]   human-readable message
 * @param {string} [props.hint]
 * @param {import('react').Ref<HTMLInputElement>} [props.ref]   React 19 passes ref as a prop
 */
export function Input({ label, error, hint, className, ref, ...rest }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input
        id={id}
        ref={ref}
        className={cn(field, 'min-h-11', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
```
`Textarea` is identical with `<textarea rows={5} className={cn(field, 'py-2', className)} />`. On React 18, wrap with `forwardRef` instead of the `ref` prop.

---

## 6. Standard page patterns
Compose these from `Section`, `Container`, `Button`. Keep each page to the sections it needs; remove one thing from every page.

**Hero.** One `h1` (no entrance animation; this is the LCP element), one supporting sentence in `text-muted` capped with `max-w-prose`, one primary `Button`, optionally a plain text link as the secondary action. Left-aligned. Real photo or nothing; no floating mockup, no badge pill.
```jsx
<Section>
  <h1 className="max-w-prose text-3xl font-semibold md:text-4xl">Handmade ceramics, made to order in Pune.</h1>
  <p className="mt-6 max-w-prose text-lg text-muted">Small batches, glazed by hand. Delivered across India in 5 to 7 days.</p>
  <div className="mt-8 flex flex-wrap items-center gap-6">
    <Button as={Link} to="/products">Shop the collection</Button>
    <Link to="/about" className="underline underline-offset-4">Our story</Link>
  </div>
</Section>
```
(The copy is a placeholder to show tone: concrete, specific, no filler. Use the client's real copy.)

**Feature list.** Not three identical icon cards. Use a two-column list with 1px dividers: a short bold title on the left, one or two sentences on the right; stacks to one column on mobile. Wrap in `<Reveal>`.
```jsx
<ul className="divide-y divide-border border-y border-border">
  {features.map((f) => (
    <li key={f.title} className="grid gap-2 py-6 md:grid-cols-3 md:gap-8">
      <h3 className="text-lg font-semibold">{f.title}</h3>
      <p className="min-w-0 text-muted md:col-span-2">{f.body}</p>
    </li>
  ))}
</ul>
```

**Pricing.** Plain bordered rows or up to 3 equal `border border-border` cards. Plan name, price, a short list (text only, no check icons in colored circles), one `Button`. No "Most popular" badge, no highlighted/glowing tier; if one plan is recommended, say so in a plain text line. Prices in a single currency (₹ with `Intl.NumberFormat('en-IN')`). On mobile, stack the cards. Never a wide comparison table; use stacked label/value cards instead.

**Footer.** `border-t border-border`, 2 to 3 columns that stack on mobile: brand and a one-line description; navigation links; legal links (Privacy, Terms, Refund/Shipping for e-commerce) plus contact email/phone and social links (text links or Lucide icons with `aria-label`). Copyright line in `text-sm text-muted`. Real `<a href>` links only.

**Contact.** Two columns on desktop, stacked on mobile: left the form (below), right the contact details (email, phone, address, hours, map link as a plain link; no embedded map unless asked). Wrap-safe long strings (`[overflow-wrap:anywhere]`). One primary action (Send message).

---

## 7. Reference `ContactForm`
Shows the full pattern: zod, react-hook-form, honeypot, Turnstile token, pending state, success and error states, human error messages. The Edge Function it talks to is in `supabase-realworld.md` section 8.

```jsx
// features/contact/schemas/contact.schema.js
import { z } from 'zod';
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  message: z.string().trim().min(10, 'Please write at least 10 characters.').max(5000),
  website: z.string().max(0).optional(),   // honeypot
});
```
```jsx
// features/contact/components/ContactForm.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { toMessage } from '@/shared/lib/errors';
import { contactSchema } from '../schemas/contact.schema';
import { sendContact } from '../api/contact.api';

export function ContactForm() {
  const [token, setToken] = useState('');           // set by the Turnstile widget callback
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
  });
  const send = useMutation({
    mutationFn: (values) => sendContact({ ...values, turnstileToken: token }),
    onSuccess: () => reset(),
  });

  if (send.isSuccess) {
    return <p role="status">Thanks. Your message has been sent. We reply within one working day.</p>;
  }

  return (
    <form onSubmit={handleSubmit((v) => send.mutate(v))} noValidate className="flex flex-col gap-6">
      <Input label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" inputMode="email" autoComplete="email"
             error={errors.email?.message} {...register('email')} />
      <Textarea label="Message" error={errors.message?.message} {...register('message')} />

      {/* Honeypot: off-screen, not display:none, not focusable */}
      <div aria-hidden="true" className="absolute left-0 h-px w-px overflow-hidden opacity-0">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label>
      </div>

      {/* <TurnstileWidget onVerify={setToken} /> */}

      {send.isError && <p role="alert" className="text-danger">{toMessage(send.error)}</p>}
      <Button type="submit" pending={send.isPending}>{send.isPending ? 'Sending...' : 'Send message'}</Button>
    </form>
  );
}
```
Add the route to `scripts/e2e/routes.json`, a `<Seo />` to the page, and a Playwright test that submits the form with the function mocked.
